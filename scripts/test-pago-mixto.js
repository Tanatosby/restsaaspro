/**
 * E2E de ISS-078 — el total del carrito no coincidía con el de la pantalla
 * de pago cuando el carrito era mixto (1 menú para llevar + 1 en el local).
 *
 * Reporte real del usuario (día 13 del piloto): el carrito mostraba S/ 23.50
 * y la pantalla "¿Cómo vas a pagar?" mostraba S/ 22.00 — el comensal paga de
 * menos por Yape/Plin aunque el backend sí registra el total correcto.
 *
 * Causa: confirmarPedido() calculaba el cargo del tapper con
 * `getModalidadOrden() === 'para_llevar'` (todo o nada, previo a ISS-047) en
 * vez de contarTappersLlevar() (por ítem, lo que ya usa updateCart()). Con un
 * carrito mixto el resumen da 'mixto' y el cargo se caía a 0.
 *
 * Este test arma ese carrito mixto real, activa un método de pago (yape) y
 * compara el total mostrado en el carrito contra el que arma la pantalla de
 * pago — deben coincidir siempre, sin importar la modalidad de cada ítem.
 *
 * Uso: PORT=3399 node scripts/test-pago-mixto.js
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
    // ── Preparar: tapper con costo + Yape activo (para forzar la pantalla de pago) ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    const setup = await page.evaluate(async () => {
      await api('PATCH', '/api/menu/config/modalidades', {
        para_llevar_activo: true, delivery_activo: false,
        costo_tapper: 1.5, tarifa_delivery: 0,
      });
      await api('PATCH', '/api/menu/config/pagos', {
        yape_activo: true, yape_telefono: '999888777',
        plin_activo: false, plin_telefono: '',
        efectivo_activo: false,
      });

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
        if (!fuente) return { error: 'No hay ningún menú con todas sus secciones obligatorias servidas' };
        await api('POST', `/api/menu/menus-dia/${fuente.id}/copiar`, { dia: hoy });
        const nuevos = await api('GET', `/api/menu/menus-dia?dia=${hoy}`);
        menu = nuevos.find(usable);
        if (!menu) return { error: 'La copia del menú no quedó usable' };
      }
      const sesion = leerSesion();
      return { menuId: menu.id, restauranteId: sesion.restaurant_id };
    });
    if (setup.error) throw new Error(setup.error);
    console.log(`Setup OK — menú #${setup.menuId}, tapper S/ 1.50, Yape activo`);

    // ── El comensal: carrito mixto (1 en local + 1 para llevar) ──
    console.log('\n── Armar el carrito mixto ──');
    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}&mesa=9`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const resultado = await page.evaluate(async (menuId) => {
      const menu = menusDia.find(m => m.id === menuId);
      for (let n = 0; n < 2; n++) {
        for (const s of menu.secciones) {
          const p = s.platos[0];
          if (p) selectMenuPlato('pedir', menu.id, s.id_seccion, p.id_componente, p.nombre, s.nombre_seccion, menu.precio, menu.id);
        }
        agregarMenu('pedir', menu.id, !!menu.elegible, menu.precio, menu.nombre);
      }
      toggleModalidadItem(1);   // el segundo se lo lleva → carrito mixto

      const itemsTotal        = cart.reduce((s, i) => s + i.precio, 0);
      const totalCarritoTexto = document.getElementById('cart-total-bar').textContent;
      const resumenModalidad  = getModalidadOrden();

      document.getElementById('nombre-cliente').value = 'Prueba ISS-078';
      await confirmarPedido();   // con Yape activo, esto arma pagoPendiente y muestra #pago-screen

      return {
        resumenModalidad,
        itemsTotal,
        totalCarritoTexto,
        totalPagoTexto:  document.getElementById('pago-total').textContent,
        pagoPendienteTotal: pagoPendiente ? pagoPendiente.total : null,
        pagoScreenVisible: document.getElementById('pago-screen').style.display !== 'none',
      };
    }, setup.menuId);

    const esperado = Number((resultado.itemsTotal + 1.5).toFixed(2));

    check(resultado.resumenModalidad === 'mixto', `El carrito es mixto (${resultado.resumenModalidad})`);
    check(resultado.pagoScreenVisible, 'La pantalla de pago se muestra');
    check(resultado.totalPagoTexto === resultado.totalCarritoTexto,
      `El total del carrito y el de la pantalla de pago coinciden (carrito: ${resultado.totalCarritoTexto}, pago: ${resultado.totalPagoTexto})`);
    check(resultado.pagoPendienteTotal === esperado,
      `El cargo del tapper (S/ 1.50) SÍ se cobra en un carrito mixto: esperado ${esperado}, obtenido ${resultado.pagoPendienteTotal}`);

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
