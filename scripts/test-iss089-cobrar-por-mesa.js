/**
 * ISS-089 — "Por cobrar" agrupada por mesa + cobro en bloque.
 *
 *  A. La zona lista MESAS, no pedidos: una fila por mesa con su cuenta
 *     acumulada y su botón "💰 Cobrar mesa N", sin desplegar nada.
 *  B. Orden por antigüedad: la mesa que llegó primero va arriba.
 *  C. Los pedidos sin mesa van juntos al final y ese grupo NO tiene cobro en
 *     bloque (son clientes distintos).
 *  D. Al desplegar, cada ticket muestra su propio monto y su "Cobrar solo este".
 *  E. El buscador filtra por MESA: si coincide un pedido, se ve la mesa entera.
 *  F. "Cobrar mesa" pide confirmación y, al aceptar, cierra todos los pedidos
 *     de la mesa en una sola llamada: quedan 'completado' con su `total`
 *     persistido (lo que cuenta en Ganancias).
 *  G. El endpoint es todo-o-nada: si un pedido ya está cobrado, no cobra ninguno.
 *
 * Uso: PORT=3399 node scripts/test-iss089-cobrar-por-mesa.js
 *      (requiere server corriendo en ese puerto + usuarios bot)
 */
const { chromium } = require('playwright');
const Database = require('better-sqlite3');

const BASE  = `http://localhost:${process.env.PORT || 3399}`;
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';
const MESA_A = '91';   // la que llegó primero
const MESA_B = '92';

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

const db = new Database('database.sqlite');
const creadas = [];

function limpiar() {
  for (const id of creadas) {
    db.prepare('DELETE FROM orden_carta_items WHERE id_orden = ?').run(id);
    db.prepare('DELETE FROM orden_menu_items  WHERE id_orden = ?').run(id);
    db.prepare('DELETE FROM ordenes WHERE id = ?').run(id);
  }
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

  // El cobro en bloque pregunta antes con un modal propio (no confirm() nativo:
  // su letra es diminuta en el celular y no admite "no volver a preguntar").
  const modalCobro   = () => page.locator('#modal-cobrar-mesa');
  const confirmarEnModal = async () => {
    await page.locator('#modal-cobrar-mesa button:has-text("Cobrar")').click();
    await page.waitForTimeout(1200);
  };
  const cancelarEnModal = async () => {
    await page.locator('#modal-cobrar-mesa button:has-text("Cancelar")').click();
    await page.waitForTimeout(400);
  };

  try {
    // ── login ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    const modalTerminos = page.locator('#modal-terminos');
    if (await modalTerminos.isVisible().catch(() => false)) {
      await page.check('#terminos-check');
      await page.click('#terminos-btn');
      await page.waitForTimeout(600);
    }
    const novCerrar = page.locator('.nov-btn-cerrar');
    if (await novCerrar.count() > 0) { await novCerrar.click().catch(() => {}); await page.waitForTimeout(300); }

    // ── fixture: pedidos entregados, listos para cobrar ──
    // Se crean por la API pública (el camino real del comensal) y se llevan a
    // es_entregado, que es lo que cae en "Por cobrar".
    async function crearPedido({ mesa, nombre, cantidad = 1 }) {
      const r = await page.evaluate(async ([mesa, nombre, cantidad]) => {
        const res = await fetch('/api/public/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_restaurante: 1,
            mesa,
            nombre_cliente: nombre,
            carta_items: [{ id_plato_carta: 1, cantidad }],
          }),
        });
        return { ok: res.ok, data: await res.json() };
      }, [mesa, nombre, cantidad]);
      if (!r.ok) throw new Error('No se pudo crear el pedido: ' + JSON.stringify(r.data));
      const id = r.data.id_orden;
      creadas.push(id);
      const est = db.prepare('SELECT id FROM estatus_orden WHERE es_entregado = 1').get().id;
      db.prepare('UPDATE ordenes SET id_estatus = ? WHERE id = ?').run(est, id);
      return id;
    }

    console.log('\n── Fixture: 3 pedidos en la mesa ' + MESA_A + ', 1 en la ' + MESA_B + ', 1 sin mesa ──');
    const a1 = await crearPedido({ mesa: MESA_A, nombre: 'Ana ISS089', cantidad: 2 });  // 56.00
    const a2 = await crearPedido({ mesa: MESA_A, nombre: 'Ana ISS089', cantidad: 1 });  // 28.00
    const a3 = await crearPedido({ mesa: MESA_A, nombre: 'Hijo ISS089', cantidad: 1 }); // 28.00
    const b1 = await crearPedido({ mesa: MESA_B, nombre: 'Beto ISS089', cantidad: 1 }); // 28.00
    const s1 = await crearPedido({ mesa: null,   nombre: 'Llevar ISS089', cantidad: 1 });

    // La mesa A tiene que quedar "más vieja" que la B para verificar el orden
    db.prepare(`UPDATE ordenes SET created_at = datetime('now','-90 minutes') WHERE id IN (?,?,?)`).run(a1, a2, a3);
    db.prepare(`UPDATE ordenes SET created_at = datetime('now','-10 minutes') WHERE id IN (?,?)`).run(b1, s1);
    check(true, `Creados: mesa ${MESA_A} → #${a1}/#${a2}/#${a3}, mesa ${MESA_B} → #${b1}, sin mesa → #${s1}`);

    // ── A. la zona lista mesas con su cuenta ──
    console.log('\n── A. La zona lista mesas con su cuenta ──');
    await page.evaluate(() => showPanel('pedidos'));
    await page.waitForTimeout(400);
    await page.evaluate(() => switchZona('cobrar'));
    await page.evaluate(() => loadColaDia());
    await page.waitForTimeout(1500);

    const filaA = page.locator(`#zona-cobrar .mesa-cuenta:has-text("Mesa ${MESA_A}")`).first();
    check(await filaA.count() === 1, `Hay UNA fila para la mesa ${MESA_A} (no 3 tarjetas)`);
    check((await filaA.innerText()).includes('3 pedidos'), 'La fila dice "3 pedidos"');
    check((await filaA.innerText()).includes('S/ 112.00'),
      `La fila muestra el total acumulado S/ 112.00 (real: ${(await filaA.innerText()).replace(/\n/g, ' | ')})`);

    const btnMesaA = filaA.locator('button:has-text("Cobrar mesa")');
    check(await btnMesaA.count() === 1, 'La fila trae "💰 Cobrar mesa" sin desplegar nada');
    const caja = await btnMesaA.boundingBox();
    check(caja && caja.height >= 44, `El botón es táctil (alto: ${caja ? caja.height.toFixed(0) : '?'}px)`);

    const resumen = page.locator('#zona-cobrar .cobrar-resumen-val');
    check(await resumen.count() === 1, 'Hay un resumen "Por cobrar hoy" arriba');

    // ── B. orden por antigüedad ──
    console.log('\n── B. Orden por antigüedad, la mesa que llegó primero arriba ──');
    const ordenFilas = await page.evaluate(() =>
      [...document.querySelectorAll('#zona-cobrar .mesa-cuenta .mesa-cuenta-tit')].map(e => e.innerText.trim()));
    const posA = ordenFilas.findIndex(t => t.includes(`Mesa ${MESA_A}`));
    const posB = ordenFilas.findIndex(t => t.includes(`Mesa ${MESA_B}`));
    check(posA >= 0 && posB >= 0 && posA < posB,
      `Mesa ${MESA_A} (90 min) va antes que la ${MESA_B} (10 min) → [${ordenFilas.join(' · ')}]`);

    // ── C. grupo sin mesa al final y sin cobro en bloque ──
    console.log('\n── C. "Para llevar y sin mesa": al final y sin cobro en bloque ──');
    const grupoSinMesa = page.locator('#zona-cobrar .mesa-cuenta.sin-mesa');
    check(await grupoSinMesa.count() === 1, 'Existe el grupo "Para llevar y sin mesa"');
    check(await grupoSinMesa.locator('button:has-text("Cobrar mesa")').count() === 0,
      'El grupo sin mesa NO tiene botón de cobro en bloque (son clientes distintos)');
    const posSin = ordenFilas.findIndex(t => t.includes('sin mesa'));
    check(posSin === ordenFilas.length - 1, `El grupo sin mesa va último (posición ${posSin + 1} de ${ordenFilas.length})`);

    // ── D. desplegar: tickets con su propio monto ──
    console.log('\n── D. Al desplegar, cada ticket trae su monto ──');
    await filaA.locator('.mesa-cuenta-open').click();
    await page.waitForTimeout(400);
    const tickets = filaA.locator('.ticket-cuenta');
    check(await tickets.count() === 3, `Se ven los 3 tickets de la mesa (real: ${await tickets.count()})`);
    const montos = await tickets.locator('.ticket-cuenta-monto').allInnerTexts();
    check(montos.filter(m => m.includes('S/ 28.00')).length === 2 && montos.some(m => m.includes('S/ 56.00')),
      `Cada ticket con su precio: ${montos.join(' / ')}`);
    check(await tickets.first().locator('button:has-text("Cobrar solo este")').count() === 1,
      'Cada ticket tiene "Cobrar solo este" (el que paga aparte)');
    check((await filaA.locator('.mesa-cuenta-body').innerText()).indexOf('S/ 112.00') === -1,
      'Adentro NO se repite el total de la mesa (ya está arriba)');

    // ── E. el buscador filtra por mesa ──
    console.log('\n── E. El buscador filtra por mesa, no por pedido ──');
    await page.fill('#cobrar-buscador input', 'Hijo ISS089');
    await page.waitForTimeout(400);
    const visiblesFiltro = await page.evaluate(() =>
      [...document.querySelectorAll('#zona-cobrar .mesa-cuenta .mesa-cuenta-tit')].map(e => e.innerText.trim()));
    check(visiblesFiltro.length === 1 && visiblesFiltro[0].includes(`Mesa ${MESA_A}`),
      `Buscar el nombre de UN pedido muestra su mesa entera → [${visiblesFiltro.join(' · ')}]`);
    const filaFiltrada = page.locator(`#zona-cobrar .mesa-cuenta`).first();
    check((await filaFiltrada.innerText()).includes('S/ 112.00'),
      'Y la cuenta sigue completa (S/ 112.00), no solo el pedido que coincide');
    await page.fill('#cobrar-buscador input', '');
    await page.waitForTimeout(400);

    // ── F. cobrar la mesa completa ──
    console.log('\n── F. "Cobrar mesa" pide confirmación y cierra todo junto ──');
    const btnCobrarMesaA = () => page
      .locator(`#zona-cobrar .mesa-cuenta:has-text("Mesa ${MESA_A}") button:has-text("Cobrar mesa")`).first();

    check(!(await btnCobrarMesaA().innerText()).includes('S/'),
      `El botón no repite el monto — ya está en la fila ("${(await btnCobrarMesaA().innerText()).trim()}")`);

    await btnCobrarMesaA().click();
    await page.waitForTimeout(600);
    check(await modalCobro().isVisible(), 'Se abre el aviso antes de cobrar');
    const textoModal = (await modalCobro().innerText()).replace(/\n+/g, ' | ');
    check(/3 pedidos/.test(textoModal) && /112\.00/.test(textoModal),
      `Con el detalle y el total: "${textoModal}"`);
    check(await page.locator('#cobrar-mesa-no-preguntar').count() === 1,
      'Y la opción "No volver a preguntarme"');

    await cancelarEnModal();
    const sigueAbierta = db.prepare(
      `SELECT COUNT(*) n FROM ordenes o JOIN estatus_orden eo ON o.id_estatus = eo.id
       WHERE o.id IN (?,?,?) AND eo.es_pagado = 0`).get(a1, a2, a3).n;
    check(sigueAbierta === 3, 'Al cancelar no se cobra nada');

    // Marcar la casilla y CANCELAR no debe apagar el aviso
    await btnCobrarMesaA().click();
    await page.waitForTimeout(500);
    await page.check('#cobrar-mesa-no-preguntar');
    await cancelarEnModal();
    check(await page.evaluate(() => pideConfirmacionDeCobro()),
      'Marcar "no preguntar" y cancelar NO apaga el aviso (solo cuenta si confirma)');

    await btnCobrarMesaA().click();
    await page.waitForTimeout(500);
    await confirmarEnModal();
    await page.waitForTimeout(1200);

    const cobradas = db.prepare(`
      SELECT o.id, o.total, o.estado_pago, eo.nombre estatus
      FROM ordenes o JOIN estatus_orden eo ON o.id_estatus = eo.id
      WHERE o.id IN (?,?,?)`).all(a1, a2, a3);
    check(cobradas.every(o => o.estatus === 'completado'),
      `Las 3 quedaron completadas (${cobradas.map(o => o.estatus).join(', ')})`);
    check(cobradas.every(o => o.total !== null),
      `Las 3 con su total persistido — ya cuentan en Ganancias (${cobradas.map(o => o.total).join(', ')})`);
    check(Math.abs(cobradas.reduce((s, o) => s + o.total, 0) - 112) < 0.005,
      `La suma cobrada es exactamente la que mostraba la fila: S/ ${cobradas.reduce((s, o) => s + o.total, 0).toFixed(2)}`);
    check(cobradas.every(o => o.estado_pago === 'pagado'), 'Las 3 quedaron marcadas como pagadas');

    check(await page.locator(`#zona-cobrar .mesa-cuenta:has-text("Mesa ${MESA_A}")`).count() === 0,
      'La mesa desapareció de la cola');
    check(await page.locator(`#zona-cobrar .mesa-cuenta:has-text("Mesa ${MESA_B}")`).count() === 1,
      `La mesa ${MESA_B} sigue ahí, intacta`);

    // "No volver a preguntarme": al confirmar sí queda guardado, y el siguiente
    // cobro va directo. Al final se restaura para no dejar el panel alterado.
    await page.evaluate(() => localStorage.setItem('mp-confirmar-cobro-mesa', 'no'));
    await page.locator(`#zona-cobrar .mesa-cuenta:has-text("Mesa ${MESA_B}") button:has-text("Cobrar mesa")`).first().click();
    await page.waitForTimeout(1400);
    check(!(await modalCobro().isVisible()), 'Con "no preguntar" activo, el cobro va directo sin aviso');
    check(db.prepare(`SELECT eo.es_pagado FROM ordenes o JOIN estatus_orden eo ON o.id_estatus = eo.id WHERE o.id = ?`)
            .get(b1).es_pagado === 1, `Y cobró igual la mesa ${MESA_B}`);

    // Configuración permite volver a activarlo
    await page.evaluate(() => showPanel('configuracion'));
    await page.waitForTimeout(1200);
    check(await page.isChecked('#cfg-confirmar-cobro-mesa') === false,
      'Configuración refleja que el aviso está desactivado');
    await page.check('#cfg-confirmar-cobro-mesa');
    await page.waitForTimeout(400);
    check(await page.evaluate(() => pideConfirmacionDeCobro()),
      'Y desde ahí se vuelve a activar — no es una decisión sin vuelta atrás');
    await page.evaluate(() => showPanel('pedidos'));
    await page.waitForTimeout(500);

    // La consola se revisa ACÁ, antes del bloque G: ese bloque provoca 409/400/404
    // a propósito contra el endpoint, y el navegador los loguea como error de red.
    check(errors.length === 0,
      'Sin errores de consola/página' + (errors.length ? ' → ' + errors.join(' | ') : ''));

    // ── G. todo-o-nada en el endpoint ──
    console.log('\n── G. El endpoint es todo-o-nada ──');
    // El único que queda sin cobrar a esta altura es el del grupo sin mesa
    const loteMixto = await page.evaluate(async ([yaCobrada, abierta]) => {
      const r = await fetch('/api/orders/cobrar-mesa', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordenes: [yaCobrada, abierta] }),
      });
      return { status: r.status, data: await r.json() };
    }, [a1, s1]);
    check(loteMixto.status === 409, `Rechaza el lote con un pedido ya cobrado (status ${loteMixto.status})`);
    const otroSigueAbierto = db.prepare(
      `SELECT eo.es_pagado FROM ordenes o JOIN estatus_orden eo ON o.id_estatus = eo.id WHERE o.id = ?`).get(s1);
    check(otroSigueAbierto.es_pagado === 0,
      'Y NO cobró el otro pedido del lote: o todos o ninguno');

    const vacio = await page.evaluate(async () => {
      const r = await fetch('/api/orders/cobrar-mesa', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordenes: [] }),
      });
      return r.status;
    });
    check(vacio === 400, `Un lote vacío da 400 (real: ${vacio})`);

    const ajeno = await page.evaluate(async () => {
      const r = await fetch('/api/orders/cobrar-mesa', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordenes: [999999] }),
      });
      return r.status;
    });
    check(ajeno === 404, `Un pedido inexistente da 404, no cobra nada (real: ${ajeno})`);

    // Acá ya no se revisa la consola: los 3 rechazos de arriba son deliberados.
    const soloEsperados = errors.every(e => /cobrar-mesa|409|400|404/.test(e));
    check(soloEsperados,
      'Los únicos errores de red son los rechazos que este test provoca' +
      (soloEsperados ? '' : ' → ' + errors.join(' | ')));

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    limpiar();
    console.log(`\n(${creadas.length} pedidos de prueba eliminados de la BD)`);
    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
