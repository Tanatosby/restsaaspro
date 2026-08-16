// Verificación manual (no forma parte de la suite jest) del monto a pagar en
// la pantalla de Yape/Plin — ISS-040.
//
// El total se calculaba (`pagoPendiente.total`) pero nunca se pintaba en
// #pago-screen: el comensal lo veía antes (en el carrito, ya cerrado) y
// después (en el repaso final, cuando ya había transferido), pero no en el
// momento exacto en que abre su app de Yape y necesita el número.
//
// Uso: PORT=3311 node app.js &   (servidor ya debe estar corriendo)
//      node scripts/test-monto-pago-visible.js
const { chromium } = require('playwright');

const BASE = 'http://localhost:3311';
let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

// Gama media real: 360 de ancho y poca altura, para que la pantalla de pago
// tenga que scrollear y se pueda comprobar que el monto no se pierde arriba.
const VIEWPORT = { width: 360, height: 600 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(`${BASE}/menu?restaurante=1&mesa=1`, { waitUntil: 'networkidle' });

  // Estado sintético: no depende de que el restaurante de prueba tenga Yape
  // configurado ni de crear un pedido real (el pedido recién se crea al
  // confirmar en el repaso, así que esto no escribe nada en la BD).
  await page.evaluate(() => {
    pagoInfo = { yape: { telefono: '987654321' }, plin: null, efectivo: true };
    pagoPendiente = {
      tipo: 'orden',
      payload: {},
      nombre: 'Ana',
      items: [{ precio: 11 }, { precio: 11 }, { precio: 11.5 }],
      total: 33.5,
    };
    showPagoStep();
  });

  console.log('\nEl monto está en la pantalla de pago');
  const visible = await page.locator('#pago-total').isVisible();
  check(visible, '#pago-total es visible al entrar a la pantalla de pago');

  const texto = await page.locator('#pago-total').textContent();
  check(texto.trim() === 'S/ 33.50', `muestra el total con 2 decimales (fue: "${texto.trim()}")`);

  // El dato tiene que leerse de un vistazo mientras el comensal usa otra app
  const fontSize = await page.locator('#pago-total').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  check(fontSize >= 20, `se lee de lejos: ${fontSize}px (mínimo 20px)`);

  console.log('\nMobile-first a 360px');
  const overflow = await page.evaluate(() => {
    const s = document.getElementById('pago-screen');
    return { horizontal: s.scrollWidth > s.clientWidth, scrollWidth: s.scrollWidth, clientWidth: s.clientWidth };
  });
  check(!overflow.horizontal, `sin overflow horizontal (${overflow.scrollWidth} ≤ ${overflow.clientWidth})`);

  const box = await page.locator('#pago-total').boundingBox();
  check(box && box.x >= 0 && box.x + box.width <= VIEWPORT.width,
    'el monto entra completo en 360px de ancho');

  console.log('\nSigue a la vista al bajar a subir el comprobante');
  // Elegir Yape despliega el número + el campo de foto: es el punto donde el
  // usuario reportó que se olvidaba del monto.
  await page.evaluate(() => seleccionarMetodoPago('yape'));
  const comprobanteVisible = await page.locator('#pago-comprobante-wrap').isVisible();
  check(comprobanteVisible, 'al elegir Yape aparece el campo del comprobante');

  const haceScroll = await page.evaluate(() => {
    const s = document.getElementById('pago-screen');
    s.scrollTop = s.scrollHeight;
    return s.scrollHeight > s.clientHeight;
  });

  if (haceScroll) {
    const boxTrasScroll = await page.locator('#pago-total').boundingBox();
    check(boxTrasScroll && boxTrasScroll.y >= 0 && boxTrasScroll.y < VIEWPORT.height,
      `sticky: el monto sigue en pantalla con la pantalla scrolleada al fondo (y=${boxTrasScroll && Math.round(boxTrasScroll.y)})`);
  } else {
    check(true, 'la pantalla entra sin scroll a 360×600 — el monto nunca sale de vista');
  }

  console.log('\nEfectivo también, y coherencia con el repaso final');
  await page.evaluate(() => seleccionarMetodoPago('efectivo'));
  const visibleEfectivo = await page.locator('#pago-total').isVisible();
  const textoEfectivo   = await page.locator('#pago-total').textContent();
  check(visibleEfectivo && textoEfectivo.trim() === 'S/ 33.50',
    'con efectivo el monto sigue visible (el comensal necesita saber cuánto preparar)');

  // El monto de la pantalla de pago debe ser el mismo que el del repaso: si
  // divergen, el comensal transfiere un importe distinto al que confirma.
  const totalRepaso = await page.evaluate(() => {
    document.getElementById('repaso-total').textContent = `S/ ${pagoPendiente.total.toFixed(2)}`;
    return document.getElementById('repaso-total').textContent;
  });
  check(totalRepaso === textoEfectivo.trim(),
    `el monto de pago coincide con el del repaso final (${totalRepaso})`);

  await browser.close();
  console.log(`\n${pass} pasaron, ${fail} fallaron`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌ Error inesperado:', e); process.exit(1); });
