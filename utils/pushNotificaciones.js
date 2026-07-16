// utils/pushNotificaciones.js
// Envío genérico de push a todos los dispositivos suscritos de un restaurante.
// Reutilizado por utils/autoPreparacion.js ("hora de preparar") y por las rutas
// que crean órdenes/reservas nuevas o el recordatorio de menú (Gap 21).

/**
 * Envía `payload` (objeto — se serializa a JSON) a todas las suscripciones
 * push del restaurante `id_restaurante`. Si un endpoint ya no es válido
 * (410), se elimina de la BD. `wpush` es el módulo web-push (real o mock en
 * tests) — si es falsy, no hace nada (permite llamar sin verificar antes).
 */
function enviarPushRestaurante(db, id_restaurante, payload, wpush) {
  if (!wpush) return;

  const suscripciones = db.prepare(`
    SELECT id, subscription FROM push_subscriptions WHERE id_restaurante = ?
  `).all(id_restaurante);

  if (!suscripciones.length) return;

  const payloadStr = JSON.stringify(payload);

  for (const row of suscripciones) {
    let sub;
    try { sub = JSON.parse(row.subscription); } catch (_) { continue; }

    wpush.sendNotification(sub, payloadStr).catch(err => {
      if (err.statusCode === 410) {
        // El dispositivo ya no tiene la suscripción activa — limpiar
        db.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).run(row.id);
      } else {
        console.error(`[Push] Error (sub ${row.id}):`, err.message);
      }
    });
  }
}

module.exports = { enviarPushRestaurante };
