/**
 * E2E del carrito agrupado de Reservar — stepper "+"/"−" por contenido
 * (`agruparMenusCarrito`, Día 9 del piloto #1: la dueña reportó que pedir 2
 * menús idénticos exigía reabrir el picker y volver a elegir cada sección
 * desde cero).
 *
 * Hasta ISS-087 (2026-09-04) esto se probaba agregando el menú vía el atajo
 * flotante "+1 mismo menú" (ISS-064) que aparecía tras cada `agregarMenu()`
 * en modo reservar — ese atajo quedó retirado: Reservar ahora decide la
 * cantidad antes con el stepper de la card, igual que Pedir desde ISS-080
 * (ver scripts/test-reservar-cantidad-primero.js para esa cobertura). Lo que
 * este test sigue verificando, sin cambios de fondo, es el AGRUPADO del
 * drawer en sí — 2 filas de carrito con igual menú + selección + modalidad
 * se muestran como una sola fila con contador — que es un mecanismo aparte
 * de `agruparMenusCarrito` y no se tocó en ISS-087.
 *
 * Uso: PORT=3399 node scripts/test-repetir-menu.js
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
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    const setup = await page.evaluate(async () => {
      const usable = m => {
        const secs = m.secciones || [];
        return secs.some(s => (s.platos || []).length)
            && secs.filter(s => s.requerido).every(s => (s.platos || []).length);
      };
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const menus = await api('GET', `/api/menu/menus-dia?dia=${hoy}`);
      const menu = menus.find(usable);
      if (!menu) return { error: 'No hay ningún menú usable para hoy' };
      const sesion = leerSesion();
      return { menuId: menu.id, restauranteId: sesion.restaurant_id };
    });
    if (setup.error) throw new Error(setup.error);
    console.log(`Setup OK — menú #${setup.menuId}`);

    // ── Reservar: agregar el mismo menú 2 veces con igual selección ──
    console.log('\n── Reservar: el drawer agrupa 2 unidades idénticas ──');
    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    await page.evaluate((menuId) => {
      const menu = resMenusDia.find(m => m.id === menuId);
      const agregarUnaVez = () => {
        for (const s of menu.secciones) {
          const p = s.platos[0];
          if (p) selectMenuPlato('reservar', menu.id, s.id_seccion, p.id_componente, p.nombre, s.nombre_seccion, menu.precio, menu.id);
        }
        agregarMenu('reservar', menu.id, !!menu.elegible, menu.precio, menu.nombre);
      };
      agregarUnaVez();
      agregarUnaVez();
    }, setup.menuId);
    await page.waitForTimeout(200);
    check((await page.evaluate(() => resCart.length)) === 2, 'resCart[] queda con 2 filas (2 agregados directos, sin atajo)');

    await page.click('.res-bar-btn');
    await page.waitForTimeout(300);
    const filasRes = await page.locator('#res-cart-items .res-cart-item').count();
    check(filasRes === 1, `El drawer de reserva agrupa en una fila (${filasRes})`);
    const stepperResNum = await page.locator('#res-cart-items .menu-stepper-num').textContent();
    check(stepperResNum.trim() === '2', `Stepper de reserva marca ×2 (${stepperResNum.trim()})`);

    // Stepper "+"/"−" del grupo
    await page.click('#res-cart-items .menu-stepper-btn.add');
    await page.waitForTimeout(150);
    check((await page.locator('#res-cart-items .menu-stepper-num').textContent()).trim() === '3', 'El botón + suma otra unidad (×3)');
    await page.click('#res-cart-items .menu-stepper-btn:not(.add)');
    await page.waitForTimeout(150);
    check((await page.locator('#res-cart-items .menu-stepper-num').textContent()).trim() === '2', 'El botón − resta una unidad (vuelve a ×2)');

    // ── El payload arma 2 grupos completos (ISS-041), no uno mezclado ──
    const gruposPayload = await page.evaluate(() => numerarGrupos(resCart));
    const gruposDistintos = new Set(gruposPayload.map(i => i.grupo));
    check(gruposDistintos.size === 2, `El payload arma 2 grupos distintos, no uno mezclado (${gruposDistintos.size})`);
    check(gruposPayload.every(i => i.grupo != null), 'Ninguna línea del payload quedó con grupo sin definir');

    console.log('\n── Sin overflow horizontal a 360px ──');
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'Sin scroll horizontal');

    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.error('💥 Error inesperado:', e.message);
    fail++;
  } finally {
    await browser.close();
    console.log(`\n${pass} pasaron, ${fail} fallaron`);
    process.exit(fail ? 1 : 0);
  }
})();
