// routes/orders.js
const express   = require('express');
const router    = express.Router();
const db        = require('../config/database');
const ExcelJS   = require('exceljs');
const { authenticate, authorize, authorizePermiso } = require('../middleware/authenticate');
const { calcularPrecioUnitario, calcularMenuTotal } = require('../utils/menuPricing');
const { calcularTotalOrden } = require('../utils/totales');
const { fechaLima } = require('../utils/fecha');
const { descontarStock, devolverStock, itemsMenuDeOrden } = require('../utils/stock');

router.use(authenticate);

// ─────────────────────────────────────────────────────
// GET /api/orders/estatus
// Lista todos los estatus de orden (para poblar selects dinámicamente)
// ─────────────────────────────────────────────────────
router.get('/estatus', (req, res) => {
  const estatus = db.prepare(`SELECT id, nombre FROM estatus_orden ORDER BY id ASC`).all();
  res.json(estatus);
});

// ─────────────────────────────────────────────────────
// GET /api/orders/activas
// Órdenes activas: pendiente + preparando + entregando
// Para la vista en tiempo real del owner/cocinero
// ─────────────────────────────────────────────────────
router.get('/activas', (req, res) => {
  const ordenes = db.prepare(`
    SELECT
      o.id,
      ROW_NUMBER() OVER (PARTITION BY o.fecha ORDER BY o.id ASC) AS numero_dia,
      o.mesa,
      o.nombre_cliente,
      o.fecha,
      o.created_at,
      o.metodo_pago,
      o.estado_pago,
      o.comprobante_url,
      o.modalidad,
      eo.nombre      AS estatus,
      eo.es_inicial,
      eo.es_en_cocina,
      eo.es_listo,
      eo.es_entregado,
      eo.es_pagado,
      eo.es_cancelado
    FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id_restaurante = ?
      AND eo.es_pagado = 0 AND eo.es_cancelado = 0
    ORDER BY o.created_at ASC
  `).all(req.user.restaurant_id);

  const result = ordenes.map(o => {
    const cartaItems = db.prepare(`
      SELECT
        oci.id,
        oci.cantidad,
        oci.precio_unitario,
        pc.nombre
      FROM orden_carta_items oci
      JOIN platos_carta pc ON oci.id_plato_carta = pc.id
      WHERE oci.id_orden = ?
    `).all(o.id);

    const menuItems = db.prepare(`
      SELECT
        omi.id,
        omi.cantidad,
        pm.nombre     AS plato,
        sm.nombre     AS seccion
      FROM orden_menu_items omi
      JOIN componentes_menu_dia cmd ON omi.id_componente = cmd.id
      JOIN platos_menu pm           ON cmd.id_plato_menu = pm.id
      JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
      WHERE omi.id_orden = ?
    `).all(o.id);

    const total = cartaItems.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);

    return { ...o, carta_items: cartaItems, menu_items: menuItems, total };
  });

  res.json(result);
});

// ─────────────────────────────────────────────────────
// GET /api/orders/queue
// Cola de cocina: pending + cooking con campos en inglés
// Consumido por kitchen.html para el polling automático
// ─────────────────────────────────────────────────────
router.get('/queue', authorizePermiso(), (req, res) => {
  const ordenes = db.prepare(`
    SELECT
      o.id,
      ROW_NUMBER() OVER (PARTITION BY o.fecha ORDER BY o.id ASC) AS numero_dia,
      o.mesa           AS table_number,
      o.nombre_cliente AS customer_name,
      o.created_at,
      eo.es_inicial,
      eo.es_en_cocina
    FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id_restaurante = ?
      AND eo.es_pagado = 0 AND eo.es_cancelado = 0 AND eo.es_listo = 0
    ORDER BY o.created_at ASC
  `).all(req.user.restaurant_id);

  const result = ordenes.map(o => {
    const cartaItems = db.prepare(`
      SELECT pc.nombre
      FROM orden_carta_items oci
      JOIN platos_carta pc ON oci.id_plato_carta = pc.id
      WHERE oci.id_orden = ?
    `).all(o.id);

    const menuItems = db.prepare(`
      SELECT pm.nombre
      FROM orden_menu_items omi
      JOIN componentes_menu_dia cmd ON omi.id_componente = cmd.id
      JOIN platos_menu pm           ON cmd.id_plato_menu = pm.id
      WHERE omi.id_orden = ?
    `).all(o.id);

    const platos = [...cartaItems, ...menuItems].map(i => i.nombre);

    return {
      id:            o.id,
      numero_dia:    o.numero_dia,
      status:        o.es_en_cocina ? 'cooking' : 'pending',
      type:          'simple',
      dish:          platos.join(', ') || '—',
      customer_name: o.customer_name || '—',
      table_number:  o.table_number  || null,
      created_at:    o.created_at,
      combo_name:    null,
      selections:    [],
    };
  });

  res.json(result);
});

// ─────────────────────────────────────────────────────
// GET /api/orders
// Todas las órdenes del restaurante con filtro opcional
// ?fecha_desde=YYYY-MM-DD  → fecha inicio del rango
// ?fecha_hasta=YYYY-MM-DD  → fecha fin del rango
// ?estatus=completado      → filtrar por estatus
// ─────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { fecha_desde, fecha_hasta, estatus } = req.query;

  let query = `
    SELECT
      o.id,
      ROW_NUMBER() OVER (PARTITION BY o.fecha ORDER BY o.id ASC) AS numero_dia,
      o.mesa,
      o.nombre_cliente,
      o.fecha,
      o.created_at,
      o.modalidad,
      eo.nombre AS estatus
    FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id_restaurante = ?
  `;
  const params = [req.user.restaurant_id];

  if (fecha_desde) {
    query += ` AND o.fecha >= ?`;
    params.push(fecha_desde);
  }
  if (fecha_hasta) {
    query += ` AND o.fecha <= ?`;
    params.push(fecha_hasta);
  }
  if (estatus) {
    query += ` AND eo.nombre = ?`;
    params.push(estatus);
  }

  query += ` ORDER BY o.created_at DESC`;

  const ordenes = db.prepare(query).all(...params);

  const result = ordenes.map(o => {
    const cartaItems = db.prepare(`
      SELECT
        oci.id,
        oci.cantidad,
        oci.precio_unitario,
        pc.nombre
      FROM orden_carta_items oci
      JOIN platos_carta pc ON oci.id_plato_carta = pc.id
      WHERE oci.id_orden = ?
    `).all(o.id);

    const menuItems = db.prepare(`
      SELECT
        omi.id,
        omi.cantidad,
        omi.id_menu_dia,
        pm.nombre   AS plato,
        sm.nombre   AS seccion,
        md.precio   AS precio_menu,
        ms.requerido
      FROM orden_menu_items omi
      JOIN componentes_menu_dia cmd ON omi.id_componente  = cmd.id
      JOIN platos_menu pm           ON cmd.id_plato_menu  = pm.id
      JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
      JOIN menus_dia md             ON omi.id_menu_dia    = md.id
      JOIN menu_secciones ms        ON ms.id_menu_dia     = omi.id_menu_dia
                                   AND ms.id_seccion_menu = cmd.id_seccion_menu
      WHERE omi.id_orden = ?
    `).all(o.id);

    const seccionesCache = new Map();
    const itemsPerMenu   = new Map();
    for (const i of menuItems) {
      itemsPerMenu.set(i.id_menu_dia, (itemsPerMenu.get(i.id_menu_dia) || 0) + 1);
    }
    const menuItemsEnriquecidos = menuItems.map(i => {
      if (!seccionesCache.has(i.id_menu_dia)) {
        const { total_obligatorias } = db.prepare(`
          SELECT COUNT(*) AS total_obligatorias FROM menu_secciones WHERE id_menu_dia = ? AND requerido = 1
        `).get(i.id_menu_dia);
        seccionesCache.set(i.id_menu_dia, total_obligatorias);
      }
      return { ...i, total_obligatorias: seccionesCache.get(i.id_menu_dia) };
    });
    const menuTotal = calcularMenuTotal(menuItemsEnriquecidos);

    const total = cartaItems.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0) + menuTotal;

    return { ...o, carta_items: cartaItems, menu_items: menuItems, total };
  });

  res.json(result);
});

// ─────────────────────────────────────────────────────
// POST /api/orders
// Crear una orden — usado por menu.html (cliente)
// No requiere autenticación — el restaurante_id viene
// del query param del QR
// ─────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const {
    id_restaurante,
    mesa,
    nombre_cliente,
    carta_items,   // [{ id_plato_carta, cantidad }]
    menu_items     // [{ id_componente, id_menu_dia, cantidad }]
  } = req.body;

  if (!id_restaurante)
    return res.status(400).json({ error: 'id_restaurante es requerido' });
  if (!carta_items?.length && !menu_items?.length)
    return res.status(400).json({ error: 'La orden debe tener al menos un ítem' });

  // Verificar que el restaurante existe y está activo
  const restaurante = db.prepare(`
    SELECT id FROM restaurantes WHERE id = ? AND activo = 1
  `).get(id_restaurante);

  if (!restaurante)
    return res.status(404).json({ error: 'Restaurante no encontrado o inactivo' });

  const fecha = fechaLima();

  // Validar ítems ANTES de insertar (evita órdenes huérfanas si un ítem es inválido)
  for (const item of (carta_items || [])) {
    const plato = db.prepare(`
      SELECT id FROM platos_carta
      WHERE id = ? AND id_restaurante = ? AND activo = 1
    `).get(item.id_plato_carta, id_restaurante);
    if (!plato)
      return res.status(400).json({ error: `Plato #${item.id_plato_carta} no disponible` });
  }
  for (const item of (menu_items || [])) {
    const componente = db.prepare(`
      SELECT cmd.id FROM componentes_menu_dia cmd
      JOIN menus_dia md ON cmd.id_menu_dia = md.id
      WHERE cmd.id = ? AND md.id_restaurante = ?
    `).get(item.id_componente, id_restaurante);
    if (!componente)
      return res.status(400).json({ error: `Componente #${item.id_componente} no válido` });
  }

  // Insertar en transacción (si el stock no alcanza, revierte todo)
  let ordenId;
  try {
    ordenId = db.transaction(() => {
      const { lastInsertRowid } = db.prepare(`
        INSERT INTO ordenes (mesa, nombre_cliente, fecha, id_restaurante, id_estatus)
        VALUES (?, ?, ?, ?, (SELECT id FROM estatus_orden WHERE es_inicial = 1))
      `).run(mesa || null, nombre_cliente || null, fecha, id_restaurante);

      const stmtCarta = db.prepare(`
        INSERT INTO orden_carta_items (id_orden, id_plato_carta, cantidad, precio_unitario)
        VALUES (?, ?, ?, (SELECT precio FROM platos_carta WHERE id = ? AND activo = 1))
      `);
      for (const item of (carta_items || [])) {
        stmtCarta.run(lastInsertRowid, item.id_plato_carta, item.cantidad || 1, item.id_plato_carta);
      }

      const stmtMenu = db.prepare(`
        INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad)
        VALUES (?, ?, ?, ?)
      `);
      for (const item of (menu_items || [])) {
        stmtMenu.run(lastInsertRowid, item.id_menu_dia, item.id_componente, item.cantidad || 1);
      }

      // Descuenta stock de los platos con control; lanza 409 si no alcanza
      descontarStock(db, menu_items || []);

      return lastInsertRowid;
    })();
  } catch (e) {
    if (e.status === 409) return res.status(409).json({ error: e.message });
    throw e;
  }

  res.status(201).json({
    message: 'Orden creada correctamente',
    id_orden: ordenId
  });
});

// ─────────────────────────────────────────────────────
// PATCH /api/orders/:id/estatus
// Cambiar estatus de una orden
// Flujo: pendiente → preparando → entregando → completado
//        cualquiera → cancelado
// ─────────────────────────────────────────────────────
const VALID_ORDER_FLAGS = new Set(['es_inicial','es_en_cocina','es_listo','es_entregado','es_pagado','es_cancelado']);

router.patch('/:id/estatus', authorizePermiso(), (req, res) => {
  const { estatus, flag } = req.body;

  let nuevoEstatus;
  if (flag) {
    if (!VALID_ORDER_FLAGS.has(flag))
      return res.status(400).json({ error: `Flag inválido. Válidos: ${[...VALID_ORDER_FLAGS].join(', ')}` });
    nuevoEstatus = db.prepare(`SELECT id, nombre, es_pagado, es_cancelado FROM estatus_orden WHERE ${flag} = 1`).get();
    if (!nuevoEstatus)
      return res.status(400).json({ error: `No existe estatus con flag ${flag}` });
  } else {
    const estatusValidos = db.prepare(`SELECT nombre FROM estatus_orden`).all().map(e => e.nombre);
    if (!estatusValidos.includes(estatus))
      return res.status(400).json({ error: `Estatus inválido. Válidos: ${estatusValidos.join(', ')}` });
    nuevoEstatus = db.prepare(`SELECT id, nombre, es_pagado, es_cancelado FROM estatus_orden WHERE nombre = ?`).get(estatus);
  }

  const orden = db.prepare(`
    SELECT o.id, eo.nombre AS estatus_actual, eo.es_pagado, eo.es_cancelado
    FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id = ? AND o.id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!orden)
    return res.status(404).json({ error: 'Orden no encontrada' });

  if (orden.es_pagado || orden.es_cancelado)
    return res.status(400).json({ error: `No se puede cambiar una orden ${orden.estatus_actual}` });

  if (nuevoEstatus.es_pagado) {
    const total = calcularTotalOrden(db, req.params.id);
    db.prepare(`UPDATE ordenes SET id_estatus = ?, total = ?, estado_pago = 'pagado' WHERE id = ?`)
      .run(nuevoEstatus.id, total, req.params.id);
  } else if (nuevoEstatus.es_cancelado) {
    // Cancelar devuelve el stock de los platos del menú (en la misma transacción)
    db.transaction(() => {
      db.prepare(`UPDATE ordenes SET id_estatus = ? WHERE id = ?`).run(nuevoEstatus.id, req.params.id);
      devolverStock(db, itemsMenuDeOrden(db, req.params.id));
    })();
  } else {
    db.prepare(`UPDATE ordenes SET id_estatus = ? WHERE id = ?`)
      .run(nuevoEstatus.id, req.params.id);
  }

  res.json({ message: `Orden #${req.params.id} → ${nuevoEstatus.nombre}`, estatus: nuevoEstatus.nombre });
});

// ─────────────────────────────────────────────────────
// PATCH /api/orders/:id/confirmar-pago
// Owner confirma que recibió el pago (Yape/Plin/Efectivo)
// ─────────────────────────────────────────────────────
router.patch('/:id/confirmar-pago', authorizePermiso(), (req, res) => {
  const orden = db.prepare(`
    SELECT id, estado_pago FROM ordenes WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
  if (!orden.estado_pago)
    return res.status(400).json({ error: 'El cliente aún no ha marcado el pago' });
  if (orden.estado_pago === 'confirmado')
    return res.status(400).json({ error: 'El pago ya fue confirmado' });

  db.prepare(`UPDATE ordenes SET estado_pago = 'confirmado' WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Pago confirmado' });
});

// ─────────────────────────────────────────────────────
// GET /api/orders/export
// Exporta historial de órdenes como formato_1.xlsx
// Solo owner. Requiere fecha_desde y fecha_hasta.
// ─────────────────────────────────────────────────────
router.get('/export', authorizePermiso(), async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;

  if (!fecha_desde || !fecha_hasta)
    return res.status(400).json({ error: 'fecha_desde y fecha_hasta son requeridos' });

  const ordenes = db.prepare(`
    SELECT
      o.id,
      o.mesa,
      o.nombre_cliente,
      o.fecha,
      o.created_at,
      eo.nombre AS estatus
    FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id_restaurante = ?
      AND o.fecha >= ?
      AND o.fecha <= ?
    ORDER BY o.fecha ASC, o.created_at ASC
  `).all(req.user.restaurant_id, fecha_desde, fecha_hasta);

  const restaurante = db.prepare(
    `SELECT nombre FROM restaurantes WHERE id = ?`
  ).get(req.user.restaurant_id);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Historial de Órdenes');

  // ── Configurar anchos de columna ──
  ws.columns = [
    { key: 'id_orden',    width: 10 },
    { key: 'mesa',        width: 10 },
    { key: 'fecha',       width: 13 },
    { key: 'hora',        width: 10 },
    { key: 'menu',        width: 8  },
    { key: 'seccion',     width: 22 },
    { key: 'plato',       width: 28 },
    { key: 'cantidad',    width: 10 },
    { key: 'cliente',     width: 20 },
    { key: 'precio',      width: 12 },
  ];

  const COLS = 10;

  // ── Fila 1: nombre del restaurante ──
  ws.mergeCells(1, 1, 1, COLS);
  const r1 = ws.getRow(1);
  r1.height = 28;
  const c1 = ws.getCell('A1');
  c1.value = restaurante ? restaurante.nombre.toUpperCase() : 'RESTAURANTE';
  c1.font      = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  c1.alignment = { horizontal: 'center', vertical: 'middle' };
  c1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1612' } };

  // ── Fila 2: título y rango de fechas ──
  ws.mergeCells(2, 1, 2, COLS);
  const c2 = ws.getCell('A2');
  c2.value     = `Historial de Órdenes  |  ${fecha_desde}  →  ${fecha_hasta}`;
  c2.font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  c2.alignment = { horizontal: 'center', vertical: 'middle' };
  c2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8692A' } };
  ws.getRow(2).height = 22;

  // ── Fila 3: encabezados ──
  const headers = ['ID Orden','Mesa','Fecha','Hora','Menú','Sección / Categoría','Plato','Cantidad','Cliente','Precio'];
  const hRow = ws.getRow(3);
  hRow.height = 18;
  headers.forEach((h, i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value     = h;
    cell.font      = { bold: true, size: 10, color: { argb: 'FFA0521E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } };
    cell.border    = {
      top: { style: 'thin', color: { argb: 'FFD4CDC4' } },
      bottom: { style: 'medium', color: { argb: 'FFC8692A' } },
      left: { style: 'thin', color: { argb: 'FFD4CDC4' } },
      right: { style: 'thin', color: { argb: 'FFD4CDC4' } },
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

  for (const orden of ordenes) {
    const cartaItems = db.prepare(`
      SELECT oci.cantidad, oci.precio_unitario, pc.nombre,
             cc.nombre AS categoria
      FROM orden_carta_items oci
      JOIN platos_carta pc       ON oci.id_plato_carta  = pc.id
      JOIN categorias_carta cc   ON pc.id_categoria     = cc.id
      WHERE oci.id_orden = ?
    `).all(orden.id);

    const menuItems = db.prepare(`
      SELECT omi.cantidad, pm.nombre AS plato, sm.nombre AS seccion,
             md.precio AS precio_menu, omi.id_menu_dia, ms.requerido
      FROM orden_menu_items omi
      JOIN componentes_menu_dia cmd ON omi.id_componente  = cmd.id
      JOIN platos_menu pm           ON cmd.id_plato_menu  = pm.id
      JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
      JOIN menus_dia md             ON omi.id_menu_dia    = md.id
      JOIN menu_secciones ms        ON ms.id_menu_dia     = omi.id_menu_dia
                                   AND ms.id_seccion_menu = cmd.id_seccion_menu
      WHERE omi.id_orden = ?
    `).all(orden.id);

    const seccionesCache = new Map();
    const itemsPerMenu   = new Map();
    for (const i of menuItems) {
      itemsPerMenu.set(i.id_menu_dia, (itemsPerMenu.get(i.id_menu_dia) || 0) + 1);
    }
    const menuItemsEnriquecidos = menuItems.map(i => {
      if (!seccionesCache.has(i.id_menu_dia)) {
        const { total_obligatorias } = db.prepare(`
          SELECT COUNT(*) AS total_obligatorias FROM menu_secciones WHERE id_menu_dia = ? AND requerido = 1
        `).get(i.id_menu_dia);
        seccionesCache.set(i.id_menu_dia, total_obligatorias);
      }
      return { ...i, total_obligatorias: seccionesCache.get(i.id_menu_dia) };
    });
    const menuTotal = calcularMenuTotal(menuItemsEnriquecidos);
    const cartaTotal = cartaItems.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
    const totalOrden = cartaTotal + menuTotal;

    const fecha = orden.fecha;
    const hora  = orden.created_at
      ? new Date(orden.created_at.endsWith('Z') ? orden.created_at : orden.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' })
      : '';
    const cliente = orden.nombre_cliente || '';
    const mesa    = orden.mesa || '';

    // Filas de carta (N)
    for (const item of cartaItems) {
      const row = ws.getRow(rowIdx++);
      const vals = [orden.id, mesa, fecha, hora, 'N', item.categoria, item.nombre, item.cantidad, cliente, item.precio_unitario];
      vals.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.font  = { size: 10 };
        cell.alignment = { vertical: 'middle' };
        borderThin(cell);
        if (i === 9 && v !== '') cell.numFmt = '"S/ "#,##0.00';
      });
    }

    // Filas de menú (Y)
    for (const item of menuItems) {
      const row = ws.getRow(rowIdx++);
      const vals = [orden.id, mesa, fecha, hora, 'Y', item.seccion, item.plato, item.cantidad, cliente, ''];
      vals.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF4FB' } };
        cell.font  = { size: 10 };
        cell.alignment = { vertical: 'middle' };
        borderThin(cell);
      });
    }

    // Fila de total (T)
    const tRow = ws.getRow(rowIdx++);
    const tVals = [orden.id, mesa, fecha, hora, 'T', '', '', '', cliente, totalOrden];
    tVals.forEach((v, i) => {
      const cell = tRow.getCell(i + 1);
      cell.value = v;
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF0E8' } };
      cell.font  = { bold: true, size: 10, color: i === 9 ? { argb: 'FFC8692A' } : { argb: 'FF1A1612' } };
      cell.alignment = { vertical: 'middle' };
      borderThin(cell);
      if (i === 9) cell.numFmt = '"S/ "#,##0.00';
    });
  }

  // ── Enviar como descarga ──
  const filename = `historial_ordenes_${fecha_desde}_${fecha_hasta}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
});

// ─────────────────────────────────────────────────────
// PUT /api/orders/:id   &   PUT /api/orders/combo/:id
// Actualiza status desde vista de cocina usando flags semánticos
//   cooking   → estatus con es_en_cocina = 1
//   done      → estatus con es_listo     = 1
//   cancelled → estatus con es_cancelado = 1
// ─────────────────────────────────────────────────────
const KITCHEN_FLAG_MAP = { cooking: 'es_en_cocina', done: 'es_listo', cancelled: 'es_cancelado' };

function actualizarOrdenKitchen(req, res) {
  const { status } = req.body;
  const flag = KITCHEN_FLAG_MAP[status];

  if (!flag)
    return res.status(400).json({ error: 'Status inválido. Válidos: cooking, done, cancelled' });

  const orden = db.prepare(`
    SELECT o.id, eo.nombre AS estatus_actual, eo.es_pagado, eo.es_cancelado
    FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id = ? AND o.id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!orden)
    return res.status(404).json({ error: 'Orden no encontrada' });

  if (orden.es_pagado || orden.es_cancelado)
    return res.status(400).json({ error: `No se puede modificar una orden ${orden.estatus_actual}` });

  const nuevoEstatus = db.prepare(`SELECT id, nombre FROM estatus_orden WHERE ${flag} = 1`).get();
  if (!nuevoEstatus)
    return res.status(500).json({ error: `No existe estatus con flag ${flag}` });

  if (flag === 'es_cancelado') {
    // Cancelar desde cocina también devuelve el stock del menú
    db.transaction(() => {
      db.prepare(`UPDATE ordenes SET id_estatus = ? WHERE id = ?`).run(nuevoEstatus.id, req.params.id);
      devolverStock(db, itemsMenuDeOrden(db, req.params.id));
    })();
  } else {
    db.prepare(`UPDATE ordenes SET id_estatus = ? WHERE id = ?`)
      .run(nuevoEstatus.id, req.params.id);
  }

  res.json({ message: `Orden #${req.params.id} → ${nuevoEstatus.nombre}`, status });
}

router.put('/combo/:id', authorizePermiso(), actualizarOrdenKitchen);
router.put('/:id',       authorizePermiso(), actualizarOrdenKitchen);

module.exports = router;