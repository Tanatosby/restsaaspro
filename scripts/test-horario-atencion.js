// Verificación manual (no forma parte de la suite jest) del Gap 18 —
// horario de atención configurable: bloquea pedidos/reservas fuera de rango
// y muestra el banner "Cerrado" en menu.html sin bloquear la navegación.
//
// Uso: PORT=3311 node app.js &   (servidor ya debe estar corriendo)
//      node scripts/test-horario-atencion.js
const { chromium } = require('playwright');
const db = require('../config/database');

const BASE = 'http://localhost:3311';
const REST_ID = 1;

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

function setHorario({ activo, apertura, cierre, dias }) {
  db.prepare(`
    UPDATE restaurantes SET horario_activo=?, hora_apertura=?, hora_cierre=?, dias_atencion=? WHERE id=?
  `).run(activo ? 1 : 0, apertura, cierre, dias, REST_ID);
}

(async () => {
  const original = db.prepare(`
    SELECT horario_activo, hora_apertura, hora_cierre, dias_atencion FROM restaurantes WHERE id=?
  `).get(REST_ID);

  const browser = await chromium.launch();

  // ── Test 1: restaurante cerrado ahora — banner visible, botón deshabilitado, backend bloquea ──
  console.log('\n[Test 1] Restaurante cerrado ahora mismo');
  {
    setHorario({ activo: true, apertura: '01:00', cierre: '02:00', dias: '0,1,2,3,4,5,6' });

    const page = await browser.newPage({ viewport: { width: 360, height: 720 } });
    await page.goto(`${BASE}/menu?restaurante=${REST_ID}&mesa=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof horarioInfo !== 'undefined' && horarioInfo !== null);

    const bannerVisible = await page.locator('#horario-cerrado-banner').isVisible();
    check(bannerVisible, 'banner de "Cerrado" visible en menu.html');

    const bannerText = await page.locator('#horario-cerrado-banner').textContent();
    check(bannerText.includes('01:00') && bannerText.includes('02:00'), `banner incluye el rango horario (texto: "${bannerText}")`);

    // El cliente sigue viendo/armando el carrito con normalidad
    const menuVisible = await page.locator('#main-content').isVisible();
    check(menuVisible, 'el menú/carta sigue siendo visible (no se bloquea la navegación)');

    await page.evaluate(() => {
      cart.push({ type: 'carta', platoId: 2, cantidad: 1, label: 'Ceviche', precio: 20 });
      updateCart();
    });
    const btnDisabled = await page.locator('#btn-confirmar').isDisabled();
    check(btnDisabled, 'botón "Confirmar pedido" deshabilitado mientras está cerrado');

    // Backend también bloquea (defensa en profundidad)
    const res = await fetch(`${BASE}/api/public/orders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_restaurante: REST_ID, nombre_cliente: 'Test Cerrado', carta_items: [{ id_plato_carta: 2, cantidad: 1 }], menu_items: [] })
    });
    const data = await res.json();
    check(res.status === 400 && /cerrado/i.test(data.error), `POST /orders bloqueado por el backend (${res.status}: ${data.error})`);

    const resReserva = await fetch(`${BASE}/api/public/reservations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_restaurante: REST_ID, nombre_cliente: 'Test Cerrado', fecha: '2026-07-20' })
    });
    const dataReserva = await resReserva.json();
    check(resReserva.status === 400 && /cerrado/i.test(dataReserva.error), `POST /reservations bloqueado por el backend (${resReserva.status}: ${dataReserva.error})`);

    await page.close();
  }

  // ── Test 2: restaurante abierto — sin banner, botón habilitado, backend permite ──
  console.log('\n[Test 2] Restaurante abierto (horario amplio)');
  {
    setHorario({ activo: true, apertura: '00:00', cierre: '23:59', dias: '0,1,2,3,4,5,6' });

    const page = await browser.newPage({ viewport: { width: 360, height: 720 } });
    await page.goto(`${BASE}/menu?restaurante=${REST_ID}&mesa=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof horarioInfo !== 'undefined' && horarioInfo !== null);

    const bannerHidden = !(await page.locator('#horario-cerrado-banner').isVisible());
    check(bannerHidden, 'banner de "Cerrado" oculto cuando está abierto');

    await page.evaluate(() => {
      cart.push({ type: 'carta', platoId: 2, cantidad: 1, label: 'Ceviche', precio: 20 });
      updateCart();
    });
    const btnEnabled = !(await page.locator('#btn-confirmar').isDisabled());
    check(btnEnabled, 'botón "Confirmar pedido" habilitado cuando está abierto');

    // Reserva con hora_llegada fuera del rango del propio horario configurado — debe bloquear
    setHorario({ activo: true, apertura: '08:00', cierre: '20:00', dias: '0,1,2,3,4,5,6' });
    const resFutura = await fetch(`${BASE}/api/public/reservations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_restaurante: REST_ID, nombre_cliente: 'Test Futuro', fecha: '2026-07-25', hora_llegada: '22:00' })
    });
    const dataFutura = await resFutura.json();
    check(resFutura.status === 400 && /reservar/i.test(dataFutura.error), `reserva con hora_llegada fuera de rango bloqueada (${resFutura.status}: ${dataFutura.error})`);

    await page.close();
  }

  await browser.close();

  // Restaurar estado original + limpiar datos de prueba
  db.prepare(`
    UPDATE restaurantes SET horario_activo=?, hora_apertura=?, hora_cierre=?, dias_atencion=? WHERE id=?
  `).run(original.horario_activo, original.hora_apertura, original.hora_cierre, original.dias_atencion, REST_ID);
  db.prepare(`DELETE FROM ordenes WHERE nombre_cliente LIKE 'Test %'`).run();
  db.prepare(`DELETE FROM reservas WHERE nombre_cliente LIKE 'Test %'`).run();
  console.log('\n(DB restaurada a su estado original)');

  console.log(`\n${pass} pasaron, ${fail} fallaron`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌ Error inesperado:', e); process.exit(1); });
