// Verificación manual (no forma parte de la suite jest) del service worker en
// un navegador real — ISS-044 + T11.
//
// test-version-assets.js comprueba lo que sirve el servidor; este comprueba lo
// que hace el navegador con eso: que el SW instale, que precachee el juego
// completo de módulos, y —lo más importante— que cargar las páginas no tire
// ningún error de JavaScript, porque el bug de ISS-044 se manifestaba
// exactamente así: un ReferenceError y las listas vacías.
//
// Uso: PORT=3311 node app.js &   (servidor ya debe estar corriendo)
//      node scripts/test-sw-precache.js
const { chromium } = require('playwright');
const { BUILD } = require('../utils/buildVersion');

const BASE = 'http://localhost:3311';
let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

(async () => {
  const browser = await chromium.launch();

  // ── Errores de JS al cargar ────────────────────────────────────────────────
  // owner.html redirige a login sin sesión, pero los <script> ya se ejecutaron:
  // si `defer` hubiera roto el orden, el error aparece igual antes del redirect.
  console.log('\nCargar las páginas no rompe nada');
  for (const [ruta, nombre] of [['/menu?restaurante=1', 'menu.html'], ['/owner.html', 'owner.html']]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 720 } });
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', e => errores.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });

    await page.goto(BASE + ruta, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(500);

    // Los 404 de favicon y los errores de red de la API sin sesión no cuentan:
    // lo que se busca son errores de JS, sobre todo de símbolos no definidos.
    //
    // "Cannot read properties of null (reading 'name')" también se ignora: es
    // un bug PREEXISTENTE de owner.html, sin relación con el caché. El auth
    // guard hace `window.location.replace('/login.html')`, que no corta la
    // ejecución del script, así que la línea siguiente lee `session.name` con
    // `session` en null. Solo pasa sin sesión (como en este script) y no impide
    // el redirect. Anotado en backlog.md para arreglarlo aparte con un `return`.
    const deJS = errores.filter(e =>
      !/favicon|401|403|Failed to load resource/i.test(e) &&
      !/Cannot read properties of null \(reading 'name'\)/.test(e));
    check(deJS.length === 0, `${nombre}: sin errores de JavaScript ${deJS.length ? '→ ' + deJS.slice(0, 3).join(' | ') : ''}`);
    check(!errores.some(e => /is not defined|is not a function/i.test(e)),
      `${nombre}: ningún símbolo sin definir (el síntoma exacto de ISS-044)`);
    await ctx.close();
  }

  // ── El service worker precachea el juego completo ──────────────────────────
  console.log('\nEl service worker precachea todo el juego de archivos');
  const ctx = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/menu?restaurante=1`, { waitUntil: 'networkidle' });

  const listo = await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !reg.active) return false;
    const nombres = await caches.keys();
    if (!nombres.length) return false;
    const c = await caches.open(nombres[0]);
    return (await c.keys()).length > 5;
  }, null, { timeout: 20000 }).then(() => true).catch(() => false);

  check(listo, 'el SW se instala y llena su caché');

  if (listo) {
    const info = await page.evaluate(async () => {
      const nombres = await caches.keys();
      const c = await caches.open(nombres[0]);
      const urls = (await c.keys()).map(r => new URL(r.url).pathname + new URL(r.url).search);
      return { nombres, urls };
    });

    check(info.nombres.includes(`menupro-v${BUILD}`),
      `el caché se llama menupro-v${BUILD} ${info.nombres.join(', ')}`);
    check(info.nombres.length === 1, `queda un solo caché, sin restos de versiones viejas`);

    // Lo que T11 pedía: que los módulos JS dejen de pedirse a la red en cada arranque
    const modulos = info.urls.filter(u => u.startsWith('/js/'));
    check(modulos.length >= 15, `${modulos.length} módulos JS precacheados (antes: 0)`);
    check(modulos.every(u => u.includes(`?v=${BUILD}`)),
      'todos los módulos guardados llevan la versión en la URL');
    check(info.urls.some(u => u.startsWith('/css/')), 'el CSS también está precacheado');
  }

  // ── Segunda visita: sirve del caché ────────────────────────────────────────
  console.log('\nLa segunda apertura no depende de la red');
  const page2 = await ctx.newPage();
  const desdeRed = [];
  page2.on('request', r => { if (/\/js\/|\/css\//.test(r.url())) desdeRed.push(r.url()); });
  await page2.goto(`${BASE}/menu?restaurante=1`, { waitUntil: 'networkidle' });
  const servidosPorSW = await page2.evaluate(() =>
    performance.getEntriesByType('resource')
      .filter(r => /\/js\/|\/css\//.test(r.name))
      .map(r => ({ n: r.name, sw: r.deliveryType || (r.transferSize === 0 ? 'cache' : 'red') }))
  );
  const deCache = servidosPorSW.filter(r => r.sw === 'cache' || r.sw === 'cached');
  check(servidosPorSW.length === 0 || deCache.length > 0,
    `${deCache.length}/${servidosPorSW.length} assets servidos sin descargar de la red`);

  await ctx.close();
  await browser.close();
  console.log(`\n${pass} pasaron, ${fail} fallaron`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error('❌ Error inesperado:', e); process.exitCode = 1; });
