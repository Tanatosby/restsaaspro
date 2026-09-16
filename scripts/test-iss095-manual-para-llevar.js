/**
 * E2E de ISS-095 — "Agregar manual" ahora puede marcar el pedido para llevar.
 *
 * Antes, POST /api/orders (la ruta que usa "+ Agregar manual") no aceptaba
 * ningún campo de modalidad: todo pedido manual quedaba "en el local" sin
 * excepción, y nunca se cobraba el envase aunque el mozo tomara un pedido
 * para llevar por teléfono o de palabra. Diagnóstico + mockup en
 * issues/ISS-095-manual-para-llevar-mockups.html.
 *
 * Cubre:
 *   - El toggle de modalidad solo aparece si el restaurante tiene
 *     "para llevar" activo (mismo criterio que menu.html/ISS-047).
 *   - Por defecto arranca en "🍽 Comer aquí".
 *   - Al elegir "🥡 Para llevar" aparece el aviso del cargo por envase.
 *   - El pedido se guarda con la modalidad correcta y cobra el tapper
 *     (mismo cálculo que ISS-029, movido a utils/modalidadPedido.js).
 *   - La Cola del día pinta el badge "🥡 Para llevar" igual que un pedido
 *     por QR — sin cambios en pedidos.js/cocina.js.
 *   - El backend rechaza 'para_llevar' si el restaurante no lo tiene activo,
 *     y cualquier modalidad que no sea 'en_local'/'para_llevar'.
 *
 * Uso: PORT=3399 node app.js &   (servidor ya debe estar corriendo)
 *      node scripts/test-iss095-manual-para-llevar.js
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

function ordenPrueba(nombre) {
  return db.prepare(`
    SELECT id, mesa, modalidad, cargo_modalidad FROM ordenes
    WHERE nombre_cliente = ? ORDER BY id DESC LIMIT 1
  `).get(nombre);
}

(async () => {
  const browser = await chromium.launch();
  const ctx  = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (/\/uploads\//.test(url) && /Failed to load resource/.test(m.text())) return;
    // Los 2 POST /api/orders de "Validación en el backend" prueban a propósito
    // que el servidor rechace con 400 — el navegador igual loguea el fetch
    // fallido en consola, no es un error de la app.
    if (/api\/orders/.test(url) && /400 \(Bad Request\)/.test(m.text())) return;
    errors.push(m.text());
  });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  let idCategoria, idPlatoCarta, configOriginal = null;

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    const modalTerminos = page.locator('#modal-terminos');
    if (await modalTerminos.isVisible().catch(() => false)) {
      await page.check('#terminos-check');
      await page.click('#terminos-btn');
      await page.waitForTimeout(600);
    }
    const novCerrar = page.locator('.nov-btn-cerrar');
    if (await novCerrar.count() > 0) {
      await novCerrar.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // ── Fixture: un plato de carta de prueba ──
    idCategoria  = await page.evaluate(async () => (await api('POST', '/api/menu/categorias', { nombre: 'TestISS095Categoria' })).id);
    idPlatoCarta = await page.evaluate(async (id_categoria) =>
      (await api('POST', '/api/menu/platos-carta', { nombre: 'TestISS095Carta', precio: 10, id_categoria })).id,
      idCategoria);
    check(!!(idCategoria && idPlatoCarta), 'Fixture de carta creado (categoría + plato)');

    configOriginal = await page.evaluate(() => api('GET', '/api/menu/restaurante/config'));

    async function setModalidades({ paraLlevar, costoTapper }) {
      await page.evaluate(async (cfg) => {
        await api('PATCH', '/api/menu/config/modalidades', cfg);
      }, {
        para_llevar_activo: paraLlevar, delivery_activo: !!configOriginal.delivery_activo,
        costo_tapper: costoTapper, tarifa_delivery: configOriginal.tarifa_delivery ?? 0,
      });
    }

    async function abrirModal() {
      await page.evaluate(() => { showPanel('pedidos'); });
      await page.waitForTimeout(300);
      await page.click('button:has-text("+ Agregar manual")');
      await page.waitForFunction(() => document.getElementById('modal-agregar-manual').style.display === 'flex');
      await page.waitForSelector(`.manual-carta-item[data-plato="${idPlatoCarta}"]`, { timeout: 5000 });
    }

    // ── Rama A: restaurante SIN "para llevar" activo ──
    console.log('\n── Restaurante sin "para llevar" activo ──');
    await setModalidades({ paraLlevar: false, costoTapper: 1.5 });
    await abrirModal();
    check(await page.locator('#manual-modalidad-field').isVisible() === false,
      'El toggle de modalidad no aparece si el restaurante no tiene "para llevar" activo');

    await page.fill('#manual-nombre', 'ISS095Test SinPL');
    await page.click(`.manual-carta-item[data-plato="${idPlatoCarta}"] button:has-text("+")`);
    await page.click('#manual-btn-enviar');
    await page.waitForTimeout(500);

    const ordenSinPL = ordenPrueba('ISS095Test SinPL');
    check(!!ordenSinPL, 'La orden se creó en la BD');
    check(ordenSinPL?.modalidad === 'en_local', `Sin el toggle, queda 'en_local' (${ordenSinPL?.modalidad})`);
    check(Number(ordenSinPL?.cargo_modalidad) === 0, `Sin cargo por envase (S/ ${ordenSinPL?.cargo_modalidad})`);

    // ── Rama B: restaurante CON "para llevar" activo ──
    console.log('\n── Restaurante con "para llevar" activo, S/1.50 por envase ──');
    await setModalidades({ paraLlevar: true, costoTapper: 1.5 });
    await abrirModal();
    check(await page.locator('#manual-modalidad-field').isVisible(),
      'El toggle de modalidad aparece con "para llevar" activo');
    check((await page.locator('#manual-mod-local').getAttribute('style') || '').includes('var(--accent)'),
      'Arranca en "🍽 Comer aquí" (botón marcado)');
    check(await page.locator('#manual-mod-cargo').isVisible() === false,
      'El aviso de cargo no se ve todavía en "Comer aquí"');

    await page.click('#manual-mod-llevar');
    await page.waitForTimeout(150);
    check((await page.locator('#manual-mod-llevar').getAttribute('style') || '').includes('var(--accent)'),
      'Al tocar "🥡 Para llevar" pasa a ser el elegido');
    const cargoTxt = await page.locator('#manual-mod-cargo').textContent();
    check(/S\/\s*1\.50/.test(cargoTxt || ''), `Muestra el cargo por envase ("${cargoTxt}")`);

    await page.fill('#manual-nombre', 'ISS095Test ConPL');
    await page.click(`.manual-carta-item[data-plato="${idPlatoCarta}"] button:has-text("+")`);
    await page.click('#manual-btn-enviar');
    await page.waitForTimeout(500);

    const ordenConPL = ordenPrueba('ISS095Test ConPL');
    check(!!ordenConPL, 'La orden se creó en la BD');
    check(ordenConPL?.modalidad === 'para_llevar', `Queda 'para_llevar' (${ordenConPL?.modalidad})`);
    check(Number(ordenConPL?.cargo_modalidad) === 1.5, `Cobra S/ 1.50 de envase (S/ ${ordenConPL?.cargo_modalidad})`);

    const itemCarta = db.prepare(`
      SELECT modalidad FROM orden_carta_items WHERE id_orden = ? AND id_plato_carta = ?
    `).get(ordenConPL?.id, idPlatoCarta);
    check(itemCarta?.modalidad === 'para_llevar', `El ítem de carta también queda 'para_llevar' (${itemCarta?.modalidad})`);

    // ── La cocina ve el mismo badge que un pedido por QR ──
    console.log('\n── Lo que ve la cocina ──');
    await page.click('.tab[data-zona="cocina"]');
    await page.waitForTimeout(300);
    const cardTxt = await page.locator('.cola-card', { hasText: 'ISS095Test ConPL' }).innerText();
    check(cardTxt.includes('Para llevar'), 'La tarjeta en Cocina muestra "🥡 Para llevar"');
    check(cardTxt.includes('Pedido manual'), 'Sigue mostrando "Pedido manual" — los dos badges conviven');

    // ── El backend valida, no solo la UI ──
    console.log('\n── Validación en el backend ──');
    await setModalidades({ paraLlevar: false, costoTapper: 1.5 });
    const rechazado = await page.evaluate(async (idPlatoCarta) => {
      try {
        await api('POST', '/api/orders', {
          manual: true, modalidad: 'para_llevar',
          carta_items: [{ id_plato_carta: idPlatoCarta, cantidad: 1 }],
        });
        return null;
      } catch (e) { return e.message; }
    }, idPlatoCarta);
    check(/para llevar/i.test(rechazado || ''), `Rechaza 'para_llevar' si el restaurante no lo tiene activo ("${rechazado}")`);

    const modalidadInvalida = await page.evaluate(async (idPlatoCarta) => {
      try {
        await api('POST', '/api/orders', {
          manual: true, modalidad: 'delivery',
          carta_items: [{ id_plato_carta: idPlatoCarta, cantidad: 1 }],
        });
        return null;
      } catch (e) { return e.message; }
    }, idPlatoCarta);
    check(/modalidad inválida/i.test(modalidadInvalida || ''), `Rechaza una modalidad que no sea en_local/para_llevar ("${modalidadInvalida}")`);

    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    try {
      if (configOriginal) {
        await page.evaluate((cfg) => api('PATCH', '/api/menu/config/modalidades', {
          para_llevar_activo: cfg.para_llevar_activo, delivery_activo: cfg.delivery_activo,
          costo_tapper: cfg.costo_tapper, tarifa_delivery: cfg.tarifa_delivery,
        }), configOriginal);
      }
    } catch (_) {}

    db.prepare(`DELETE FROM orden_carta_items WHERE id_orden IN (SELECT id FROM ordenes WHERE nombre_cliente LIKE 'ISS095Test%')`).run();
    db.prepare(`DELETE FROM ordenes WHERE nombre_cliente LIKE 'ISS095Test%'`).run();
    if (idPlatoCarta) db.prepare(`DELETE FROM platos_carta WHERE id = ?`).run(idPlatoCarta);
    if (idCategoria)  db.prepare(`DELETE FROM categorias_carta WHERE id = ?`).run(idCategoria);

    console.log(`\n(fixture y órdenes de prueba limpiados de la BD)\n`);
    console.log(`${pass}/${pass + fail} verificaciones OK`);
    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
  }
})();
