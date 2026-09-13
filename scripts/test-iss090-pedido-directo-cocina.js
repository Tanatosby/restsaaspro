/**
 * ISS-090 — "Pendientes" deja de recibir órdenes.
 *
 *  A. POST /api/public/orders: el pedido del comensal nace EN COCINA
 *     (es_en_cocina=1, es_inicial=0) — antes paraba en "Pendientes".
 *  B. clasificarZonas(): una orden es_en_cocina cae en "cocina"; una orden
 *     vieja que quedó en es_inicial SIGUE cayendo en "pendientes"
 *     (compatibilidad: si desapareciera quedaría activa e invisible); las
 *     reservas siguen clasificándose en "pendientes".
 *  C. btnOrden(): en "pendientes" + es_inicial sigue ofreciendo "🍳 A cocina",
 *     para poder cerrar las que quedaron de antes del cambio.
 *  D. Panel real: el pedido recién creado aparece en zona-cocina con su botón
 *     "✅ Listo" y NO aparece en zona-pendientes.
 *  E. Sin regresión: el pedido manual (POST /api/orders, manual:true) sigue
 *     entrando directo a cocina.
 *
 * Uso: PORT=3399 node scripts/test-iss090-pedido-directo-cocina.js
 *      (requiere server corriendo en ese puerto + usuarios bot)
 */
const { chromium } = require('playwright');

const BASE  = `http://localhost:${process.env.PORT || 3399}`;
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';
const MARCA = `ISS090-${Date.now()}`;

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

  const creadas = [];

  try {
    // ── login → owner ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    // Gap 22 / ISS-082: si el owner de prueba todavía no aceptó los Términos,
    // el modal tapa todo el panel. Aceptarlo es parte del setup, no del test.
    const modalTerminos = page.locator('#modal-terminos');
    if (await modalTerminos.isVisible()) {
      await page.check('#terminos-check');
      await page.click('#terminos-btn');
      await page.waitForTimeout(800);
    }

    const novCerrar = page.locator('.nov-btn-cerrar');
    if (await novCerrar.count() > 0) await novCerrar.click();

    // ── A. el pedido del comensal nace en cocina ──
    console.log('\n── A. POST /api/public/orders entra directo a cocina ──');
    const creada = await page.evaluate(async (marca) => {
      const r = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_restaurante: 1,
          mesa: '9',
          nombre_cliente: marca,
          carta_items: [{ id_plato_carta: 1, cantidad: 1 }],
        }),
      });
      return { ok: r.ok, status: r.status, data: await r.json() };
    }, MARCA);

    check(creada.ok, `La orden se creó (status ${creada.status}${creada.ok ? '' : ' → ' + JSON.stringify(creada.data)})`);
    if (!creada.ok) throw new Error('sin orden no se puede seguir');
    creadas.push(creada.data.id_orden);

    const cola = await page.evaluate(async () => {
      const r = await fetch('/api/orders/cola', { credentials: 'same-origin' });
      return r.json();
    });
    const mia = cola.ordenes.find(o => o.id === creada.data.id_orden);
    check(!!mia, `La orden #${creada.data.id_orden} aparece en la cola del día`);
    check(mia && mia.es_en_cocina === 1, `Nace con es_en_cocina=1 (real: ${mia && mia.es_en_cocina})`);
    check(mia && !mia.es_inicial, `NO nace en es_inicial (real: ${mia && mia.es_inicial})`);
    check(mia && mia.estatus === 'preparando', `Estatus "preparando" (real: ${mia && mia.estatus})`);

    // ── B. clasificarZonas() ──
    console.log('\n── B. clasificarZonas(): órdenes a cocina, reservas a pendientes ──');
    const B = await page.evaluate(() => {
      const z = clasificarZonas(
        [
          { id: 101, es_en_cocina: 1 },   // pedido nuevo (ISS-090)
          { id: 102, es_inicial: 1 },     // orden vieja, anterior al cambio
        ],
        [
          { id: 201, es_inicial: 1 },     // reserva por confirmar
          { id: 202, es_confirmada: 1 },  // reserva confirmada
        ]
      );
      const ids = arr => arr.map(i => i.datos.id);
      return { pendientes: ids(z.pendientes), cocina: ids(z.cocina) };
    });
    check(B.cocina.includes(101), 'La orden es_en_cocina va a la zona "cocina"');
    check(!B.pendientes.includes(101), 'La orden es_en_cocina NO va a "pendientes"');
    check(B.pendientes.includes(102), 'La orden vieja es_inicial SIGUE visible en "pendientes" (compatibilidad)');
    check(B.pendientes.includes(201) && B.pendientes.includes(202),
      'Las reservas siguen clasificándose en "pendientes"');

    // ── C. btnOrden() conserva "A cocina" para las viejas ──
    console.log('\n── C. btnOrden(): las órdenes viejas se pueden cerrar ──');
    const C = await page.evaluate(() => ({
      vieja:  btnOrden({ id: 102, es_inicial: 1, modalidad: 'en_local' }, 'pendientes'),
      cocina: btnOrden({ id: 101, es_en_cocina: 1, modalidad: 'en_local' }, 'cocina'),
    }));
    check(C.vieja.includes('🍳 A cocina') && C.vieja.includes("accionRapidaOrden(102,'es_en_cocina')"),
      'Orden vieja en "pendientes": conserva "🍳 A cocina"');
    check(C.cocina.includes('✅ Listo'),
      'Orden en "cocina": primer paso manual es "✅ Listo"');

    // ── D. panel real ──
    console.log('\n── D. El pedido se ve en "En cocina", no en "Pendientes" ──');
    await page.evaluate(() => showPanel('pedidos'));
    await page.waitForTimeout(500);
    await page.evaluate(() => loadColaDia());
    await page.waitForTimeout(1200);

    const D = await page.evaluate(marca => ({
      enPendientes: document.getElementById('zona-pendientes').innerText.includes(marca),
      enCocina:     document.getElementById('zona-cocina').innerText.includes(marca),
    }), MARCA);
    check(D.enCocina, 'El pedido está en la zona "En cocina"');
    check(!D.enPendientes, 'El pedido NO está en la zona "Pendientes"');

    // ── E. sin regresión: el pedido manual sigue entrando a cocina ──
    console.log('\n── E. Sin regresión: el pedido manual sigue entrando a cocina ──');
    const manual = await page.evaluate(async (marca) => {
      const r = await fetch('/api/orders', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesa: '9',
          nombre_cliente: marca + '-manual',
          carta_items: [{ id_plato_carta: 1, cantidad: 1 }],
          manual: true,
        }),
      });
      return { ok: r.ok, data: await r.json() };
    }, MARCA);
    check(manual.ok, 'El pedido manual se creó');
    if (manual.ok) {
      creadas.push(manual.data.id_orden);
      const cola2 = await page.evaluate(async () => {
        const r = await fetch('/api/orders/cola', { credentials: 'same-origin' });
        return r.json();
      });
      const man = cola2.ordenes.find(o => o.id === manual.data.id_orden);
      check(man && man.es_en_cocina === 1, `El manual sigue naciendo en cocina (real: ${man && man.estatus})`);
      check(man && man.es_manual === 1, 'Y sigue marcado como es_manual');
    }

    check(errors.length === 0,
      'Sin errores de consola/página' + (errors.length ? ' → ' + errors.join(' | ') : ''));

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    // Limpieza: cancelar las órdenes de prueba para no dejarlas en la cola
    for (const id of creadas) {
      try {
        await page.evaluate(async (oid) => {
          await fetch(`/api/orders/${oid}/estatus`, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ flag: 'es_cancelado' }),
          });
        }, id);
      } catch (_) {}
    }
    if (creadas.length) console.log(`\n(órdenes de prueba canceladas: ${creadas.join(', ')})`);
    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
