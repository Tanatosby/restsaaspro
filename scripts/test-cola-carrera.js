// Verificación manual (no forma parte de la suite jest) de ISS-026 + ISS-027.
//
// ISS-026 — Cola del día:
//   1) doble tap no dispara 2 PATCH ni muestra el error falso
//      "No se puede cambiar una orden pagado"
//   2) la respuesta de un poll anterior a la acción no repinta el estado viejo
//      (el pedido ya no reaparece en su zona anterior)
//   3) la card se mueve de zona al instante (actualización optimista)
//   4) cierre de caja: banner + modal + cobrar recupera el total en la BD
//
// ISS-027 — Sesión persistente:
//   5) cerrar y reabrir la app no vuelve a pedir credenciales
//
// Uso: PORT=3999 node app.js &
//      node scripts/test-cola-carrera.js
const { chromium } = require('playwright');
const Database = require('better-sqlite3');

const BASE  = process.env.BASE || 'http://localhost:3999';

// Credenciales del owner de prueba local. Se leen del entorno para no sumar
// otra copia en claro al repositorio, que es público:
//   TEST_EMAIL=... TEST_PASS=... node scripts/test-cola-carrera.js
const EMAIL = process.env.TEST_EMAIL;
const PASS  = process.env.TEST_PASS;

if (!EMAIL || !PASS) {
  console.error('Faltan TEST_EMAIL y TEST_PASS en el entorno.');
  console.error('Ej: TEST_EMAIL=owner@ejemplo.com TEST_PASS=... node scripts/test-cola-carrera.js');
  process.exit(1);
}

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

const db = new Database('database.sqlite');
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

// Órdenes creadas por esta prueba, para limpiarlas al final
const creadas = [];

async function crearOrden(nombre) {
  const res = await fetch(`${BASE}/api/public/orders`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_restaurante: 1,
      mesa: '9',
      nombre_cliente: nombre,
      carta_items: [{ id_plato_carta: 1, cantidad: 1 }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`No se pudo crear la orden: ${data.error}`);
  creadas.push(data.id_orden);
  return data.id_orden;
}

async function login(page) {
  await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });

  // Con la sesión persistente (ISS-027), login.html rebota solo al panel si la
  // cookie sigue viva — el formulario ni siquiera llega a mostrarse. Es el
  // comportamiento deseado, así que acá solo se completa cuando hace falta.
  await page.waitForTimeout(1200);
  if (page.url().includes('owner.html')) return;

  await page.fill('#email', EMAIL);
  await page.fill('#password', PASS);
  await page.click('#submit-btn');
  await page.waitForURL('**/owner.html', { timeout: 15000 });
}

async function irACola(page) {
  await page.evaluate(() => showPanel('pedidos'));
  await page.waitForTimeout(800);
}

const estatusDe = id => db.prepare(`
  SELECT eo.nombre FROM ordenes o JOIN estatus_orden eo ON o.id_estatus = eo.id WHERE o.id = ?
`).get(id)?.nombre;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });

  // ── Test 1: doble tap ────────────────────────────────────────────────
  console.log('\n[Test 1] Doble tap en "A cocina" — un solo PATCH, sin error falso');
  {
    const id = await crearOrden('Doble Tap');
    const page = await ctx.newPage();

    const patches = [];
    const toasts  = [];
    page.on('request', r => {
      if (r.method() === 'PATCH' && r.url().includes(`/api/orders/${id}/estatus`)) patches.push(r.url());
    });

    await login(page);
    await irACola(page);

    // Capturar todo lo que pase por toast(), incluidos los de error
    await page.evaluate(() => {
      window.__toasts = [];
      const orig = window.toast;
      window.toast = (msg, tipo) => { window.__toasts.push({ msg, tipo }); return orig(msg, tipo); };
    });

    const btn = page.locator(`button:has-text("A cocina")`).first();
    await btn.waitFor({ timeout: 10000 });

    // Dos taps seguidos, como cuando la app no responde y el owner insiste
    await btn.click({ force: true });
    await btn.click({ force: true }).catch(() => {});   // la card pudo ya haberse movido
    await page.waitForTimeout(2500);

    const capturados = await page.evaluate(() => window.__toasts);
    toasts.push(...capturados);

    check(patches.length === 1, `un solo PATCH enviado (real: ${patches.length})`);
    check(
      !toasts.some(t => t.tipo === 'err' && /No se puede cambiar/i.test(t.msg)),
      'sin el error falso "No se puede cambiar una orden…"'
    );
    check(estatusDe(id) === 'preparando', `la orden quedó en preparando (real: ${estatusDe(id)})`);

    await page.close();
  }

  // ── Test 2: respuesta de poll vieja llega después de la acción ───────
  console.log('\n[Test 2] Poll lento anterior a la acción — el pedido no reaparece');
  {
    const id = await crearOrden('Carrera Poll');
    const page = await ctx.newPage();
    await login(page);
    await irACola(page);

    await page.locator(`button:has-text("A cocina")`).first().waitFor({ timeout: 10000 });

    // Retener la respuesta de /cola para simular el poll que arrancó antes del
    // tap y contesta después. Es exactamente la condición que hacía reaparecer
    // el pedido en "Pendientes".
    await page.route('**/api/orders/cola', async route => {
      await new Promise(r => setTimeout(r, 3000));
      await route.continue();
    });

    await page.evaluate(() => loadColaDia());   // dispara el poll lento
    await page.waitForTimeout(300);

    await page.unroute('**/api/orders/cola');
    await page.locator(`button:has-text("A cocina")`).first().click({ force: true });
    await page.waitForTimeout(4500);            // deja llegar la respuesta retenida

    const enPendientes = await page.evaluate(() =>
      document.getElementById('zona-pendientes').innerText.includes('Carrera Poll')
    );
    const enCocina = await page.evaluate(() =>
      document.getElementById('zona-cocina').innerText.includes('Carrera Poll')
    );

    check(!enPendientes, 'NO reaparece en Pendientes tras llegar la respuesta vieja');
    check(enCocina, 'quedó en la zona "En cocina"');
    check(estatusDe(id) === 'preparando', `estatus correcto en la BD (real: ${estatusDe(id)})`);

    await page.close();
  }

  // ── Test 3: actualización optimista ─────────────────────────────────
  console.log('\n[Test 3] La card se mueve al instante, sin esperar al servidor');
  {
    const id = await crearOrden('Optimista');
    const page = await ctx.newPage();
    await login(page);
    await irACola(page);
    await page.locator(`button:has-text("A cocina")`).first().waitFor({ timeout: 10000 });

    // PATCH deliberadamente lento: la UI no debe esperarlo para reaccionar
    let lento = true;
    await page.route('**/api/orders/*/estatus', async route => {
      if (lento) await new Promise(r => setTimeout(r, 2500));
      await route.continue();
    });

    await page.locator(`button:has-text("A cocina")`).first().click({ force: true });
    await page.waitForTimeout(400);   // mucho antes de que responda el PATCH

    const yaEnCocina = await page.evaluate(() =>
      document.getElementById('zona-cocina').innerText.includes('Optimista')
    );
    check(yaEnCocina, 'la card ya está en "En cocina" a los 400 ms');

    lento = false;
    await page.waitForTimeout(3500);
    check(estatusDe(id) === 'preparando', `el servidor confirmó el cambio (real: ${estatusDe(id)})`);

    await page.close();
  }

  // ── Test 4: reversión si el backend rechaza ─────────────────────────
  console.log('\n[Test 4] Si el backend rechaza, la card vuelve a su zona');
  {
    const id = await crearOrden('Rechazada');
    const page = await ctx.newPage();
    await login(page);
    await irACola(page);
    await page.locator(`button:has-text("A cocina")`).first().waitFor({ timeout: 10000 });

    await page.route('**/api/orders/*/estatus', route =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Error simulado' }) })
    );

    await page.locator(`button:has-text("A cocina")`).first().click({ force: true });
    await page.waitForTimeout(1500);

    const volvio = await page.evaluate(() =>
      document.getElementById('zona-pendientes').innerText.includes('Rechazada')
    );
    check(volvio, 'la card volvió a "Pendientes" tras el rechazo');
    check(estatusDe(id) === 'pendiente', `la BD quedó intacta (real: ${estatusDe(id)})`);

    await page.close();
  }

  // ── Test 5: cierre de caja ──────────────────────────────────────────
  console.log('\n[Test 5] Cierre de caja — banner, modal y recuperación del total');
  {
    const page = await ctx.newPage();
    await login(page);
    await irACola(page);
    await page.waitForTimeout(1200);

    const viejas = db.prepare(`
      SELECT o.id FROM ordenes o JOIN estatus_orden eo ON o.id_estatus = eo.id
      WHERE o.id_restaurante = 1 AND eo.es_pagado = 0 AND eo.es_cancelado = 0
        AND substr(o.fecha,1,10) < ?
    `).all(hoy()).map(r => r.id);

    const bannerVisible = await page.locator('#banner-sin-cerrar').isVisible();
    check(viejas.length === 0 ? !bannerVisible : bannerVisible,
      `banner ${viejas.length ? 'visible' : 'oculto'} con ${viejas.length} órdenes viejas`);

    if (viejas.length) {
      const texto = await page.locator('#sin-cerrar-conteo').textContent();
      console.log(`     conteo mostrado: "${texto}"`);

      await page.click('#banner-sin-cerrar button');
      await page.waitForTimeout(600);
      check(await page.locator('#modal-cierre-caja').isVisible(), 'el modal se abre');

      const filas = await page.locator('.cierre-item').count();
      check(filas > 0, `el modal lista ${filas} pedidos sin cerrar`);

      // Cobrar el primero y comprobar que el dinero entra a Ganancias
      const idACobrar = viejas[0];
      const antes = db.prepare('SELECT total FROM ordenes WHERE id = ?').get(idACobrar).total;
      check(antes === null, `antes de cerrar, total es NULL (invisible en Ganancias)`);

      await page.locator('.cierre-item button:has-text("Se cobró")').first().click();
      await page.waitForTimeout(1800);

      const fila = db.prepare(`
        SELECT o.total, eo.nombre estatus FROM ordenes o
        JOIN estatus_orden eo ON o.id_estatus = eo.id WHERE o.id = ?
      `).get(idACobrar);
      check(fila.estatus === 'completado', `quedó completado (real: ${fila.estatus})`);
      check(fila.total !== null, `total persistido: S/ ${fila.total} — ya cuenta en Ganancias`);
    }

    await page.close();
  }

  // ── Test 6: sesión persistente (ISS-027) ────────────────────────────
  console.log('\n[Test 6] Sesión persistente — reabrir la app no pide credenciales');
  {
    const page = await ctx.newPage();
    await login(page);

    const guardada = await page.evaluate(() => localStorage.getItem('mp-session'));
    check(!!guardada, 'la sesión quedó en localStorage (sobrevive al cierre de la PWA)');

    // Simular cerrar la app: sessionStorage se pierde, localStorage y la cookie no
    await page.evaluate(() => sessionStorage.clear());
    await page.close();

    const page2 = await ctx.newPage();
    await page2.goto(`${BASE}/owner.html`, { waitUntil: 'domcontentloaded' });
    await page2.waitForTimeout(1500);
    check(page2.url().includes('owner.html'), `entró directo al panel (url: ${page2.url()})`);

    // Y desde el login también debe rebotar solo, sin escribir nada
    await page2.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
    await page2.waitForTimeout(2500);
    check(page2.url().includes('owner.html'), `login.html rebota al panel (url: ${page2.url()})`);

    // Con la cookie muerta sí debe pedir credenciales, sin bucle de redirecciones
    await ctx.clearCookies();
    await page2.goto(`${BASE}/owner.html`, { waitUntil: 'domcontentloaded' });
    await page2.waitForTimeout(2500);
    check(page2.url().includes('login.html'), `sin cookie vuelve al login (url: ${page2.url()})`);
    const limpio = await page2.evaluate(() => localStorage.getItem('mp-session'));
    check(limpio === null, 'la sesión local se limpió — sin bucle login ↔ panel');

    await page2.close();
  }

  await browser.close();

  // ── Limpieza ────────────────────────────────────────────────────────
  console.log('\n[Limpieza] Eliminando las órdenes de prueba');
  for (const id of creadas) {
    db.prepare('DELETE FROM orden_carta_items WHERE id_orden = ?').run(id);
    db.prepare('DELETE FROM orden_menu_items  WHERE id_orden = ?').run(id);
    db.prepare('DELETE FROM ordenes WHERE id = ?').run(id);
  }
  console.log(`  ${creadas.length} órdenes de prueba eliminadas`);

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`RESULTADO: ${pass} ✅   ${fail} ❌`);
  process.exit(fail ? 1 : 0);
})();
