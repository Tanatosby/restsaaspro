/**
 * E2E del widget MenuExport (owner.html → Menús del día → «⬇ Descargar menú»).
 * Verifica que el botón esté en la card, que el lienzo se componga con las
 * medidas del diseño (1080px de ancho, alto dinámico según cuántos platos hay),
 * que la banda superior use el color del restaurante, que el archivo salga como
 * JPEG descargable con el nombre correcto, y que un menú sin platos avise en vez
 * de exportar una imagen vacía.
 *
 * Uso: PORT=3399 node scripts/test-menu-export.js
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
const BAND_H = 40 + 54 + 34;
const FOOT_H = 2 + 32 + 34 + 42;

// Réplica de columnsFor()/sectionGeometry(): 1-3 platos ocupan la fila entera,
// 4 se parten 2+2, de 5 en adelante van de a 3.
function columnsFor(n) {
  if (n <= 3) return n;
  if (n === 4) return 2;
  return 3;
}

function sectionHeight(n) {
  const cols = columnsFor(n);
  let colW = (ANCHO_UTIL - COL_GAP * (cols - 1)) / cols;
  if (cols === 1) colW = Math.min(colW, COL_W_MAX);
  const thumbH = Math.round(colW / ASPECTO);
  const itemH  = thumbH + 12 + 2 * 43;               // miniatura + nombre a 2 líneas
  const rows   = Math.ceil(n / cols);
  return 30 + 18 + rows * itemH + (rows - 1) * COL_GAP;
}

function expectedHeight(secciones, conPortada) {
  const headH = conPortada ? 400 : (46 + 92 + 30);
  const seccionesH = secciones.reduce((acc, s) => acc + sectionHeight(s.platos), 0)
    + Math.max(0, secciones.length - 1) * 34;
  return BAND_H + headH + 36 + seccionesH + 36 + FOOT_H;
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

    // Cerrar el modal "Qué hay de nuevo" (ISS-076) si aparece — un contexto
    // de navegador nuevo no tiene nada en localStorage, así que siempre sale
    // en la primera carga y tapa los botones del panel.
    const novCerrar = page.locator('.nov-btn-cerrar');
    if (await novCerrar.count() > 0) await novCerrar.click();

    console.log('\n── El widget carga ──');
    check(await page.evaluate(() => typeof window.MenuExport?.download === 'function'), 'MenuExport.download() expuesto');
    check(await page.evaluate(() => typeof window.MenuExport?.render === 'function'), 'MenuExport.render() expuesto');

    // ── Buscar un menú real con platos ──
    const menus = await page.evaluate(async () => await api('GET', '/api/menu/menus-dia'));
    const conPlatos = menus.find(m => (m.secciones || []).some(s => (s.platos || []).length));
    check(!!conPlatos, `Hay un menú con platos para exportar (${conPlatos ? conPlatos.nombre : 'ninguno'})`);
    if (!conPlatos) throw new Error('La BD local no tiene ningún menú con platos — corré scripts/seed-demo-data.js');

    // ── Ir a la fecha de ese menú, en la galería ──
    await page.evaluate(() => { showPanel('menu-dia'); switchTab('md', 'menus'); });
    await page.waitForTimeout(500);
    await page.fill('#mw-fecha', conPlatos.dia);
    await page.dispatchEvent('#mw-fecha', 'change');
    await page.waitForTimeout(700);

    console.log('\n── El botón en la card ──');
    const btn = page.locator(`[data-export="${conPlatos.id}"]`);
    check(await btn.count() > 0, 'Botón «Descargar menú» presente en la card');
    check((await btn.textContent()).includes('Descargar menú'), 'La etiqueta dice «Descargar menú»');

    const box = await btn.boundingBox();
    check(box && box.height >= 44, `Touch target ≥44px (${box ? Math.round(box.height) : 0}px)`);

    // Orden: Configurar → Copiar → Descargar → Eliminar
    const orden = await page.evaluate(id => {
      const card = document.querySelector(`[data-export="${id}"]`).closest('.mw-menu-card');
      return [...card.querySelectorAll('.mw-menu-actions > button')].map(b => b.textContent.trim());
    }, conPlatos.id);
    check(orden.length === 4 && /Descargar/.test(orden[2]) && /Eliminar/.test(orden[3]),
      `«Descargar» va entre «Copiar» y «Eliminar» (${orden.join(' | ')})`);

    console.log('\n── El lienzo compuesto ──');
    const info = await page.evaluate(async (id) => {
      const menus = await api('GET', '/api/menu/menus-dia');
      const menu = menus.find(m => m.id === id);
      const canvas = await window.MenuExport.render(menu);
      const ctx = canvas.getContext('2d');
      const px = (x, y) => { const d = ctx.getImageData(x, y, 1, 1).data; return `${d[0]},${d[1]},${d[2]}`; };
      const cfg = await api('GET', '/api/menu/restaurante/config');
      return {
        w: canvas.width,
        h: canvas.height,
        banda:  px(20, 20),
        fondo:  px(20, canvas.height - 20),
        cfgColor: cfg.color_primario,
        secciones: (menu.secciones || [])
          .filter(s => (s.platos || []).length)
          .map(s => ({ platos: s.platos.length })),
        conPortada: (menu.secciones || []).some(s => (s.platos || []).some(p => p.url_foto)),
        jpegLen: canvas.toDataURL('image/jpeg', 0.85).length,
      };
    }, conPlatos.id);

    check(info.w === W, `Ancho del archivo = 1080px (${info.w})`);

    const esperado = expectedHeight(info.secciones, info.conPortada);
    check(info.h === esperado, `Alto dinámico según los platos: esperado ${esperado}, obtenido ${info.h}`);

    const hexBanda = '#' + info.banda.split(',').map(n => (+n).toString(16).padStart(2, '0')).join('');
    check(hexBanda.toLowerCase() === (info.cfgColor || '').toLowerCase(),
      `La banda superior usa el color del restaurante (${hexBanda} vs ${info.cfgColor})`);
    check(info.fondo === '245,241,237', `El fondo es el beige de la marca (${info.fondo})`);
    check(info.jpegLen > 10000, `El JPEG tiene contenido real (${Math.round(info.jpegLen / 1024)} KB en base64)`);

    console.log('\n── La descarga ──');
    const descarga = page.waitForEvent('download', { timeout: 15000 });
    await btn.click();
    const file = await descarga;
    check(file.suggestedFilename() === `menu-${conPlatos.dia}.jpg`,
      `Se descarga como menu-<fecha>.jpg (${file.suggestedFilename()})`);

    // El botón vuelve a su estado normal tras generar
    await page.waitForTimeout(400);
    check(!(await btn.isDisabled()), 'El botón se re-habilita al terminar');
    check((await btn.textContent()).includes('Descargar menú'), 'El botón recupera su etiqueta');

    console.log('\n── La grilla se adapta al tamaño de la sección ──');
    // Menús sintéticos: una sección con N platos sin foto. El alto delata cuántas
    // columnas y filas se usaron, que es lo que se rompía con la grilla fija de 3.
    for (const n of [1, 2, 3, 4, 5, 6, 7]) {
      const alto = await page.evaluate(async (cant) => {
        const platos = Array.from({ length: cant }, (_, i) => ({
          id_plato: i + 1, nombre: `Plato ${i + 1}`, url_foto: null, agotado: 0,
        }));
        const menu = {
          id: -2, nombre: 'Prueba', precio: 10, dia: '2026-01-01',
          secciones: [{ nombre_seccion: 'Sección', requerido: 1, platos }],
        };
        return (await window.MenuExport.render(menu)).height;
      }, n);
      const esperado = expectedHeight([{ platos: n }], false);
      const cols = columnsFor(n);
      check(alto === esperado, `${n} plato${n > 1 ? 's' : ''} → ${cols} columna${cols > 1 ? 's' : ''}, alto ${alto} (esperado ${esperado})`);
    }

    console.log('\n── Menú sin platos ──');
    const sinPlatos = await page.evaluate(async () => {
      const menu = { id: -1, nombre: 'Menú vacío', precio: 10, dia: '2026-01-01', secciones: [] };
      await window.MenuExport.download(menu);
      const t = document.querySelector('.toast, #toast');
      return t ? t.textContent : '';
    });
    check(/no tiene platos/i.test(sinPlatos), `Avisa en vez de exportar una imagen vacía ("${sinPlatos.trim()}")`);

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
