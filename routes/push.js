// routes/push.js
const express    = require('express');
const router     = express.Router();
const db         = require('../config/database');
const { authenticate } = require('../middleware/authenticate');

// GET /api/push/vapid-key — pública, sin auth
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(500).json({ error: 'Push no configurado en el servidor' });
  res.json({ publicKey: key });
});

// POST /api/push/subscribe — guardar suscripción del dispositivo
router.post('/subscribe', authenticate, (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Suscripción inválida' });

  const id_usuario     = req.user.id;
  const id_restaurante = req.user.restaurant_id;

  // No duplicar si ya existe el mismo endpoint para este usuario
  const existe = db.prepare(`
    SELECT id FROM push_subscriptions
    WHERE id_usuario = ? AND subscription LIKE ?
  `).get(id_usuario, `%${subscription.endpoint}%`);

  if (!existe) {
    db.prepare(`
      INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription)
      VALUES (?, ?, ?)
    `).run(id_usuario, id_restaurante, JSON.stringify(subscription));
  }

  res.json({ ok: true });
});

// DELETE /api/push/unsubscribe — eliminar suscripción
router.delete('/unsubscribe', authenticate, (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint requerido' });

  db.prepare(`
    DELETE FROM push_subscriptions
    WHERE id_usuario = ? AND subscription LIKE ?
  `).run(req.user.id, `%${endpoint}%`);

  res.json({ ok: true });
});

module.exports = router;
