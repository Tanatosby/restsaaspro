/**
 * E2E de ISS-079 — homologar "Cobrar": para llevar/delivery debía pasar por
 * la pestaña "Cobrar" antes de cerrarse, igual que las órdenes/reservas con
 * mesa, en vez de completarse directo desde "Listos" en un solo toque.
 *
 * Pedido explícito del usuario, día 13 del piloto: "que tanto reservas como
 * órdenes aparezcan en cobrar para saber si pagaron o no".
 *
 * Dos partes:
 *  1. btnOrden()/btnReserva() en zona "Listos" — antes se bifurcaban por
 *     modalidad (mesa → "Entregar/Entregado", para llevar → cobro directo).
 *     Ahora ambas ramas hacen la misma parada intermedia; solo cambia la
 *     etiqueta ("🍽 Entregar/Entregado" vs "📦 Recogido").
 *  2. Punta a punta con una orden y una reserva para llevar reales: deben
 *     aparecer en la zona "Cobrar" (no completarse solas al marcar "Listo").
 *
 * Uso: PORT=3399 node scripts/test-cobrar-homologado.js
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

    const novCerrar = page.locator('.nov-btn-cerrar');
    if (await novCerrar.count() > 0) await novCerrar.click();

    console.log('\n── btnOrden()/btnReserva(): misma parada para ambas modalidades ──');
    const botones = await page.evaluate(() => {
      const ordenMesa    = btnOrden({ id: 1, modalidad: 'en_local',    es_listo: 1 }, 'listos');
      const ordenLlevar  = btnOrden({ id: 2, modalidad: 'para_llevar', es_listo: 1 }, 'listos');
      const ordenCobrar  = btnOrden({ id: 1, modalidad: 'en_local',    es_entregado: 1 }, 'cobrar');
      const resMesa      = btnReserva({ id: 3, modalidad: 'en_local',    es_listo: 1 }, 'listos');
      const resLlevar    = btnReserva({ id: 4, modalidad: 'para_llevar', es_listo: 1 }, 'listos');
      const resDelivery  = btnReserva({ id: 5, modalidad: 'delivery',    es_listo: 1 }, 'listos');
      const resCobrar    = btnReserva({ id: 3, modalidad: 'en_local',    es_cliente_llego: 1 }, 'cobrar');
      return { ordenMesa, ordenLlevar, ordenCobrar, resMesa, resLlevar, resDelivery, resCobrar };
    });

    check(/es_entregado/.test(botones.ordenLlevar) && /📦 Recogido/.test(botones.ordenLlevar),
      'Orden para llevar en "Listos": marca es_entregado con la etiqueta "📦 Recogido" (antes cobraba directo)');
    check(/es_entregado/.test(botones.ordenMesa) && /🍽 Entregar/.test(botones.ordenMesa),
      'Orden con mesa en "Listos" sigue igual: "🍽 Entregar" (sin regresión)');
    check(/💰 Cobrar/.test(botones.ordenCobrar), 'La orden entregada sí aparece en "Cobrar"');

    check(/es_cliente_llego/.test(botones.resLlevar) && /📦 Recogido/.test(botones.resLlevar),
      'Reserva para llevar en "Listos": marca es_cliente_llego con "📦 Recogido" (antes completaba directo)');
    check(/es_cliente_llego/.test(botones.resDelivery) && /📦 Recogido/.test(botones.resDelivery),
      'Reserva delivery en "Listos": mismo criterio que para llevar');
    check(/es_cliente_llego/.test(botones.resMesa) && /🍽 Entregado/.test(botones.resMesa),
      'Reserva con mesa en "Listos" sigue igual: "🍽 Entregado" (sin regresión)');
    check(/💰 Completar/.test(botones.resCobrar), 'La reserva con cliente llegado sí aparece en "Cobrar"');

    // ── Punta a punta: una orden y una reserva para llevar reales ──
    console.log('\n── Punta a punta: orden para llevar real ──');
    const setup = await page.evaluate(async () => {
      await api('PATCH', '/api/menu/config/modalidades', {
        para_llevar_activo: true, delivery_activo: true, costo_tapper: 1.5, tarifa_delivery: 3,
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
        if (!fuente) return { error: 'No hay ningún menú usable' };
        await api('POST', `/api/menu/menus-dia/${fuente.id}/copiar`, { dia: hoy });
        menu = (await api('GET', `/api/menu/menus-dia?dia=${hoy}`)).find(usable);
      }
      const sesion = leerSesion();
      const menuItems = menu.secciones
        .filter(s => (s.platos || []).length)
        .map(s => ({ id_menu_dia: menu.id, id_componente: s.platos[0].id_componente, cantidad: 1, modalidad: 'para_llevar' }));

      const orden = await fetch('/api/public/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_restaurante: sesion.restaurant_id, mesa: null,
          nombre_cliente: 'Prueba ISS-079 (orden)', modalidad: 'para_llevar', menu_items: menuItems,
        }),
      }).then(r => r.json());

      const reserva = await fetch('/api/public/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_restaurante: sesion.restaurant_id, nombre_cliente: 'Prueba ISS-079 (reserva)',
          fecha: hoy, modalidad: 'para_llevar', menu_items: menuItems,
        }),
      }).then(r => r.json());

      return { idOrden: orden.id_orden, idReserva: reserva.id_reserva, error: orden.error || reserva.error };
    });
    if (setup.error) throw new Error(setup.error);
    console.log(`Setup OK — orden #${setup.idOrden}, reserva #${setup.idReserva}, ambas para llevar`);

    const recorrido = await page.evaluate(async ({ idOrden, idReserva }) => {
      showPanel('pedidos');
      await loadColaDia();

      // Confirmar la reserva y llevar ambas a "Listo"
      await accionRapidaReserva(idReserva, 'es_confirmada');
      await accionRapidaOrden(idOrden, 'es_en_cocina');
      await accionRapidaReserva(idReserva, 'es_en_cocina');
      await accionRapidaOrden(idOrden, 'es_listo');
      await accionRapidaReserva(idReserva, 'es_listo');
      await loadColaDia();

      const zonasListo = clasificarZonas(_cache.ordenes, _cache.reservas);
      const enListosOrden  = zonasListo.listos.some(x => x.tipo === 'orden'  && x.datos.id === idOrden);
      const enListosReserva = zonasListo.listos.some(x => x.tipo === 'reserva' && x.datos.id === idReserva);
      const enCobrarAntes  = zonasListo.cobrar.some(x => x.datos.id === idOrden || x.datos.id === idReserva);

      // El paso nuevo: marcar "Recogido" — antes esto ni existía para para
      // llevar, se cobraba directo desde "Listos".
      await accionRapidaOrden(idOrden, 'es_entregado');
      await accionRapidaReserva(idReserva, 'es_cliente_llego');
      await loadColaDia();

      const zonasCobrar = clasificarZonas(_cache.ordenes, _cache.reservas);
      const enCobrarOrden   = zonasCobrar.cobrar.some(x => x.tipo === 'orden'   && x.datos.id === idOrden);
      const enCobrarReserva = zonasCobrar.cobrar.some(x => x.tipo === 'reserva' && x.datos.id === idReserva);
      const desaparecieron  = !zonasCobrar.pendientes.concat(zonasCobrar.cocina, zonasCobrar.listos)
        .some(x => x.datos.id === idOrden || x.datos.id === idReserva);

      // Cerrar el ciclo: cobrar ambas
      await cobrarColaOrden(idOrden);
      await cobrarColaReserva(idReserva);
      await loadColaDia();
      const zonasFinal = clasificarZonas(_cache.ordenes, _cache.reservas);
      const siguenActivas = zonasFinal.pendientes.concat(zonasFinal.cocina, zonasFinal.listos, zonasFinal.cobrar)
        .some(x => x.datos.id === idOrden || x.datos.id === idReserva);

      return { enListosOrden, enListosReserva, enCobrarAntes, enCobrarOrden, enCobrarReserva, desaparecieron, siguenActivas };
    }, setup);

    check(recorrido.enListosOrden && recorrido.enListosReserva, 'Ambas llegan a "Listos" normalmente');
    check(!recorrido.enCobrarAntes, 'Todavía NO están en "Cobrar" al llegar a "Listos" (falta el paso "Recogido")');
    check(recorrido.enCobrarOrden, 'La orden para llevar SÍ aparece en "Cobrar" tras "📦 Recogido"');
    check(recorrido.enCobrarReserva, 'La reserva para llevar SÍ aparece en "Cobrar" tras "📦 Recogido"');
    check(recorrido.desaparecieron, 'Ninguna quedó pegada en zonas anteriores');
    check(!recorrido.siguenActivas, 'Al cobrar/completar, ambas salen de la Cola del día (quedan pagadas)');

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
