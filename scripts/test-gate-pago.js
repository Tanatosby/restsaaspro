// Verificación manual (no forma parte de la suite jest) del Gap 17 —
// gate de pago obligatorio antes de crear la orden/reserva — y de la
// validación de nombre obligatorio en órdenes.
//
// ISS-081 fusionó "¿Cómo vas a pagar?" + "Revisa tu pedido" en una sola
// pantalla — este test se actualizó para reflejar eso: "Ya pagué" ahora
// crea la orden/reserva directo (con el mismo gate: nunca antes de tener
// método + comprobante resueltos), no hay una pantalla de repaso aparte.
//
// Uso: PORT=3311 node app.js &   (servidor ya debe estar corriendo)
//      node scripts/test-gate-pago.js
const { chromium } = require('playwright');
const db = require('../config/database');

const BASE = 'http://localhost:3311';
let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}
function ordenesDeHoy() {
  return db.prepare(`SELECT id, nombre_cliente, metodo_pago, comprobante_url FROM ordenes WHERE nombre_cliente LIKE 'GateTest%' ORDER BY id DESC`).all();
}
function reservasDeHoy() {
  return db.prepare(`SELECT id, nombre_cliente, metodo_pago FROM reservas WHERE nombre_cliente LIKE 'GateTest%' ORDER BY id DESC`).all();
}

(async () => {
  const browser = await chromium.launch();
  const page    = await browser.newPage({ viewport: { width: 390, height: 800 } });
  // Fotos de /uploads pueden faltar en dev (uploads fuera de git, mismo criterio
  // que scripts/test-menu-wizard.js) — no es un error de la app.
  const consoleErrors = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (/\/uploads\//.test(url) && /Failed to load resource/.test(m.text())) return;
    consoleErrors.push(m.text());
  });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  await page.goto(`${BASE}/menu?restaurante=1&mesa=1`, { waitUntil: 'networkidle' });

  // ── Test 1: nombre obligatorio bloquea el envío ──
  console.log('\n[Test 1] Nombre obligatorio en órdenes');
  const antes1 = ordenesDeHoy().length;
  await page.evaluate(() => { cart.push({ type: 'carta', platoId: 2, cantidad: 1, label: 'Ceviche', precio: 20 }); updateCart(); });
  await page.evaluate(() => confirmarPedido()); // sin llenar nombre-cliente
  await page.waitForTimeout(300);
  check(ordenesDeHoy().length === antes1, 'sin nombre → no se crea ninguna orden');
  check(await page.locator('#pago-screen.show').count() === 0, 'sin nombre → no avanza a la pantalla de pago');

  // Validación también en el backend (por si alguien pega directo a la API)
  const backendRes = await fetch(`${BASE}/api/public/orders`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_restaurante: 1, mesa: 1, carta_items: [{ id_plato_carta: 2, cantidad: 1 }], menu_items: [] })
  });
  check(backendRes.status === 400, `backend rechaza orden sin nombre_cliente (status ${backendRes.status})`);

  // ── Test 2: gate de pago — la orden NO existe hasta tocar "Ya pagué" ──
  console.log('\n[Test 2] Gate de pago — orden (método Plin, con foto)');
  await page.fill('#nombre-cliente', 'GateTest Orden');
  await page.evaluate(() => confirmarPedido());
  await page.waitForSelector('#pago-screen.show', { timeout: 5000 });
  check(true, 'con nombre → avanza a la pantalla de pago');
  check(ordenesDeHoy().length === antes1, 'la orden AÚN no existe en la BD al mostrar la pantalla de pago (antes se creaba acá)');

  // ISS-081: el resumen de solo lectura vive en esta misma pantalla — antes
  // solo aparecía en el repaso, ahora eliminado. Colapsado detrás de un link
  // desde el día 16 del piloto (feedback probando Reservar) — sigue en el
  // DOM, solo oculto hasta tocar "Ver mi pedido".
  const itemsResumen = await page.locator('#pago-items .cart-item').count();
  check(itemsResumen > 0, `el resumen del pedido está armado en la pantalla de pago (${itemsResumen} ítem(s))`);

  await page.click('#btn-met-plin');
  await page.waitForTimeout(200);
  const fileInput = await page.locator('#pago-foto');
  const fakeJpg = Buffer.from([0xFF,0xD8,0xFF,0xE0,0,0,0,0,0,0,0,0,0,0,0xFF,0xD9]);
  const tmpPath = require('path').join(__dirname, '_tmp_comprobante.jpg');
  require('fs').writeFileSync(tmpPath, fakeJpg);
  await fileInput.setInputFiles(tmpPath);
  await page.waitForTimeout(200);
  check(ordenesDeHoy().length === antes1, 'adjuntar el comprobante todavía no crea nada — falta tocar "Ya pagué"');

  await page.click('#btn-ya-pague');
  await page.waitForSelector('#confirm-screen.show', { timeout: 5000 });
  await page.waitForTimeout(300);
  const nuevasOrdenes = ordenesDeHoy();
  check(nuevasOrdenes.length === antes1 + 1, '"Ya pagué" con foto adjunta → RECIÉN AHÍ crea la orden (sin pantalla de repaso aparte)');
  check(nuevasOrdenes[0]?.metodo_pago === 'plin', 'la orden creada ya tiene metodo_pago=plin adjunto (no queda "sin pago" ni un instante)');
  check(!!nuevasOrdenes[0]?.comprobante_url, 'la orden creada ya tiene comprobante_url adjunto');
  require('fs').unlinkSync(tmpPath);

  // ── Test 3: gate de pago — reserva (método Efectivo, sin foto) ──
  console.log('\n[Test 3] Gate de pago — reserva (método Efectivo)');
  await page.evaluate(() => { resetTodo(); switchMode('reservar'); });
  await page.waitForTimeout(300);

  const antesRes = reservasDeHoy().length;
  await page.evaluate(() => {
    resCart.push({ type: 'carta', platoId: 2, cantidad: 1, label: 'Ceviche', subLabel: '', precio: 20 });
    // Día 9 del piloto: nombre/fecha ya no viven inline — el nombre está en
    // #res-drawer (hay que abrirlo para poder llenarlo) y la fecha sigue
    // siempre visible arriba de la carta.
    openResDrawer();
  });
  await page.fill('#res-nombre', 'GateTest Reserva');
  await page.fill('#res-fecha', new Date().toISOString().slice(0, 10));
  await page.evaluate(() => confirmarReserva());
  await page.waitForSelector('#pago-screen.show', { timeout: 5000 });
  check(reservasDeHoy().length === antesRes, 'la reserva AÚN no existe en la BD al mostrar la pantalla de pago');

  await page.click('#btn-met-efectivo');
  await page.waitForTimeout(200);
  check(reservasDeHoy().length === antesRes, 'elegir Efectivo todavía no crea nada — falta tocar el botón');

  await page.click('#btn-ya-pague');
  await page.waitForSelector('#confirm-screen.show', { timeout: 5000 });
  await page.waitForTimeout(300);
  const nuevasReservas = reservasDeHoy();
  check(nuevasReservas.length === antesRes + 1, 'al tocar el botón → recién ahí se crea la reserva');
  check(nuevasReservas[0]?.metodo_pago === 'efectivo', 'la reserva creada ya tiene metodo_pago=efectivo adjunto');

  // ── Test 4: sin métodos de pago activos → sigue creando directo (no hay nada que gatear) ──
  console.log('\n[Test 4] Restaurante sin métodos de pago activos → crea directo, sin gate');
  await page.evaluate(() => { resetTodo(); switchMode('pedir'); });
  await page.waitForTimeout(200);
  const antesDirecta = ordenesDeHoy().length;
  await page.evaluate(() => { pagoInfo = null; cart.push({ type: 'carta', platoId: 2, cantidad: 1, label: 'Ceviche', precio: 20 }); updateCart(); });
  await page.fill('#nombre-cliente', 'GateTest Directa');
  await page.evaluate(() => confirmarPedido());
  await page.waitForSelector('#confirm-screen.show', { timeout: 5000 });
  check(await page.locator('#pago-screen.show').count() === 0, 'sin métodos de pago → nunca pasa por la pantalla de pago');
  check(ordenesDeHoy().length === antesDirecta + 1, 'sin métodos de pago → la orden se crea directo (comportamiento sin cambios para este caso)');

  // ── Test 5: cambiar de método antes de enviar — ya no hay pantalla de
  //    repaso a la que "volver" (ISS-081), pero sigue siendo el mismo caso
  //    real: corregir el método elegido sin perder nombre/ítems.
  console.log('\n[Test 5] Cambiar de método en la misma pantalla, sin perder nombre/ítems');
  // Recargar: Test 4 pisó pagoInfo=null en memoria de la página, hay que restaurarlo
  await page.goto(`${BASE}/menu?restaurante=1&mesa=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  await page.evaluate(() => { cart.push({ type: 'carta', platoId: 2, cantidad: 1, label: 'Ceviche', precio: 20 }); updateCart(); });
  await page.fill('#nombre-cliente', 'GateTest Cambia Metodo');
  await page.evaluate(() => confirmarPedido());
  await page.waitForSelector('#pago-screen.show', { timeout: 5000 });

  await page.click('#btn-met-efectivo');
  await page.waitForTimeout(150);
  check((await page.locator('#btn-ya-pague').textContent()).toLowerCase().includes('efectivo'), 'con Efectivo, el botón queda listo para confirmar');

  // Cambia de opinión, ahora Plin — sigue en la MISMA pantalla, sin navegar
  await page.click('#btn-met-plin');
  await page.waitForTimeout(150);
  check(await page.locator('#pago-comprobante-wrap').evaluate(el => getComputedStyle(el).display !== 'none'), 'al cambiar a Plin, pide el comprobante');

  const fileInput2 = await page.locator('#pago-foto');
  const fakeJpg2 = Buffer.from([0xFF,0xD8,0xFF,0xE0,0,0,0,0,0,0,0,0,0,0,0xFF,0xD9]);
  const tmpPath2 = require('path').join(__dirname, '_tmp_comprobante2.jpg');
  require('fs').writeFileSync(tmpPath2, fakeJpg2);
  await fileInput2.setInputFiles(tmpPath2);
  await page.waitForTimeout(150);

  await page.click('#btn-ya-pague');
  await page.waitForSelector('#confirm-screen.show', { timeout: 5000 });
  await page.waitForTimeout(300);
  const ordenCambioMetodo = ordenesDeHoy()[0];
  check(ordenCambioMetodo?.nombre_cliente === 'GateTest Cambia Metodo', 'el nombre se conserva tras cambiar de método');
  check(ordenCambioMetodo?.metodo_pago === 'plin', `queda con el ÚLTIMO método elegido, no con el primero (${ordenCambioMetodo?.metodo_pago})`);
  require('fs').unlinkSync(tmpPath2);

  check(consoleErrors.length === 0, `0 errores de consola (hubo ${consoleErrors.length}: ${consoleErrors.slice(0,3).join(' | ')})`);

  // Limpieza de datos de prueba
  db.prepare(`DELETE FROM orden_carta_items WHERE id_orden IN (SELECT id FROM ordenes WHERE nombre_cliente LIKE 'GateTest%')`).run();
  db.prepare(`DELETE FROM ordenes WHERE nombre_cliente LIKE 'GateTest%'`).run();
  db.prepare(`DELETE FROM reserva_carta_items WHERE id_reserva IN (SELECT id FROM reservas WHERE nombre_cliente LIKE 'GateTest%')`).run();
  db.prepare(`DELETE FROM reservas WHERE nombre_cliente LIKE 'GateTest%'`).run();
  console.log('\n(datos de prueba GateTest* limpiados de la BD)');

  await browser.close();
  console.log(`\n${pass} pasaron, ${fail} fallaron`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌ Error inesperado:', e); process.exit(1); });
