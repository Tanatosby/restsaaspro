/**
 * E2E del widget CartaExport (owner.html → Carta → Platos a la carta →
 * «⬇ Descargar carta»). Hermano de scripts/test-menu-export.js.
 *
 * Verifica que el botón esté junto a "＋ Crear plato", que el lienzo se
 * componga con las medidas del diseño (1080px de ancho, alto dinámico según
 * cuántas categorías/platos hay), que cada card lleve su precio, que la
 * banda superior use el color del restaurante, y que el archivo salga como
 * carta.jpg descargable.
 *
 * Uso: PORT=3399 node scripts/test-carta-export.js
 */
const { chromium } = require('playwright');

const BASE  = `http://localhost:${process.env.PORT || 3399}`;
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

// Mismas constantes que el widget — si el diseño cambia, este test debe fallar.
const W = 1080, PAD = 64, COL_GAP = 20;
const ANCHO_UTIL = W - PAD * 2;                      // 952
const ASPECTO = 304 / 218;
const COL_W_MAX = 600;
const BAND_H  = 40 + 54 + 34;
const TITLE_H = 46 + 68 + 40;
const FOOT_H  = 2 + 32 + 34 + 42;

function columnsFor(n) {
  if (n <= 3) return n;
  if (n === 4) return 2;
  return 3;
}

// A diferencia de MenuExport, cada card suma su propia línea de precio.
function sectionHeight(n) {
  const cols = columnsFor(n);
  let colW = (ANCHO_UTIL - COL_GAP * (cols - 1)) / cols;
  if (cols === 1) colW = Math.min(colW, COL_W_MAX);
  const thumbH = Math.round(colW / ASPECTO);
  const itemH  = thumbH + 12 + 2 * 43 + 6 + 32;      // miniatura + nombre (2L) + precio
  const rows   = Math.ceil(n / cols);
  return 30 + 18 + rows * itemH + (rows - 1) * COL_GAP;
}

function expectedHeight(categorias) {
  const seccionesH = categorias.reduce((acc, c) => acc + sectionHeight(c.platos), 0)
    + Math.max(0, categorias.length - 1) * 34;
  return BAND_H + TITLE_H + 8 + seccionesH + 36 + FOOT_H;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
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

    // Cerrar el modal "Qué hay de nuevo" (ISS-076) si aparece — un contexto
    // de navegador nuevo no tiene nada en localStorage, así que siempre sale
    // en la primera carga y tapa los botones del panel.
    const novCerrar = page.locator('.nov-btn-cerrar');
    if (await novCerrar.count() > 0) await novCerrar.click();

    console.log('\n── El widget carga ──');
    check(await page.evaluate(() => typeof window.CartaExport?.download === 'function'), 'CartaExport.download() expuesto');
    check(await page.evaluate(() => typeof window.CartaExport?.render === 'function'), 'CartaExport.render() expuesto');

    // ── Ir al panel Carta → Platos a la carta ──
    await page.evaluate(() => { showPanel('carta'); switchTab('carta', 'platos'); });
    await page.waitForTimeout(500);

    console.log('\n── El botón junto a "＋ Crear plato" ──');
    const btn = page.locator('#btn-descargar-carta');
    check(await btn.count() > 0, 'Botón «Descargar carta» presente');
    check((await btn.textContent()).includes('Descargar carta'), 'La etiqueta dice «Descargar carta»');
    const box = await btn.boundingBox();
    check(box && box.height >= 44, `Touch target ≥44px (${box ? Math.round(box.height) : 0}px)`);

    console.log('\n── El lienzo compuesto ──');
    const info = await page.evaluate(async () => {
      const platos = await api('GET', '/api/menu/platos-carta');
      const cfg = await api('GET', '/api/menu/restaurante/config');
      const canvas = await window.CartaExport.render();
      const ctx = canvas.getContext('2d');
      const px = (x, y) => { const d = ctx.getImageData(x, y, 1, 1).data; return `${d[0]},${d[1]},${d[2]}`; };
      const porCat = new Map();
      platos.filter(p => p.activo !== 0).forEach(p => {
        porCat.set(p.categoria, (porCat.get(p.categoria) || 0) + 1);
      });
      return {
        w: canvas.width,
        h: canvas.height,
        banda: px(20, 20),
        fondo: px(20, canvas.height - 20),
        cfgColor: cfg.color_primario,
        categorias: [...porCat.values()].map(n => ({ platos: n })),
        jpegLen: canvas.toDataURL('image/jpeg', 0.85).length,
      };
    });

    check(info.w === W, `Ancho del archivo = 1080px (${info.w})`);
    check(info.categorias.length > 0, `Hay categorías con platos para exportar (${info.categorias.length})`);

    const esperado = expectedHeight(info.categorias);
    check(info.h === esperado, `Alto dinámico según categorías/platos: esperado ${esperado}, obtenido ${info.h}`);

    const hexBanda = '#' + info.banda.split(',').map(n => (+n).toString(16).padStart(2, '0')).join('');
    check(hexBanda.toLowerCase() === (info.cfgColor || '').toLowerCase(),
      `La banda superior usa el color del restaurante (${hexBanda} vs ${info.cfgColor})`);
    check(info.fondo === '245,241,237', `El fondo es el beige de la marca (${info.fondo})`);
    check(info.jpegLen > 5000, `El JPEG tiene contenido real (${Math.round(info.jpegLen / 1024)} KB en base64)`);

    console.log('\n── La descarga ──');
    const descarga = page.waitForEvent('download', { timeout: 15000 });
    await btn.click();
    const file = await descarga;
    check(file.suggestedFilename() === 'carta.jpg', `Se descarga como carta.jpg (${file.suggestedFilename()})`);

    await page.waitForTimeout(400);
    check(!(await btn.isDisabled()), 'El botón se re-habilita al terminar');
    check((await btn.textContent()).includes('Descargar carta'), 'El botón recupera su etiqueta');

    console.log('\n── Sin overflow horizontal a 360px ──');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(!overflow, 'La página no scrollea de costado');

    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
