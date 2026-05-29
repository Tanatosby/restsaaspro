// utils/autoPreparacion.js
// Job que detecta reservas confirmadas próximas y las pasa automáticamente a "En cocina".
// Lima siempre es UTC-5 (Perú no tiene horario de verano).

const LIMA_OFFSET = '-5 hours';

/**
 * Consulta reservas confirmadas cuya hora de llegada entra en el umbral
 * de preparación (minutos_preparacion del restaurante) y aún no están en cocina.
 * Retorna filas listas para procesar.
 */
function obtenerReservasParaPreparar(db) {
  return db.prepare(`
    SELECT r.id,
           r.id_restaurante,
           r.nombre_cliente,
           r.fecha,
           r.hora_llegada,
           rest.minutos_preparacion
    FROM reservas r
    JOIN restaurantes rest ON r.id_restaurante = rest.id
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE er.es_confirmada = 1
      AND r.hora_llegada IS NOT NULL
      AND r.fecha >= date('now', '${LIMA_OFFSET}')
      AND datetime(r.fecha || ' ' || r.hora_llegada, '-' || rest.minutos_preparacion || ' minutes')
            <= datetime('now', '${LIMA_OFFSET}')
  `).all();
}

/**
 * Envía una notificación push a todos los dispositivos suscritos del restaurante.
 * wpush = módulo web-push (real o mock en tests).
 * Si un endpoint ya no es válido (410), se elimina de la BD.
 */
function enviarPushRestaurante(db, reserva, wpush) {
  const suscripciones = db.prepare(`
    SELECT id, subscription FROM push_subscriptions WHERE id_restaurante = ?
  `).all(reserva.id_restaurante);

  if (!suscripciones.length) return;

  const payload = JSON.stringify({
    title: '🍽 Hora de preparar',
    body:  `Reserva de ${reserva.nombre_cliente} — llega en ${reserva.minutos_preparacion} min`,
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  });

  for (const row of suscripciones) {
    let sub;
    try { sub = JSON.parse(row.subscription); } catch (_) { continue; }

    wpush.sendNotification(sub, payload).catch(err => {
      if (err.statusCode === 410) {
        // El dispositivo ya no tiene la suscripción activa — limpiar
        db.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).run(row.id);
      } else {
        console.error(`[AutoPrep] Push error (sub ${row.id}):`, err.message);
      }
    });
  }
}

/**
 * Un tick del job: detecta reservas en ventana, las mueve a es_en_cocina y notifica.
 * wpush es inyectable para facilitar los tests.
 */
function procesarReservasPendientes(db, wpush) {
  const estatusEnCocina = db.prepare(
    `SELECT id FROM estatus_reserva WHERE es_en_cocina = 1`
  ).get();
  if (!estatusEnCocina) return 0;

  const reservas = obtenerReservasParaPreparar(db);
  if (!reservas.length) return 0;

  const upd = db.prepare(`UPDATE reservas SET id_estatus = ? WHERE id = ?`);

  for (const r of reservas) {
    upd.run(estatusEnCocina.id, r.id);
    console.log(`[AutoPrep] Reserva #${r.id} (${r.nombre_cliente}) → En cocina`);
    if (wpush) enviarPushRestaurante(db, r, wpush);
  }

  return reservas.length;
}

/**
 * Inicia el job periódico. Devuelve el intervalId para poder detenerlo (útil en tests).
 * webpush es el módulo real; en tests se inyecta un mock.
 */
function iniciarJob(db, webpush, intervaloMs = 60_000) {
  function tick() {
    try {
      procesarReservasPendientes(db, webpush);
    } catch (err) {
      console.error('[AutoPrep] Error en job:', err.message);
    }
  }

  tick(); // ejecutar de inmediato al arrancar
  return setInterval(tick, intervaloMs);
}

module.exports = { iniciarJob, procesarReservasPendientes, enviarPushRestaurante, obtenerReservasParaPreparar };
