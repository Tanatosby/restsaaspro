/**
 * E2E de ISS-048 — volver de "¿Cómo vas a pagar?" a la carta, en pedido y
 * en reserva. Antes no había forma de retroceder: el comensal que se
 * olvidaba de un ítem quedaba varado hasta pagar o cerrar la pestaña.
 *
 * Uso: PORT=3399 node scripts/test-iss048-volver-pago.js
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

// Nombre único por corrida — si no, dos corridas seguidas ven la orden que
// dejó la anterior y "no se creó ninguna orden con volver" da falso positivo.
const NOMBRE_CLIENTE = `Cliente de prueba ISS-048 ${Date.now()}`;

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
    // ── Setup como owner: efectivo activo + menú del día usable ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    const setup = await page.evaluate(async () => {
      await api('PATCH', '/api/menu/config/pagos', { efectivo_activo: true });

      const usable = m => {
        const secs = m.secciones || [];
        return secs.some(s => (s.platos || []).length)
            && secs.filter(s => s.requerido).every(s => (s.platos || []).length);
      };
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const menus = await api('GET', `/api/menu/menus-dia?dia=${hoy}`);
      let menu = menus.find(usable);
      if (!menu) {
        const todos = await api('GET', '/api/menu/menus-dia');
        const fuente = todos.find(usable);
        if (!fuente) return { error: 'No hay ningún menú usable' };
        await api('POST', `/api/menu/menus-dia/${fuente.id}/copiar`, { dia: hoy });
        const nuevos = await api('GET', `/api/menu/menus-dia?dia=${hoy}`);
        menu = nuevos.find(usable);
        if (!menu) return { error: 'La copia del menú no quedó usable' };
      }
      const sesion = leerSesion();
      return { menuId: menu.id, restauranteId: sesion.restaurant_id };
    });
    if (setup.error) throw new Error(setup.error);
    console.log(`Setup OK — restaurante #${setup.restauranteId}, menú #${setup.menuId}, efectivo activo`);

    // ════════════════════════════════════════════════
    // PEDIDO — el drawer se cierra al entrar a pago; volver debe reabrirlo
    // ════════════════════════════════════════════════
    console.log('\n── Pedido: armar carrito y llegar a "¿Cómo vas a pagar?" ──');
    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}&mesa=7`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    await page.evaluate((menuId) => {
      const menu = menusDia.find(m => m.id === menuId);
      for (const s of menu.secciones) {
        const p = s.platos[0];
        if (p) selectMenuPlato('pedir', menu.id, s.id_seccion, p.id_componente, p.nombre, s.nombre_seccion, menu.precio, menu.id);
      }
      agregarMenu('pedir', menu.id, !!menu.elegible, menu.precio, menu.nombre);
    }, setup.menuId);
    await page.waitForTimeout(300);

    // #btn-confirmar vive dentro del drawer — hay que abrirlo antes de poder tocarlo.
    await page.evaluate(() => openDrawer());
    await page.waitForTimeout(300);
    await page.fill('#nombre-cliente', NOMBRE_CLIENTE);
    await page.click('#btn-confirmar');
    await page.waitForTimeout(600);

    check(await page.locator('#pago-screen').evaluate(el => el.classList.contains('show')), 'Llega a "¿Cómo vas a pagar?"');
    check(!(await page.locator('#cart-drawer').evaluate(el => el.classList.contains('open'))), 'El drawer se cerró al entrar (comportamiento previo)');

    console.log('\n── Touch target del botón ← ──');
    const alturaBoton = await page.locator('#pago-screen button[aria-label="Volver"]').evaluate(el => el.getBoundingClientRect().height);
    check(alturaBoton >= 44, `Botón ← ≥44px (${Math.round(alturaBoton)}px) — mismo criterio que el de #repaso-screen`);

    console.log('\n── Volver con el botón ← ──');
    await page.click('#pago-screen button[aria-label="Volver"]');
    await page.waitForTimeout(400);

    check(!(await page.locator('#pago-screen').evaluate(el => el.classList.contains('show'))), 'La pantalla de pago se oculta');
    check(await page.locator('#cart-drawer').evaluate(el => el.classList.contains('open')), 'El drawer del carrito se reabre');
    check((await page.locator('#cart-count').textContent()).trim() === '1', 'El ítem del carrito sigue ahí (no se perdió ni se creó la orden)');

    console.log('\n── Nada se creó todavía en el backend ──');
    // Sigue siendo la cookie del owner (mismo contexto de browser) — menu.html
    // no carga api()/utils.js, así que acá va fetch directo.
    const ordenesTrasVolver = await page.evaluate(async (nombre) => {
      const r = await fetch('/api/orders', { credentials: 'same-origin' }).then(r => r.json());
      return r.filter(o => o.nombre_cliente === nombre).length;
    }, NOMBRE_CLIENTE);
    check(ordenesTrasVolver === 0, 'No se creó ninguna orden con volver');

    console.log('\n── Confirmar de nuevo funciona igual después de volver ──');
    await page.click('#btn-confirmar');
    await page.waitForTimeout(600);
    check(await page.locator('#pago-screen').evaluate(el => el.classList.contains('show')), 'Vuelve a llegar a la pantalla de pago');
    await page.click('#btn-met-efectivo');
    await page.waitForTimeout(400);
    await page.click('#btn-ya-pague');
    await page.waitForTimeout(500);
    // Repaso final → confirmar de verdad
    const hayRepaso = await page.locator('#repaso-screen').evaluate(el => el.classList.contains('show')).catch(() => false);
    if (hayRepaso) {
      await page.click('#btn-repaso-confirmar');
      await page.waitForTimeout(1000);
    }
    check(await page.locator('#confirm-screen').evaluate(el => el.classList.contains('show')), 'El pedido se confirma normalmente tras haber usado "volver" antes');

    // ════════════════════════════════════════════════
    // RESERVA — no cierra nada al entrar a pago; volver solo oculta la pantalla
    // ════════════════════════════════════════════════
    console.log('\n── Reserva: armar carrito y llegar a "¿Cómo vas a pagar?" ──');
    // Sin `mesa` en la URL, menu.html arranca en modo "reservar" por defecto.
    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const hoy = await page.evaluate(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()));
    await page.fill('#res-fecha', hoy);
    await page.waitForTimeout(600);

    await page.evaluate((menuId) => {
      const menu = resMenusDia.find(m => m.id === menuId);
      for (const s of menu.secciones) {
        const p = s.platos[0];
        if (p) selectMenuPlato('reservar', menu.id, s.id_seccion, p.id_componente, p.nombre, s.nombre_seccion, menu.precio, menu.id);
      }
      agregarMenu('reservar', menu.id, !!menu.elegible, menu.precio, menu.nombre);
    }, setup.menuId);
    await page.waitForTimeout(300);

    // Día 9 del piloto: los datos de la reserva (nombre, hora, teléfono) ya
    // no van inline en #res-panel — viven en #res-drawer, que se abre desde
    // la barra sticky de abajo, igual que el carrito de "Pedir".
    await page.click('.res-bar-btn');
    await page.waitForTimeout(400);

    await page.fill('#res-nombre', 'Reserva de prueba ISS-048');
    await page.click('#btn-reservar');
    await page.waitForTimeout(600);

    check(await page.locator('#pago-screen').evaluate(el => el.classList.contains('show')), 'La reserva también llega a "¿Cómo vas a pagar?"');

    console.log('\n── Volver desde la reserva ──');
    await page.click('#pago-screen button[aria-label="Volver"]');
    await page.waitForTimeout(400);

    check(!(await page.locator('#pago-screen').evaluate(el => el.classList.contains('show'))), 'La pantalla de pago se oculta');
    check(await page.locator('#res-drawer').evaluate(el => el.classList.contains('open')), 'El drawer de la reserva se reabre');
    const resCartLen = await page.evaluate(() => resCart.length);
    check(resCartLen === 1, `El carrito de la reserva no se perdió (${resCartLen} ítem)`);

    console.log('\n── Sin overflow horizontal a 360px ──');
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'Sin scroll horizontal');

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
