/**
 * E2E del atajo "+1 mismo menú" — Día 9 del piloto #1: la dueña reportó que
 * pedir 2 menús idénticos exigía reabrir el picker y volver a elegir cada
 * sección desde cero. Verifica que:
 *   1. Al agregar un menú aparece un atajo con botón "+1 mismo menú".
 *   2. Usarlo junta el carrito en una sola fila con contador (×2), no filas
 *      repetidas — y que el stepper +/− de esa fila también funciona.
 *   3. Bajo el capó cada unidad sigue siendo su propia fila del carrito, así
 *      que el backend arma 2 grupos completos (ISS-041), no un solo grupo
 *      con las líneas mezcladas.
 * Se prueba en "Pedir" (cart) y en "Reservar" (resCart) — ambos comparten
 * la misma lógica en menu.html.
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

    // ── Pedir: agregar 1 menú y usar el atajo "+1 mismo menú" ──
    console.log('\n── Pedir: atajo "+1 mismo menú" ──');
    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}&mesa=9`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    await page.evaluate((menuId) => {
      const menu = menusDia.find(m => m.id === menuId);
      for (const s of menu.secciones) {
        const p = s.platos[0];
        if (p) selectMenuPlato('pedir', menu.id, s.id_seccion, p.id_componente, p.nombre, s.nombre_seccion, menu.precio, menu.id);
      }
      agregarMenu('pedir', menu.id, !!menu.elegible, menu.precio, menu.nombre);
    }, setup.menuId);
    await page.waitForTimeout(200);

    check(await page.locator('#atajo-repetir-menu.show').count() === 1, 'Aparece el atajo tras agregar el menú');
    check((await page.locator('#atajo-repetir-menu button').textContent()).includes('+1 mismo menú'), 'El atajo tiene el botón "+1 mismo menú"');

    await page.click('#atajo-repetir-menu button');
    await page.waitForTimeout(200);

    const soloUnaFila = await page.evaluate(() => cart.length === 2);
    check(soloUnaFila, 'Bajo el capó quedan 2 filas en cart[] (2 unidades del mismo menú)');

    await page.click('.cart-btn');
    await page.waitForTimeout(300);

    const filasVisibles = await page.locator('#drawer-items .cart-item').count();
    check(filasVisibles === 1, `El carrito muestra UNA sola fila agrupada (${filasVisibles})`);
    const stepperNum = await page.locator('#drawer-items .menu-stepper-num').textContent();
    check(stepperNum.trim() === '2', `El stepper marca ×2 (${stepperNum.trim()})`);

    // Stepper "+": una unidad más
    await page.click('#drawer-items .menu-stepper-btn.add');
    await page.waitForTimeout(150);
    check((await page.locator('#drawer-items .menu-stepper-num').textContent()).trim() === '3', 'El botón + del stepper suma otra unidad (×3)');
    check((await page.evaluate(() => cart.length)) === 3, 'cart[] tiene 3 filas tras el +');

    // Stepper "−": vuelve a 2
    await page.click('#drawer-items .menu-stepper-btn:not(.add)');
    await page.waitForTimeout(150);
    check((await page.locator('#drawer-items .menu-stepper-num').textContent()).trim() === '2', 'El botón − del stepper resta una unidad (vuelve a ×2)');

    const precioTotal = await page.locator('#drawer-items .cart-item-price').textContent();
    const precioUnit   = await page.evaluate(() => cart[0].precio);
    check(precioTotal.includes((precioUnit * 2).toFixed(2)), `El precio de la fila es el de 2 unidades (${precioTotal.trim()})`);

    // ── Verificar que el payload que se manda al backend arma 2 grupos
    //    completos (ISS-041), no un solo grupo con las líneas mezcladas.
    //    numerarGrupos() es la misma función que usan confirmarPedido() y
    //    confirmarReserva() para construir el payload real — se prueba
    //    directo en vez de completar todo el flujo de pago (Gap 17: este
    //    restaurante tiene "efectivo" activo, así que confirmarPedido() no
    //    crea la orden directo, pasa por la pantalla de pago primero).
    const gruposPayload = await page.evaluate(() => numerarGrupos(cart));
    const gruposDistintos = new Set(gruposPayload.map(i => i.grupo));
    check(gruposDistintos.size === 2, `El payload arma 2 grupos distintos, no uno mezclado (${gruposDistintos.size})`);
    check(gruposPayload.every(i => i.grupo != null), 'Ninguna línea del payload quedó con grupo sin definir');
    check(gruposPayload.length === (gruposPayload.length / 2) * 2 &&
          [...gruposDistintos].every(g => gruposPayload.filter(i => i.grupo === g).length === gruposPayload.length / 2),
          'Los 2 grupos tienen la misma cantidad de líneas (misma selección duplicada, no mezclada)');

    // ── Reservar: mismo atajo, mismo agrupado ──
    console.log('\n── Reservar: mismo atajo ──');
    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    await page.evaluate((menuId) => {
      const menu = resMenusDia.find(m => m.id === menuId);
      for (const s of menu.secciones) {
        const p = s.platos[0];
        if (p) selectMenuPlato('reservar', menu.id, s.id_seccion, p.id_componente, p.nombre, s.nombre_seccion, menu.precio, menu.id);
      }
      agregarMenu('reservar', menu.id, !!menu.elegible, menu.precio, menu.nombre);
    }, setup.menuId);
    await page.waitForTimeout(200);

    await page.click('#atajo-repetir-menu button');
    await page.waitForTimeout(200);
    check((await page.evaluate(() => resCart.length)) === 2, 'resCart[] también queda con 2 filas tras el atajo');

    await page.click('.res-bar-btn');
    await page.waitForTimeout(300);
    const filasRes = await page.locator('#res-cart-items .res-cart-item').count();
    check(filasRes === 1, `El drawer de reserva también agrupa en una fila (${filasRes})`);
    const stepperResNum = await page.locator('#res-cart-items .menu-stepper-num').textContent();
    check(stepperResNum.trim() === '2', `Stepper de reserva marca ×2 (${stepperResNum.trim()})`);

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
