// Verificación manual (no forma parte de la suite jest) de 2 fixes:
// 1) #pago-screen con scroll (antes se cortaba el botón "Ya pagué" — ISS nuevo, capturas del cliente)
// 2) Modal de comprobante in-app en owner.html (antes <a target="_blank">, rompía la PWA instalada)
//
// Uso: PORT=3311 node app.js &   (servidor ya debe estar corriendo)
//      node scripts/test-fixes-pago-comprobante.js
const { chromium } = require('playwright');

const BASE  = 'http://localhost:3311';
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

(async () => {
  const browser = await chromium.launch();

  // ── Test 1: pantalla de pago con viewport bajito (simula celular con barras de Safari) ──
  console.log('\n[Test 1] #pago-screen — scroll hasta el botón "Ya pagué"');
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 550 } });
    await page.goto(`${BASE}/menu?restaurante=1&mesa=1`, { waitUntil: 'networkidle' });

    await page.evaluate(() => {
      cart.push({ type: 'carta', platoId: 2, cantidad: 1, label: 'Ceviche', precio: 20 });
      updateCart();
    });
    await page.evaluate(() => confirmarPedido());
    await page.waitForSelector('#pago-screen.show', { timeout: 10000 });
    await page.waitForTimeout(300);

    if (await page.locator('#btn-met-plin').count()) {
      await page.click('#btn-met-plin');
      await page.waitForTimeout(300);
    }

    const overflowY = await page.locator('#pago-screen').evaluate(el => getComputedStyle(el).overflowY);
    check(overflowY === 'auto', `overflow-y:auto en #pago-screen (real: ${overflowY})`);

    const { scrollHeight, clientHeight } = await page.locator('#pago-screen').evaluate(el => ({
      scrollHeight: el.scrollHeight, clientHeight: el.clientHeight
    }));
    console.log(`     scrollHeight=${scrollHeight} clientHeight=${clientHeight} (${scrollHeight > clientHeight ? 'hay overflow real en este viewport — reproduce el bug original' : 'contenido entra igual'})`);

    await page.locator('#pago-screen').evaluate(el => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(150);
    const box = await page.locator('#btn-ya-pague').boundingBox();
    check(!!box && box.y >= 0 && box.y < 550, `botón "Ya pagué" alcanzable con scroll (boundingBox: ${JSON.stringify(box)})`);

    await page.close();
  }

  // ── Test 2: modal de comprobante en owner.html (no debe abrir pestaña nueva) ──
  console.log('\n[Test 2] Modal de comprobante en Órdenes (owner.html)');
  {
    // Crear una orden real + pago con foto vía API pública (mismo flujo que un cliente)
    const ordRes = await fetch(`${BASE}/api/public/orders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_restaurante: 1, mesa: 1, nombre_cliente: 'Test Comprobante',
        modalidad: 'en_local', carta_items: [{ id_plato_carta: 2, cantidad: 1 }], menu_items: []
      })
    });
    const orden = await ordRes.json();
    check(ordRes.ok, `orden de prueba creada (id=${orden.id_orden})`);

    const fakeJpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0,0,0,0,0,0,0,0,0,0, 0xFF, 0xD9]); // JPEG mínimo válido
    const form = new FormData();
    form.append('metodo_pago', 'plin');
    form.append('foto', new Blob([fakeJpg], { type: 'image/jpeg' }), 'comprobante.jpg');
    const pagoRes = await fetch(`${BASE}/api/public/pago/orden/${orden.id_orden}`, { method: 'PATCH', body: form });
    const pagoData = await pagoRes.json();
    check(pagoRes.ok, `pago con comprobante registrado (${pagoData.comprobante_url})`);

    // Login owner
    const ctx  = await browser.newContext({ viewport: { width: 390, height: 700 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => { showPanel('ordenes'); switchTab('ord', 'activas'); });
    await page.waitForTimeout(500);

    const thumb = page.locator(`#list-ordenes-activas img[src="${pagoData.comprobante_url}"]`).first();
    check(await thumb.count() > 0, 'miniatura de comprobante renderizada en la lista');

    // Confirmar que NO está envuelta en <a target="_blank">
    const wrappedInAnchor = await thumb.evaluate(img => !!img.closest('a[target="_blank"]'));
    check(!wrappedInAnchor, 'la miniatura ya NO usa <a target="_blank"> (causa del bug en la PWA instalada)');

    const pagesBefore = ctx.pages().length;
    await thumb.click();
    await page.waitForTimeout(300);
    const modalOpen = await page.locator('#comprobante-modal.show').count();
    check(modalOpen > 0, 'el modal #comprobante-modal se abre al tocar la miniatura');
    check(ctx.pages().length === pagesBefore, 'no se abrió ninguna pestaña/ventana nueva (comportamiento seguro dentro de la PWA)');

    const modalImgSrc = await page.locator('#comprobante-modal-img').getAttribute('src');
    check(modalImgSrc && modalImgSrc.includes(pagoData.comprobante_url), `el modal muestra la foto correcta (${modalImgSrc})`);

    // Cerrar con el botón ✕
    await page.click('.comprobante-modal-close');
    await page.waitForTimeout(200);
    check(await page.locator('#comprobante-modal.show').count() === 0, 'el modal cierra con el botón ✕');

    await ctx.close();
  }

  await browser.close();
  console.log(`\n${pass} pasaron, ${fail} fallaron`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌ Error inesperado:', e); process.exit(1); });
