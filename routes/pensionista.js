// routes/pensionista.js
// Endpoints del propio pensionista logueado (rol 'pensionista'): ver su
// saldo, armar su pedido con descuento automático de saldo (sin pantalla de
// pago) y ver su propio historial. Distinto de routes/pensionistas.js
// (plural), que es el CRUD del owner. Ver pensionistas.md §0, §4, §9.
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { authenticate, authorize } = require('../middleware/authenticate');
const { fechaLima, ahoraLima } = require('../utils/fecha');
const { calcularMenuTotal } = require('../utils/menuPricing');
const { descontarStock } = require('../utils/stock');
const { validarHorarioAhora } = require('../utils/horarioAtencion');
const { cancelarPedidoPensionista } = require('../utils/pensionistaPedido');

router.use(authenticate);
router.use(authorize('pensionista'));

function buscarPensionistaPorUsuario(idUsuario) {
  return db.prepare(`
    SELECT p.id, p.id_usuario, p.apellido, p.telefono, p.saldo, p.activo, p.id_restaurante
    FROM pensionistas p
    WHERE p.id_usuario = ?
  `).get(idUsuario);
}

// Enriquece { id_componente, ... } con id_menu_dia / requerido /
// total_obligatorias / precio_menu — lo que necesita calcularMenuTotal
// (utils/menuPricing.js) para repartir el precio del menú entre sus
// secciones. precio_menu se lee de la BD (no del cliente) para no confiar
// en un precio que el front pudiera mandar alterado.
function enriquecerMenuItems(idRestaurante, menuItems) {
  const seccionesCache = new Map();
  return menuItems.map(item => {
    const info = db.prepare(`
      SELECT cmd.id_menu_dia, ms.requerido, md.precio AS precio_menu
      FROM componentes_menu_dia cmd
      JOIN menus_dia md      ON cmd.id_menu_dia = md.id
      JOIN menu_secciones ms ON ms.id_menu_dia = cmd.id_menu_dia
                            AND ms.id_seccion_menu = cmd.id_seccion_menu
      WHERE cmd.id = ? AND md.id_restaurante = ?
    `).get(item.id_componente, idRestaurante);
    if (!info) return null;

    if (!seccionesCache.has(info.id_menu_dia)) {
      const { total_obligatorias } = db.prepare(`
        SELECT COUNT(*) AS total_obligatorias FROM menu_secciones
        WHERE id_menu_dia = ? AND requerido = 1
      `).get(info.id_menu_dia);
      seccionesCache.set(info.id_menu_dia, total_obligatorias);
    }

    return {
      id_menu_dia:        info.id_menu_dia,
      requerido:          info.requerido,
      precio_menu:        info.precio_menu,
      total_obligatorias: seccionesCache.get(info.id_menu_dia),
      cantidad:           item.cantidad || 1,
    };
  }).filter(Boolean);
}

// ─────────────────────────────────────────────────────
// GET /api/pensionista/me
// Datos propios + saldo actual + si está por debajo del umbral de aviso
// del restaurante (pensionistas.md §0 punto 4).
// ─────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const pensionista = buscarPensionistaPorUsuario(req.user.id);
  if (!pensionista)
    return res.status(404).json({ error: 'Pensionista no encontrado' });

  const restaurante = db.prepare(`
    SELECT nombre, pensionista_saldo_aviso FROM restaurantes WHERE id = ?
  `).get(pensionista.id_restaurante);

  const umbralAviso = restaurante?.pensionista_saldo_aviso ?? 20;

  res.json({
    id:             pensionista.id,
    nombre:         req.user.name,
    apellido:       pensionista.apellido,
    telefono:       pensionista.telefono,
    saldo:          pensionista.saldo,
    activo:         !!pensionista.activo,
    id_restaurante: pensionista.id_restaurante,
    restaurante:    restaurante?.nombre || null,
    saldo_bajo:     pensionista.saldo < umbralAviso,
  });
});

// ─────────────────────────────────────────────────────
// GET /api/pensionista/mis-pedidos
// Historial propio, más reciente primero, con sus ítems y estatus.
// ─────────────────────────────────────────────────────
router.get('/mis-pedidos', (req, res) => {
  const pensionista = buscarPensionistaPorUsuario(req.user.id);
  if (!pensionista)
    return res.status(404).json({ error: 'Pensionista no encontrado' });

  const pedidos = db.prepare(`
    SELECT pp.id, pp.mesa, pp.modalidad, pp.fecha, pp.total, pp.created_at,
           eo.nombre AS estatus, eo.es_inicial, eo.es_en_cocina, eo.es_listo,
           eo.es_entregado, eo.es_pagado, eo.es_cancelado
    FROM pedidos_pensionista pp
    JOIN estatus_orden eo ON pp.id_estatus = eo.id
    WHERE pp.id_pensionista = ?
    ORDER BY pp.created_at DESC
  `).all(pensionista.id);

  const result = pedidos.map(p => {
    const carta_items = db.prepare(`
      SELECT ppci.cantidad, ppci.precio_unitario, pc.nombre
      FROM pedido_pensionista_carta_items ppci
      JOIN platos_carta pc ON ppci.id_plato_carta = pc.id
      WHERE ppci.id_pedido = ?
    `).all(p.id);

    const menu_items = db.prepare(`
      SELECT ppmi.cantidad, pm.nombre AS plato, sm.nombre AS seccion
      FROM pedido_pensionista_menu_items ppmi
      JOIN componentes_menu_dia cmd ON ppmi.id_componente  = cmd.id
      JOIN platos_menu pm           ON cmd.id_plato_menu   = pm.id
      JOIN secciones_menu sm        ON cmd.id_seccion_menu  = sm.id
      WHERE ppmi.id_pedido = ?
    `).all(p.id);

    return { ...p, carta_items, menu_items };
  });

  res.json(result);
});

// ─────────────────────────────────────────────────────
// POST /api/pensionista/pedido
// Crea el pedido y descuenta el saldo en la misma transacción.
// Body: { mesa?, modalidad?, carta_items: [{id_plato_carta,cantidad}],
//         menu_items: [{id_componente,id_menu_dia,cantidad}] }
// ─────────────────────────────────────────────────────
router.post('/pedido', (req, res) => {
  const { mesa, modalidad = 'en_local', carta_items = [], menu_items = [] } = req.body;

  if (!carta_items.length && !menu_items.length)
    return res.status(400).json({ error: 'El pedido debe tener al menos un ítem' });

  const pensionista = buscarPensionistaPorUsuario(req.user.id);
  if (!pensionista)
    return res.status(404).json({ error: 'Pensionista no encontrado' });
  if (!pensionista.activo)
    return res.status(403).json({ error: 'Tu cuenta de pensionista está dada de baja. Habla con el restaurante.' });

  const idRestaurante = pensionista.id_restaurante;

  const rest = db.prepare(`
    SELECT id, activo, horario_activo, hora_apertura, hora_cierre, dias_atencion
    FROM restaurantes WHERE id = ? AND activo = 1
  `).get(idRestaurante);
  if (!rest)
    return res.status(404).json({ error: 'Restaurante no encontrado o inactivo' });

  // El pensionista respeta el mismo horario de atención que cualquier
  // comensal — ya pagó, pero no puede pedir fuera de horario (pensionistas.md §7).
  const horario = validarHorarioAhora(rest, ahoraLima());
  if (!horario.permitido)
    return res.status(400).json({ error: horario.error });

  // Validar ítems (mismo criterio que routes/public.js POST /orders)
  for (const item of carta_items) {
    const plato = db.prepare(`
      SELECT id FROM platos_carta WHERE id = ? AND id_restaurante = ? AND activo = 1
    `).get(item.id_plato_carta, idRestaurante);
    if (!plato)
      return res.status(400).json({ error: `Plato #${item.id_plato_carta} no disponible` });
  }
  for (const item of menu_items) {
    const componente = db.prepare(`
      SELECT cmd.id FROM componentes_menu_dia cmd
      JOIN menus_dia md ON cmd.id_menu_dia = md.id
      WHERE cmd.id = ? AND md.id_restaurante = ?
    `).get(item.id_componente, idRestaurante);
    if (!componente)
      return res.status(400).json({ error: `Componente #${item.id_componente} no válido` });
  }

  // Calcular el total ANTES de insertar, para validar saldo suficiente.
  const cartaTotal = carta_items.reduce((suma, item) => {
    const plato = db.prepare(`SELECT precio FROM platos_carta WHERE id = ?`).get(item.id_plato_carta);
    return suma + (plato?.precio || 0) * (item.cantidad || 1);
  }, 0);
  const menuTotal = calcularMenuTotal(enriquecerMenuItems(idRestaurante, menu_items));
  const total = cartaTotal + menuTotal;

  // Saldo insuficiente bloquea el pedido — decisión cerrada (pensionistas.md §0 punto 5).
  if (total > pensionista.saldo)
    return res.status(400).json({
      error: `Saldo insuficiente. Tu saldo actual es S/ ${pensionista.saldo.toFixed(2)} y el pedido cuesta S/ ${total.toFixed(2)}.`,
      saldo: pensionista.saldo,
      total
    });

  const fecha = fechaLima();
  const nuevoSaldo = pensionista.saldo - total;

  let pedidoId;
  try {
    pedidoId = db.transaction(() => {
      const { lastInsertRowid } = db.prepare(`
        INSERT INTO pedidos_pensionista (id_pensionista, mesa, modalidad, fecha, total, id_restaurante, id_estatus)
        VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM estatus_orden WHERE es_inicial = 1))
      `).run(pensionista.id, mesa || null, modalidad, fecha, total, idRestaurante);

      const stmtCarta = db.prepare(`
        INSERT INTO pedido_pensionista_carta_items (id_pedido, id_plato_carta, cantidad, precio_unitario)
        SELECT ?, id, ?, precio FROM platos_carta WHERE id = ?
      `);
      for (const item of carta_items) {
        stmtCarta.run(lastInsertRowid, item.cantidad || 1, item.id_plato_carta);
      }

      const stmtMenu = db.prepare(`
        INSERT INTO pedido_pensionista_menu_items (id_pedido, id_menu_dia, id_componente, cantidad)
        VALUES (?, ?, ?, ?)
      `);
      for (const item of menu_items) {
        stmtMenu.run(lastInsertRowid, item.id_menu_dia, item.id_componente, item.cantidad || 1);
      }

      // Descuenta stock de los platos con control; lanza 409 si no alcanza
      // (revierte toda la transacción — no se descuenta saldo ni se crea el pedido).
      descontarStock(db, menu_items);

      db.prepare(`UPDATE pensionistas SET saldo = ? WHERE id = ?`).run(nuevoSaldo, pensionista.id);
      db.prepare(`
        INSERT INTO pensionista_movimientos
          (id_pensionista, tipo, monto, saldo_resultante, id_pedido_pensionista, id_usuario_registro)
        VALUES (?, 'consumo', ?, ?, ?, ?)
      `).run(pensionista.id, -total, nuevoSaldo, lastInsertRowid, req.user.id);

      return lastInsertRowid;
    })();
  } catch (e) {
    if (e.status === 409) return res.status(409).json({ error: e.message });
    throw e;
  }

  res.status(201).json({
    message: '¡Pedido enviado correctamente!',
    id_pedido: pedidoId,
    total,
    saldo_restante: nuevoSaldo
  });
});

// ─────────────────────────────────────────────────────
// PATCH /api/pensionista/pedido/:id/cancelar
// El pensionista cancela su propio pedido — devuelve el saldo y el stock
// automáticamente. Ver pensionistas.md §7.
// ─────────────────────────────────────────────────────
router.patch('/pedido/:id/cancelar', (req, res) => {
  const pensionista = buscarPensionistaPorUsuario(req.user.id);
  if (!pensionista)
    return res.status(404).json({ error: 'Pensionista no encontrado' });

  const pedido = db.prepare(`
    SELECT id, id_pensionista FROM pedidos_pensionista WHERE id = ?
  `).get(req.params.id);

  if (!pedido)
    return res.status(404).json({ error: 'Pedido no encontrado' });
  if (pedido.id_pensionista !== pensionista.id)
    return res.status(403).json({ error: 'No puedes cancelar el pedido de otro pensionista' });

  try {
    const { saldo } = cancelarPedidoPensionista(db, pedido.id, req.user.id);
    res.json({ message: 'Pedido cancelado, saldo devuelto', saldo_restante: saldo });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

module.exports = router;
