// Verificación manual (no forma parte de la suite jest) del versionado de
// assets y del precache del service worker — ISS-044 + T11.
//
// El 2026-08-16 un deploy dejó al navegador con un `utils.js` viejo y un
// `cocina.js` nuevo: el panel apareció vacío y pareció pérdida de datos. La
// defensa es que TODAS las URLs de assets cambien juntas en cada build, y que
// el service worker precachee el juego completo.
//
// Uso: PORT=3311 node app.js &   (servidor ya debe estar corriendo)
//      node scripts/test-version-assets.js
const path = require('path');
const fs = require('fs');
const { BUILD } = require('../utils/buildVersion');

const BASE = 'http://localhost:3311';
let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

(async () => {
  console.log(`\nVersión de build: ${BUILD}`);

  // ── Los HTML salen con la versión inyectada ────────────────────────────────
  console.log('\nLos HTML se sirven con la versión resuelta');
  for (const ruta of ['/owner.html', '/menu.html']) {
    const res = await fetch(BASE + ruta);
    const html = await res.text();
    check(res.ok, `${ruta} responde ${res.status}`);
    check(!html.includes('__BUILD__'), `${ruta} no deja ningún __BUILD__ sin reemplazar`);
    check(html.includes(`?v=${BUILD}`), `${ruta} pide sus assets con ?v=${BUILD}`);
    check(res.headers.get('cache-control') === 'no-cache',
      `${ruta} se revalida siempre (es el punto de entrada que avisa del cambio)`);
  }

  // Ni un solo asset local sin versionar: uno solo que quede fijo reabre el bug
  console.log('\nNingún asset local queda sin versionar');
  for (const ruta of ['/owner.html', '/menu.html']) {
    const html = await (await fetch(BASE + ruta)).text();
    const sinVersion = [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map(m => m[1]);
    check(sinVersion.length === 0,
      `${ruta} sin assets locales sin ?v= ${sinVersion.length ? '→ ' + sinVersion.join(', ') : ''}`);
  }

  // ── El service worker ──────────────────────────────────────────────────────
  console.log('\nEl service worker');
  const swRes = await fetch(`${BASE}/sw.js`);
  const sw = await swRes.text();
  check(!sw.includes('__BUILD__'), 'sw.js sale con la versión inyectada');
  check(sw.includes(`const BUILD = '${BUILD}'`), `sw.js usa la misma versión (${BUILD}) que el servidor`);
  check(swRes.headers.get('cache-control') === 'no-cache', 'sw.js se revalida siempre');

  // Todo <script src> local del HTML tiene que estar precacheado, o el arranque
  // vuelve a depender de la red archivo por archivo (T11)
  const ownerHtml = await (await fetch(`${BASE}/owner.html`)).text();
  const scripts = [...ownerHtml.matchAll(/src="(\/[^"]+\.js)\?v=/g)].map(m => m[1]);
  const faltantes = scripts.filter(s => !sw.includes(`v('${s}')`));
  check(faltantes.length === 0,
    `los ${scripts.length} scripts locales de owner.html están en ASSETS ${faltantes.length ? '→ faltan: ' + faltantes.join(', ') : ''}`);
  check(sw.includes("cache: 'reload'"),
    'el precache usa cache:"reload" — sin eso el SW puede fosilizar una copia vieja del navegador');

  // ── Los assets versionados existen de verdad ───────────────────────────────
  console.log('\nLas URLs versionadas responden');
  const assets = [...sw.matchAll(/v\('([^']+)'\)/g)].map(m => m[1]);
  let ok = 0, malas = [];
  for (const a of assets) {
    const r = await fetch(`${BASE}${a}?v=${BUILD}`);
    if (r.ok) ok++; else malas.push(`${a} → ${r.status}`);
  }
  check(malas.length === 0, `los ${assets.length} assets del precache existen ${malas.length ? '→ ' + malas.join(', ') : ''}`);

  // La query no debe cambiar el contenido: es solo una etiqueta de versión
  const conV  = await (await fetch(`${BASE}/js/modules/utils.js?v=${BUILD}`)).text();
  const sinV  = await (await fetch(`${BASE}/js/modules/utils.js`)).text();
  check(conV === sinV, 'el ?v= no altera el contenido servido, solo la URL');

  // ── Lo que arreglaría el bug de ISS-044 ────────────────────────────────────
  console.log('\nLa defensa concreta contra el panel vacío');
  const antes = ownerHtml.match(/utils\.js\?v=(\S+?)"/)?.[1];
  const otro  = ownerHtml.match(/cocina\.js\?v=(\S+?)"/)?.[1];
  check(antes && antes === otro,
    `utils.js y cocina.js piden la MISMA versión (${antes}) — no pueden quedar desparejos`);

  // Al subir BUILD, cambian todas a la vez
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'public', 'owner.html'), 'utf8');
  check(!fuente.includes(`?v=${BUILD}`) && fuente.includes('?v=__BUILD__'),
    'el HTML en disco guarda el placeholder, no el número — se bumpea en un solo archivo');

  // ── Arranque (T11) ─────────────────────────────────────────────────────────
  console.log('\nArranque: nada externo bloquea el primer pintado');
  for (const [ruta, nombre] of [['/owner.html', 'owner'], ['/menu.html', 'menu']]) {
    const html = await (await fetch(BASE + ruta)).text();
    const head = html.slice(0, html.indexOf('</head>'));
    const cdnBloqueante = [...head.matchAll(/<script(?![^>]*\bdefer\b)(?![^>]*\basync\b)[^>]*src="(https?:\/\/[^"]+)"/g)].map(m => m[1]);
    check(cdnBloqueante.length === 0,
      `${nombre}: sin <script> externo bloqueante en el <head> ${cdnBloqueante.length ? '→ ' + cdnBloqueante.join(', ') : ''}`);
    // El <link> de dentro de <noscript> es el fallback para JS deshabilitado:
    // no participa del render normal, así que no cuenta como bloqueante.
    const headSinNoscript = head.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
    const cssBloqueante = [...headSinNoscript.matchAll(/<link[^>]*href="(https:\/\/fonts\.googleapis[^"]+)"[^>]*>/g)]
      .filter(m => !m[0].includes('media="print"') && !m[0].includes('preconnect'));
    check(cssBloqueante.length === 0,
      `${nombre}: las fuentes no bloquean el render ${cssBloqueante.length ? '→ ' + cssBloqueante.map(m => m[1]).join(', ') : ''}`);
    check(head.includes('<noscript>'), `${nombre}: queda el fallback de fuentes para JS deshabilitado`);
  }

  console.log(`\n${pass} pasaron, ${fail} fallaron`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error('❌ Error inesperado:', e); process.exitCode = 1; });
