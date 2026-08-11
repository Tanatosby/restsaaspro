// utils/pushNotificaciones.js
// Envío genérico de push a todos los dispositivos suscritos de un restaurante.
// Reutilizado por utils/autoPreparacion.js ("hora de preparar") y por las rutas
// que crean órdenes/reservas nuevas o el recordatorio de menú (Gap 21).

/**
 * Envía `payload` (objeto — se serializa a JSON) a todas las suscripciones
 * push del restaurante `id_restaurante`. Si una suscripción ya no sirve, se
 * elimina de la BD:
 *   - 410 (Gone): el dispositivo se desuscribió del lado del navegador.
 *   - 403 (Forbidden) "VAPID credentials no corresponden": la suscripción se
 *     creó con una VAPID key que el servidor ya no usa (ej. keys
 *     regeneradas — ver ISS-025). Nunca va a funcionar hasta que el
 *     dispositivo se resuscriba con la key vigente, así que dejarla en la
 *     BD solo genera reintentos en vano y ruido en los logs.
 * `wpush` es el módulo web-push (real o mock en tests) — si es falsy, no
 * hace nada (permite llamar sin verificar antes).
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
      if (err.statusCode === 410 || err.statusCode === 403) {
        db.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).run(row.id);
        if (err.statusCode === 403) {
          console.error(`[Push] Sub ${row.id} con VAPID keys desincronizadas — eliminada, el dispositivo debe resuscribirse`);
        }
      } else {
        console.error(`[Push] Error (sub ${row.id}):`, err.message);
      }
    });
  }
}

module.exports = { enviarPushRestaurante };
