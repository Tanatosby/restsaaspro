// Verificación manual (no forma parte de la suite jest) del fix de z-index
// del modal de foto sobre MenuModal — ISS-038.
//
// El modal de zoom de foto (#photo-modal, z-index 110) se abría por debajo
// de la hoja de selección de platos del menú del día (MenuModal .mm-overlay,
// z-index 1500). El usuario lo veía como "no aparece sobre la pantalla, sino
// por debajo" y recién se hacía visible al cerrar la hoja con "Agregar
// pedido". Fix: #photo-modal subido a z-index 1600.
//
// Uso: PORT=3311 node app.js &   (servidor ya debe estar corriendo)
//      node scripts/test-photo-modal-zindex.js
const { chromium } = require('playwright');

const BASE = 'http://localhost:3311';
let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 720 } });
  await page.goto(`${BASE}/menu?restaurante=1&mesa=1`, { waitUntil: 'networkidle' });

  // Abrir MenuModal con datos sintéticos (no depende de que exista un menú
  // elegible con foto en la BD de prueba) y simular el tap en la foto de un
  // plato, exactamente el flujo que reportó el usuario.
  await page.evaluate(() => {
    MenuModal.open({
      mode: 'pedir',
      menu: {
        id: 999, nombre: 'Menú de prueba', precio: 15, elegible: true,
        secciones: [{
          id_seccion: 1, nombre_seccion: 'Entrada', requerido: 1,
          platos: [{ id_componente: 1, nombre: 'Ceviche', descripcion: 'Test', url_foto: '/img/test.jpg', agotado: false }]
        }]
      }
    });
  });

  const mmOpen = await page.locator('.mm-overlay').evaluate(el => el.classList.contains('open'));
  check(mmOpen, 'MenuModal abierto (.mm-overlay.open)');

  // Tap en la foto del plato dentro de la hoja — igual que el usuario
  await page.locator('.plato-thumb').first().click();

  const photoOpen = await page.locator('#photo-modal').evaluate(el => el.classList.contains('open'));
  check(photoOpen, 'photo-modal se abre al tocar la foto');

  // El chequeo real: en el punto central de la pantalla, ¿qué elemento
  // "gana" visualmente? Antes del fix ganaba .mm-sheet (z-index 1500 tapaba
  // al modal de foto, z-index 110). Debe ganar photo-modal.
  const topElementInfo = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return { tag: el.tagName, cls: el.className, closesPhotoModal: !!el.closest('#photo-modal') };
  });
  check(topElementInfo.closesPhotoModal, `el elemento en el centro de pantalla pertenece a #photo-modal (fue: <${topElementInfo.tag} class="${topElementInfo.cls}">)`);

  const zPhoto = await page.locator('#photo-modal').evaluate(el => getComputedStyle(el).zIndex);
  const zMm    = await page.locator('.mm-overlay').evaluate(el => getComputedStyle(el).zIndex);
  check(Number(zPhoto) > Number(zMm), `z-index de #photo-modal (${zPhoto}) > .mm-overlay (${zMm})`);

  // Cerrar la foto y luego el MenuModal — no debe quedar nada abierto de más
  await page.locator('.photo-modal-close').click();
  const photoClosedAfter = await page.locator('#photo-modal').evaluate(el => !el.classList.contains('open'));
  check(photoClosedAfter, 'photo-modal se cierra con el botón ✕ sin afectar a MenuModal');

  const mmStillOpen = await page.locator('.mm-overlay').evaluate(el => el.classList.contains('open'));
  check(mmStillOpen, 'MenuModal sigue abierto después de cerrar solo la foto');

  await browser.close();
  console.log(`\n${pass} pasaron, ${fail} fallaron`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('❌ Error inesperado:', e); process.exit(1); });
