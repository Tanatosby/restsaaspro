/**
 * E2E de ISS-047 — un menú para llevar y otro para comer en el local.
 * Reproduce el caso real del día 5 del piloto punta a punta: el comensal arma
 * el pedido desde el QR marcando modalidades distintas, y se verifica que el
 * backend las guarde por separado, que cobre UN solo tapper (no dos) y que la
 * cocina vea cuál de los dos menús se envasa.
 *
 * Uso: PORT=3399 node scripts/test-modalidad-mixta.js
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
    // ── Preparar: menú del día con platos + tapper con costo ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    const setup = await page.evaluate(async () => {
      const cfg = await api('GET', '/api/menu/restaurante/config');
      await api('PATCH', '/api/menu/config/modalidades', {
        para_llevar_activo: true, delivery_activo: !!cfg.delivery_activo,
        costo_tapper: 1.0, tarifa_delivery: cfg.tarifa_delivery ?? 0,
      });
      // Un menú sirve solo si se puede agregar al carrito: TODA sección
      // obligatoria necesita al menos un plato, si no agregarMenu() lo rechaza.
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
      return { menuId: menu.id, restauranteId: sesion.restaurant_id, costoTapper: 1.0 };
    });
    if (setup.error) throw new Error(setup.error);
    console.log(`Setup OK — menú #${setup.menuId}, tapper S/ 1.00`);

    // ── El comensal: carrito con 2 menús, uno de cada modalidad ──
    console.log('\n── Lado del comensal ──');
    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}&mesa=7`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const carrito = await page.evaluate(async (menuId) => {
      const menu = menusDia.find(m => m.id === menuId);
      // Armar 2 instancias del mismo menú eligiendo el primer plato de cada sección
      for (let n = 0; n < 2; n++) {
        for (const s of menu.secciones) {
          const p = s.platos[0];
          if (p) selectMenuPlato('pedir', menu.id, s.id_seccion, p.id_componente, p.nombre, s.nombre_seccion, menu.precio, menu.id);
        }
        agregarMenu('pedir', menu.id, !!menu.elegible, menu.precio, menu.nombre);
      }
      // El segundo se lo lleva
      toggleModalidadItem(1);
      return {
        items:      cart.map(i => i.modalidad),
        resumen:    getModalidadOrden(),
        cargo:      contarTappersLlevar(cart),
        masterLocal:  document.getElementById('mod-all-local').classList.contains('on'),
        masterLlevar: document.getElementById('mod-all-llevar').classList.contains('on'),
        hint:       document.getElementById('mod-mixto-hint').textContent,
      };
    }, setup.menuId);

    check(carrito.items.length === 2, `2 menús en el carrito (${carrito.items.length})`);
    check(carrito.items[0] === 'en_local' && carrito.items[1] === 'para_llevar',
      `Cada menú con su modalidad (${carrito.items.join(' | ')})`);
    check(carrito.resumen === 'mixto', `El pedido se resume como mixto (${carrito.resumen})`);
    check(carrito.cargo === 1, `Se cobra UN solo tapper, no dos (${carrito.cargo})`);

    console.log('\n── El selector de arriba refleja el estado ──');
    check(!carrito.masterLocal && !carrito.masterLlevar, 'Mezclado: ningún botón queda marcado');
    check(/Mezclado — 1 de 2/.test(carrito.hint), `El hint dice cuántos se llevan ("${carrito.hint}")`);

    const master = await page.evaluate(() => {
      setModalidadTodo('para_llevar');
      const todoLlevar = {
        items: cart.map(i => i.modalidad),
        on:    document.getElementById('mod-all-llevar').classList.contains('on'),
        cargo: contarTappersLlevar(cart),
      };
      setModalidadTodo('en_local');
      const todoLocal = {
        items: cart.map(i => i.modalidad),
        on:    document.getElementById('mod-all-local').classList.contains('on'),
        cargo: contarTappersLlevar(cart),
      };
      toggleModalidadItem(1);   // volver al mixto para enviarlo
      return { todoLlevar, todoLocal };
    });
    check(master.todoLlevar.items.every(m => m === 'para_llevar') && master.todoLlevar.on,
      `«Todo para llevar» marca los dos de una (cobra ${master.todoLlevar.cargo} tappers)`);
    check(master.todoLocal.items.every(m => m === 'en_local') && master.todoLocal.on,
      `«Todo aquí» los devuelve a los dos (cobra ${master.todoLocal.cargo} tappers)`);

    // ── Enviar el pedido ──
    console.log('\n── Lo que guardó el backend ──');
    const enviado = await page.evaluate(async () => {
      const cartaItems = cart.filter(i => i.type === 'carta')
        .map(i => ({ id_plato_carta: i.platoId, cantidad: i.cantidad, modalidad: i.modalidad }));
      const r = await fetch('/api/public/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_restaurante: parseInt(restauranteId),
          mesa: 7,
          nombre_cliente: 'Prueba ISS-047',
          modalidad: getModalidadOrden(),
          carta_items: cartaItems,
          menu_items: numerarGrupos(cart),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'falló el POST');
      return data;
    });
    check(!!enviado.id_orden, `Orden creada (#${enviado.id_orden})`);

    // api() es un global de owner.html, no existe en menu.html
    await page.goto(`${BASE}/owner.html`, { waitUntil: 'networkidle' });
    const guardado = await page.evaluate(async (ordenId) => {
      const { ordenes } = await api('GET', '/api/orders/cola');
      const o = ordenes.find(x => x.id === ordenId);
      const porGrupo = {};
      for (const i of (o.menu_items || [])) porGrupo[i.grupo] = i.modalidad;
      return { modalidad: o.modalidad, cargo: o.cargo_modalidad, porGrupo };
    }, enviado.id_orden);

    check(guardado.modalidad === 'mixto', `La orden queda marcada 'mixto' (${guardado.modalidad})`);
    check(guardado.porGrupo[1] === 'en_local' && guardado.porGrupo[2] === 'para_llevar',
      `Cada instancia guardó la suya (menú 1: ${guardado.porGrupo[1]}, menú 2: ${guardado.porGrupo[2]})`);
    // El cargo no viaja en /api/orders/cola, así que se lee de la BD: es el
    // número que de verdad se le cobra al comensal.
    const fila = require('../config/database')
      .prepare('SELECT cargo_modalidad, modalidad FROM ordenes WHERE id = ?')
      .get(enviado.id_orden);
    check(fila.cargo_modalidad === 1.0,
      `Cobró S/ 1.00 de envase, no S/ 2.00 (S/ ${Number(fila.cargo_modalidad).toFixed(2)})`);
    check(fila.modalidad === 'mixto', `En la BD la orden es 'mixto' (${fila.modalidad})`);

    // ── La cocina ──
    console.log('\n── Lo que ve la cocina ──');
    await page.evaluate(() => showPanel('cocina'));
    await page.waitForTimeout(1200);

    const ticket = await page.evaluate(id => {
      const card = document.getElementById(`cocina-ord-${id}`);
      if (!card) return null;
      return {
        resumen: card.textContent.match(/🥡\s*\d+\s*de\s*\d+\s*para llevar/)?.[0] || '',
        heads:   [...card.querySelectorAll('.menu-grupo-head')].map(h => h.textContent.trim()),
      };
    }, enviado.id_orden);

    check(!!ticket, 'El pedido aparece en la cola de cocina');
    if (ticket) {
      check(/1 de 2 para llevar/.test(ticket.resumen), `Badge de resumen arriba ("${ticket.resumen}")`);
      check(ticket.heads.length === 2, `Los 2 menús van separados (${ticket.heads.length})`);
      check(/Aquí/.test(ticket.heads[0]) && /Llevar/.test(ticket.heads[1]),
        `Cada menú dice cuál se envasa (${ticket.heads.join(' || ')})`);
    }

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
