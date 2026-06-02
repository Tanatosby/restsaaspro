/**
 * Prueba E2E del widget PwaInstall en login.html y owner.html.
 * A) Android/Chrome: simula `beforeinstallprompt` → el botón aparece y al click dispara prompt().
 * B) iOS (user-agent iPhone): el botón aparece y abre el instructivo "Añadir a pantalla de inicio".
 * Uso: node scripts/test-pwa-install.js   (requiere server en TEST_BASE)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE  = process.env.TEST_BASE || 'http://localhost:3399';
const SHOTS = path.resolve('scripts/_pwa-test-shots');

let failures = 0;
const log = (...a) => console.log(...a);
const assert = (c, m) => { log((c ? '✅' : '❌') + ' ' + m); if (!c) failures++; };

const fireInstallPrompt = () => {
  const evt = new Event('beforeinstallprompt');
  evt.prompt = () => { window.__promptCalled = true; };
  evt.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(evt);
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const watch = (p, tag) => {
    p.on('console', m => { if (m.type() === 'error') errors.push(`[${tag}] console.error: ${m.text()}`); });
    p.on('pageerror', e => errors.push(`[${tag}] pageerror: ${e.message}`));
  };

  // ── A) Camino Android/Chrome (beforeinstallprompt) ──
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  watch(page, 'desktop');

  // login.html
  await page.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  assert(await page.locator('#btn-install').evaluate(e => e.hidden) === true,
    'Login: botón oculto antes de beforeinstallprompt');
  await page.evaluate(fireInstallPrompt);
  assert(await page.locator('#btn-install').evaluate(e => e.hidden) === false,
    'Login: botón aparece tras beforeinstallprompt');
  await page.evaluate(() => document.getElementById('btn-install').click());
  await page.waitForTimeout(120);
  assert(await page.evaluate(() => window.__promptCalled === true), 'Login: click dispara el prompt nativo');

  // owner.html (tras login real)
  await page.fill('#email', 'owner@bot.com');
  await page.fill('#password', 'BotMenuPro2026!');
  await page.click('#submit-btn');
  await page.waitForURL(/owner\.html/, { timeout: 10000 });
  assert(await page.locator('#btn-instalar-app').evaluate(e => e.hidden) === true,
    'Owner: botón oculto antes de beforeinstallprompt');
  await page.evaluate(fireInstallPrompt);
  assert(await page.locator('#btn-instalar-app').evaluate(e => e.hidden) === false,
    'Owner: botón aparece tras beforeinstallprompt');
  await page.evaluate(() => document.getElementById('btn-instalar-app').click());
  await page.waitForTimeout(120);
  assert(await page.evaluate(() => window.__promptCalled === true), 'Owner: click dispara el prompt nativo');
  await ctx.close();

  // ── B) Camino iOS (instructivo manual) ──
  const ios = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
  });
  const ip = await ios.newPage();
  watch(ip, 'ios');
  await ip.goto(`${BASE}/login.html`, { waitUntil: 'networkidle' });
  assert(await ip.locator('#btn-install').evaluate(e => e.hidden) === false,
    'iOS: botón visible (instalación manual, sin beforeinstallprompt)');
  await ip.evaluate(() => document.getElementById('btn-install').click());
  await ip.waitForSelector('.pwa-ios.open', { timeout: 3000 });
  assert(await ip.locator('.pwa-ios-card').isVisible(), 'iOS: abre el instructivo "Añadir a pantalla de inicio"');
  await ip.waitForTimeout(350);
  await ip.screenshot({ path: path.join(SHOTS, 'ios-instructivo.png') });
  await ios.close();

  assert(errors.length === 0, 'Sin errores de consola/página' + (errors.length ? ' → ' + errors.join(' | ') : ''));

  await browser.close();
  log(`\n${failures === 0 ? '🎉 TODO VERDE' : '⚠️  ' + failures + ' fallo(s)'} — screenshots en ${SHOTS}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('TEST FAIL:', e); process.exit(1); });
