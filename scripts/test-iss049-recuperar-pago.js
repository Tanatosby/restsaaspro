/**
 * E2E de ISS-049 — recuperar el pedido si la pestaña se recarga sola
 * mientras el comensal salió a pagar (Yape/Plin). En un celular de gama
 * media, Chrome puede descargar la pestaña de fondo y recargarla de cero al
 * volver — antes esto perdía el carrito entero y obligaba a rehacer todo.
 *
 * `page.reload()` simula exactamente ese caso: borra todo el estado en
 * memoria (igual que Chrome matando la pestaña) pero conserva localStorage
 * (igual que Chrome conserva el storage del origen).
 *
 * Uso: PORT=3399 node scripts/test-iss049-recuperar-pago.js
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
// dejó la anterior y "se creó UNA sola orden" da falso positivo.
const NOMBRE_CLIENTE = `Cliente ISS-049 ${Date.now()}`;

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
    // Armar el pedido y llegar a "elegir método"
    // ════════════════════════════════════════════════
    console.log('\n── Armar carrito y elegir "efectivo" ──');
    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}&mesa=9`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    await page.evaluate((menuId) => {
      const menu = menusDia.find(m => m.id === menuId);
      for (const s of menu.secciones) {
        const p = s.platos[0];
        if (p) selectMenuPlato('pedir', menu.id, s.id_seccion, p.id_componente, p.nombre, s.nombre_seccion, menu.precio, menu.id);
      }
      agregarMenu('pedir', menu.id, !!menu.elegible, menu.precio, menu.nombre);
      openDrawer();
    }, setup.menuId);
    await page.waitForTimeout(300);

    await page.fill('#nombre-cliente', NOMBRE_CLIENTE);
    await page.click('#btn-confirmar');
    await page.waitForTimeout(500);
    check(await page.locator('#pago-screen').evaluate(el => el.classList.contains('show')), 'Llega a "¿Cómo vas a pagar?"');

    await page.click('#btn-met-efectivo');
    await page.waitForTimeout(300);

    const totalAntes = await page.locator('#pago-total').textContent();
    check(await page.evaluate(() => !!localStorage.getItem('mp-pago-pendiente')), 'Al elegir método, ya quedó guardado en localStorage');

    // ════════════════════════════════════════════════
    // Simular que la pestaña se recarga sola (Chrome mata la pestaña de fondo)
    // ════════════════════════════════════════════════
    console.log('\n── Se recarga la pestaña (simula que Chrome la mató de fondo) ──');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    check(await page.locator('#pago-screen').evaluate(el => el.classList.contains('show')), 'Vuelve solo a "¿Cómo vas a pagar?" — no arranca vacío');
    check((await page.locator('#pago-total').textContent()) === totalAntes, `El total sigue siendo el mismo (${totalAntes})`);
    check(await page.locator('#btn-met-efectivo').evaluate(el => el.style.opacity === '1'), 'El método "efectivo" sigue marcado como elegido');
    check(await page.locator('#btn-ya-pague').isVisible(), 'El botón "Confirmar" del método ya está visible, sin tener que re-elegir');

    // ════════════════════════════════════════════════
    // El pedido se puede terminar de confirmar después de recuperarse
    // ════════════════════════════════════════════════
    console.log('\n── Confirmar después de recuperado — sin duplicar nada ──');
    await page.click('#btn-ya-pague');
    await page.waitForTimeout(500);
    await page.click('#btn-repaso-confirmar');
    await page.waitForTimeout(1200);
    check(await page.locator('#confirm-screen').evaluate(el => el.classList.contains('show')), 'El pedido se confirma normalmente tras recuperarse');
    check(!(await page.evaluate(() => !!localStorage.getItem('mp-pago-pendiente'))), 'Se limpió el guardado local al confirmar con éxito');

    const ordenesCreadas = await page.evaluate(async (nombre) => {
      const r = await fetch('/api/orders', { credentials: 'same-origin' }).then(r => r.json());
      return r.filter(o => o.nombre_cliente === nombre).length;
    }, NOMBRE_CLIENTE);
    check(ordenesCreadas === 1, `Se creó UNA sola orden, no duplicada (${ordenesCreadas})`);

    // ════════════════════════════════════════════════
    // Después de confirmar, un reload nuevo no debe recuperar nada viejo
    // ════════════════════════════════════════════════
    console.log('\n── Tras confirmar, un reload no trae de vuelta un pedido viejo ──');
    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}&mesa=9`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    check(!(await page.locator('#pago-screen').evaluate(el => el.classList.contains('show'))), 'La pantalla de pago no reaparece sola en una visita nueva');

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
