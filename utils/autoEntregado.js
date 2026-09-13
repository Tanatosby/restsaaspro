// utils/autoEntregado.js — ISS-091
// Job que pasa las órdenes de "Listos" a "Por cobrar" solas, pasados X minutos.
//
// Por qué existe: "Listos" solo se vacía si alguien toca "🍽 Entregar", y en
// hora pico nadie lo toca. Día 15 del piloto: ~39 pedidos acumulados sin cerrar
// (ISS-085). El plato sí se lleva a la mesa — lo que no ocurre es el toque en
// la pantalla, que es trabajo de registro, no de servicio.
//
// Alcance, decidido con el usuario (ver ISS-091):
//
//  · SOLO ÓRDENES. Las reservas quedan fuera: ahí "cliente llegó" y "salió con
//    el repartidor" son datos reales que alguien tiene que confirmar, no los
//    puede poner un reloj.
//  · TODAS las modalidades. Una orden "para llevar" es alguien que está en el
//    local y se lleva su plato: se lo dan ahí mismo. Y una orden nunca puede
//    ser delivery — MODALIDADES_ORDEN no lo admite (routes/public.js), el
//    delivery solo existe en reservas.
//
// Mismo molde que utils/autoPreparacion.js, que ya mueve reservas a cocina.

// El umbral se cuenta desde `listo_at`, no desde `created_at`: si se contara
// desde la creación, un pedido que estuvo 40 minutos en cocina se marcaría
// entregado en el mismo instante en que la cocinera lo pone listo.
//
// `listo_at` se escribe en los dos caminos por los que una orden llega a listo
// (PATCH /:id/estatus y el PUT de cocina). Las órdenes que ya estaban en
// "Listos" ANTES del deploy lo tienen en NULL y el job las ignora a propósito:
// vaciarlas de golpe al arrancar marcaría como entregados platos que quizá
// siguen en la barra. Esas se cierran a mano, una sola vez.
function obtenerOrdenesParaEntregar(db) {
  return db.prepare(`
    SELECT o.id,
           o.id_restaurante,
           o.mesa,
           rest.minutos_auto_entregado
    FROM ordenes o
    JOIN restaurantes rest   ON o.id_restaurante = rest.id
    JOIN estatus_orden eo    ON o.id_estatus     = eo.id
    WHERE eo.es_listo = 1
      AND o.listo_at IS NOT NULL
      AND rest.minutos_auto_entregado > 0
      AND datetime(o.listo_at, '+' || rest.minutos_auto_entregado || ' minutes') <= datetime('now')
  `).all();
}

/**
 * Un tick del job: mueve a "entregado" las órdenes que ya cumplieron su tiempo
 * en "Listos". Devuelve cuántas movió.
 */
function procesarOrdenesListas(db) {
  const estatusEntregado = db.prepare(
    `SELECT id FROM estatus_orden WHERE es_entregado = 1`
  ).get();
  if (!estatusEntregado) return 0;

  const ordenes = obtenerOrdenesParaEntregar(db);
  if (!ordenes.length) return 0;

  const upd = db.prepare(`UPDATE ordenes SET id_estatus = ? WHERE id = ?`);

  for (const o of ordenes) {
    upd.run(estatusEntregado.id, o.id);
    console.log(`[AutoEntrega] Orden #${o.id}${o.mesa ? ` (mesa ${o.mesa})` : ''} → Por cobrar ` +
                `tras ${o.minutos_auto_entregado} min en Listos`);
  }

  return ordenes.length;
}

/**
 * Inicia el job periódico. Devuelve el intervalId para poder detenerlo (tests).
 */
function iniciarJob(db, intervaloMs = 60_000) {
  function tick() {
    try {
      procesarOrdenesListas(db);
    } catch (err) {
      console.error('[AutoEntrega] Error en job:', err.message);
    }
  }

  tick();
  return setInterval(tick, intervaloMs);
}

module.exports = { iniciarJob, procesarOrdenesListas, obtenerOrdenesParaEntregar };
