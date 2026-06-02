/**
 * Prueba E2E de "Editar platos" (widget FormModal) + fix de scroll en Menús del día.
 * - Carta: ✏️ → editar nombre+precio → verificar → restaurar.
 * - Menú:  ✏️ → editar nombre → verificar → restaurar.
 * - Scroll: el botón "Eliminar" de un menú del día queda visible y dentro de 390px.
 * Uso: node scripts/test-editar-platos.js   (requiere server en TEST_BASE)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE  = process.env.TEST_BASE || 'http://localhost:3399';
const SHOTS = path.resolve('scripts/_editar-test-shots');

let failures = 0;
const log = (...a) => console.log(...a);
const assert = (c, m) => { log((c ? '✅' : '❌') + ' ' + m); if (!c) failures++; };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  // Login
  await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  await page.fill('#email', 'owner@bot.com');
  await page.fill('#password', 'BotMenuPro2026!');
  await page.click('#submit-btn');
  await page.waitForURL(/owner\.html/, { timeout: 10000 });
  log('Login OK');

  // ── CARTA: editar nombre + precio ──
  await page.evaluate(() => { showPanel('carta'); switchTab('carta', 'platos'); });
  await page.waitForSelector('#subpanel-carta-platos:not(.hidden)', { timeout: 8000 });
  await page.waitForSelector('#list-platos-carta table tbody tr', { state: 'visible', timeout: 8000 });
  const cRow = page.locator('#list-platos-carta table tbody tr').first();
  const cNameOrig = (await cRow.locator('td strong').textContent()).trim();
  const cPriceOrig = (await cRow.locator('td').nth(3).textContent()).replace(/[^\d.]/g, '') || '0';

  await cRow.locator('button[onclick^="editarPlatoCarta"]').click();
  await page.waitForSelector('.fm-overlay.open', { timeout: 5000 });
  const nFields = await page.locator('.fm-body .fm-field').count();
  assert(nFields === 4, `FormModal de carta muestra 4 campos (nombre/precio/desc/categoría) — vio ${nFields}`);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(SHOTS, '1-form-carta.png') });

  await page.fill('#fm-f-nombre', cNameOrig + ' (edit)');
  await page.fill('#fm-f-precio', '99.50');
  await page.click('.fm-btn-submit');
  await page.waitForSelector('.fm-overlay.open', { state: 'detached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const cNameNew = (await page.locator('#list-platos-carta table tbody tr').first().locator('td strong').textContent()).trim();
  const cPriceNew = (await page.locator('#list-platos-carta table tbody tr').first().locator('td').nth(3).textContent()).trim();
  assert(cNameNew === cNameOrig + ' (edit)', `Carta: nombre editado se refleja ("${cNameNew}")`);
  assert(/99\.50/.test(cPriceNew), `Carta: precio editado se refleja ("${cPriceNew}")`);

  // Restaurar nombre + precio originales (hygiene del seed)
  await page.locator('#list-platos-carta table tbody tr').first().locator('button[onclick^="editarPlatoCarta"]').click();
  await page.waitForSelector('.fm-overlay.open', { timeout: 5000 });
  await page.fill('#fm-f-nombre', cNameOrig);
  await page.fill('#fm-f-precio', cPriceOrig);
  await page.click('.fm-btn-submit');
  await page.waitForTimeout(1000);

  // ── MENÚ: editar nombre ──
  await page.evaluate(() => { showPanel('menu-dia'); switchTab('md', 'platos'); });
  await page.waitForSelector('#subpanel-md-platos:not(.hidden)', { timeout: 8000 });
  await page.waitForSelector('#list-platos-menu table tbody tr', { state: 'visible', timeout: 8000 });
  const mRow = page.locator('#list-platos-menu table tbody tr').first();
  const mNameOrig = (await mRow.locator('td strong').textContent()).trim();

  await mRow.locator('button[onclick^="editarPlatoMenu"]').click();
  await page.waitForSelector('.fm-overlay.open', { timeout: 5000 });
  const nFieldsM = await page.locator('.fm-body .fm-field').count();
  assert(nFieldsM === 2, `FormModal de menú muestra 2 campos (nombre/desc) — vio ${nFieldsM}`);
  await page.fill('#fm-f-nombre', mNameOrig + ' (edit)');
  await page.click('.fm-btn-submit');
  await page.waitForTimeout(1200);
  const mNameNew = (await page.locator('#list-platos-menu table tbody tr').first().locator('td strong').textContent()).trim();
  assert(mNameNew === mNameOrig + ' (edit)', `Menú: nombre editado se refleja ("${mNameNew}")`);
  // restaurar
  await page.locator('#list-platos-menu table tbody tr').first().locator('button[onclick^="editarPlatoMenu"]').click();
  await page.waitForSelector('.fm-overlay.open', { timeout: 5000 });
  await page.fill('#fm-f-nombre', mNameOrig);
  await page.click('.fm-btn-submit');
  await page.waitForTimeout(1000);

  // ── SCROLL FIX: botón "Eliminar" del menú del día visible y dentro de 390px ──
  await page.evaluate(() => { showPanel('menu-dia'); switchTab('md', 'menus'); });
  await page.waitForSelector('#subpanel-md-menus:not(.hidden)', { timeout: 8000 });
  const cards = await page.locator('#list-menus-dia .card').count();
  if (cards === 0) {
    assert(false, 'No hay menús del día sembrados para probar el scroll (corré seed-demo-data.js)');
  } else {
    const elim = page.locator('#list-menus-dia .card button.btn-danger', { hasText: 'Eliminar' }).first();
    await elim.scrollIntoViewIfNeeded();
    const vis = await elim.isVisible();
    const bb = await elim.boundingBox();
    const vw = page.viewportSize().width;
    assert(vis && bb && bb.x >= 0 && (bb.x + bb.width) <= vw + 1,
      `Menús del día: botón "Eliminar" visible y dentro de ${vw}px (x=${bb && Math.round(bb.x)}, der=${bb && Math.round(bb.x + bb.width)})`);
    await page.screenshot({ path: path.join(SHOTS, '2-menus-dia-scroll.png') });
  }

  assert(errors.length === 0, 'Sin errores de consola/página' + (errors.length ? ' → ' + errors.join(' | ') : ''));

  await browser.close();
  log(`\n${failures === 0 ? '🎉 TODO VERDE' : '⚠️  ' + failures + ' fallo(s)'} — screenshots en ${SHOTS}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('TEST FAIL:', e); process.exit(1); });
