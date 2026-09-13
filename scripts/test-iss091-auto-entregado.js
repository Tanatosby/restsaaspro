/**
 * ISS-091 — Auto-entregado: "Listos" se vacía sola.
 *
 *  A. Marcar un pedido como "Listo" registra `listo_at` — antes no se guardaba
 *     cuándo había quedado listo, sólo cuándo se creó el pedido.
 *  B. El job mueve a "Por cobrar" las órdenes que cumplieron su tiempo y deja
 *     las que no.
 *  C. Las RESERVAS quedan fuera: siguen esperando el toque de la dueña.
 *  D. "↩️ Regresar a cocina" aparece también en "Por cobrar" (la ventana para
 *     deshacer un "Listo" tocado por error ya no se cierra sola).
 *  E. Volver a cocina y salir de nuevo reinicia el reloj.
 *  F. Configuración: el endpoint valida y 0 apaga el automatismo.
 *  G. El poll de la cola quedó en 20 s.
 *
 * Uso: PORT=3399 node scripts/test-iss091-auto-entregado.js
 */
const { chromium } = require('playwright');
const Database = require('better-sqlite3');
const { procesarOrdenesListas } = require('../utils/autoEntregado');

const BASE  = `http://localhost:${process.env.PORT || 3399}`;
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

const db = new Database('database.sqlite');
const creadas = [];
let idReserva = null;
const minutosOriginal = db.prepare('SELECT minutos_auto_entregado FROM restaurantes WHERE id = 1').get()?.minutos_auto_entregado;

const estatusDe = id => db.prepare(`
  SELECT eo.nombre FROM ordenes o JOIN estatus_orden eo ON o.id_estatus = eo.id WHERE o.id = ?
`).get(id)?.nombre;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (/\/uploads\//.test(url) && /Failed to load resource/.test(m.text())) return;
    errors.push(m.text());
  });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    const modalTerminos = page.locator('#modal-terminos');
    if (await modalTerminos.isVisible().catch(() => false)) {
      await page.check('#terminos-check');
      await page.click('#terminos-btn');
      await page.waitForTimeout(600);
    }
    const nov = page.locator('.nov-btn-cerrar');
    if (await nov.count() > 0) { await nov.click().catch(() => {}); await page.waitForTimeout(300); }

    async function crearPedido(nombre, mesa = '61') {
      const r = await page.evaluate(async ([mesa, nombre]) => {
        const res = await fetch('/api/public/orders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_restaurante: 1, mesa, nombre_cliente: nombre,
            carta_items: [{ id_plato_carta: 1, cantidad: 1 }] }),
        });
        return (await res.json()).id_orden;
      }, [mesa, nombre]);
      creadas.push(r);
      return r;
    }
    const marcarListo = (id) => page.evaluate(async (oid) => {
      const r = await fetch(`/api/orders/${oid}/estatus`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: 'es_listo' }),
      });
      return r.status;
    }, id);

    // ── A. marcar "Listo" registra listo_at ──
    console.log('\n── A. Marcar "Listo" registra la hora ──');
    const a1 = await crearPedido('ISS091 Listo');
    check(db.prepare('SELECT listo_at FROM ordenes WHERE id = ?').get(a1).listo_at === null,
      'Al crearse, el pedido no tiene listo_at');
    check(await marcarListo(a1) === 200, 'Se marca como Listo');
    const listoAt = db.prepare('SELECT listo_at FROM ordenes WHERE id = ?').get(a1).listo_at;
    check(!!listoAt, `Quedó registrado el momento en que estuvo listo (${listoAt})`);

    // ── B. el job mueve lo que cumplió el tiempo ──
    console.log('\n── B. El job mueve lo que cumplió su tiempo ──');
    db.prepare('UPDATE restaurantes SET minutos_auto_entregado = 3 WHERE id = 1').run();
    const a2 = await crearPedido('ISS091 Reciente');
    await marcarListo(a2);

    // El primero lleva 10 minutos listo; el segundo, recién
    db.prepare(`UPDATE ordenes SET listo_at = datetime('now','-10 minutes') WHERE id = ?`).run(a1);

    const movidas = procesarOrdenesListas(db);
    check(movidas === 1, `El job movió 1 pedido (real: ${movidas})`);
    check(estatusDe(a1) === 'entregado', `El de 10 min pasó a "Por cobrar" (real: ${estatusDe(a1)})`);
    check(estatusDe(a2) === 'entregando', `El recién listo se quedó en "Listos" (real: ${estatusDe(a2)})`);

    // ── C. las reservas quedan fuera ──
    console.log('\n── C. Las reservas quedan fuera ──');
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const estListoRes = db.prepare('SELECT id FROM estatus_reserva WHERE es_listo = 1').get().id;
    idReserva = db.prepare(`
      INSERT INTO reservas (codigo, nombre_cliente, fecha, mesa, id_restaurante, id_estatus, modalidad, created_at)
      VALUES ('ISS091R', 'ISS091 Reserva', ?, '61', 1, ?, 'en_local', datetime('now','-120 minutes'))
    `).run(hoy, estListoRes).lastInsertRowid;

    procesarOrdenesListas(db);
    const estadoReserva = db.prepare(`
      SELECT er.nombre FROM reservas r JOIN estatus_reserva er ON r.id_estatus = er.id WHERE r.id = ?
    `).get(idReserva).nombre;
    check(estadoReserva !== 'entregado' && estadoReserva !== 'completada',
      `La reserva (2 h lista) sigue esperando confirmación humana (${estadoReserva})`);

    // ── D. "Regresar a cocina" también en Por cobrar ──
    console.log('\n── D. "Regresar a cocina" acompaña al pedido ──');
    const D = await page.evaluate(() => ({
      listos: btnOrden({ id: 1, es_listo: 1, modalidad: 'en_local' }, 'listos'),
      cobrar: btnOrden({ id: 1, es_entregado: 1, modalidad: 'en_local' }, 'cobrar'),
    }));
    check(D.listos.includes('Regresar a cocina'), 'Sigue estando en "Listos" (ISS-055)');
    check(D.cobrar.includes('Regresar a cocina'),
      'Y ahora también en "Por cobrar" — el pedido llega solo, el botón lo sigue');
    check(D.cobrar.includes('💰 Cobrar'), 'Sin perder el botón de cobrar');

    // ── E. volver a cocina reinicia el reloj ──
    console.log('\n── E. Volver a cocina reinicia el reloj ──');
    const e1 = await crearPedido('ISS091 Reinicio');
    await marcarListo(e1);
    db.prepare(`UPDATE ordenes SET listo_at = datetime('now','-30 minutes') WHERE id = ?`).run(e1);
    await page.evaluate(async (oid) => {
      await fetch(`/api/orders/${oid}/estatus`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag: 'es_en_cocina' }),
      });
    }, e1);
    await marcarListo(e1);
    const movidasTrasReinicio = procesarOrdenesListas(db);
    check(estatusDe(e1) === 'entregando',
      `Tras volver a cocina y salir, arranca de cero y no se lo lleva el job (real: ${estatusDe(e1)}, movidas: ${movidasTrasReinicio})`);

    // ── G. poll a 20 s (antes de F: esa sección provoca 400/404 a propósito) ──
    console.log('\n── G. El poll de la cola ──');
    const poll = await page.evaluate(() => POLL_COLA_MS);
    check(poll === 20000, `La cola se refresca cada 20 s (real: ${poll / 1000} s)`);
    const sub = await page.evaluate(() =>
      document.querySelector('#panel-pedidos .sec-sub')?.textContent || '');
    check(sub.includes('20 s'), `Y el texto del panel de la Cola lo dice: "${sub}"`);

    check(errors.length === 0,
      'Sin errores de consola/página' + (errors.length ? ' → ' + errors.join(' | ') : ''));

    // ── F. configuración ──
    console.log('\n── F. Configuración del umbral ──');
    const guardar = (v) => page.evaluate(async (val) => {
      const r = await fetch('/api/menu/config/minutos-auto-entregado', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutos_auto_entregado: val }),
      });
      return r.status;
    }, v);
    check(await guardar(10) === 200, 'Guarda un valor válido (10)');
    check(db.prepare('SELECT minutos_auto_entregado FROM restaurantes WHERE id = 1').get().minutos_auto_entregado === 10,
      'Quedó guardado en el restaurante');
    check(await guardar(-1) === 400, 'Rechaza un negativo');
    check(await guardar(999) === 400, 'Rechaza un valor fuera de rango');

    check(await guardar(0) === 200, 'Acepta 0 (apagar)');
    const f1 = await crearPedido('ISS091 Apagado');
    await marcarListo(f1);
    db.prepare(`UPDATE ordenes SET listo_at = datetime('now','-90 minutes') WHERE id = ?`).run(f1);
    procesarOrdenesListas(db);
    check(estatusDe(f1) === 'entregando',
      `Con 0, un pedido de 90 min sigue en "Listos" (real: ${estatusDe(f1)})`);

    const cfg = await page.evaluate(async () =>
      (await (await fetch('/api/menu/restaurante/config', { credentials: 'same-origin' })).json()));
    check(cfg.minutos_auto_entregado === 0, `La configuración lo expone (${cfg.minutos_auto_entregado})`);

    // El panel de Configuración lo pinta en su input
    await page.evaluate(() => showPanel('configuracion'));
    await page.waitForTimeout(1500);
    const valorInput = await page.inputValue('#cfg-minutos-auto-entregado');
    check(valorInput === '0', `El panel muestra el valor guardado (input: "${valorInput}")`);

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    db.prepare('UPDATE restaurantes SET minutos_auto_entregado = ? WHERE id = 1')
      .run(minutosOriginal ?? 3);
    if (idReserva) db.prepare('DELETE FROM reservas WHERE id = ?').run(idReserva);
    for (const id of creadas) {
      db.prepare('DELETE FROM orden_carta_items WHERE id_orden = ?').run(id);
      db.prepare('DELETE FROM orden_menu_items  WHERE id_orden = ?').run(id);
      db.prepare('DELETE FROM ordenes WHERE id = ?').run(id);
    }
    console.log(`\n(${creadas.length} pedidos y 1 reserva de prueba eliminados; umbral restaurado a ${minutosOriginal ?? 3})`);
    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
