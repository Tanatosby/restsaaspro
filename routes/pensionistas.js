// routes/pensionistas.js
// Gestión de pensionistas (comensales recurrentes con saldo prepagado) —
// accesible por owner. El pensionista es un usuario más (id_rol='pensionista'),
// creado y administrado 100% desde este módulo (nunca desde /api/usuarios).
// Ver pensionistas.md §0-§6 (decisiones cerradas 2026-08-10) para el diseño.
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/database');
const { authenticate, authorize, authorizePermiso } = require('../middleware/authenticate');
const { cancelarPedidoPensionista } = require('../utils/pensionistaPedido');

router.use(authenticate);

// Trae un pensionista + sus datos de usuario, o null si no existe.
function buscarPensionista(id) {
  return db.prepare(`
    SELECT p.id, p.id_usuario, p.apellido, p.telefono, p.saldo, p.activo,
           p.id_restaurante, p.created_at, u.nombre, u.email
    FROM pensionistas p
    JOIN usuarios u ON p.id_usuario = u.id
    WHERE p.id = ?
  `).get(id);
}

// El owner solo puede operar pensionistas de su propio restaurante.
function verificarPropiedad(req, pensionista) {
  return req.user.role === 'admin' || pensionista.id_restaurante === req.user.restaurant_id;
}

// ─────────────────────────────────────────────────────
// GET /api/pensionistas
// Lista los pensionistas del restaurante del owner
// ─────────────────────────────────────────────────────
router.get('/', authorize('owner', 'admin'), (req, res) => {
  const restauranteId = req.user.role === 'admin'
    ? (req.query.restaurante || req.user.restaurant_id)
    : req.user.restaurant_id;

  const pensionistas = db.prepare(`
    SELECT p.id, p.id_usuario, u.nombre, p.apellido, u.email, p.telefono,
           p.saldo, p.activo, p.created_at
    FROM pensionistas p
    JOIN usuarios u ON p.id_usuario = u.id
    WHERE p.id_restaurante = ?
    ORDER BY p.activo DESC, u.nombre ASC
  `).all(restauranteId);

  res.json(pensionistas);
});

// ─────────────────────────────────────────────────────
// POST /api/pensionistas
// Crea un pensionista: usuario (id_rol='pensionista') + fila en pensionistas.
// Si saldo_inicial > 0, registra el primer movimiento de tipo 'recarga'.
// ─────────────────────────────────────────────────────
router.post('/', authorize('owner', 'admin'), (req, res) => {
  const { nombre, apellido, email, telefono, password, saldo_inicial, id_restaurante } = req.body;

  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre es requerido' });
  if (!apellido?.trim())
    return res.status(400).json({ error: 'El apellido es requerido' });
  if (!email?.trim())
    return res.status(400).json({ error: 'El email es requerido' });
  // Mismo criterio que routes/usuarios.js: no es un correo real, es un
  // identificador de login que el owner inventa. Ver pensionistas.md §0 punto 5.
  if (!email.trim().toLowerCase().endsWith('@menupro.tech'))
    return res.status(400).json({ error: 'El email debe terminar en @menupro.tech' });
  if (!password || password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

  const saldoInicial = saldo_inicial === undefined || saldo_inicial === null || saldo_inicial === ''
    ? 0
    : Number(saldo_inicial);
  if (!Number.isFinite(saldoInicial) || saldoInicial < 0)
    return res.status(400).json({ error: 'El saldo inicial debe ser un número mayor o igual a 0' });

  const restauranteId = req.user.role === 'admin'
    ? (id_restaurante || req.user.restaurant_id)
    : req.user.restaurant_id;

  if (!restauranteId)
    return res.status(400).json({ error: 'id_restaurante es requerido' });

  const restaurante = db.prepare(`
    SELECT id FROM restaurantes WHERE id = ? AND activo = 1
  `).get(restauranteId);

  if (!restaurante)
    return res.status(404).json({ error: 'Restaurante no encontrado o inactivo' });

  const existe = db.prepare(`SELECT id FROM usuarios WHERE email = ?`).get(email.trim());
  if (existe)
    return res.status(400).json({ error: 'El email ya está registrado' });

  const rolRow = db.prepare(`SELECT id FROM roles WHERE nombre = 'pensionista'`).get();
  if (!rolRow)
    return res.status(500).json({ error: 'Rol "pensionista" no está configurado' });

  const hash = bcrypt.hashSync(password, 10);

  const crear = db.transaction(() => {
    const { lastInsertRowid: idUsuario } = db.prepare(`
      INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
      VALUES (?, ?, ?, ?, ?)
    `).run(nombre.trim(), email.trim(), hash, rolRow.id, restauranteId);

    const { lastInsertRowid: idPensionista } = db.prepare(`
      INSERT INTO pensionistas (id_usuario, apellido, telefono, saldo, id_restaurante)
      VALUES (?, ?, ?, ?, ?)
    `).run(idUsuario, apellido.trim(), telefono?.trim() || null, saldoInicial, restauranteId);

    if (saldoInicial > 0) {
      db.prepare(`
        INSERT INTO pensionista_movimientos
          (id_pensionista, tipo, monto, saldo_resultante, nota, id_usuario_registro)
        VALUES (?, 'recarga', ?, ?, 'Saldo inicial', ?)
      `).run(idPensionista, saldoInicial, saldoInicial, req.user.id);
    }

    return idPensionista;
  });

  const id = crear();

  res.status(201).json({
    message: `Pensionista "${nombre.trim()} ${apellido.trim()}" creado correctamente`,
    id
  });
});

// ─────────────────────────────────────────────────────
// POST /api/pensionistas/:id/recargar
// Registra una recarga de saldo (dinero recibido fuera del sistema).
// ─────────────────────────────────────────────────────
router.post('/:id/recargar', authorize('owner', 'admin'), (req, res) => {
  const { monto, nota } = req.body;

  const montoNum = Number(monto);
  if (!Number.isFinite(montoNum) || montoNum <= 0)
    return res.status(400).json({ error: 'El monto debe ser un número mayor a 0' });

  const pensionista = buscarPensionista(req.params.id);
  if (!pensionista)
    return res.status(404).json({ error: 'Pensionista no encontrado' });
  if (!verificarPropiedad(req, pensionista))
    return res.status(403).json({ error: 'No tienes permiso sobre este pensionista' });
  if (!pensionista.activo)
    return res.status(400).json({ error: 'No se puede recargar a un pensionista dado de baja' });

  const nuevoSaldo = pensionista.saldo + montoNum;

  const recargar = db.transaction(() => {
    db.prepare(`UPDATE pensionistas SET saldo = ? WHERE id = ?`).run(nuevoSaldo, pensionista.id);
    db.prepare(`
      INSERT INTO pensionista_movimientos
        (id_pensionista, tipo, monto, saldo_resultante, nota, id_usuario_registro)
      VALUES (?, 'recarga', ?, ?, ?, ?)
    `).run(pensionista.id, montoNum, nuevoSaldo, nota?.trim() || null, req.user.id);
  });
  recargar();

  res.json({
    message: `Recarga de S/ ${montoNum.toFixed(2)} registrada para "${pensionista.nombre} ${pensionista.apellido}"`,
    saldo: nuevoSaldo
  });
});

// ─────────────────────────────────────────────────────
// GET /api/pensionistas/:id/movimientos
// Historial de movimientos de saldo (recargas y consumos) — transparencia
// si el pensionista reclama. Ver pensionistas.md §6.
// ─────────────────────────────────────────────────────
router.get('/:id/movimientos', authorize('owner', 'admin'), (req, res) => {
  const pensionista = buscarPensionista(req.params.id);
  if (!pensionista)
    return res.status(404).json({ error: 'Pensionista no encontrado' });
  if (!verificarPropiedad(req, pensionista))
    return res.status(403).json({ error: 'No tienes permiso sobre este pensionista' });

  const movimientos = db.prepare(`
    SELECT id, tipo, monto, saldo_resultante, id_pedido_pensionista, nota, created_at
    FROM pensionista_movimientos
    WHERE id_pensionista = ?
    ORDER BY created_at DESC, id DESC
  `).all(pensionista.id);

  res.json(movimientos);
});

// ─────────────────────────────────────────────────────
// PATCH /api/pensionistas/:id
// Edita nombre, apellido y/o teléfono
// ─────────────────────────────────────────────────────
router.patch('/:id', authorize('owner', 'admin'), (req, res) => {
  const { nombre, apellido, telefono } = req.body;

  const pensionista = buscarPensionista(req.params.id);
  if (!pensionista)
    return res.status(404).json({ error: 'Pensionista no encontrado' });
  if (!verificarPropiedad(req, pensionista))
    return res.status(403).json({ error: 'No tienes permiso sobre este pensionista' });

  if (nombre !== undefined && !nombre.trim())
    return res.status(400).json({ error: 'El nombre no puede quedar vacío' });
  if (apellido !== undefined && !apellido.trim())
    return res.status(400).json({ error: 'El apellido no puede quedar vacío' });

  const editar = db.transaction(() => {
    if (nombre !== undefined)
      db.prepare(`UPDATE usuarios SET nombre = ? WHERE id = ?`).run(nombre.trim(), pensionista.id_usuario);
    if (apellido !== undefined || telefono !== undefined) {
      db.prepare(`UPDATE pensionistas SET apellido = ?, telefono = ? WHERE id = ?`).run(
        apellido !== undefined ? apellido.trim() : pensionista.apellido,
        telefono !== undefined ? (telefono?.trim() || null) : pensionista.telefono,
        pensionista.id
      );
    }
  });
  editar();

  res.json({ message: 'Datos del pensionista actualizados' });
});

// ─────────────────────────────────────────────────────
// PATCH /api/pensionistas/:id/password
// Cambia la contraseña de login del pensionista
// ─────────────────────────────────────────────────────
router.patch('/:id/password', authorize('owner', 'admin'), (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

  const pensionista = buscarPensionista(req.params.id);
  if (!pensionista)
    return res.status(404).json({ error: 'Pensionista no encontrado' });
  if (!verificarPropiedad(req, pensionista))
    return res.status(403).json({ error: 'No tienes permiso sobre este pensionista' });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`UPDATE usuarios SET password_hash = ? WHERE id = ?`).run(hash, pensionista.id_usuario);

  res.json({ message: `Contraseña de "${pensionista.nombre} ${pensionista.apellido}" actualizada` });
});

// ─────────────────────────────────────────────────────
// PATCH /api/pensionistas/:id/activo
// Baja/alta lógica — no borra historial ni permite nuevos pedidos si activo=0.
// Mismo patrón que PATCH /api/menu/menus-dia/:id/activo.
// ─────────────────────────────────────────────────────
router.patch('/:id/activo', authorize('owner', 'admin'), (req, res) => {
  const { activo } = req.body;
  if (activo === undefined || activo === null)
    return res.status(400).json({ error: 'El campo activo es obligatorio' });

  const pensionista = buscarPensionista(req.params.id);
  if (!pensionista)
    return res.status(404).json({ error: 'Pensionista no encontrado' });
  if (!verificarPropiedad(req, pensionista))
    return res.status(403).json({ error: 'No tienes permiso sobre este pensionista' });

  db.prepare(`UPDATE pensionistas SET activo = ? WHERE id = ?`).run(activo ? 1 : 0, pensionista.id);

  res.json({ message: 'Estado del pensionista actualizado', activo: activo ? 1 : 0 });
});

// ─────────────────────────────────────────────────────
// PATCH /api/pensionistas/pedidos/:id/estatus
// Owner/staff mueve el pedido por el ciclo de cocina — mismo set de flags
// que PATCH /api/orders/:id/estatus (reutiliza estatus_orden, ver
// pensionistas.md §3). "es_pagado" acá no cobra nada (ya se descontó del
// saldo al crear el pedido): solo cierra el pedido como entregado/liquidado.
// "es_cancelado" devuelve saldo + stock automáticamente (pensionistas.md §7).
// ─────────────────────────────────────────────────────
const VALID_PEDIDO_FLAGS = new Set(['es_inicial', 'es_en_cocina', 'es_listo', 'es_entregado', 'es_pagado', 'es_cancelado']);

router.patch('/pedidos/:id/estatus', authorizePermiso(), (req, res) => {
  const { flag } = req.body;

  if (!VALID_PEDIDO_FLAGS.has(flag))
    return res.status(400).json({ error: `Flag inválido. Válidos: ${[...VALID_PEDIDO_FLAGS].join(', ')}` });

  const pedido = db.prepare(`
    SELECT pp.id, pp.id_restaurante, eo.nombre AS estatus_actual, eo.es_pagado, eo.es_cancelado
    FROM pedidos_pensionista pp
    JOIN estatus_orden eo ON pp.id_estatus = eo.id
    WHERE pp.id = ?
  `).get(req.params.id);

  if (!pedido)
    return res.status(404).json({ error: 'Pedido no encontrado' });
  if (req.user.role !== 'admin' && pedido.id_restaurante !== req.user.restaurant_id)
    return res.status(403).json({ error: 'No tienes permiso sobre este pedido' });
  if (pedido.es_pagado || pedido.es_cancelado)
    return res.status(400).json({ error: `No se puede cambiar un pedido ${pedido.estatus_actual}` });

  if (flag === 'es_cancelado') {
    try {
      cancelarPedidoPensionista(db, pedido.id, req.user.id);
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      throw e;
    }
    return res.json({ message: `Pedido #${pedido.id} → cancelado (saldo devuelto)`, estatus: 'cancelado' });
  }

  const nuevoEstatus = db.prepare(`SELECT id, nombre FROM estatus_orden WHERE ${flag} = 1`).get();
  if (!nuevoEstatus)
    return res.status(500).json({ error: `No existe estatus con flag ${flag}` });

  db.prepare(`UPDATE pedidos_pensionista SET id_estatus = ? WHERE id = ?`).run(nuevoEstatus.id, pedido.id);
  res.json({ message: `Pedido #${pedido.id} → ${nuevoEstatus.nombre}`, estatus: nuevoEstatus.nombre });
});

module.exports = router;
