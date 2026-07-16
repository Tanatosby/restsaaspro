// utils/recordatorioMenu.js
// Job que revisa restaurantes activos sin menú del día configurado para hoy
// y les envía un recordatorio push, repitiendo cada 8 horas mientras siga
// sin configurarse (Gap 21 — visto en el piloto #1, ver pilotos.md).

const { enviarPushRestaurante } = require('./pushNotificaciones');
const { fechaLima } = require('./fecha');

const OCHO_HORAS_MS = 8 * 60 * 60 * 1000;

/**
 * true si corresponde (re)enviar el recordatorio: nunca se envió, o ya
 * pasaron al menos 8 horas desde el último envío. `ultimoEnvio` es el string
 * ISO guardado en `restaurantes.ultimo_recordatorio_menu` (o null/undefined).
 * `ahora` es inyectable para tests.
 */
function yaPasaron8Horas(ultimoEnvio, ahora = new Date()) {
  if (!ultimoEnvio) return true;
  const desde = new Date(ultimoEnvio);
  return (ahora.getTime() - desde.getTime()) >= OCHO_HORAS_MS;
}

/**
 * Restaurantes activos que, para la fecha dada (Lima, hoy por defecto), no
 * tienen ningún menú del día activo configurado.
 */
function restaurantesSinMenuHoy(db, fecha = fechaLima()) {
  return db.prepare(`
    SELECT r.id, r.ultimo_recordatorio_menu
    FROM restaurantes r
    WHERE r.activo = 1
      AND NOT EXISTS (
        SELECT 1 FROM menus_dia md
        WHERE md.id_restaurante = r.id AND md.dia = ? AND md.activo = 1
      )
  `).all(fecha);
}

/**
 * Un tick del job: por cada restaurante sin menú de hoy y con 8h+ desde el
 * último aviso (o ninguno todavía), envía push y actualiza el timestamp.
 * Retorna la cantidad de recordatorios enviados. Sin wpush no hace nada
 * (nada que intentar, y no queremos marcar el timestamp sin haber avisado).
 */
function procesarRecordatoriosMenu(db, wpush, ahora = new Date()) {
  if (!wpush) return 0;

  const candidatos = restaurantesSinMenuHoy(db);
  if (!candidatos.length) return 0;

  const upd = db.prepare(`UPDATE restaurantes SET ultimo_recordatorio_menu = ? WHERE id = ?`);
  let enviados = 0;

  for (const r of candidatos) {
    if (!yaPasaron8Horas(r.ultimo_recordatorio_menu, ahora)) continue;

    enviarPushRestaurante(db, r.id, {
      title: '🍽 No olvides configurar tu menú',
      body:  'Todavía no configuraste el menú del día de hoy.',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    }, wpush);

    upd.run(ahora.toISOString(), r.id);
    enviados++;
  }

  return enviados;
}

/**
 * Inicia el job periódico (cada 30 min por defecto). Devuelve el intervalId
 * para poder detenerlo (útil en tests). webpush es el módulo real; en tests
 * se inyecta un mock.
 */
function iniciarJob(db, webpush, intervaloMs = 30 * 60 * 1000) {
  function tick() {
    try {
      procesarRecordatoriosMenu(db, webpush);
    } catch (err) {
      console.error('[RecordatorioMenu] Error en job:', err.message);
    }
  }

  tick(); // ejecutar de inmediato al arrancar
  return setInterval(tick, intervaloMs);
}

module.exports = { iniciarJob, procesarRecordatoriosMenu, restaurantesSinMenuHoy, yaPasaron8Horas };
