/**
 * ISS-094 — crear las mesas de una vez + mesa escrita a mano en "Agregar manual".
 *
 *  A. Configuración → Mesas sin mesas: "¿Cuántas mesas tiene tu local?" + un
 *     botón crea de la 1 a la N. El texto de ayuda anticipa qué va a pasar.
 *  B. Repetir no duplica; un número mayor agrega solo las que faltan; uno
 *     inválido no llama al servidor. El QR por mesa arranca con esa cantidad.
 *  C. A 360 px y con la letra más grande: sin scroll horizontal y todo ≥ 44 px.
 *  D. "Agregar manual" SIN mesas creadas: la mesa se escribe a mano, y el pedido
 *     se junta en "Por cobrar" con el pedido por QR de la misma mesa.
 *  E. Mesa inválida (0, decimal) → error en el modal; el servidor también la rechaza.
 *
 * Toca las mesas del restaurante 1 de la BD de desarrollo: las guarda al
 * empezar y las restaura al final.
 *
 * Uso: PORT=3399 node app.js &   (servidor ya debe estar corriendo)
 *      PORT=3399 node scripts/test-iss094-mesas.js
 */
const { chromium } = require('playwright');
const Database = require('better-sqlite3');

const BASE  = `http://localhost:${process.env.PORT || 3399}`;
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';
const RID   = 1;
const MESA  = '97';

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

const db = new Database('database.sqlite');
const mesasOriginales = db.prepare('SELECT * FROM mesas WHERE id_restaurante = ?').all(RID);
const creadas = [];

const contarMesas = () => db.prepare('SELECT COUNT(*) AS n FROM mesas WHERE id_restaurante = ?').get(RID).n;
const borrarMesas = () => db.prepare('DELETE FROM mesas WHERE id_restaurante = ?').run(RID);

function restaurar() {
  for (const id of creadas) {
    db.prepare('DELETE FROM orden_carta_items WHERE id_orden = ?').run(id);
    db.prepare('DELETE FROM orden_menu_items  WHERE id_orden = ?').run(id);
    db.prepare('DELETE FROM ordenes WHERE id = ?').run(id);
  }
  borrarMesas();
  const ins = db.prepare('INSERT INTO mesas (id, numero, capacidad, activo, id_restaurante) VALUES (?, ?, ?, ?, ?)');
  for (const m of mesasOriginales) ins.run(m.id, m.numero, m.capacidad, m.activo, m.id_restaurante);
}

(async () => {
  const browser = await chromium.launch();
  const ctx  = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const url = (m.location() && m.location().url) || '';
    if (/\/uploads\//.test(url) && /Failed to load resource/.test(m.text())) return;
    // El 400 de la mesa inválida (caso E) es a propósito
    if (/status of 400/.test(m.text())) return;
    errors.push(m.text());
  });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  const texto = sel => page.locator(sel).innerText();

  try {
    borrarMesas();

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

    // ── A. sin mesas ──
    console.log('\n── A. Configuración → Mesas, sin mesas todavía ──');
    await page.evaluate(() => showPanel('configuracion'));
    await page.evaluate(() => loadMesasConfig());
    await page.waitForTimeout(500);
    check((await texto('#cfg-mesas-resumen')).includes('Crea todas tus mesas'), 'El resumen invita a crearlas');
    check((await texto('#cfg-mesas-btn')) === 'Crear mesas', 'El botón dice "Crear mesas"');
    await page.fill('#cfg-mesas-cantidad', '20');
    check((await texto('#cfg-mesas-ayuda')) === 'Se crean numeradas del 1 al 20.', 'La ayuda anticipa "del 1 al 20"');
    await page.click('#cfg-mesas-btn');
    await page.waitForTimeout(900);
    check(contarMesas() === 20, `Se crearon 20 mesas en la BD (hay ${contarMesas()})`);
    check((await texto('#cfg-mesas-resumen')).includes('Tienes 20 mesas: 1 a 20.'),
      `El resumen dice "Tienes 20 mesas: 1 a 20." (real: "${await texto('#cfg-mesas-resumen')}")`);
    check((await texto('#cfg-mesas-btn')) === 'Crear las que faltan', 'Con mesas, el botón pasa a "Crear las que faltan"');
    check((await page.inputValue('#qr-num-mesas')) === '20', 'El QR por mesa arranca en 20');

    // ── B. repetir, ampliar, inválido ──
    console.log('\n── B. Repetir no duplica · ampliar agrega las que faltan ──');
    check((await texto('#cfg-mesas-ayuda')).startsWith('Ya tienes todas esas mesas'), 'Con 20 puesto, la ayuda dice que ya están');
    await page.click('#cfg-mesas-btn');
    await page.waitForTimeout(700);
    check(contarMesas() === 20, 'Tocar de nuevo no duplica (siguen 20)');

    await page.fill('#cfg-mesas-cantidad', '25');
    check((await texto('#cfg-mesas-ayuda')).includes('las mesas 21 a 25. No se borra ninguna.'),
      `La ayuda anticipa "21 a 25" (real: "${await texto('#cfg-mesas-ayuda')}")`);
    await page.click('#cfg-mesas-btn');
    await page.waitForTimeout(900);
    check(contarMesas() === 25, 'Con 25 se agregan 5 (hay 25)');
    check((await page.inputValue('#qr-num-mesas')) === '25', 'El QR por mesa se actualiza a 25');

    await page.fill('#cfg-mesas-cantidad', '10');
    await page.click('#cfg-mesas-btn');
    await page.waitForTimeout(700);
    check(contarMesas() === 25, 'Un número menor no borra ninguna');

    await page.fill('#cfg-mesas-cantidad', '0');
    check((await texto('#cfg-mesas-ayuda')) === 'Pon un número entre 1 y 100.', 'Con 0 la ayuda pide un número válido');
    await page.click('#cfg-mesas-btn');
    await page.waitForTimeout(500);
    check(contarMesas() === 25, 'Con 0 no se crea nada');

    const apiInvalida = await page.evaluate(async () => {
      const r = await fetch('/api/mesas/lote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cantidad: 'abc' }) });
      return r.status;
    });
    check(apiInvalida === 400, `El servidor rechaza una cantidad inválida (status ${apiInvalida})`);

    // ── C. mobile-first ──
    console.log('\n── C. 360 px con la letra más grande ──');
    await page.evaluate(() => document.documentElement.style.setProperty('--font-scale', '1.7'));
    await page.waitForTimeout(300);
    const medidas = await page.evaluate(() => {
      const card = document.getElementById('cfg-mesas-cantidad').closest('.card');
      card.scrollIntoView();
      const r = el => document.getElementById(el).getBoundingClientRect();
      return {
        scroll: document.documentElement.scrollWidth, ancho: window.innerWidth,
        cardRight: card.getBoundingClientRect().right,
        input: r('cfg-mesas-cantidad').height, boton: r('cfg-mesas-btn').height,
        fontInput: parseFloat(getComputedStyle(document.getElementById('cfg-mesas-cantidad')).fontSize),
      };
    });
    check(medidas.scroll <= medidas.ancho && medidas.cardRight <= medidas.ancho,
      `Sin overflow horizontal (scrollWidth ${medidas.scroll}, card hasta ${medidas.cardRight.toFixed(0)} de ${medidas.ancho})`);
    check(medidas.input >= 44 && medidas.boton >= 44, `Input y botón ≥ 44 px (${medidas.input.toFixed(0)} / ${medidas.boton.toFixed(0)})`);
    check(medidas.fontInput >= 16, `Letra del input ≥ 16 px (${medidas.fontInput})`);
    await page.evaluate(() => document.documentElement.style.removeProperty('--font-scale'));

    // ── D. Agregar manual sin mesas creadas ──
    console.log(`\n── D. Agregar manual sin mesas: la mesa ${MESA} se junta con su pedido por QR ──`);
    borrarMesas();
    const est = db.prepare('SELECT id FROM estatus_orden WHERE es_entregado = 1').get().id;

    const qr = await page.evaluate(async (mesa) => {
      const res = await fetch('/api/public/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_restaurante: 1, mesa, nombre_cliente: 'QR ISS094', carta_items: [{ id_plato_carta: 1, cantidad: 1 }] }),
      });
      return { ok: res.ok, data: await res.json() };
    }, MESA);
    if (!qr.ok) throw new Error('No se pudo crear el pedido por QR: ' + JSON.stringify(qr.data));
    creadas.push(qr.data.id_orden);
    db.prepare('UPDATE ordenes SET id_estatus = ? WHERE id = ?').run(est, qr.data.id_orden);

    await page.evaluate(() => showPanel('pedidos'));
    await page.waitForTimeout(300);
    await page.click('button:has-text("+ Agregar manual")');
    await page.waitForFunction(() => document.getElementById('modal-agregar-manual').style.display === 'flex');
    await page.waitForSelector('.manual-carta-item[data-plato="1"]', { timeout: 5000 });

    const campo = await page.evaluate(() => {
      const el = document.getElementById('manual-mesa');
      return { tag: el.tagName, type: el.type, inputmode: el.getAttribute('inputmode'), h: el.getBoundingClientRect().height,
               font: parseFloat(getComputedStyle(el).fontSize) };
    });
    check(campo.tag === 'INPUT' && campo.type === 'number' && campo.inputmode === 'numeric',
      `La mesa es un campo numérico, no un selector (${campo.tag} type=${campo.type})`);
    check(campo.h >= 44 && campo.font >= 16, `Campo ≥ 44 px y letra ≥ 16 px (${campo.h.toFixed(0)} / ${campo.font})`);

    // E (en el mismo modal). Mesa inválida → error, no se envía
    const ultimaManual = () => db.prepare('SELECT MAX(id) AS id FROM ordenes WHERE es_manual = 1').get().id;
    const antes = ultimaManual();
    await page.click('.manual-carta-item[data-plato="1"] button:has-text("+")');
    for (const invalida of ['0', '2.5']) {
      await page.fill('#manual-mesa', invalida);
      await page.click('#manual-btn-enviar');
      await page.waitForTimeout(500);
      check((await texto('#manual-error')).includes('número entero mayor a 0') && ultimaManual() === antes,
        `Mesa "${invalida}" → error en el modal y no se crea el pedido`);
    }

    await page.fill('#manual-mesa', MESA);
    await page.click('#manual-btn-enviar');
    await page.waitForTimeout(1000);
    const manual = db.prepare('SELECT id, mesa, typeof(mesa) AS tipo FROM ordenes WHERE es_manual = 1 AND id > ? ORDER BY id DESC LIMIT 1').get(antes || 0);
    check(!!manual, 'Se creó el pedido manual');
    if (manual) {
      creadas.push(manual.id);
      db.prepare('UPDATE ordenes SET id_estatus = ? WHERE id = ?').run(est, manual.id);
    }
    const qrRow = db.prepare('SELECT mesa, typeof(mesa) AS tipo FROM ordenes WHERE id = ?').get(qr.data.id_orden);
    check(manual && manual.mesa === 97 && manual.tipo === 'integer' && qrRow.mesa === 97 && qrRow.tipo === 'integer',
      `Los dos quedan con mesa = 97 entero (manual: ${manual?.mesa}/${manual?.tipo}, QR: ${qrRow.mesa}/${qrRow.tipo})`);

    await page.evaluate(() => switchZona('cobrar'));
    await page.evaluate(() => loadColaDia());
    await page.waitForTimeout(1500);
    const fila = page.locator(`#zona-cobrar .mesa-cuenta:has-text("Mesa ${MESA}")`);
    check(await fila.count() === 1, `"Por cobrar" muestra UNA fila para la mesa ${MESA}`);
    if (await fila.count() === 1) {
      check((await fila.innerText()).includes('2 pedidos'), `La fila junta los 2 pedidos (QR + manual), sin mesas creadas`);
    }

    const apiMesaMala = await page.evaluate(async () => {
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesa: 'abc', manual: true, carta_items: [{ id_plato_carta: 1, cantidad: 1 }] }) });
      return r.status;
    });
    check(apiMesaMala === 400, `El servidor rechaza mesa "abc" en POST /api/orders (status ${apiMesaMala})`);

    check(errors.length === 0, `Sin errores de consola${errors.length ? ': ' + errors.join(' | ') : ''}`);
  } catch (e) {
    console.log('  💥', e.message);
    fail++;
  } finally {
    restaurar();
    check(contarMesas() === mesasOriginales.length, `Mesas originales restauradas (${mesasOriginales.length})`);
    await browser.close();
    console.log(`\n${pass}/${pass + fail} checks OK`);
    process.exit(fail ? 1 : 0);
  }
})();
