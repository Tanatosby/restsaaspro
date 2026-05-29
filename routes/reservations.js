// routes/reservations.js
const express  = require('express');
const router   = express.Router();
const db       = require('../config/database');
const ExcelJS  = require('exceljs');
const { authenticate, authorize, authorizePermiso } = require('../middleware/authenticate');
const { calcularPrecioUnitario, calcularMenuTotal } = require('../utils/menuPricing');
const { calcularTotalReserva } = require('../utils/totales');

router.use(authenticate);

// ─────────────────────────────────────────────────────
// GET /api/reservations/estatus
// Lista todos los estatus de reserva (para poblar selects dinámicamente)
// ─────────────────────────────────────────────────────
router.get('/estatus', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_reserva ORDER BY id ASC`).all();
  res.json(estatus);
});

// ─────────────────────────────────────────────────────
// GET /api/reservations
// Todas las reservas del restaurante
// ?fecha_desde=YYYY-MM-DD → límite inferior del rango
// ?fecha_hasta=YYYY-MM-DD → límite superior del rango
// ?estatus=pendiente      → filtrar por estatus
// ─────────────────────────────────────────────────────
const VALID_RESERVA_FLAGS = new Set(['es_inicial','es_confirmada','es_en_cocina','es_listo','es_cliente_llego','es_full','es_cancelado']);

router.get('/', (req, res) => {
  const { fecha_desde, fecha_hasta, estatus, flag } = req.query;

  let query = `
    SELECT
      r.id,
      r.codigo,
      r.nombre_cliente,
      r.telefono_cliente,
      r.fecha,
      r.hora_llegada,
      r.mesa,
      r.created_at,
      r.metodo_pago,
      r.estado_pago,
      r.comprobante_url,
      r.modalidad,
      er.nombre          AS estatus,
      er.es_full,
      er.es_inicial,
      er.es_confirmada,
      er.es_en_cocina,
      er.es_listo,
      er.es_cliente_llego,
      er.es_cancelado
    FROM reservas r
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE r.id_restaurante = ?
  `;
  const params = [req.user.restaurant_id];

  if (fecha_desde) {
    query += ` AND r.fecha >= ?`;
    params.push(fecha_desde);
  }
  if (fecha_hasta) {
    query += ` AND r.fecha <= ?`;
    params.push(fecha_hasta);
  }
  if (flag && VALID_RESERVA_FLAGS.has(flag)) {
    query += ` AND er.${flag} = 1`;
  } else if (estatus) {
    query += ` AND er.nombre = ?`;
    params.push(estatus);
  }

  query += ` ORDER BY r.fecha ASC, r.created_at ASC`;

  const reservas = db.prepare(query).all(...params);

  // Enriquecer con ítems de cada reserva
  const result = reservas.map(r => {
    const cartaItems = db.prepare(`
      SELECT
        rci.id,
        rci.cantidad,
        rci.precio_unitario,
        pc.nombre
      FROM reserva_carta_items rci
      JOIN platos_carta pc ON rci.id_plato_carta = pc.id
      WHERE rci.id_reserva = ?
    `).all(r.id);

    const menuItems = db.prepare(`
      SELECT
        rmi.id,
        rmi.cantidad,
        rmi.id_menu_dia,
        md.precio   AS precio_menu,
        pm.nombre   AS plato,
        sm.nombre   AS seccion,
        ms.requerido
      FROM reserva_menu_items rmi
      JOIN componentes_menu_dia cmd ON rmi.id_componente  = cmd.id
      JOIN platos_menu pm           ON cmd.id_plato_menu  = pm.id
      JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
      JOIN menus_dia md             ON rmi.id_menu_dia    = md.id
      JOIN menu_secciones ms        ON ms.id_menu_dia     = rmi.id_menu_dia
                                   AND ms.id_seccion_menu = cmd.id_seccion_menu
      WHERE rmi.id_reserva = ?
    `).all(r.id);

    const seccionesCache = new Map();
    const itemsPerMenu   = new Map();
    for (const i of menuItems) {
      itemsPerMenu.set(i.id_menu_dia, (itemsPerMenu.get(i.id_menu_dia) || 0) + 1);
    }
    const menuItemsConPrecio = menuItems.map(i => {
      if (!seccionesCache.has(i.id_menu_dia)) {
        const { total_obligatorias } = db.prepare(`
          SELECT COUNT(*) AS total_obligatorias FROM menu_secciones WHERE id_menu_dia = ? AND requerido = 1
        `).get(i.id_menu_dia);
        seccionesCache.set(i.id_menu_dia, total_obligatorias);
      }
      const enriched = { ...i, total_obligatorias: seccionesCache.get(i.id_menu_dia) };
      return { ...enriched, precio_unitario: calcularPrecioUnitario(enriched, itemsPerMenu) };
    });

    const total = r.es_full
      ? cartaItems.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0)
        + menuItemsConPrecio.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0)
      : 0;

    return { ...r, carta_items: cartaItems, menu_items: menuItemsConPrecio, total };
  });

  res.json(result);
});

// ─────────────────────────────────────────────────────
// POST /api/reservations
// Crear una reserva — puede venir del cliente (menu.html)
// o del mozo
// ─────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const {
    id_restaurante,
    nombre_cliente,
    telefono_cliente,
    fecha,
    hora_llegada,
    mesa,
    carta_items,
    menu_items
  } = req.body;

  if (!nombre_cliente?.trim())
    return res.status(400).json({ error: 'El nombre del cliente es requerido' });
  if (!fecha)
    return res.status(400).json({ error: 'La fecha de la reserva es requerida' });

  // Si viene del cliente (sin auth), necesita id_restaurante en el body
  // Si viene del mozo/owner (con auth), usamos req.user.restaurant_id
  const restauranteId = req.user?.restaurant_id || id_restaurante;

  if (!restauranteId)
    return res.status(400).json({ error: 'id_restaurante es requerido' });

  const restaurante = db.prepare(`
    SELECT id FROM restaurantes WHERE id = ? AND activo = 1
  `).get(restauranteId);

  if (!restaurante)
    return res.status(404).json({ error: 'Restaurante no encontrado o inactivo' });

  const { lastInsertRowid: reservaId } = db.prepare(`
    INSERT INTO reservas (nombre_cliente, telefono_cliente, fecha, hora_llegada, mesa, id_restaurante, id_estatus)
    VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM estatus_reserva WHERE es_inicial = 1))
  `).run(
    nombre_cliente.trim(),
    telefono_cliente || null,
    fecha,
    hora_llegada || null,
    mesa || null,
    restauranteId
  );

  // Insertar ítems de carta si vienen
  if (carta_items?.length) {
    const stmt = db.prepare(`
      INSERT INTO reserva_carta_items (id_reserva, id_plato_carta, cantidad, precio_unitario)
      VALUES (?, ?, ?, (SELECT precio FROM platos_carta WHERE id = ?))
    `);
    for (const item of carta_items) {
      stmt.run(reservaId, item.id_plato_carta, item.cantidad || 1, item.id_plato_carta);
    }
  }

  // Insertar ítems de menú si vienen
  if (menu_items?.length) {
    const stmt = db.prepare(`
      INSERT INTO reserva_menu_items (id_reserva, id_menu_dia, id_componente, cantidad)
      VALUES (?, ?, ?, ?)
    `);
    for (const item of menu_items) {
      stmt.run(reservaId, item.id_menu_dia, item.id_componente, item.cantidad || 1);
    }
  }

  res.status(201).json({
    message: 'Reserva creada correctamente',
    id_reserva: reservaId
  });
});

// ─────────────────────────────────────────────────────
// PATCH /api/reservations/:id/estatus
// Cambiar estatus de una reserva
// Flujo: pendiente → confirmada → completada
//        pendiente/confirmada → cancelada
// ─────────────────────────────────────────────────────
router.patch('/:id/estatus', authorizePermiso(), (req, res) => {
  const { estatus, flag } = req.body;

  let nuevoEstatus;
  if (flag) {
    if (!VALID_RESERVA_FLAGS.has(flag))
      return res.status(400).json({ error: `Flag inválido. Válidos: ${[...VALID_RESERVA_FLAGS].join(', ')}` });
    nuevoEstatus = db.prepare(`SELECT id, nombre, es_full FROM estatus_reserva WHERE ${flag} = 1`).get();
    if (!nuevoEstatus)
      return res.status(400).json({ error: `No existe estatus con flag ${flag}` });
  } else {
    const estatusValidos = db.prepare(`SELECT nombre FROM estatus_reserva ORDER BY id ASC`).all().map(e => e.nombre);
    if (!estatusValidos.includes(estatus))
      return res.status(400).json({ error: `Estatus inválido. Válidos: ${estatusValidos.join(', ')}` });
    nuevoEstatus = db.prepare(`SELECT id, nombre, es_full FROM estatus_reserva WHERE nombre = ?`).get(estatus);
  }

  const reserva = db.prepare(`
    SELECT r.id, er.nombre AS estatus_actual, er.es_full, er.es_cancelado
    FROM reservas r
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE r.id = ? AND r.id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!reserva)
    return res.status(404).json({ error: 'Reserva no encontrada' });

  if (reserva.es_full || reserva.es_cancelado)
    return res.status(400).json({
      error: `No se puede cambiar una reserva ${reserva.estatus_actual}`
    });

  if (nuevoEstatus.es_full) {
    const total = calcularTotalReserva(db, req.params.id);
    db.prepare(`UPDATE reservas SET id_estatus = ?, total = ?, estado_pago = 'pagado' WHERE id = ?`)
      .run(nuevoEstatus.id, total, req.params.id);
  } else {
    db.prepare(`UPDATE reservas SET id_estatus = ? WHERE id = ?`)
      .run(nuevoEstatus.id, req.params.id);
  }

  // Auto-merge: al marcar cliente llegó, fusionar ítems de reserva en orden activa de la misma mesa
  if (flag === 'es_cliente_llego') {
    autoMergeReservaEnOrden(req.params.id, req.user.restaurant_id);
  }

  res.json({ message: `Reserva #${req.params.id} → ${nuevoEstatus.nombre}`, estatus: nuevoEstatus.nombre });
});

// ─────────────────────────────────────────────────────
// PATCH /api/reservations/:id/mesa
// Asignar o cambiar la mesa de una reserva
// ─────────────────────────────────────────────────────
router.patch('/:id/mesa', authorizePermiso(), (req, res) => {
  const { mesa } = req.body;

  const reserva = db.prepare(`
    SELECT id FROM reservas WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });

  db.prepare(`UPDATE reservas SET mesa = ? WHERE id = ?`)
    .run(mesa || null, req.params.id);

  res.json({ message: `Mesa asignada: ${mesa || 'sin mesa'}`, mesa: mesa || null });
});

// ─────────────────────────────────────────────────────
// PATCH /api/reservations/:id/confirmar-pago
// Owner confirma que recibió el pago de una reserva
// ─────────────────────────────────────────────────────
router.patch('/:id/confirmar-pago', authorizePermiso(), (req, res) => {
  const reserva = db.prepare(`
    SELECT id, estado_pago FROM reservas WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (!reserva.estado_pago)
    return res.status(400).json({ error: 'El cliente aún no ha marcado el pago' });
  if (reserva.estado_pago === 'confirmado')
    return res.status(400).json({ error: 'El pago ya fue confirmado' });

  db.prepare(`UPDATE reservas SET estado_pago = 'confirmado' WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Pago de reserva confirmado' });
});

// ─────────────────────────────────────────────────────
// GET /api/reservations/export
// Exporta historial de reservas como formato_1.xlsx
// Solo owner. Requiere fecha_desde y fecha_hasta.
// ─────────────────────────────────────────────────────
router.get('/export', authorizePermiso(), async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;

  if (!fecha_desde || !fecha_hasta)
    return res.status(400).json({ error: 'fecha_desde y fecha_hasta son requeridos' });

  const reservas = db.prepare(`
    SELECT
      r.id,
      r.nombre_cliente,
      r.telefono_cliente,
      r.fecha,
      r.mesa,
      r.created_at,
      er.nombre  AS estatus,
      er.es_full AS es_full
    FROM reservas r
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE r.id_restaurante = ?
      AND r.fecha >= ?
      AND r.fecha <= ?
    ORDER BY r.fecha ASC, r.created_at ASC
  `).all(req.user.restaurant_id, fecha_desde, fecha_hasta);

  const restaurante = db.prepare(
    `SELECT nombre FROM restaurantes WHERE id = ?`
  ).get(req.user.restaurant_id);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Historial de Reservas');

  // ── Configurar anchos de columna ──
  ws.columns = [
    { key: 'id_reserva',  width: 12 },
    { key: 'mesa',        width: 8  },
    { key: 'fecha',       width: 13 },
    { key: 'cliente',     width: 22 },
    { key: 'telefono',    width: 16 },
    { key: 'menu',        width: 8  },
    { key: 'seccion',     width: 22 },
    { key: 'plato',       width: 28 },
    { key: 'cantidad',    width: 10 },
    { key: 'precio',      width: 12 },
  ];

  const COLS = 10;

  // ── Fila 1: nombre del restaurante ──
  ws.mergeCells(1, 1, 1, COLS);
  const c1 = ws.getCell('A1');
  c1.value     = restaurante ? restaurante.nombre.toUpperCase() : 'RESTAURANTE';
  c1.font      = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };
  c1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1612' } };
  ws.getRow(1).height = 28;

  // ── Fila 2: título y rango de fechas ──
  ws.mergeCells(2, 1, 2, COLS);
  const c2 = ws.getCell('A2');
  c2.value     = `Historial de Reservas  |  ${fecha_desde}  →  ${fecha_hasta}`;
  c2.font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  c2.alignment = { horizontal: 'center', vertical: 'middle' };
  c2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8692A' } };
  ws.getRow(2).height = 22;

  // ── Fila 3: encabezados ──
  const headers = ['ID Reserva', 'Mesa', 'Fecha', 'Cliente', 'Teléfono', 'Menú', 'Sección / Categoría', 'Plato', 'Cantidad', 'Precio'];
  const hRow = ws.getRow(3);
  hRow.height = 18;
  headers.forEach((h, i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value     = h;
    cell.font      = { bold: true, size: 10, color: { argb: 'FFA0521E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } };
    cell.border    = {
      top:    { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      bottom: { style: 'medium', color: { argb: 'FFC8692A' } },
      left:   { style: 'thin',   color: { argb: 'FFD4CDC4' } },
      right:  { style: 'thin',   color: { argb: 'FFD4CDC4' } },
    };
  });

  const borderThin = (cell) => {
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FFE8E2DA' } },
      bottom: { style: 'thin', color: { argb: 'FFE8E2DA' } },
      left:   { style: 'thin', color: { argb: 'FFE8E2DA' } },
      right:  { style: 'thin', color: { argb: 'FFE8E2DA' } },
    };
  };

  let rowIdx = 4;

  for (const reserva of reservas) {
    const cartaItems = db.prepare(`
      SELECT rci.cantidad, rci.precio_unitario, pc.nombre, cc.nombre AS categoria
      FROM reserva_carta_items rci
      JOIN platos_carta pc     ON rci.id_plato_carta = pc.id
      JOIN categorias_carta cc ON pc.id_categoria    = cc.id
      WHERE rci.id_reserva = ?
    `).all(reserva.id);

    const menuItems = db.prepare(`
      SELECT
        rmi.cantidad,
        rmi.id_menu_dia,
        md.precio   AS precio_menu,
        pm.nombre   AS plato,
        sm.nombre   AS seccion,
        ms.requerido
      FROM reserva_menu_items rmi
      JOIN componentes_menu_dia cmd ON rmi.id_componente  = cmd.id
      JOIN platos_menu pm           ON cmd.id_plato_menu  = pm.id
      JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
      JOIN menus_dia md             ON rmi.id_menu_dia    = md.id
      JOIN menu_secciones ms        ON ms.id_menu_dia     = rmi.id_menu_dia
                                   AND ms.id_seccion_menu = cmd.id_seccion_menu
      WHERE rmi.id_reserva = ?
    `).all(reserva.id);

    const seccionesCache = new Map();
    const itemsPerMenu   = new Map();
    for (const i of menuItems) {
      itemsPerMenu.set(i.id_menu_dia, (itemsPerMenu.get(i.id_menu_dia) || 0) + 1);
    }
    const menuItemsEnriquecidos = menuItems.map(i => {
      if (!seccionesCache.has(i.id_menu_dia)) {
        const { total_obligatorias } = db.prepare(
          `SELECT COUNT(*) AS total_obligatorias FROM menu_secciones WHERE id_menu_dia = ? AND requerido = 1`
        ).get(i.id_menu_dia);
        seccionesCache.set(i.id_menu_dia, total_obligatorias);
      }
      return { ...i, total_obligatorias: seccionesCache.get(i.id_menu_dia) };
    });
    const menuTotal = calcularMenuTotal(menuItemsEnriquecidos);
    const cartaTotal  = cartaItems.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
    const totalReserva = cartaTotal + menuTotal;

    const fecha    = reserva.fecha;
    const cliente  = reserva.nombre_cliente || '';
    const telefono = reserva.telefono_cliente || '';
    const mesa     = reserva.mesa || '';

    // Filas de carta (N)
    for (const item of cartaItems) {
      const row  = ws.getRow(rowIdx++);
      const vals = [reserva.id, mesa, fecha, cliente, telefono, 'N', item.categoria, item.nombre, item.cantidad, item.precio_unitario];
      vals.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value     = v;
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.font      = { size: 10 };
        cell.alignment = { vertical: 'middle' };
        borderThin(cell);
        if (i === 9 && v !== '') cell.numFmt = '"S/ "#,##0.00';
      });
    }

    // Filas de menú (Y)
    for (const item of menuItems) {
      const row  = ws.getRow(rowIdx++);
      const vals = [reserva.id, mesa, fecha, cliente, telefono, 'Y', item.seccion, item.plato, item.cantidad, ''];
      vals.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value     = v;
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF4FB' } };
        cell.font      = { size: 10 };
        cell.alignment = { vertical: 'middle' };
        borderThin(cell);
      });
    }

    // Fila de total (T)
    const tRow = ws.getRow(rowIdx++);
    const tVals = [reserva.id, mesa, fecha, cliente, telefono, 'T', '', '', '', totalReserva];
    tVals.forEach((v, i) => {
      const cell = tRow.getCell(i + 1);
      cell.value     = v;
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } };
      cell.font      = { bold: true, size: 10, color: i === 9 ? { argb: 'FFC8692A' } : { argb: 'FF1A1612' } };
      cell.alignment = { vertical: 'middle' };
      borderThin(cell);
      if (i === 9) cell.numFmt = '"S/ "#,##0.00';
    });
  }

  // ── Enviar como descarga ──
  const filename = `historialReservas_${fecha_desde}_${fecha_hasta}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
});

// ─────────────────────────────────────────────────────
// Auto-merge: copia ítems de la reserva en la orden activa de la misma mesa.
// Solo actúa si el restaurante tiene auto_merge_activo=1 y la reserva tiene mesa.
// ─────────────────────────────────────────────────────
function autoMergeReservaEnOrden(reservaId, restauranteId) {
  const rest = db.prepare(`SELECT auto_merge_activo FROM restaurantes WHERE id = ?`).get(restauranteId);
  if (!rest?.auto_merge_activo) return;

  const reserva = db.prepare(`SELECT mesa FROM reservas WHERE id = ?`).get(reservaId);
  if (!reserva?.mesa) return;

  // Buscar orden activa en la misma mesa (cualquier estado no terminal)
  const orden = db.prepare(`
    SELECT o.id FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id_restaurante = ? AND o.mesa = ?
      AND eo.es_pagado = 0 AND eo.es_cancelado = 0
    ORDER BY o.id DESC LIMIT 1
  `).get(restauranteId, reserva.mesa);
  if (!orden) return;

  db.transaction(() => {
    // Copiar ítems de carta
    const cartaItems = db.prepare(
      `SELECT id_plato_carta, cantidad, precio_unitario FROM reserva_carta_items WHERE id_reserva = ?`
    ).all(reservaId);
    const stmtCarta = db.prepare(
      `INSERT INTO orden_carta_items (id_orden, id_plato_carta, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`
    );
    for (const i of cartaItems) stmtCarta.run(orden.id, i.id_plato_carta, i.cantidad, i.precio_unitario);

    // Copiar ítems de menú
    const menuItems = db.prepare(
      `SELECT id_menu_dia, id_componente, cantidad FROM reserva_menu_items WHERE id_reserva = ?`
    ).all(reservaId);
    const stmtMenu = db.prepare(
      `INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad) VALUES (?, ?, ?, ?)`
    );
    for (const i of menuItems) stmtMenu.run(orden.id, i.id_menu_dia, i.id_componente, i.cantidad);

    // Copiar cargo_modalidad de la reserva a la orden
    const { cargo_modalidad } = db.prepare(`SELECT cargo_modalidad FROM reservas WHERE id = ?`).get(reservaId);
    if (cargo_modalidad > 0) {
      db.prepare(`UPDATE ordenes SET cargo_modalidad = cargo_modalidad + ? WHERE id = ?`)
        .run(cargo_modalidad, orden.id);
    }
  })();
}

module.exports = router;