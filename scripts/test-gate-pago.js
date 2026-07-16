// Verificación manual (no forma parte de la suite jest) del Gap 17 —
// gate de pago obligatorio antes de crear la orden/reserva — y de la
// validación de nombre obligatorio en órdenes.
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

  // ── Test 2: gate de pago — la orden NO existe hasta confirmar en el repaso ──
  console.log('\n[Test 2] Gate de pago — orden (método Plin, con foto)');
  await page.fill('#nombre-cliente', 'GateTest Orden');
  await page.evaluate(() => confirmarPedido());
  await page.waitForSelector('#pago-screen.show', { timeout: 5000 });
  check(true, 'con nombre → avanza a la pantalla de pago');
  check(ordenesDeHoy().length === antes1, 'la orden AÚN no existe en la BD al mostrar la pantalla de pago (antes se creaba acá)');

  await page.click('#btn-met-plin');
  await page.waitForTimeout(200);
  const fileInput = await page.locator('#pago-foto');
  const fakeJpg = Buffer.from([0xFF,0xD8,0xFF,0xE0,0,0,0,0,0,0,0,0,0,0,0xFF,0xD9]);
  const tmpPath = require('path').join(__dirname, '_tmp_comprobante.jpg');
  require('fs').writeFileSync(tmpPath, fakeJpg);
  await fileInput.setInputFiles(tmpPath);
  await page.waitForTimeout(200);

  await page.click('#btn-ya-pague');
  await page.waitForSelector('#repaso-screen.show', { timeout: 5000 });
  check(true, '"Ya pagué" con foto adjunta → avanza al repaso final');
  check(ordenesDeHoy().length === antes1, 'la orden SIGUE sin existir en la BD en el repaso (solo se valida, no se envía)');

  const repasoNombre = await page.locator('#repaso-nombre').textContent();
  const repasoMetodo = await page.locator('#repaso-metodo').textContent();
  const repasoFotoVisible = await page.locator('#repaso-foto-wrap').evaluate(el => getComputedStyle(el).display !== 'none');
  check(repasoNombre.includes('GateTest Orden'), `el repaso muestra el nombre correcto (${repasoNombre})`);
  check(repasoMetodo.includes('Plin'), `el repaso muestra el método correcto (${repasoMetodo})`);
  check(repasoFotoVisible, 'el repaso muestra la miniatura del comprobante adjuntado');

  await page.click('#btn-repaso-confirmar');
  await page.waitForSelector('#confirm-screen.show', { timeout: 5000 });
  await page.waitForTimeout(300);
  const nuevasOrdenes = ordenesDeHoy();
  check(nuevasOrdenes.length === antes1 + 1, 'al confirmar en el repaso → RECIÉN AHÍ se crea la orden');
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
  });
  await page.fill('#res-nombre', 'GateTest Reserva');
  await page.fill('#res-fecha', new Date().toISOString().slice(0, 10));
  await page.evaluate(() => confirmarReserva());
  await page.waitForSelector('#pago-screen.show', { timeout: 5000 });
  check(reservasDeHoy().length === antesRes, 'la reserva AÚN no existe en la BD al mostrar la pantalla de pago');

  await page.click('#btn-met-efectivo');
  await page.waitForTimeout(200);
  await page.click('#btn-ya-pague');
  await page.waitForSelector('#repaso-screen.show', { timeout: 5000 });
  check(reservasDeHoy().length === antesRes, 'la reserva SIGUE sin existir en el repaso (efectivo tampoco salta el gate)');

  await page.click('#btn-repaso-confirmar');
  await page.waitForTimeout(600);
  const nuevasReservas = reservasDeHoy();
  check(nuevasReservas.length === antesRes + 1, 'al confirmar en el repaso → recién ahí se crea la reserva');
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

  // ── Test 5: botón "← Volver" en el repaso regresa al pago sin perder nombre/ítems ──
  console.log('\n[Test 5] Botón "← Volver" desde el repaso');
  // Recargar: Test 4 pisó pagoInfo=null en memoria de la página, hay que restaurarlo
  await page.goto(`${BASE}/menu?restaurante=1&mesa=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  await page.evaluate(() => { cart.push({ type: 'carta', platoId: 2, cantidad: 1, label: 'Ceviche', precio: 20 }); updateCart(); });
  await page.fill('#nombre-cliente', 'GateTest Volver');
  await page.evaluate(() => confirmarPedido());
  await page.waitForSelector('#pago-screen.show', { timeout: 5000 });
  await page.click('#btn-met-efectivo');
  await page.waitForTimeout(150);
  await page.click('#btn-ya-pague');
  await page.waitForSelector('#repaso-screen.show', { timeout: 5000 });
  await page.click('#repaso-screen button[aria-label="Volver"]');
  await page.waitForTimeout(200);
  check(await page.locator('#pago-screen.show').count() > 0, '"← Volver" regresa a la pantalla de pago');
  check(await page.locator('#repaso-screen.show').count() === 0, '"← Volver" oculta el repaso');
  // Puede corregir el método (ya no efectivo, ahora Plin) y seguir el flujo con el mismo nombre/ítems
  await page.click('#btn-met-plin');
  await page.waitForTimeout(150);
  const fileInput2 = await page.locator('#pago-foto');
  const fakeJpg2 = Buffer.from([0xFF,0xD8,0xFF,0xE0,0,0,0,0,0,0,0,0,0,0,0xFF,0xD9]);
  const tmpPath2 = require('path').join(__dirname, '_tmp_comprobante2.jpg');
  require('fs').writeFileSync(tmpPath2, fakeJpg2);
  await fileInput2.setInputFiles(tmpPath2);
  await page.waitForTimeout(150);
  await page.click('#btn-ya-pague');
  await page.waitForSelector('#repaso-screen.show', { timeout: 5000 });
  const nombreTrasVolver = await page.locator('#repaso-nombre').textContent();
  const metodoTrasVolver = await page.locator('#repaso-metodo').textContent();
  check(nombreTrasVolver.includes('GateTest Volver'), 'tras corregir el método, el nombre se conserva');
  check(metodoTrasVolver.includes('Plin'), `tras corregir el método, refleja el nuevo método elegido (${metodoTrasVolver})`);
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
