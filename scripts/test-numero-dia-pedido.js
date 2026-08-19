/**
 * E2E de ISS-050 — el número de pedido que ve el comensal tiene que ser el
 * mismo que ve la dueña (numero_dia: 1, 2, 3… por día), no el id crudo de
 * la tabla (que sigue de corrido y puede ser #96 aunque hoy haya 22
 * pedidos).
 *
 * Uso: PORT=3399 node scripts/test-numero-dia-pedido.js
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
    // ── Setup como owner: efectivo activo + menú del día usable ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    const setup = await page.evaluate(async () => {
      await api('PATCH', '/api/menu/config/pagos', { efectivo_activo: false }); // primer pedido: sin ningún método → camino "sin pago"
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
    console.log(`Setup OK — restaurante #${setup.restauranteId}, menú #${setup.menuId}`);

    async function armarYAgregarMenu(mesa) {
      await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}&mesa=${mesa}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
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
    }

    // ════════════════════════════════════════════════
    // Pedido 1 — camino SIN pantalla de pago (restaurante sin métodos activos)
    // ════════════════════════════════════════════════
    console.log('\n── Pedido 1: camino sin pantalla de pago ──');
    await armarYAgregarMenu(11);
    await page.fill('#nombre-cliente', 'ISS-050 sin pago');
    await page.click('#btn-confirmar');
    await page.waitForTimeout(1200);
    check(await page.locator('#confirm-screen').evaluate(el => el.classList.contains('show')), 'Llega a la pantalla de confirmación');

    const numeroMostrado1 = await page.locator('#confirm-sub .confirm-num').textContent();
    console.log(`  Número mostrado al comensal: ${numeroMostrado1.trim()}`);
    check(/^#\d+$/.test(numeroMostrado1.trim()), 'El número mostrado tiene forma de número (no vacío)');

    const owner1 = await page.evaluate(async (nombre) => {
      const r = await fetch('/api/orders', { credentials: 'same-origin' }).then(r => r.json());
      return r.find(o => o.nombre_cliente === nombre);
    }, 'ISS-050 sin pago');
    check(!!owner1, 'La orden aparece en la lista del owner');
    check(numeroMostrado1.trim() === `#${owner1.numero_dia}`,
      `El número que ve el comensal (${numeroMostrado1.trim()}) coincide con numero_dia del owner (#${owner1.numero_dia})`);
    console.log(`  (referencia: id crudo #${owner1.id}, numero_dia #${owner1.numero_dia})`);

    // ════════════════════════════════════════════════
    // Pedido 2 — camino CON pago (efectivo), siguiente en la fila del mismo día
    // ════════════════════════════════════════════════
    console.log('\n── Pedido 2: camino con pago (efectivo) ──');
    // Seguimos en el contexto de menu.html (sin utils.js/api()) — fetch directo,
    // la cookie del owner sigue viva en este mismo contexto de browser.
    await page.evaluate(async () => {
      await fetch('/api/menu/config/pagos', {
        method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ efectivo_activo: true })
      });
    });

    await armarYAgregarMenu(12);
    await page.fill('#nombre-cliente', 'ISS-050 con pago');
    await page.click('#btn-confirmar');
    await page.waitForTimeout(500);
    check(await page.locator('#pago-screen').evaluate(el => el.classList.contains('show')), 'Llega a "¿Cómo vas a pagar?"');
    await page.click('#btn-met-efectivo');
    await page.waitForTimeout(300);
    await page.click('#btn-ya-pague');
    await page.waitForTimeout(400);
    await page.click('#btn-repaso-confirmar');
    await page.waitForTimeout(1200);
    check(await page.locator('#confirm-screen').evaluate(el => el.classList.contains('show')), 'Llega a la pantalla de confirmación');

    const numeroMostrado2 = await page.locator('#confirm-sub .confirm-num').textContent();
    const owner2 = await page.evaluate(async (nombre) => {
      const r = await fetch('/api/orders', { credentials: 'same-origin' }).then(r => r.json());
      return r.find(o => o.nombre_cliente === nombre);
    }, 'ISS-050 con pago');
    check(!!owner2, 'La segunda orden aparece en la lista del owner');
    check(numeroMostrado2.trim() === `#${owner2.numero_dia}`,
      `El número que ve el comensal (${numeroMostrado2.trim()}) coincide con numero_dia del owner (#${owner2.numero_dia})`);
    check(owner2.numero_dia === owner1.numero_dia + 1,
      `Es correlativo al pedido anterior del mismo día (${owner1.numero_dia} → ${owner2.numero_dia})`);

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
