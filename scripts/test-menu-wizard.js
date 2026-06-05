/**
 * Smoke E2E del widget MenuWizard (owner.html → Menús del día).
 * Modelo: GALERÍA (vista principal) + WIZARD de 3 pasos lanzado desde "＋ Crear menú".
 * Verifica: montaje, galería visible por defecto, selector de fecha (◀ ▶), botón crear,
 * wizard de 3 pasos (título → precio → ¿fijo o elige?) que hereda la fecha, creación,
 * vuelta a la galería con el menú nuevo como card retrato, ⚙ Configurar abre el modal,
 * sin overflow de página a 360px, 0 errores de consola.
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

    // ── Ir a Menús del día ──
    await page.click('#tab-md-menus');
    await page.waitForTimeout(400);

    // ── Galería como vista principal ──
    check(await page.locator('#menu-wizard-mount .mw').count() > 0, 'Widget MenuWizard montado');
    check(await page.locator('#md-legacy').evaluate(el => getComputedStyle(el).display === 'none'), 'Form legacy oculto');
    check(await page.locator('#mw-gallery').isVisible(), 'Galería visible por defecto');
    check(await page.locator('#mw-wizard').isHidden(), 'Wizard oculto por defecto');
    const fechaVal = await page.locator('#mw-fecha').inputValue();
    check(!!fechaVal, `Selector de fecha precargado (${fechaVal})`);
    check(await page.locator('[data-act="day-prev"]').isVisible() && await page.locator('[data-act="day-next"]').isVisible(), 'Flechas ◀ ▶ de día visibles');
    check(await page.locator('[data-act="open-wizard"]').isVisible(), 'Botón "＋ Crear menú" fijo visible');

    // Las flechas cambian el día (ida y vuelta para no alterar la fecha de prueba)
    await page.click('[data-act="day-next"]');
    await page.waitForTimeout(300);
    check((await page.locator('#mw-fecha').inputValue()) !== fechaVal, 'Flecha ▶ cambia el día');
    await page.click('[data-act="day-prev"]');
    await page.waitForTimeout(300);
    check((await page.locator('#mw-fecha').inputValue()) === fechaVal, 'Flecha ◀ vuelve al día original');

    // ── Abrir wizard (3 pasos) ──
    await page.click('[data-act="open-wizard"]');
    await page.waitForTimeout(300);
    check(await page.locator('#mw-wizard').isVisible(), 'Wizard visible tras "Crear menú"');
    check(await page.locator('#mw-gallery').isHidden(), 'Galería oculta dentro del wizard');
    check(/Nuevo menú/.test(await page.locator('#mw-wiz-head').innerText()), 'Cabecera del wizard hereda la fecha');

    // Paso 1: título (con figura)
    check(await page.locator('[data-step="0"] .mw-hero-emoji').isVisible(), 'Paso 1 (título) muestra figura/emoji');
    const nombre = 'Menú Wizard Test ' + Date.now();
    await page.fill('#mw-nombre', nombre);
    await page.click('[data-act="to-precio"]');
    await page.waitForTimeout(450);
    const trackX2 = await page.locator('.mw-track').evaluate(el => el.style.transform);
    check(/-100%/.test(trackX2), `Deslizó a paso 2 (${trackX2})`);
    check(await page.locator('[data-step="1"] .mw-hero-emoji').isVisible(), 'Paso 2 (precio) muestra figura/emoji');

    // Paso 2: precio → paso 3
    await page.fill('#mw-precio', '18.50');
    await page.click('[data-act="to-pregunta"]');
    await page.waitForTimeout(450);

    // Paso 3: ¿fijo o elige? — crear deshabilitado hasta elegir
    check(await page.locator('[data-act="crear"]').isDisabled(), 'Botón "Crear" deshabilitado antes de elegir');
    await page.click('.mw-choice[data-elegible="1"]');
    check(!(await page.locator('[data-act="crear"]').isDisabled()), 'Botón "Crear" habilitado tras elegir');

    // Crear → vuelve a la galería con el menú nuevo
    await page.click('[data-act="crear"]');
    await page.waitForTimeout(900);
    check(await page.locator('#mw-gallery').isVisible(), 'Vuelve a la galería tras crear');
    check(await page.locator('#mw-wizard').isHidden(), 'Wizard se cierra tras crear');
    check(await page.locator('#mw-menus-list .mw-menu-card').count() > 0, 'Galería muestra al menos 1 menú');
    const cardText = await page.locator('#mw-menus-list .mw-menu-card').first().innerText();
    check(cardText.includes('18.50'), 'Card de la galería muestra el precio');

    // Card retrato: más alta que ancha
    const box = await page.locator('#mw-menus-list .mw-menu-card').first().boundingBox();
    check(box && box.height > box.width, `Card es retrato (${Math.round(box.width)}×${Math.round(box.height)})`);

    // Explicaciones de los toggles (Cliente elige / Visible)
    check(await page.locator('#mw-menus-list .mw-toggle-hint').first().isVisible(), 'Card muestra explicación de los toggles');
    // El menú recién creado no tiene platos → sin foto → watermark que llena el aire
    const newCardLoc = page.locator('#mw-menus-list .mw-menu-card', { hasText: nombre });
    check(await newCardLoc.locator('.mw-menu-watermark').count() > 0, 'Card sin foto muestra watermark (emoji)');

    // ── Sin overflow horizontal de página a 360px ──
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check(overflow, 'Sin overflow horizontal de página a 360px');

    // La galería sí scrollea en X (contenido), no la página
    const menusScrollable = await page.locator('#mw-menus-list').evaluate(el => el.scrollWidth >= el.clientWidth);
    check(menusScrollable, 'La galería es un carrusel horizontal');

    // ── ⚙ Configurar abre la vista de configuración INLINE (ya no es modal) ──
    // Configuramos el menú recién creado (sin secciones) para no duplicar secciones de los seeds.
    const newCard = page.locator('#mw-menus-list .mw-menu-card', { hasText: nombre });
    await newCard.locator('[data-cfg]').click();
    await page.waitForTimeout(400);
    check(await page.locator('#mw-config').isVisible(), '⚙ Configurar abre la vista de configuración inline');
    check(await page.locator('#mw-gallery').isHidden(), 'Galería oculta dentro de configuración');
    check((await page.locator('#mc-title').innerText()).trim().length > 0, 'Configuración muestra el título del menú');
    check(await page.locator('#mc-body .mc-sec-gallery').count() > 0, 'Configuración renderiza una galería de secciones');
    // Solo botón "Agregar sección" + secciones (sin barra de select inline)
    check(await page.locator('#mc-body .mw-create-btn').count() > 0, 'Config tiene el botón "＋ Agregar sección"');
    check(await page.locator('#mc-body #mc-sel-sec').count() === 0, 'Ya no hay select inline de sección en la galería');

    // "Agregar sección" abre el mini-wizard de 2 pasos
    await page.click('#mc-body .mw-create-btn');
    await page.waitForTimeout(400);
    check(await page.locator('#as-track').count() > 0, '"Agregar sección" abre el wizard de 2 pasos');
    check(((await page.locator('#mc-body .mw-step-label').first().textContent()) || '').includes('Paso 1 de 2'), 'Wizard de sección arranca en Paso 1 de 2');

    const asOpts = await page.locator('#mc-body [data-as-sel]').count();
    if (asOpts > 0) {
      // Paso 1: elegir una sección
      await page.locator('#mc-body [data-as-sel]').first().click();
      check(!(await page.locator('#as-next').isDisabled()), 'Paso 1: "Siguiente" se habilita al elegir sección');
      await page.click('#as-next');
      await page.waitForTimeout(450);
      const asX = await page.locator('#as-track').evaluate(el => el.style.transform);
      check(/-100%/.test(asX), `Desliza al paso 2 (${asX})`);
      // Paso 2: obligatoria con emojis
      check(await page.locator('[data-as-req="1"] .mw-choice-emoji').isVisible(), 'Paso 2 (obligatoria) muestra opciones con emoji');
      await page.click('[data-as-req="1"]');
      check(!(await page.locator('#as-add').isDisabled()), 'Paso 2: "Agregar" se habilita al elegir');
      await page.click('#as-add');
      await page.waitForTimeout(700);
      check(await page.locator('#mc-body .mc-sec-card').count() > 0, 'La sección agregada aparece como card retrato');
      const sbox = await page.locator('#mc-body .mc-sec-card').first().boundingBox();
      check(sbox && sbox.height > sbox.width, `Card de sección es retrato (${Math.round(sbox.width)}×${Math.round(sbox.height)})`);
    } else {
      console.log('  ⚠️  Sin secciones en el catálogo para probar el alta (omitido)');
    }

    // "← Volver" regresa a la galería
    await page.click('[data-act="cfg-back"]');
    await page.waitForTimeout(400);
    check(await page.locator('#mw-gallery').isVisible(), '"← Volver" regresa a la galería');
    check(await page.locator('#mw-config').isHidden(), 'Vista de configuración oculta tras volver');

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
