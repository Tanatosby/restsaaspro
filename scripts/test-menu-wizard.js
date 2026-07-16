/**
 * Smoke E2E del widget MenuWizard (owner.html → Menús del día) — flujo v2.
 * Modelo: GALERÍA + WIZARD de 3 pasos + vista de ARMADO (acordeón vertical).
 * Verifica: montaje, galería, selector de fecha (◀ ▶), wizard de 3 pasos que
 * hereda la fecha, «Crear y agregar platos →» encadena al armado con secciones
 * heredadas, acordeón (colapsar/expandir, badges), picker multi-selección,
 * alta rápida de sección (1 tap), sin hub, sin overflow a 360px, 0 errores.
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
  page.on('console', m => {
    if (m.type() !== 'error') return;
    // Fotos de /uploads pueden faltar en dev (uploads fuera de git) — no es error de la app
    const url = (m.location() && m.location().url) || '';
    if (/\/uploads\//.test(url) && /Failed to load resource/.test(m.text())) return;
    errors.push(m.text());
  });
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
    // Desde el rediseño Home (hubs), las tabs viejas están ocultas (display:none):
    // se navega con las funciones globales showPanel/switchTab.
    await page.evaluate(() => { showPanel('menu-dia'); switchTab('md', 'menus'); });
    await page.waitForTimeout(600);

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
    check(/agregar platos/i.test(await page.locator('[data-act="crear"]').innerText()), 'Botón final dice "Crear y agregar platos →"');

    // ── Crear → encadena DIRECTO a la vista de armado (flujo v2) ──
    await page.click('[data-act="crear"]');
    await page.waitForTimeout(900);
    check(await page.locator('#mw-config').isVisible(), 'Tras crear encadena a la vista de armado (config)');
    check(await page.locator('#mw-wizard').isHidden(), 'Wizard se cierra tras crear');
    check((await page.locator('#mc-title').innerText()).includes(nombre), 'La vista de armado muestra el menú recién creado');

    // ── Vista de armado v2: toggles compactos + acordeón vertical ──
    check(await page.locator('#mc-body .mc-cli-compact .mc-cli-btn').count() === 2, 'Fila compacta con los 2 toggles del cliente (sin hub)');
    check(await page.locator('#mc-body .mc-acc').count() > 0, 'Secciones renderizadas como lista vertical (acordeón)');
    check(await page.locator('#mc-body .mc-add-sec').isVisible(), 'Botón "＋ Agregar sección" al final de la lista');

    const nSecs = await page.locator('#mc-body .mc-sec').count();
    if (nSecs > 0) {
      // Herencia de secciones: el menú nace con la estructura del último menú
      check(true, `Secciones heredadas del último menú (${nSecs})`);
      check(await page.locator('#mc-body .mc-hint').count() > 0, 'Hint "✨ solo agrega los platos de hoy" visible tras crear');
      check(await page.locator('#mc-body .mc-sec-badge.warn').count() > 0, 'Secciones heredadas marcan "⚠ sin platos"');

      // El acordeón colapsa/expande al tocar la cabecera
      await page.locator('#mc-body .mc-sec-head').first().click();
      await page.waitForTimeout(300);
      check(!(await page.locator('#mc-body .mc-sec').first().evaluate(el => el.classList.contains('open'))), 'Tocar la cabecera colapsa la sección');
      await page.locator('#mc-body .mc-sec-head').first().click();
      await page.waitForTimeout(300);
      check(await page.locator('#mc-body .mc-sec').first().evaluate(el => el.classList.contains('open')), 'Tocar de nuevo la expande');

      // ── Picker multi-selección: marcar 2 platos y confirmar una vez ──
      await page.locator('#mc-body .mc-add-platos').first().click();
      await page.waitForTimeout(400);
      check(await page.locator('.pp-overlay.open').count() > 0, '"＋ Platos" abre el PlatoPicker');
      check(await page.locator('.pp-foot.show').count() > 0, 'Picker en modo multi (footer de confirmación visible)');
      const nPlatosCat = await page.locator('.pp-grid .pp-card').count();
      if (nPlatosCat >= 2) {
        await page.locator('.pp-grid .pp-card').nth(0).click();
        await page.locator('.pp-grid .pp-card').nth(1).click();
        check(await page.locator('.pp-grid .pp-card.sel').count() === 2, 'Dos platos marcados sin cerrar el picker');
        check(/2 nuevos/.test(await page.locator('.pp-confirm').innerText()), 'Footer dice "Guardar (2 nuevos) ✓"');
        await page.click('.pp-confirm');
        await page.waitForTimeout(700);
        check(await page.locator('#mc-body .mc-plato-row').count() >= 2, 'Los 2 platos aparecen en la sección tras confirmar');
        check(/2 platos/.test(await page.locator('#mc-body .mc-sec-badge').first().innerText()), 'Badge de la sección pasa a "2 platos"');
        // Acciones del plato detrás del ⋯
        await page.locator('#mc-body .mc-dots').first().click();
        await page.waitForTimeout(200);
        check(await page.locator('#mc-body .mc-plato-acts.open').count() > 0, 'El ⋯ expande las acciones del plato');
      } else {
        await page.click('.pp-close');
        console.log('  ⚠️  Catálogo con <2 platos — picker multi omitido');
      }
    } else {
      console.log('  ⚠️  Sin menús previos con secciones — herencia vacía (tolerado)');
      // ── Alta rápida de sección (1 tap) ──
      await page.click('#mc-body .mc-add-sec');
      await page.waitForTimeout(400);
      const filas = await page.locator('#mc-body .mc-addsec-row').count();
      if (filas > 0) {
        await page.locator('#mc-body .mc-addsec-row .mc-mini-act.primaria').first().click();
        await page.waitForTimeout(700);
        check(await page.locator('#mc-body .mc-sec').count() > 0, 'Alta rápida: 1 tap agrega la sección al acordeón');
      } else {
        console.log('  ⚠️  Sin secciones libres en el catálogo (omitido)');
      }
    }

    // ── Sin overflow horizontal de página a 360px (vista de armado) ──
    const overflowCfg = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check(overflowCfg, 'Sin overflow horizontal en la vista de armado a 360px');

    // "← Volver" regresa a la galería (un solo nivel — ya no hay hub)
    await page.click('[data-act="cfg-back"]');
    await page.waitForTimeout(500);
    check(await page.locator('#mw-gallery').isVisible(), '"← Volver" regresa a la galería en 1 tap');
    check(await page.locator('#mw-config').isHidden(), 'Vista de armado oculta tras volver');

    // ── Galería: el menú nuevo aparece como card retrato ──
    check(await page.locator('#mw-menus-list .mw-menu-card').count() > 0, 'Galería muestra al menos 1 menú');
    const newCardLoc = page.locator('#mw-menus-list .mw-menu-card', { hasText: nombre });
    check(await newCardLoc.count() > 0, 'El menú recién creado aparece en la galería');
    check((await newCardLoc.first().innerText()).includes('18.50'), 'Card de la galería muestra el precio');
    const box = await page.locator('#mw-menus-list .mw-menu-card').first().boundingBox();
    check(box && box.height > box.width, `Card es retrato (${Math.round(box.width)}×${Math.round(box.height)})`);

    // ── Sin overflow horizontal de página a 360px (galería) ──
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    check(overflow, 'Sin overflow horizontal de página a 360px');

    // La galería sí scrollea en X (contenido), no la página
    const menusScrollable = await page.locator('#mw-menus-list').evaluate(el => el.scrollWidth >= el.clientWidth);
    check(menusScrollable, 'La galería es un carrusel horizontal');

    // ── ⚙ Configurar desde la galería aterriza DIRECTO en el acordeón (sin hub) ──
    await newCardLoc.first().locator('[data-cfg]').click();
    await page.waitForTimeout(400);
    check(await page.locator('#mw-config').isVisible(), '⚙ Configurar abre la vista de armado inline');
    check(await page.locator('#mc-body .mc-acc').count() > 0, 'Aterriza directo en el acordeón de secciones (sin hub)');
    check(await page.locator('#mc-body .mc-hub-card').count() === 0, 'El hub de 2 opciones ya no existe');
    check(await page.locator('#mc-body .mc-hint').count() === 0, 'El hint de herencia NO aparece al reabrir (solo tras crear)');
    await page.click('[data-act="cfg-back"]');
    await page.waitForTimeout(400);
    check(await page.locator('#mw-gallery').isVisible(), 'Volver desde ⚙ regresa a la galería');

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
