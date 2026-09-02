/**
 * E2E de los 3 cambios del día 15 del piloto (ISS-084 / ISS-085):
 *
 *  A. btnOrden()/btnReserva() en zona "Listos" — botón "✅ Ya pagó" para
 *     Yape/Plin que cierra el pedido de un toque (reusa cobrarColaOrden/
 *     cobrarColaReserva). Efectivo NO lo muestra. En reservas solo aparece
 *     sin mesa (con mesa, saltar es_cliente_llego se saltaría el auto-merge).
 *  B. coincideFiltroCobrar() — el buscador de "Por cobrar" matchea por mesa,
 *     nombre de cliente y #orden.
 *  C. renderMenuDiaCard(m, 'pedir') — la foto del menú es un botón que llama
 *     agregarMenuDesdeFoto(); 'reservar' no cambia.
 *  D. menu.html — el botón de tamaño de letra dice "🔤 Aumentar letra" y en el
 *     nivel máximo pasa a "🔤 Volver a normal".
 *
 * Uso: PORT=3399 node scripts/test-ya-pago-foto-buscador.js
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
    // ── login → owner ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');
    const novCerrar = page.locator('.nov-btn-cerrar');
    if (await novCerrar.count() > 0) await novCerrar.click();

    // ── A. "✅ Ya pagó" en Listos ──
    console.log('\n── A. botón "✅ Ya pagó" en zona Listos ──');
    const A = await page.evaluate(() => ({
      ordenYape:    btnOrden({ id: 5, metodo_pago: 'yape',     es_listo: 1, modalidad: 'en_local' }, 'listos'),
      ordenPlin:    btnOrden({ id: 6, metodo_pago: 'plin',     es_listo: 1, modalidad: 'para_llevar' }, 'listos'),
      ordenEfvo:    btnOrden({ id: 7, metodo_pago: 'efectivo', es_listo: 1, modalidad: 'en_local' }, 'listos'),
      ordenCobrar:  btnOrden({ id: 5, metodo_pago: 'yape',     es_entregado: 1, modalidad: 'en_local' }, 'cobrar'),
      resSinMesa:   btnReserva({ id: 8, metodo_pago: 'yape',   es_listo: 1, modalidad: 'para_llevar' }, 'listos'),
      resDelivery:  btnReserva({ id: 9, metodo_pago: 'yape',   es_listo: 1, modalidad: 'delivery' }, 'listos'),
      resConMesa:   btnReserva({ id: 10, metodo_pago: 'yape',  es_listo: 1, modalidad: 'en_local' }, 'listos'),
      resEfvo:      btnReserva({ id: 11, metodo_pago: 'efectivo', es_listo: 1, modalidad: 'para_llevar' }, 'listos'),
    }));
    check(A.ordenYape.includes('✅ Ya pagó') && A.ordenYape.includes('cobrarColaOrden(5)'),
      'Orden Yape en Listos: muestra "✅ Ya pagó" → cobrarColaOrden');
    check(A.ordenYape.includes('🍽 Entregar'),
      'Orden Yape en Listos: conserva "🍽 Entregar" (no reemplaza, agrega)');
    check(A.ordenPlin.includes('✅ Ya pagó') && A.ordenPlin.includes('📦 Recogido'),
      'Orden Plin para llevar en Listos: "✅ Ya pagó" + "📦 Recogido"');
    check(!A.ordenEfvo.includes('Ya pagó'),
      'Orden EFECTIVO en Listos: NO muestra "✅ Ya pagó" (va por Cobrar)');
    check(A.ordenCobrar.includes('💰 Cobrar') && !A.ordenCobrar.includes('Ya pagó'),
      'Zona Cobrar sin regresión: sigue con "💰 Cobrar"');
    check(A.resSinMesa.includes('✅ Ya pagó') && A.resSinMesa.includes('cobrarColaReserva(8)'),
      'Reserva Yape SIN mesa en Listos: muestra "✅ Ya pagó"');
    check(A.resDelivery.includes('✅ Ya pagó'),
      'Reserva Yape delivery en Listos: muestra "✅ Ya pagó"');
    check(!A.resConMesa.includes('Ya pagó') && A.resConMesa.includes('🍽 Entregado'),
      'Reserva Yape CON mesa en Listos: NO muestra "✅ Ya pagó" (protege el auto-merge)');
    check(!A.resEfvo.includes('Ya pagó'),
      'Reserva EFECTIVO en Listos: NO muestra "✅ Ya pagó"');

    // ── B. coincideFiltroCobrar() ──
    console.log('\n── B. buscador de "Por cobrar" ──');
    const B = await page.evaluate(() => {
      const orden = { datos: { mesa: 3, nombre_cliente: 'Rosa Pérez', numero_dia: 12 } };
      const llevar = { datos: { mesa: null, nombre_cliente: 'Luis', numero_dia: 14 } };
      return {
        porNumeroMesa:  coincideFiltroCobrar(orden, '3'),
        porTextoMesa:   coincideFiltroCobrar(orden, 'mesa 3'),
        porNombre:      coincideFiltroCobrar(orden, 'rosa'),
        porNumOrden:    coincideFiltroCobrar(llevar, '#14'),
        noMatch:        coincideFiltroCobrar(orden, 'mesa 9'),
        sinMesaOk:      coincideFiltroCobrar(llevar, 'luis'),
      };
    });
    check(B.porNumeroMesa, 'Filtra por número de mesa ("3")');
    check(B.porTextoMesa, 'Filtra por "mesa 3"');
    check(B.porNombre, 'Filtra por nombre de cliente ("rosa")');
    check(B.porNumOrden, 'Filtra por #orden ("#14")');
    check(!B.noMatch, 'No matchea una mesa distinta ("mesa 9")');
    check(B.sinMesaOk, 'Un pedido sin mesa igual matchea por nombre');

    // ── C. foto del menú en "Pedir" ──
    console.log('\n── C. renderMenuDiaCard(m, "pedir"): foto = +1 ──');
    await page.goto(`${BASE}/menu?restaurante=1&mesa=11`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const C = await page.evaluate(() => {
      const m = {
        id: 99, nombre: 'Menú Prueba', precio: 12, elegible: true,
        url_foto_portada: '/uploads/x.jpg',
        secciones: [{ nombre_seccion: 'Segundo', requerido: 1, platos: [{ id_componente: 1, nombre: 'Pollo' }] }],
      };
      return {
        pedir: renderMenuDiaCard(m, 'pedir'),
        reservar: renderMenuDiaCard(m, 'reservar'),
        tieneFn: typeof agregarMenuDesdeFoto === 'function',
      };
    });
    check(C.pedir.includes('menu-dia-photo--add') && C.pedir.includes('agregarMenuDesdeFoto(99'),
      'Pedir: la foto es un botón que llama agregarMenuDesdeFoto(99, this)');
    check(C.pedir.includes('role="button"') && C.pedir.includes('menu-dia-zoom'),
      'Pedir: la foto tiene role=button y un botón 🔍 para el zoom');
    check(C.pedir.includes('cambiarCantidadMenuPedir(99,1)') && C.pedir.includes('cambiarCantidadMenuPedir(99,-1)'),
      'Pedir: el stepper +/− sigue presente (no se reemplazó)');
    check(!C.reservar.includes('agregarMenuDesdeFoto') && C.reservar.includes("abrirMenuModal(99,'reservar')"),
      'Reservar: NO cambia (sigue abriendo el picker al tocar la card)');
    check(C.tieneFn, 'agregarMenuDesdeFoto está definida globalmente');

    // ── D. botón de tamaño de letra ──
    console.log('\n── D. botón "🔤 Aumentar letra" (menu.html) ──');
    const btn = page.locator('#btn-font-scale');
    const t0 = (await btn.textContent()).trim();
    check(t0 === '🔤 Aumentar letra', `Arranca en "🔤 Aumentar letra" (fue: "${t0}")`);
    await btn.click(); // 1 → 1.2
    await btn.click(); // 1.2 → 1.45 (máximo)
    const tMax = (await btn.textContent()).trim();
    check(tMax === '🔤 Volver a normal', `En el nivel máximo dice "🔤 Volver a normal" (fue: "${tMax}")`);
    await btn.click(); // 1.45 → 1 (wrap)
    const tWrap = (await btn.textContent()).trim();
    check(tWrap === '🔤 Aumentar letra', 'Al volver a Normal, regresa a "🔤 Aumentar letra"');
    const scale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--font-scale').trim());
    check(scale === '1' || scale === '', `--font-scale volvió a 1 (fue: "${scale}")`);

    // ── consola ──
    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' — ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.error('\n💥 Error inesperado:', e.message);
    fail++;
  } finally {
    await browser.close();
  }

  console.log(`\n${pass}/${pass + fail} verificaciones OK`);
  process.exit(fail ? 1 : 0);
})();
