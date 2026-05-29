// routes/mesas.js
const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const { authenticate, authorizePermiso } = require('../middleware/authenticate');
const { fechaLima } = require('../utils/fecha');

router.use(authenticate);

// GET /api/mesas — lista todas las mesas del restaurante
router.get('/', (req, res) => {
  const mesas = db.prepare(`
    SELECT id, numero, capacidad, activo
    FROM mesas
    WHERE id_restaurante = ?
    ORDER BY numero ASC
  `).all(req.user.restaurant_id);
  res.json(mesas);
});

// Helpers para lógica de hora de llegada
function horaAMinutos(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function ahoraLimaMinutos() {
  const str = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date());
  return horaAMinutos(str);
}

// Reserva inminente: hora_llegada entre (ahora - 30 min) y (ahora + 120 min)
function esInminente(hora_llegada) {
  if (!hora_llegada) return false;
  const horaMin  = horaAMinutos(hora_llegada);
  const ahoraMin = ahoraLimaMinutos();
  return horaMin >= ahoraMin - 30 && horaMin <= ahoraMin + 120;
}

// GET /api/mesas/estado — mesas con estado derivado de órdenes y reservas activas de hoy
router.get('/estado', (req, res) => {
  const hoy = fechaLima();
  const rid  = req.user.restaurant_id;

  const mesas = db.prepare(`
    SELECT id, numero, capacidad
    FROM mesas
    WHERE id_restaurante = ? AND activo = 1
    ORDER BY numero ASC
  `).all(rid);

  // Mesas con orden activa (pendiente / preparando / entregando)
  const ordenesActivas = db.prepare(`
    SELECT o.mesa, o.id, o.nombre_cliente, eo.nombre AS estatus,
           o.created_at, o.fecha
    FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id_restaurante = ?
      AND eo.es_pagado = 0 AND eo.es_cancelado = 0
      AND o.mesa IS NOT NULL
  `).all(rid);

  // Reservas confirmadas para hoy con mesa asignada e hora inminente
  const reservasHoy = db.prepare(`
    SELECT r.mesa, r.id, r.nombre_cliente, r.hora_llegada
    FROM reservas r
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE r.id_restaurante = ?
      AND r.fecha = ?
      AND er.es_confirmada = 1
      AND r.mesa IS NOT NULL
  `).all(rid, hoy).filter(r => esInminente(r.hora_llegada));

  const porMesa = {};
  for (const o of ordenesActivas) {
    porMesa[o.mesa] = { tipo: 'ocupada', orden: o };
  }
  for (const r of reservasHoy) {
    if (!porMesa[r.mesa]) {
      porMesa[r.mesa] = { tipo: 'reservada', reserva: r };
    }
  }

  const resultado = mesas.map(m => ({
    ...m,
    estado:  porMesa[m.numero]?.tipo    ?? 'libre',
    orden:   porMesa[m.numero]?.orden   ?? null,
    reserva: porMesa[m.numero]?.reserva ?? null,
  }));

  res.json(resultado);
});

// POST /api/mesas — crear mesa
router.post('/', authorizePermiso(), (req, res) => {
  const { numero, capacidad } = req.body;
  if (!numero || isNaN(numero) || numero < 1)
    return res.status(400).json({ error: 'El número de mesa es requerido y debe ser positivo' });

  const existe = db.prepare(`
    SELECT id FROM mesas WHERE numero = ? AND id_restaurante = ?
  `).get(numero, req.user.restaurant_id);
  if (existe)
    return res.status(400).json({ error: `La mesa ${numero} ya existe` });

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO mesas (numero, capacidad, id_restaurante) VALUES (?, ?, ?)
  `).run(parseInt(numero), parseInt(capacidad) || 4, req.user.restaurant_id);

  res.status(201).json({ id: lastInsertRowid, numero: parseInt(numero), capacidad: parseInt(capacidad) || 4, activo: 1 });
});

// PATCH /api/mesas/:id — editar capacidad o activo
router.patch('/:id', authorizePermiso(), (req, res) => {
  const mesa = db.prepare(`
    SELECT id FROM mesas WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);
  if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' });

  const { capacidad, activo } = req.body;
  const sets = [], vals = [];
  if (capacidad !== undefined) { sets.push('capacidad = ?'); vals.push(parseInt(capacidad) || 4); }
  if (activo    !== undefined) { sets.push('activo = ?');    vals.push(activo ? 1 : 0); }
  if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' });

  vals.push(req.params.id);
  db.prepare(`UPDATE mesas SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  res.json({ message: 'Mesa actualizada' });
});

// DELETE /api/mesas/:id — eliminar mesa
router.delete('/:id', authorizePermiso(), (req, res) => {
  const mesa = db.prepare(`
    SELECT id, numero FROM mesas WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);
  if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada' });

  db.prepare(`DELETE FROM mesas WHERE id = ?`).run(req.params.id);
  res.json({ message: `Mesa ${mesa.numero} eliminada` });
});

module.exports = router;
