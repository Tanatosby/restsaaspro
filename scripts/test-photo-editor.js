/**
 * Prueba E2E del widget PhotoEditor en owner.html (Platos de carta).
 * Verifica: subir vía 📷 → recortador → guardar → miniatura; abrir visor con
 * Recortar/Cambiar/Eliminar; recortar desde el visor; eliminar (restaura estado).
 * Uso: node scripts/test-photo-editor.js   (requiere server en BASE)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE  = process.env.TEST_BASE || 'http://localhost:3399';
const IMG   = path.resolve('landing/bot/assets/aji-de-gallina.jpg');
const SHOTS = path.resolve('scripts/_photo-test-shots');

const log = (...a) => console.log(...a);
let failures = 0;
const assert = (cond, msg) => { log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) failures++; };

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // celular gama media
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

  // Panel Carta → tab "Platos a la carta" (la lista vive en un subpanel oculto por defecto)
  await page.evaluate(() => { showPanel('carta'); switchTab('carta', 'platos'); });
  await page.waitForSelector('#subpanel-carta-platos:not(.hidden)', { timeout: 8000 });
  await page.waitForSelector('#list-platos-carta table tbody tr', { state: 'visible', timeout: 8000 });
  const row = page.locator('#list-platos-carta table tbody tr').first();

  // ── Test 1: subir foto por el 📷 → debe abrir el recortador ──
  await row.locator('input[type=file]').last().setInputFiles(IMG);
  await page.waitForSelector('.pe-crop:not([hidden])', { timeout: 5000 });
  assert(await page.locator('.pe-crop-stage').isVisible(), 'Elegir foto nueva abre el recortador');
  await page.waitForTimeout(450); // dejar terminar la animación de entrada para la captura
  await page.screenshot({ path: path.join(SHOTS, '1-cropper.png') });

  // Zoom + arrastre
  await page.evaluate(() => { const z = document.querySelector('.pe-crop-zoom'); z.value = '1.6'; z.dispatchEvent(new Event('input', { bubbles: true })); });
  const box = await page.locator('.pe-crop-stage').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 35, box.y + box.height / 2 - 25, { steps: 6 });
  await page.mouse.up();
  await page.screenshot({ path: path.join(SHOTS, '2-cropper-zoom-drag.png') });

  // Guardar recorte → sube
  await page.click('.pe-btn-save');
  await page.waitForSelector('.pe-modal.open', { state: 'detached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOTS, '3-after-upload.png') });
  assert(await row.locator('img.foto-cell-img').count() === 1, 'Tras recortar+guardar la fila muestra miniatura');

  // ── Test 2: click miniatura → visor con acciones ──
  await row.locator('img.foto-cell-img').click();
  await page.waitForSelector('.pe-view:not([hidden])', { timeout: 5000 });
  assert(await page.locator('.pe-btn-crop').isVisible(),   'Visor muestra "Recortar"');
  assert(await page.locator('.pe-btn-change').isVisible(), 'Visor muestra "Cambiar foto"');
  assert(await page.locator('.pe-btn-delete').isVisible(), 'Visor muestra "Eliminar foto"');
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(SHOTS, '4-viewer.png') });

  // ── Test 3: Recortar desde el visor ──
  await page.click('.pe-btn-crop');
  await page.waitForSelector('.pe-crop:not([hidden])', { timeout: 5000 });
  assert(await page.locator('.pe-crop-stage').isVisible(), 'Recortar desde el visor reabre el recortador');
  await page.click('.pe-btn-save');
  await page.waitForTimeout(1500);

  // ── Test 4: eliminar foto (restaura placeholder) ──
  await row.locator('img.foto-cell-img').click();
  await page.waitForSelector('.pe-view:not([hidden])', { timeout: 5000 });
  await page.click('.pe-btn-delete');
  await page.waitForTimeout(1500);
  assert(await row.locator('label.foto-cell-empty').count() === 1, 'Tras eliminar vuelve el placeholder');
  await page.screenshot({ path: path.join(SHOTS, '5-after-delete.png') });

  // Errores de consola
  assert(errors.length === 0, 'Sin errores de consola/página' + (errors.length ? ' → ' + errors.join(' | ') : ''));

  await browser.close();
  log(`\n${failures === 0 ? '🎉 TODO VERDE' : '⚠️  ' + failures + ' fallo(s)'} — screenshots en ${SHOTS}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('TEST FAIL:', e); process.exit(1); });
