// utils/autoPreparacion.js
// Job que detecta reservas confirmadas próximas y las pasa automáticamente a "En cocina".
// Lima siempre es UTC-5 (Perú no tiene horario de verano).

const { enviarPushRestaurante: enviarPush } = require('./pushNotificaciones');

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
 * Envía la notificación push "hora de preparar" a todos los dispositivos
 * suscritos del restaurante de la reserva. Delega el envío/limpieza genérico
 * en utils/pushNotificaciones.js (compartido con Gap 21).
 */
function enviarPushRestaurante(db, reserva, wpush) {
  enviarPush(db, reserva.id_restaurante, {
    title: '🍽 Hora de preparar',
    body:  `Reserva de ${reserva.nombre_cliente} — llega en ${reserva.minutos_preparacion} min`,
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  }, wpush);
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
