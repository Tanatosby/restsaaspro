/**
 * E2E de pensionista.html (Fase 2 del módulo Pensionistas).
 * El backend y el panel del owner (Fase 1) ya estaban probados; esto cubre la
 * pantalla que faltaba: el pensionista pide con su saldo, sin pantalla de
 * pago, ve su saldo bajar en vivo, cancela y ve el saldo devuelto, se bloquea
 * si el saldo no alcanza, y queda afuera si el owner lo da de baja.
 *
 * Uso: PORT=3399 node scripts/test-pensionista-cliente.js
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

const sufijo = Date.now();
const PASS_P = 'Pension2026!';

function nuevoConsoleWatcher(page, errors) {
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (/\/uploads\//.test(url) && /Failed to load resource/.test(m.text())) return;
    errors.push(m.text());
  });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
}

// Contexto propio por pensionista — NUNCA el del owner: los contextos de
// Playwright comparten cookies entre todas sus páginas, así que loguearse acá
// con el contexto del owner pisaría su cookie de sesión a mitad del test y
// las llamadas de limpieza que siguen (dar de baja, etc.) fallarían con
// 403 "Insufficient permissions" sin que el motivo sea obvio.
async function loginComo(browser, email, password) {
  const ctx  = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#submit-btn');
  await page.waitForURL(/pensionista/, { timeout: 8000 });
  await page.waitForLoadState('networkidle');
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch();
  const ctxOwner = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const pageOwner = await ctxOwner.newPage();

  let idA = null, idB = null, idC = null;
  const emailA = `pen-cli-a-${sufijo}@menupro.tech`;
  const emailB = `pen-cli-b-${sufijo}@menupro.tech`;
  const emailC = `pen-cli-c-${sufijo}@menupro.tech`;

  try {
    // ── Setup como owner: modalidades, menú del día usable, un plato de carta ──
    await pageOwner.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await pageOwner.fill('#email', EMAIL);
    await pageOwner.fill('#password', PASS);
    await pageOwner.click('#submit-btn');
    await pageOwner.waitForURL(/owner/, { timeout: 8000 });
    await pageOwner.waitForLoadState('networkidle');

    const setup = await pageOwner.evaluate(async () => {
      const cfg = await api('GET', '/api/menu/restaurante/config');
      await api('PATCH', '/api/menu/config/modalidades', {
        para_llevar_activo: true, delivery_activo: !!cfg.delivery_activo,
        costo_tapper: cfg.costo_tapper ?? 1.0, tarifa_delivery: cfg.tarifa_delivery ?? 0,
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

      const carta = await api('GET', '/api/menu/platos-carta');
      const plato = carta.find(p => p.activo);
      if (!plato) return { error: 'No hay ningún plato de carta activo' };

      const sesion = leerSesion();
      return {
        menuId: menu.id, menuPrecio: menu.precio,
        platoId: plato.id, platoPrecio: plato.precio, platoNombre: plato.nombre,
        restauranteId: sesion.restaurant_id,
      };
    });
    if (setup.error) throw new Error(setup.error);
    console.log(`Setup OK — menú #${setup.menuId} (S/ ${setup.menuPrecio}), plato "${setup.platoNombre}" (S/ ${setup.platoPrecio})`);

    const totalEsperado = Number(setup.menuPrecio) + Number(setup.platoPrecio);

    // ── Crear los 3 pensionistas de prueba ──
    const creados = await pageOwner.evaluate(async ({ emailA, emailB, emailC, passP }) => {
      const a = await api('POST', '/api/pensionistas', { nombre: 'Cliente', apellido: 'Prueba A', email: emailA, password: passP, saldo_inicial: 50 });
      const b = await api('POST', '/api/pensionistas', { nombre: 'Cliente', apellido: 'Prueba B', email: emailB, password: passP, saldo_inicial: 2 });
      const c = await api('POST', '/api/pensionistas', { nombre: 'Cliente', apellido: 'Prueba C', email: emailC, password: passP, saldo_inicial: 30 });
      return { idA: a.id, idB: b.id, idC: c.id };
    }, { emailA, emailB, emailC, passP: PASS_P });
    idA = creados.idA; idB = creados.idB; idC = creados.idC;
    console.log(`Pensionistas de prueba creados: #${idA} (S/50), #${idB} (S/2), #${idC} (S/30)`);

    // ════════════════════════════════════════════════
    // A — flujo feliz: pedir, confirmar, ver en Mis pedidos, cancelar
    // ════════════════════════════════════════════════
    console.log('\n── Pensionista A: login y saldo ──');
    const errorsA = [];
    const { ctx: ctxA, page: pageA } = await loginComo(browser, emailA, PASS_P);
    nuevoConsoleWatcher(pageA, errorsA);
    check(/pensionista\.html/.test(pageA.url()), `Login redirige a pensionista.html (${pageA.url()})`);
    check((await pageA.locator('#pen-saldo-num').textContent()).trim() === 'S/ 50.00', 'La barra de saldo muestra S/ 50.00');
    check(!(await pageA.locator('#pen-saldo-bar').evaluate(el => el.classList.contains('low'))), 'Saldo alto: sin el estilo de aviso');
    check(await pageA.locator('#pen-aviso').isHidden(), 'Sin banner de saldo bajo');

    console.log('\n── Armar el pedido: un plato de carta + un menú del día ──');
    await pageA.evaluate(({ platoId, precio, nombre, menuId }) => {
      changeQty(platoId, precio, nombre, 1);
      const menu = menusDia.find(m => m.id === menuId);
      for (const s of menu.secciones) {
        const p = s.platos[0];
        if (p) selectMenuPlato('pedir', menu.id, s.id_seccion, p.id_componente, p.nombre, s.nombre_seccion, menu.precio, menu.id);
      }
      agregarMenu('pedir', menu.id, !!menu.elegible, menu.precio, menu.nombre);
    }, { platoId: setup.platoId, precio: setup.platoPrecio, nombre: setup.platoNombre, menuId: setup.menuId });
    await pageA.waitForTimeout(400);

    await pageA.click('#cart-bar .cart-btn');
    await pageA.waitForTimeout(400);
    check(await pageA.locator('#cart-drawer').evaluate(el => el.classList.contains('open')), 'El carrito se abre');

    const montoDrawer = (await pageA.locator('#pen-descuento-monto').textContent()).trim();
    check(montoDrawer === `S/ ${totalEsperado.toFixed(2)}`, `El drawer muestra el total correcto (${montoDrawer})`);
    check((await pageA.locator('#pen-descuento-saldo-actual').textContent()).includes('S/ 50.00'), 'Muestra el saldo actual antes de confirmar');
    check(await pageA.locator('#pen-modalidad-wrap').isVisible(), 'El toggle Aquí/Para llevar aparece (para_llevar activo)');
    check(await pageA.locator('#btn-confirmar-pedido').isEnabled(), 'El botón de confirmar está habilitado (saldo alcanza)');

    console.log('\n── Confirmar — sin pantalla de pago ──');
    await pageA.click('#btn-confirmar-pedido');
    await pageA.waitForTimeout(1200);
    check(await pageA.locator('#confirm-screen').evaluate(el => el.classList.contains('show')), 'Aparece la pantalla de confirmación');
    const saldoEsperadoTrasPedido = 50 - totalEsperado;
    check((await pageA.locator('#confirm-saldo-num').textContent()).trim() === `S/ ${saldoEsperadoTrasPedido.toFixed(2)}`,
      'Muestra el saldo restante correcto, sin pasar por Yape/Plin/Efectivo');

    console.log('\n── Mis pedidos: aparece pendiente y se puede cancelar ──');
    await pageA.click('#confirm-actions button:has-text("Ver mis pedidos")');
    await pageA.waitForTimeout(700);
    check(await pageA.locator('#tab-mispedidos').evaluate(el => el.classList.contains('active')), 'La pestaña "Mis pedidos" queda activa');
    const primeraCard = pageA.locator('.pen-ped-card').first();
    check(await primeraCard.count() > 0, 'El pedido aparece en el historial');
    check((await primeraCard.locator('.pen-chip').textContent()).includes('Pendiente'), 'Estado inicial: Pendiente');
    check((await primeraCard.locator('.pen-ped-total').textContent()).trim() === `S/ ${totalEsperado.toFixed(2)}`, 'Muestra el total correcto');
    check(await primeraCard.locator('.pen-ped-cancel').count() === 1, 'Tiene botón Cancelar mientras está pendiente');

    await primeraCard.locator('.pen-ped-cancel').click();
    await pageA.waitForTimeout(900);
    check((await primeraCard.locator('.pen-chip').textContent()).includes('Cancelado'), 'Tras cancelar: chip Cancelado');
    check(await primeraCard.locator('.pen-ped-cancel').count() === 0, 'Ya no se puede volver a cancelar');
    check((await pageA.locator('#pen-saldo-num').textContent()).trim() === 'S/ 50.00', 'El saldo vuelve a S/ 50.00 (devuelto)');

    console.log('\n── Sin overflow horizontal a 360px ──');
    check(!(await pageA.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'Sin scroll horizontal');

    console.log('\n── Touch targets ──');
    const chicosA = await pageA.evaluate(() => [
      ...document.querySelectorAll('.header button, .pen-tab, .cart-btn, #btn-confirmar-pedido, .pen-ped-cancel')
    ].filter(b => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 44)
     .map(b => `${b.textContent.trim().slice(0, 20)} (${Math.round(b.getBoundingClientRect().height)}px)`));
    check(chicosA.length === 0, `Todos los controles ≥44px${chicosA.length ? ' → ' + chicosA.join(', ') : ''}`);

    console.log('\n── Consola limpia (A) ──');
    check(errorsA.length === 0, `0 errores de consola${errorsA.length ? ' → ' + errorsA.join(' | ') : ''}`);
    await ctxA.close();

    // ════════════════════════════════════════════════
    // B — saldo insuficiente: bloqueo con mensaje claro
    // ════════════════════════════════════════════════
    console.log('\n── Pensionista B: saldo insuficiente bloquea ──');
    const { ctx: ctxB, page: pageB } = await loginComo(browser, emailB, PASS_P);
    check((await pageB.locator('#pen-saldo-num').textContent()).trim() === 'S/ 2.00', 'Saldo inicial S/ 2.00');

    await pageB.evaluate(({ platoId, precio, nombre }) => { changeQty(platoId, precio, nombre, 1); },
      { platoId: setup.platoId, precio: setup.platoPrecio, nombre: setup.platoNombre });
    await pageB.click('#cart-bar .cart-btn');
    await pageB.waitForTimeout(400);
    check(await pageB.locator('#pen-error-saldo').isVisible(), 'Aparece el aviso de saldo insuficiente');
    check((await pageB.locator('#pen-error-saldo').textContent()).includes('Saldo insuficiente'), 'El mensaje dice "Saldo insuficiente"');
    check(!(await pageB.locator('#btn-confirmar-pedido').isEnabled()), 'El botón de confirmar queda deshabilitado');
    await ctxB.close();

    // ════════════════════════════════════════════════
    // C — baja lógica: pantalla de bloqueo
    // ════════════════════════════════════════════════
    console.log('\n── Pensionista C: cuenta dada de baja ──');
    const { ctx: ctxC, page: pageC } = await loginComo(browser, emailC, PASS_P);
    await pageOwner.evaluate(async (id) => { await api('PATCH', `/api/pensionistas/${id}/activo`, { activo: 0 }); }, idC);
    await pageC.reload({ waitUntil: 'networkidle' });
    await pageC.waitForTimeout(500);
    check(await pageC.locator('.pen-blocked').isVisible(), 'Muestra la pantalla de cuenta dada de baja');
    check(await pageC.locator('.pen-tabs').isHidden(), 'Las pestañas quedan ocultas');
    await ctxC.close();

    // ════════════════════════════════════════════════
    // Sin sesión: redirige a login
    // ════════════════════════════════════════════════
    console.log('\n── Sin sesión: pensionista.html redirige a login ──');
    const ctxAnon = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const pageAnon = await ctxAnon.newPage();
    await pageAnon.goto(`${BASE}/pensionista.html`, { waitUntil: 'networkidle' });
    check(/login\.html/.test(pageAnon.url()), `Redirige a login.html (${pageAnon.url()})`);
    await ctxAnon.close();

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    // Limpieza: los 3 pensionistas de prueba quedan dados de baja
    for (const id of [idA, idB, idC].filter(Boolean)) {
      try {
        await pageOwner.evaluate(async (id) => { await api('PATCH', `/api/pensionistas/${id}/activo`, { activo: 0 }); }, id);
      } catch (_) {}
    }
    console.log(`\n(pensionistas de prueba dados de baja: ${[idA, idB, idC].filter(Boolean).join(', ')})`);
    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
