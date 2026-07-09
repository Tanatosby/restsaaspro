// routes/public.js
// Rutas públicas — sin autenticación
// Usadas por menu.html (cliente que escanea QR)
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { fechaLima, ahoraLima } = require('../utils/fecha');
const { generarCodigoUnico } = require('../utils/codigoReserva');
const { descontarStock, devolverStock, itemsMenuDeReserva } = require('../utils/stock');
const { dentroDeVentanaCancelacion } = require('../utils/cancelacionReserva');
const db      = require('../config/database');

// Multer para comprobantes de pago (subidos por el cliente)
const comprobantesDir = path.join(__dirname, '..', 'public', 'uploads', 'comprobantes');
if (!fs.existsSync(comprobantesDir)) fs.mkdirSync(comprobantesDir, { recursive: true });

const uploadComprobante = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, comprobantesDir),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `comp-${req.params.id}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se aceptan imágenes'));
  }
});

// ─────────────────────────────────────────────────────
// Helper: verificar que el restaurante existe y está activo
// ─────────────────────────────────────────────────────
function getRestaurante(id) {
  return db.prepare(`
    SELECT id, nombre, foto_portada, color_primario, color_secundario,
           yape_activo, yape_telefono, plin_activo, plin_telefono, efectivo_activo,
           para_llevar_activo, delivery_activo, costo_tapper, tarifa_delivery
    FROM restaurantes WHERE id = ? AND activo = 1
  `).get(id);
}

// ─────────────────────────────────────────────────────
// GET /api/public/restaurante/:id
// Info básica del restaurante (nombre, foto y colores para menu.html)
// ─────────────────────────────────────────────────────
router.get('/restaurante/:id', (req, res) => {
  const restaurante = getRestaurante(req.params.id);
  if (!restaurante)
    return res.status(404).json({ error: 'Restaurante no encontrado o inactivo' });

  res.json({
    id:               restaurante.id,
    nombre:           restaurante.nombre,
    foto_portada:     restaurante.foto_portada     || null,
    color_primario:   restaurante.color_primario   || '#c8692a',
    color_secundario: restaurante.color_secundario || '#1a6090',
    pagos: {
      yape:     restaurante.yape_activo     ? { telefono: restaurante.yape_telefono } : null,
      plin:     restaurante.plin_activo     ? { telefono: restaurante.plin_telefono } : null,
      efectivo: restaurante.efectivo_activo ? true : false,
    },
    modalidades: {
      para_llevar:     !!restaurante.para_llevar_activo,
      delivery:        !!restaurante.delivery_activo,
      costo_tapper:    restaurante.costo_tapper    ?? 0,
      tarifa_delivery: restaurante.tarifa_delivery ?? 0,
    },
  });
});

// ─────────────────────────────────────────────────────
// GET /api/public/menu?restaurante=1&dia=YYYY-MM-DD
// Menús del día con sus secciones y platos disponibles
// Si no se pasa dia, usa la fecha de hoy
// ─────────────────────────────────────────────────────
router.get('/menu', (req, res) => {
  const { restaurante, dia } = req.query;

  if (!restaurante)
    return res.status(400).json({ error: 'restaurante es requerido' });

  const rest = getRestaurante(restaurante);
  if (!rest)
    return res.status(404).json({ error: 'Restaurante no encontrado o inactivo' });

  const fecha = dia || fechaLima();

  const menus = db.prepare(`
    SELECT md.id, md.nombre, md.elegible, md.dia, md.precio,
           pm.url_foto AS url_foto_portada
    FROM menus_dia md
    LEFT JOIN platos_menu pm ON pm.id = md.id_plato_portada
    WHERE md.id_restaurante = ? AND md.dia = ? AND md.activo = 1
    ORDER BY md.created_at ASC
  `).all(restaurante, fecha);

  // Para cada menú traer secciones y platos
  const result = menus.map(menu => {
    const secciones = db.prepare(`
      SELECT
        ms.id        AS id_menu_seccion,
        ms.requerido,
        sm.id        AS id_seccion,
        sm.nombre    AS nombre_seccion
      FROM menu_secciones ms
      JOIN secciones_menu sm ON ms.id_seccion_menu = sm.id
      WHERE ms.id_menu_dia = ?
      ORDER BY sm.nombre ASC
    `).all(menu.id);

    const seccionesConPlatos = secciones.map(s => {
      const platos = db.prepare(`
        SELECT
          cmd.id   AS id_componente,
          pm.id    AS id_plato,
          pm.nombre,
          pm.descripcion,
          pm.url_foto
        FROM componentes_menu_dia cmd
        JOIN platos_menu pm ON cmd.id_plato_menu = pm.id
        WHERE cmd.id_menu_dia = ? AND cmd.id_seccion_menu = ? AND cmd.agotado = 0
          AND (cmd.stock_restante IS NULL OR cmd.stock_restante > 0)
        ORDER BY pm.nombre ASC
      `).all(menu.id, s.id_seccion);

      return { ...s, platos };
    });

    return { ...menu, secciones: seccionesConPlatos };
  });

  res.json(result);
});

// ─────────────────────────────────────────────────────
// GET /api/public/carta?restaurante=1
// Platos a la carta activos, agrupados por categoría
// ─────────────────────────────────────────────────────
router.get('/carta', (req, res) => {
  const { restaurante } = req.query;

  if (!restaurante)
    return res.status(400).json({ error: 'restaurante es requerido' });

  const rest = getRestaurante(restaurante);
  if (!rest)
    return res.status(404).json({ error: 'Restaurante no encontrado o inactivo' });

  // Traer categorías que tengan al menos un plato activo
  const categorias = db.prepare(`
    SELECT DISTINCT cc.id, cc.nombre
    FROM categorias_carta cc
    JOIN platos_carta pc ON pc.id_categoria = cc.id
    WHERE cc.id_restaurante = ? AND pc.activo = 1
    ORDER BY cc.nombre ASC
  `).all(restaurante);

  const result = categorias.map(cat => {
    const platos = db.prepare(`
      SELECT id, nombre, descripcion, precio, url_foto
      FROM platos_carta
      WHERE id_categoria = ? AND id_restaurante = ? AND activo = 1
      ORDER BY nombre ASC
    `).all(cat.id, restaurante);

    return { ...cat, platos };
  });

  res.json(result);
});

// ─────────────────────────────────────────────────────
// POST /api/public/orders
// Crear una orden desde el QR del cliente
// Body: {
//   id_restaurante,
//   mesa,
//   nombre_cliente,   (opcional)
//   carta_items:  [{ id_plato_carta, cantidad }],
//   menu_items:   [{ id_componente, id_menu_dia, cantidad }]
// }
// ─────────────────────────────────────────────────────
router.post('/orders', (req, res) => {
  const {
    id_restaurante,
    mesa,
    nombre_cliente,
    modalidad    = 'en_local',
    carta_items  = [],
    menu_items   = []
  } = req.body;

  if (!id_restaurante)
    return res.status(400).json({ error: 'id_restaurante es requerido' });
  if (!carta_items.length && !menu_items.length)
    return res.status(400).json({ error: 'La orden debe tener al menos un ítem' });

  const MODALIDADES_ORDEN = ['en_local', 'para_llevar'];
  if (!MODALIDADES_ORDEN.includes(modalidad))
    return res.status(400).json({ error: 'modalidad inválida para una orden' });

  const rest = getRestaurante(id_restaurante);
  if (!rest)
    return res.status(404).json({ error: 'Restaurante no encontrado o inactivo' });

  const fecha = fechaLima();

  // Validar ítems de carta antes de insertar
  for (const item of carta_items) {
    const plato = db.prepare(`
      SELECT id, precio FROM platos_carta
      WHERE id = ? AND id_restaurante = ? AND activo = 1
    `).get(item.id_plato_carta, id_restaurante);

    if (!plato)
      return res.status(400).json({ error: `Plato #${item.id_plato_carta} no disponible` });
  }

  // Validar ítems de menú antes de insertar
  for (const item of menu_items) {
    const componente = db.prepare(`
      SELECT cmd.id FROM componentes_menu_dia cmd
      JOIN menus_dia md ON cmd.id_menu_dia = md.id
      WHERE cmd.id = ? AND md.id_restaurante = ?
    `).get(item.id_componente, id_restaurante);

    if (!componente)
      return res.status(400).json({ error: `Componente #${item.id_componente} no válido` });
  }

  const cargo_modalidad = modalidad === 'para_llevar' ? (rest.costo_tapper ?? 0) : 0;

  // Todo válido — insertar en transacción (si el stock no alcanza, revierte todo)
  let ordenId;
  try {
    ordenId = db.transaction(() => {
      const { lastInsertRowid } = db.prepare(`
        INSERT INTO ordenes (mesa, nombre_cliente, fecha, id_restaurante, id_estatus, modalidad, cargo_modalidad)
        VALUES (?, ?, ?, ?, (SELECT id FROM estatus_orden WHERE es_inicial = 1), ?, ?)
      `).run(mesa || null, nombre_cliente?.trim() || null, fecha, id_restaurante, modalidad, cargo_modalidad);

      // Ítems de carta
      const stmtCarta = db.prepare(`
        INSERT INTO orden_carta_items (id_orden, id_plato_carta, cantidad, precio_unitario)
        SELECT ?, id, ?, precio FROM platos_carta WHERE id = ?
      `);
      for (const item of carta_items) {
        stmtCarta.run(lastInsertRowid, item.cantidad || 1, item.id_plato_carta);
      }

      // Ítems de menú
      const stmtMenu = db.prepare(`
        INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad)
        VALUES (?, ?, ?, ?)
      `);
      for (const item of menu_items) {
        stmtMenu.run(lastInsertRowid, item.id_menu_dia, item.id_componente, item.cantidad || 1);
      }

      // Descuenta stock de los platos con control; lanza 409 si no alcanza
      descontarStock(db, menu_items);

      return lastInsertRowid;
    })();
  } catch (e) {
    if (e.status === 409) return res.status(409).json({ error: e.message });
    throw e;
  }

  res.status(201).json({
    message: '¡Pedido enviado correctamente!',
    id_orden: ordenId
  });
});

// ─────────────────────────────────────────────────────
// POST /api/public/reservations
// Crear una reserva desde menu.html (cliente sin mesa)
// Body: {
//   id_restaurante,
//   nombre_cliente,    (obligatorio)
//   telefono_cliente,  (opcional)
//   fecha,             (YYYY-MM-DD, obligatorio)
//   carta_items:  [{ id_plato_carta, cantidad }],
//   menu_items:   [{ id_componente, id_menu_dia, cantidad }]
// }
// ─────────────────────────────────────────────────────
router.post('/reservations', (req, res) => {
  const {
    id_restaurante,
    nombre_cliente,
    telefono_cliente,
    fecha,
    hora_llegada,
    modalidad   = 'en_local',
    carta_items = [],
    menu_items  = []
  } = req.body;

  // Validaciones básicas
  if (!id_restaurante)
    return res.status(400).json({ error: 'id_restaurante es requerido' });
  if (!nombre_cliente?.trim())
    return res.status(400).json({ error: 'El nombre es requerido para reservar' });
  if (!fecha)
    return res.status(400).json({ error: 'La fecha de la reserva es requerida' });

  // Fecha no puede ser en el pasado
  const hoy = fechaLima();
  if (fecha < hoy)
    return res.status(400).json({ error: 'La fecha de la reserva no puede ser en el pasado' });

  const rest = getRestaurante(id_restaurante);
  if (!rest)
    return res.status(404).json({ error: 'Restaurante no encontrado o inactivo' });

  const MODALIDADES_RESERVA = ['en_local', 'para_llevar', 'delivery'];
  if (!MODALIDADES_RESERVA.includes(modalidad))
    return res.status(400).json({ error: 'modalidad inválida' });
  if (modalidad === 'delivery' && !rest.delivery_activo)
    return res.status(400).json({ error: 'Este restaurante no ofrece delivery' });
  if (modalidad === 'para_llevar' && !rest.para_llevar_activo)
    return res.status(400).json({ error: 'Este restaurante no ofrece para llevar' });

  // Validar ítems de carta
  for (const item of carta_items) {
    const plato = db.prepare(`
      SELECT id FROM platos_carta
      WHERE id = ? AND id_restaurante = ? AND activo = 1
    `).get(item.id_plato_carta, id_restaurante);

    if (!plato)
      return res.status(400).json({ error: `Plato #${item.id_plato_carta} no disponible` });
  }

  // Validar ítems de menú
  for (const item of menu_items) {
    const componente = db.prepare(`
      SELECT cmd.id FROM componentes_menu_dia cmd
      JOIN menus_dia md ON cmd.id_menu_dia = md.id
      WHERE cmd.id = ? AND md.id_restaurante = ?
    `).get(item.id_componente, id_restaurante);

    if (!componente)
      return res.status(400).json({ error: `Componente #${item.id_componente} no válido` });
  }

  let cargo_modalidad_res = 0;
  if (modalidad === 'para_llevar') cargo_modalidad_res = rest.costo_tapper    ?? 0;
  if (modalidad === 'delivery')    cargo_modalidad_res = (rest.costo_tapper ?? 0) + (rest.tarifa_delivery ?? 0);

  // Insertar en transacción (si el stock no alcanza, revierte todo)
  let reservaId, codigo;
  try {
    ({ reservaId, codigo } = db.transaction(() => {
      const codigoNuevo = generarCodigoUnico(db);

    const { lastInsertRowid } = db.prepare(`
      INSERT INTO reservas (nombre_cliente, telefono_cliente, fecha, hora_llegada, mesa, id_restaurante, id_estatus, codigo, modalidad, cargo_modalidad)
      VALUES (?, ?, ?, ?, NULL, ?, (SELECT id FROM estatus_reserva WHERE es_inicial = 1), ?, ?, ?)
    `).run(
      nombre_cliente.trim(),
      telefono_cliente?.trim() || null,
      fecha,
      hora_llegada?.trim() || null,
      id_restaurante,
      codigoNuevo,
      modalidad,
      cargo_modalidad_res
    );

    // Ítems de carta
    const stmtCarta = db.prepare(`
      INSERT INTO reserva_carta_items (id_reserva, id_plato_carta, cantidad, precio_unitario)
      SELECT ?, id, ?, precio FROM platos_carta WHERE id = ?
    `);
    for (const item of carta_items) {
      stmtCarta.run(lastInsertRowid, item.cantidad || 1, item.id_plato_carta);
    }

    // Ítems de menú
    const stmtMenu = db.prepare(`
      INSERT INTO reserva_menu_items (id_reserva, id_menu_dia, id_componente, cantidad)
      VALUES (?, ?, ?, ?)
    `);
    for (const item of menu_items) {
      stmtMenu.run(lastInsertRowid, item.id_menu_dia, item.id_componente, item.cantidad || 1);
    }

    // Descuenta stock de los platos con control; lanza 409 si no alcanza.
    // La reserva descuenta del stock del componente de SU fecha (el menú es de esa fecha).
    descontarStock(db, menu_items);

    return { reservaId: lastInsertRowid, codigo: codigoNuevo };
    })());
  } catch (e) {
    if (e.status === 409) return res.status(409).json({ error: e.message });
    throw e;
  }

  res.status(201).json({
    message: '¡Reserva creada correctamente!',
    id_reserva: reservaId,
    codigo
  });
});

// ─────────────────────────────────────────────────────
// PATCH /api/public/pago/orden/:id
// El cliente marca su pago como enviado y sube foto del comprobante.
// La foto es OBLIGATORIA para yape/plin (es la única evidencia de una
// transferencia digital); efectivo no la requiere (se paga en persona).
// Body: multipart/form-data — metodo_pago ('yape'|'plin'|'efectivo'), foto
// ─────────────────────────────────────────────────────
function handlePago(tabla, idField) {
  return (req, res) => {
    uploadComprobante.single('foto')(req, res, err => {
      if (err) return res.status(400).json({ error: err.message });

      const { metodo_pago } = req.body;
      if (!['yape', 'plin', 'efectivo'].includes(metodo_pago))
        return res.status(400).json({ error: 'metodo_pago inválido' });
      if (['yape', 'plin'].includes(metodo_pago) && !req.file)
        return res.status(400).json({ error: 'Debes adjuntar la foto del comprobante' });

      const row = db.prepare(`SELECT id, estado_pago FROM ${tabla} WHERE id = ?`).get(req.params.id);
      if (!row) return res.status(404).json({ error: 'Registro no encontrado' });
      if (row.estado_pago === 'confirmado')
        return res.status(400).json({ error: 'El pago ya fue confirmado' });

      const comprobante_url = req.file ? `/uploads/comprobantes/${req.file.filename}` : null;
      db.prepare(`UPDATE ${tabla} SET metodo_pago = ?, estado_pago = 'enviado', comprobante_url = ? WHERE id = ?`)
        .run(metodo_pago, comprobante_url, req.params.id);

      res.json({ message: 'Pago registrado correctamente', comprobante_url });
    });
  };
}

router.patch('/pago/orden/:id',   handlePago('ordenes',  'id'));
router.patch('/pago/reserva/:id', handlePago('reservas', 'id'));

// ─────────────────────────────────────────────────────
// GET /api/public/reserva/:codigo
// El cliente consulta el estado de su reserva con su código
// Sin autenticación — solo datos necesarios para el cliente
// ─────────────────────────────────────────────────────
router.get('/reserva/:codigo', (req, res) => {
  const reserva = db.prepare(`
    SELECT
      r.id,
      r.codigo,
      r.nombre_cliente,
      r.fecha,
      r.hora_llegada,
      r.metodo_pago,
      r.estado_pago,
      r.created_at,
      er.nombre           AS estatus,
      er.es_inicial,
      er.es_confirmada,
      er.es_en_cocina,
      er.es_listo,
      er.es_cliente_llego,
      er.es_full,
      er.es_cancelado
    FROM reservas r
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE r.codigo = ?
  `).get(req.params.codigo);

  if (!reserva)
    return res.status(404).json({ error: 'Reserva no encontrada. Verifica tu código.' });

  const carta_items = db.prepare(`
    SELECT pc.nombre, rci.cantidad, rci.precio_unitario
    FROM reserva_carta_items rci
    JOIN platos_carta pc ON rci.id_plato_carta = pc.id
    WHERE rci.id_reserva = ?
  `).all(reserva.id);

  const menu_items = db.prepare(`
    SELECT pm.nombre AS plato, sm.nombre AS seccion, rmi.cantidad
    FROM reserva_menu_items rmi
    JOIN componentes_menu_dia cmd ON rmi.id_componente  = cmd.id
    JOIN platos_menu pm           ON cmd.id_plato_menu  = pm.id
    JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
    WHERE rmi.id_reserva = ?
  `).all(reserva.id);

  res.json({ ...reserva, carta_items, menu_items });
});

// ─────────────────────────────────────────────────────
// PATCH /api/public/reserva/:codigo/cancelar
// El cliente cancela su propia reserva con su código (actúa como token).
// Sujeto a la ventana de tiempo del restaurante (minutos_cancelacion_reserva,
// default 30) respecto a la hora_llegada. Si la reserva no tiene hora_llegada
// (el cliente no la especificó), se permite cancelar sin límite de horario
// mientras el estatus siga siendo cancelable.
// ─────────────────────────────────────────────────────
router.patch('/reserva/:codigo/cancelar', (req, res) => {
  const reserva = db.prepare(`
    SELECT r.id, r.fecha, r.hora_llegada, r.id_restaurante,
           er.nombre AS estatus_actual, er.es_full, er.es_cancelado
    FROM reservas r
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE r.codigo = ?
  `).get(req.params.codigo);

  if (!reserva)
    return res.status(404).json({ error: 'Reserva no encontrada. Verifica tu código.' });

  if (reserva.es_full || reserva.es_cancelado)
    return res.status(400).json({ error: `No se puede cancelar una reserva ${reserva.estatus_actual}` });

  const rest = db.prepare(`SELECT minutos_cancelacion_reserva FROM restaurantes WHERE id = ?`)
    .get(reserva.id_restaurante);
  const minutosLimite = rest?.minutos_cancelacion_reserva ?? 30;

  const ventana = dentroDeVentanaCancelacion(reserva.fecha, reserva.hora_llegada, minutosLimite, ahoraLima());
  if (!ventana.permitido)
    return res.status(400).json({ error: ventana.error });

  const cancelado = db.prepare(`SELECT id FROM estatus_reserva WHERE es_cancelado = 1`).get();

  db.transaction(() => {
    db.prepare(`UPDATE reservas SET id_estatus = ? WHERE id = ?`).run(cancelado.id, reserva.id);
    devolverStock(db, itemsMenuDeReserva(db, reserva.id));
  })();

  res.json({ message: 'Reserva cancelada correctamente', estatus: 'cancelada' });
});

module.exports = router;