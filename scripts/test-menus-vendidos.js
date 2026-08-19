/**
 * E2E del fix de conteo de "Menús pedidos"/"Menús reservados" + la tarjeta
 * nueva "Menús de hoy" (panel Reportes → Análisis).
 *
 * El bug real (backlog.md, día 4 del piloto): el conteo dividía por el TOTAL
 * de secciones del menú (obligatorias + opcionales) en vez de por las
 * obligatorias — con secciones opcionales sin pedir, subcontaba. Este script
 * arma un menú con 2 secciones obligatorias + 1 opcional, crea 3 pedidos que
 * solo piden las obligatorias (nunca la opcional) y verifica que el conteo dé
 * el número real de menús (3), no lo que daba la fórmula vieja (2, por
 * redondeo de 3×2/3).
 *
 * Uso: PORT=3399 node app.js &   (servidor ya debe estar corriendo)
 *      node scripts/test-menus-vendidos.js
 */
const { chromium } = require('playwright');
const db = require('../config/database');

const BASE  = `http://localhost:${process.env.PORT || 3399}`;
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

function todayLima() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

(async () => {
  const browser = await chromium.launch();
  const ctx  = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  let idSeccionA, idSeccionB, idSeccionOpc, idPlatoA, idPlatoB, idPlatoOpc, idMenu;
  const idsOrdenes = [];

  try {
    // ── Login ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');
    console.log('Login OK →', page.url());

    // ── Fixture: menú con 2 obligatorias + 1 opcional (el caso que exponía el bug) ──
    console.log('\n── Preparando el menú de prueba (2 obligatorias + 1 opcional) ──');
    const hoy = todayLima();
    idSeccionA   = await page.evaluate(() => api('POST', '/api/menu/secciones', { nombre: 'MVTestEntrada' })).then(r => r.id);
    idSeccionB   = await page.evaluate(() => api('POST', '/api/menu/secciones', { nombre: 'MVTestSegundo' })).then(r => r.id);
    idSeccionOpc = await page.evaluate(() => api('POST', '/api/menu/secciones', { nombre: 'MVTestPostre' })).then(r => r.id);
    idPlatoA     = await page.evaluate(() => api('POST', '/api/menu/platos-menu', { nombre: 'MVTestPlatoEntrada' })).then(r => r.id);
    idPlatoB     = await page.evaluate(() => api('POST', '/api/menu/platos-menu', { nombre: 'MVTestPlatoSegundo' })).then(r => r.id);
    idPlatoOpc   = await page.evaluate(() => api('POST', '/api/menu/platos-menu', { nombre: 'MVTestPlatoPostre' })).then(r => r.id);
    idMenu = await page.evaluate((dia) => api('POST', '/api/menu/menus-dia', {
      nombre: 'MVTest Menú', elegible: 1, dia, precio: 18,
    }), hoy).then(r => r.id);

    await page.evaluate(({ idMenu, idSeccionA }) => api('POST', `/api/menu/menus-dia/${idMenu}/secciones`, { id_seccion_menu: idSeccionA, requerido: true }), { idMenu, idSeccionA });
    await page.evaluate(({ idMenu, idSeccionB }) => api('POST', `/api/menu/menus-dia/${idMenu}/secciones`, { id_seccion_menu: idSeccionB, requerido: true }), { idMenu, idSeccionB });
    await page.evaluate(({ idMenu, idSeccionOpc }) => api('POST', `/api/menu/menus-dia/${idMenu}/secciones`, { id_seccion_menu: idSeccionOpc, requerido: false }), { idMenu, idSeccionOpc });

    const idComponenteA = await page.evaluate(({ idMenu, idSeccionA, idPlatoA }) =>
      api('POST', `/api/menu/menus-dia/${idMenu}/secciones/${idSeccionA}/platos`, { id_plato_menu: idPlatoA }),
      { idMenu, idSeccionA, idPlatoA }).then(r => r.id);
    const idComponenteB = await page.evaluate(({ idMenu, idSeccionB, idPlatoB }) =>
      api('POST', `/api/menu/menus-dia/${idMenu}/secciones/${idSeccionB}/platos`, { id_plato_menu: idPlatoB }),
      { idMenu, idSeccionB, idPlatoB }).then(r => r.id);
    check(!!(idComponenteA && idComponenteB), 'Fixture creado: menú con 2 obligatorias + 1 opcional (nunca pedida)');

    // ── Baseline: kpis ANTES de crear los pedidos de prueba ──
    const kpisAntes = await page.evaluate(() => api('GET', '/api/reportes/kpis'));

    // ── 3 pedidos, cada uno solo con las 2 secciones OBLIGATORIAS (sin postre) ──
    console.log('\n── Creando 3 pedidos, cada uno = 1 menú completo (sin la sección opcional) ──');
    for (let n = 1; n <= 3; n++) {
      const { id_orden } = await page.evaluate(({ idMenu, idComponenteA, idComponenteB, n }) =>
        api('POST', '/api/orders', {
          mesa: n, nombre_cliente: `MenusVendidosTest ${n}`,
          menu_items: [
            { id_componente: idComponenteA, id_menu_dia: idMenu, cantidad: 1, grupo: 1 },
            { id_componente: idComponenteB, id_menu_dia: idMenu, cantidad: 1, grupo: 1 },
          ],
        }), { idMenu, idComponenteA, idComponenteB, n });
      idsOrdenes.push(id_orden);
    }
    check(idsOrdenes.length === 3 && idsOrdenes.every(Boolean), '3 pedidos creados correctamente');

    // Pedido 1 → pagado, Pedido 2 → entregado, Pedido 3 → se queda pendiente
    // (no debe contar en "Menús de hoy", que solo cuenta cobrado/entregado)
    await page.evaluate((id) => api('PATCH', `/api/orders/${id}/estatus`, { flag: 'es_pagado' }), idsOrdenes[0]);
    await page.evaluate((id) => api('PATCH', `/api/orders/${id}/estatus`, { flag: 'es_entregado' }), idsOrdenes[1]);

    // ── El conteo corregido ──
    console.log('\n── Verificando /api/reportes/kpis ──');
    const kpisDespues = await page.evaluate(() => api('GET', '/api/reportes/kpis'));
    const deltaPedidos = kpisDespues.menus_pedidos - kpisAntes.menus_pedidos;
    const deltaHoy      = kpisDespues.menus_hoy      - kpisAntes.menus_hoy;

    check(deltaPedidos === 3, `menus_pedidos sube en 3 (uno por pedido) — subió ${deltaPedidos}`);

    // La fórmula vieja (dividir por el TOTAL de secciones, 3, en vez de las
    // obligatorias, 2) habría dado Math.round(3 × 2/3) = Math.round(2) = 2,
    // no 3 — undercounting real que motivó el fix.
    const totalDeSecciones = 3; // 2 obligatorias + 1 opcional
    const conteoConBugViejo = Math.round(3 * (2 / totalDeSecciones));
    check(conteoConBugViejo === 2 && deltaPedidos !== conteoConBugViejo,
      `La fórmula vieja habría dado ${conteoConBugViejo} (subcontado) — la corregida da ${deltaPedidos}`);

    check(deltaHoy === 2, `menus_hoy solo cuenta pagado+entregado (2 de los 3, el pendiente no cuenta) — subió ${deltaHoy}`);

    // ── La tarjeta en la UI ──
    console.log('\n── Verificando la tarjeta "Menús de hoy" en Reportes ──');
    await page.evaluate(() => { showPanel('reportes'); loadReportes(); });
    await page.waitForTimeout(500);
    // .stat-label tiene text-transform:uppercase por CSS — innerText() refleja
    // el texto RENDERIZADO (mayúsculas), no el HTML crudo. Comparar case-insensitive.
    const cards = await page.locator('#stats-reportes .stat-card').allInnerTexts();
    check(cards.length > 0 && /menús de hoy/i.test(cards[0]), `"Menús de hoy" es la primera tarjeta (${cards[0]?.split('\n')[0]})`);
    check(cards.some(c => /menús pedidos/i.test(c)), 'La tarjeta "Menús pedidos" sigue presente');
    check(cards.some(c => /menús reservados/i.test(c)), 'La tarjeta "Menús reservados" sigue presente');

    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    // ── Limpieza ──
    if (idsOrdenes.length) {
      const ph = idsOrdenes.map(() => '?').join(',');
      db.prepare(`DELETE FROM orden_menu_items WHERE id_orden IN (${ph})`).run(...idsOrdenes);
      db.prepare(`DELETE FROM ordenes WHERE id IN (${ph})`).run(...idsOrdenes);
    }
    if (idMenu) {
      db.prepare(`DELETE FROM componentes_menu_dia WHERE id_menu_dia = ?`).run(idMenu);
      db.prepare(`DELETE FROM menu_secciones WHERE id_menu_dia = ?`).run(idMenu);
      db.prepare(`DELETE FROM menus_dia WHERE id = ?`).run(idMenu);
    }
    [idPlatoA, idPlatoB, idPlatoOpc].filter(Boolean).forEach(id => db.prepare(`DELETE FROM platos_menu WHERE id = ?`).run(id));
    [idSeccionA, idSeccionB, idSeccionOpc].filter(Boolean).forEach(id => db.prepare(`DELETE FROM secciones_menu WHERE id = ?`).run(id));
    console.log('\n(fixture y pedidos de prueba limpiados de la BD)');

    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
