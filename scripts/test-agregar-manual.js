/**
 * E2E del botón "+ Agregar manual" en la Cola del día (owner.html → pedidos.js).
 * Cubre el diseño acordado con el usuario:
 *   - El pedido entra DIRECTO a "En cocina" (sin el tap extra de "→ Preparando").
 *   - metodo_pago = 'efectivo' solo si el restaurante tiene efectivo_activo=1;
 *     si no, queda NULL — nunca contradice la configuración de pagos.
 *   - estado_pago queda NULL siempre — no debe aparecer el badge de "Efectivo"
 *     (badgePago), solo el badge propio "🧾 Pedido manual · Confirmar pago al
 *     cobrar" (badgeManual), sin importar si efectivo está activo o no.
 *   - Las secciones obligatorias del menú se siguen exigiendo (ISS-046).
 *   - Con fotos (2026-08-19): el plato de cada sección se elige con
 *     PlatoPicker (grid de fotos), no un <select>. Se sumó carta, con el
 *     mismo patrón card+stepper que ya tenía el menú del día.
 *
 * Uso: PORT=3399 node app.js &   (servidor ya debe estar corriendo)
 *      node scripts/test-agregar-manual.js
 */
const { chromium } = require('playwright');
const db = require('../config/database');

const BASE  = `http://localhost:${process.env.PORT || 3399}`;
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

function todayLima() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

function ordenPrueba(nombre) {
  return db.prepare(`
    SELECT o.id, o.mesa, o.metodo_pago, o.estado_pago, o.es_manual, eo.es_en_cocina, eo.es_inicial
    FROM ordenes o JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.nombre_cliente = ?
    ORDER BY o.id DESC LIMIT 1
  `).get(nombre);
}

(async () => {
  const browser = await chromium.launch();
  const ctx  = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    // Fotos de /uploads pueden faltar en dev (uploads fuera de git, mismo
    // criterio que scripts/test-gate-pago.js) — no es un error de la app.
    const url = (m.location() && m.location().url) || '';
    if (/\/uploads\//.test(url) && /Failed to load resource/.test(m.text())) return;
    errors.push(m.text());
  });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  // IDs de lo creado en esta corrida, para poder limpiar todo al final.
  let idSeccion, idPlato, idMenu, idComponente;
  let idCategoria, idPlatoCarta;
  let configOriginal = null;

  try {
    // ── Login ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');
    console.log('Login OK →', page.url());

    // ── Fixture: un menú del día de hoy, con 1 sección obligatoria y 1 plato ──
    console.log('\n── Preparando un menú del día de prueba ──');
    const hoy = todayLima();
    idSeccion = await page.evaluate(async () => (await api('POST', '/api/menu/secciones', { nombre: 'TestManualSeccion' })).id);
    idPlato   = await page.evaluate(async () => (await api('POST', '/api/menu/platos-menu', { nombre: 'TestManualPlato' })).id);
    idMenu    = await page.evaluate(async (dia) => (await api('POST', '/api/menu/menus-dia', {
      nombre: 'TestManual Menú', elegible: 1, dia, precio: 12,
    })).id, hoy);
    await page.evaluate(async ({ idMenu, idSeccion }) => {
      await api('POST', `/api/menu/menus-dia/${idMenu}/secciones`, { id_seccion_menu: idSeccion, requerido: true });
    }, { idMenu, idSeccion });
    idComponente = await page.evaluate(async ({ idMenu, idSeccion, idPlato }) =>
      (await api('POST', `/api/menu/menus-dia/${idMenu}/secciones/${idSeccion}/platos`, { id_plato_menu: idPlato })).id,
      { idMenu, idSeccion, idPlato });
    check(!!(idSeccion && idPlato && idMenu && idComponente), 'Fixture creado (sección + plato + menú + componente)');

    // ── Fixture: un plato de carta de prueba ──
    idCategoria  = await page.evaluate(async () => (await api('POST', '/api/menu/categorias', { nombre: 'TestManualCategoria' })).id);
    idPlatoCarta = await page.evaluate(async (id_categoria) =>
      (await api('POST', '/api/menu/platos-carta', { nombre: 'TestManualCarta', precio: 8, id_categoria })).id,
      idCategoria);
    check(!!(idCategoria && idPlatoCarta), 'Fixture de carta creado (categoría + plato)');

    configOriginal = await page.evaluate(() => api('GET', '/api/menu/restaurante/config'));

    async function setEfectivoActivo(valor) {
      await page.evaluate(async (cfg) => {
        await api('PATCH', '/api/menu/config/pagos', {
          yape_activo: cfg.yape_activo, yape_telefono: cfg.yape_telefono,
          plin_activo: cfg.plin_activo, plin_telefono: cfg.plin_telefono,
          efectivo_activo: cfg.efectivo_activo,
        });
      }, { ...configOriginal, efectivo_activo: valor });
    }

    async function abrirYEnviarPedidoManual(nombreCliente, { elegirPlato = true, conCarta = false } = {}) {
      await page.evaluate(() => { showPanel('pedidos'); });
      await page.waitForTimeout(300);
      await page.click('button:has-text("+ Agregar manual")');
      await page.waitForFunction(() => document.getElementById('modal-agregar-manual').style.display === 'flex');
      await page.waitForSelector(`.manual-menu-card[data-menu="${idMenu}"]`, { timeout: 5000 });

      await page.fill('#manual-nombre', nombreCliente);
      await page.click(`.manual-menu-card[data-menu="${idMenu}"] button:has-text("+")`);
      await page.waitForSelector(`#manual-secciones-${idMenu} button`, { timeout: 5000 });
      if (elegirPlato) {
        // El chip "+ Elegir [sección]" abre PlatoPicker (grid de fotos) — ya no es un <select>.
        await page.click(`#manual-secciones-${idMenu} button`);
        await page.waitForSelector('.pp-overlay.open', { timeout: 5000 });
        await page.click(`.pp-card[data-id="${idComponente}"]`);
        await page.waitForTimeout(200);
      }
      if (conCarta) {
        await page.click(`.manual-carta-item[data-plato="${idPlatoCarta}"] button:has-text("+")`);
      }

      await page.click('#manual-btn-enviar');
      await page.waitForTimeout(400);
    }

    // ── El chip con foto reemplaza al <select>, y la carta aparece en el modal ──
    console.log('\n── El modal muestra el chip visual y la sección "Carta" ──');
    await page.evaluate(() => { showPanel('pedidos'); });
    await page.waitForTimeout(300);
    await page.click('button:has-text("+ Agregar manual")');
    await page.waitForFunction(() => document.getElementById('modal-agregar-manual').style.display === 'flex');
    await page.click(`.manual-menu-card[data-menu="${idMenu}"] button:has-text("+")`);
    await page.waitForSelector(`#manual-secciones-${idMenu} button`, { timeout: 5000 });
    check((await page.locator(`#manual-secciones-${idMenu} button`).textContent()).includes('Elegir'),
      'El chip vacío dice "+ Elegir [sección]" (no un <select>)');

    await page.click(`#manual-secciones-${idMenu} button`);
    await page.waitForSelector('.pp-overlay.open', { timeout: 5000 });
    // El plato de prueba no tiene foto — PlatoPicker cae al placeholder 🍽️, no a <img>.
    check(await page.locator(`.pp-card[data-id="${idComponente}"]`).count() === 1,
      'PlatoPicker (grid de fotos) muestra el plato de la sección');
    await page.click(`.pp-card[data-id="${idComponente}"]`);
    await page.waitForTimeout(200);
    check((await page.locator(`#manual-secciones-${idMenu} button`).textContent()).includes('cambiar'),
      'Tras elegir, el chip queda "lleno" con el nombre del plato + "cambiar"');

    check(await page.locator(`.manual-carta-item[data-plato="${idPlatoCarta}"]`).count() === 1,
      'La carta aparece en el modal, con el plato de prueba');

    await page.click('#modal-agregar-manual button:has-text("Cancelar")');
    await page.waitForTimeout(200);

    // ── Rama A: efectivo_activo = 0 → metodo_pago debe quedar NULL ──
    console.log('\n── Rama A: restaurante SIN efectivo activo ──');
    await setEfectivoActivo(false);
    await abrirYEnviarPedidoManual('AgregarManualTest A');
    check((await page.locator('#toast.show').textContent()).includes('cocina'), 'Toast de confirmación al enviar');

    const ordenA = ordenPrueba('AgregarManualTest A');
    check(!!ordenA, 'La orden se creó en la BD');
    check(ordenA?.es_manual === 1, 'es_manual = 1');
    check(ordenA?.es_en_cocina === 1, 'Entra DIRECTO a "En cocina" (sin pasar por "pendiente")');
    check(ordenA?.metodo_pago === null, 'metodo_pago queda NULL cuando el restaurante no tiene efectivo activo (no contradice su config)');
    check(ordenA?.estado_pago === null, 'estado_pago queda NULL (no hay comprobante que revisar)');

    await page.click('.tab[data-zona="cocina"]');
    await page.waitForTimeout(300);
    const cardA = await page.locator('.cola-card', { hasText: 'AgregarManualTest A' }).innerText();
    check(cardA.includes('Pedido manual'), 'La tarjeta en "En cocina" avisa "Pedido manual"');
    check(cardA.includes('Confirmar pago'), 'El aviso deja claro que falta confirmar el pago al cobrar');
    check(!cardA.includes('💵 Efectivo'), 'NO dice "Efectivo" — el restaurante no lo tiene activo, no debe contradecirlo');

    // ── Rama B: efectivo_activo = 1 → metodo_pago = 'efectivo' ──
    console.log('\n── Rama B: restaurante CON efectivo activo ──');
    await setEfectivoActivo(true);
    await abrirYEnviarPedidoManual('AgregarManualTest B');

    const ordenB = ordenPrueba('AgregarManualTest B');
    check(ordenB?.es_manual === 1, 'es_manual = 1');
    check(ordenB?.es_en_cocina === 1, 'También entra directo a "En cocina"');
    check(ordenB?.metodo_pago === 'efectivo', 'metodo_pago = \'efectivo\' cuando el restaurante SÍ lo tiene activo');
    check(ordenB?.estado_pago === null, 'estado_pago sigue NULL (no debe verse "Pendiente confirmación", falso para un cobro en mano)');

    await page.click('.tab[data-zona="cocina"]');
    await page.waitForTimeout(300);
    const cardB = await page.locator('.cola-card', { hasText: 'AgregarManualTest B' }).innerText();
    check(cardB.includes('Pedido manual'), 'Misma tarjeta "Pedido manual" — el aviso es igual tenga o no efectivo activo');
    check(!cardB.includes('💵 Efectivo'), 'Tampoco aparece "💵 Efectivo" acá — badgePago no se dispara sin estado_pago');

    // ── Rama con carta: menú del día + un plato de carta en el mismo pedido ──
    console.log('\n── Pedido manual con menú + carta juntos ──');
    await abrirYEnviarPedidoManual('AgregarManualTest Carta', { conCarta: true });

    const ordenCarta = ordenPrueba('AgregarManualTest Carta');
    check(!!ordenCarta, 'La orden con carta se creó en la BD');
    const itemsCarta = db.prepare(`
      SELECT cantidad, precio_unitario FROM orden_carta_items WHERE id_orden = ? AND id_plato_carta = ?
    `).get(ordenCarta?.id, idPlatoCarta);
    check(itemsCarta?.cantidad === 1, `El plato de carta quedó guardado con cantidad 1 (${itemsCarta?.cantidad})`);
    check(itemsCarta?.precio_unitario === 8, `Con el precio correcto (S/ ${itemsCarta?.precio_unitario})`);
    const itemsMenuDeEsaOrden = db.prepare(`SELECT COUNT(*) AS n FROM orden_menu_items WHERE id_orden = ?`).get(ordenCarta?.id).n;
    check(itemsMenuDeEsaOrden > 0, 'El menú del día también quedó guardado en el mismo pedido');

    // ── Secciones obligatorias siguen exigidas (ISS-046) ──
    console.log('\n── Sección obligatoria sin elegir → bloquea el envío ──');
    await abrirYEnviarPedidoManual('AgregarManualTest C', { elegirPlato: false });
    const errTxt = await page.locator('#manual-error').textContent();
    check(/falta elegir/i.test(errTxt || ''), `El modal avisa qué sección falta ("${errTxt}")`);
    check(!ordenPrueba('AgregarManualTest C'), 'No se crea ninguna orden mientras falte la sección obligatoria');
    await page.click('#modal-agregar-manual button:has-text("Cancelar")');

    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    // ── Restaurar config de pagos y borrar todo lo de prueba ──
    try {
      if (configOriginal) {
        await page.evaluate((cfg) => api('PATCH', '/api/menu/config/pagos', {
          yape_activo: cfg.yape_activo, yape_telefono: cfg.yape_telefono,
          plin_activo: cfg.plin_activo, plin_telefono: cfg.plin_telefono,
          efectivo_activo: cfg.efectivo_activo,
        }), configOriginal);
      }
    } catch (_) {}

    db.prepare(`DELETE FROM orden_menu_items  WHERE id_orden IN (SELECT id FROM ordenes WHERE nombre_cliente LIKE 'AgregarManualTest%')`).run();
    db.prepare(`DELETE FROM orden_carta_items WHERE id_orden IN (SELECT id FROM ordenes WHERE nombre_cliente LIKE 'AgregarManualTest%')`).run();
    db.prepare(`DELETE FROM ordenes WHERE nombre_cliente LIKE 'AgregarManualTest%'`).run();
    if (idMenu)       db.prepare(`DELETE FROM componentes_menu_dia WHERE id_menu_dia = ?`).run(idMenu);
    if (idMenu)       db.prepare(`DELETE FROM menu_secciones WHERE id_menu_dia = ?`).run(idMenu);
    if (idMenu)       db.prepare(`DELETE FROM menus_dia WHERE id = ?`).run(idMenu);
    if (idPlato)      db.prepare(`DELETE FROM platos_menu WHERE id = ?`).run(idPlato);
    if (idSeccion)    db.prepare(`DELETE FROM secciones_menu WHERE id = ?`).run(idSeccion);
    if (idPlatoCarta) db.prepare(`DELETE FROM platos_carta WHERE id = ?`).run(idPlatoCarta);
    if (idCategoria)  db.prepare(`DELETE FROM categorias_carta WHERE id = ?`).run(idCategoria);
    console.log('\n(fixture y órdenes de prueba limpiados de la BD)');

    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
