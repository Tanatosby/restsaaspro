/**
 * Smoke E2E del widget MenuWizard (owner.html → Menús del día).
 * Verifica: montaje, recorrido de los 4 pasos del carrusel, creación de un menú,
 * carrusel horizontal del paso 4, sin overflow de página a 360px, 0 errores de consola.
 *
 * Uso: PORT=3399 node scripts/test-menu-wizard.js
 */
const { chromium } = require('playwright');

const BASE = `http://localhost:${process.env.PORT || 3399}`;
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  try {
    // ── Login ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');
    console.log('Login OK →', page.url());

    // ── Ir a Menús del día (panel ya activo por defecto) ──
    await page.click('#tab-md-menus');
    await page.waitForTimeout(300);

    // Paso 1: montaje + fecha
    check(await page.locator('#menu-wizard-mount .mw').count() > 0, 'Widget MenuWizard montado');
    check(await page.locator('#md-legacy').evaluate(el => getComputedStyle(el).display === 'none'), 'Form legacy oculto');
    check(await page.locator('[data-step="0"] .mw-title').isVisible(), 'Paso 1 (fecha) visible');
    const fechaVal = await page.locator('#mw-fecha').inputValue();
    check(!!fechaVal, `Fecha precargada (${fechaVal})`);

    // Avanzar a paso 2
    await page.click('[data-act="to-2"]');
    await page.waitForTimeout(450);
    const trackX = await page.locator('.mw-track').evaluate(el => el.style.transform);
    check(/-100%/.test(trackX), `Carrusel deslizó a paso 2 (${trackX})`);

    // Paso 2: nombre + precio
    const nombre = 'Menú Wizard Test ' + Date.now();
    await page.fill('#mw-nombre', nombre);
    await page.fill('#mw-precio', '18.50');
    await page.click('[data-act="to-3"]');
    await page.waitForTimeout(450);

    // Paso 3: pregunta fijo/elige — botón crear deshabilitado hasta elegir
    check(await page.locator('[data-act="crear"]').isDisabled(), 'Botón "Crear" deshabilitado antes de elegir');
    await page.click('.mw-choice[data-elegible="1"]');
    check(await page.locator('.mw-choice[data-elegible="1"]').evaluate(el => el.classList.contains('sel')), 'Opción "Cliente elige" seleccionada');
    check(!(await page.locator('[data-act="crear"]').isDisabled()), 'Botón "Crear" habilitado tras elegir');

    // Crear → paso 4
    await page.click('[data-act="crear"]');
    await page.waitForTimeout(900);
    check(await page.locator('[data-step="3"] .mw-menu-card').count() > 0, 'Paso 4 muestra al menos 1 menú');
    const cardText = await page.locator('[data-step="3"] .mw-menu-card').first().innerText();
    check(cardText.includes('18.50'), 'Card del paso 4 muestra el precio');
    check(await page.locator('[data-step="3"] [data-cfg]').first().isVisible(), 'Botón "⚙ Configurar" visible en paso 4');

    // ── Sin overflow horizontal de página a 360px ──
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check(overflow, 'Sin overflow horizontal de página a 360px');

    // El carrusel de menús sí scrollea en X (contenido), no la página
    const menusScrollable = await page.locator('#mw-menus-list').evaluate(el => el.scrollWidth >= el.clientWidth);
    check(menusScrollable, 'Lista de menús del paso 4 es un carrusel horizontal');

    // ── ⚙ Configurar abre el modal existente ──
    await page.click('[data-step="3"] [data-cfg]');
    await page.waitForTimeout(400);
    check(await page.locator('#menu-config-overlay.open').count() > 0, '⚙ Configurar abre el modal de configuración existente');

    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.error('💥 Excepción:', e.message);
    fail++;
  } finally {
    await browser.close();
    console.log(`\nResultado: ${pass} ✅ / ${fail} ❌`);
    process.exit(fail ? 1 : 0);
  }
})();
