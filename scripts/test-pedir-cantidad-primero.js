/**
 * E2E del flujo "cantidad primero" de Pedir (menu.html) — día 13 del piloto.
 *
 * Reemplaza el viejo patrón de "tocar la card abre el picker, agregar de a
 * uno" por: elegir cuántos con el stepper de la card (sin que se abra nada),
 * tocar "Elegir opciones" y ahí sí configurar cada unidad en secuencia
 * ("1/n", "2/n"...), encadenando incluso entre distintos tipos de menú, y
 * aterrizando directo en el carrito al terminar — nunca de vuelta a la
 * carta. El carrito tampoco se abre con menús a medio pedir: si el stepper
 * marca cantidad sin configurar, tocar el carrito arranca el wizard primero.
 * Reservar NO cambia — sigue con abrirMenuModal() de siempre (cubierto por
 * otros tests existentes).
 *
 * Uso: PORT=3399 node scripts/test-pedir-cantidad-primero.js
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
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    const setup = await page.evaluate(async () => {
      const usable = m => {
        const secs = m.secciones || [];
        return secs.some(s => (s.platos || []).length)
            && secs.filter(s => s.requerido).every(s => (s.platos || []).length);
      };
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const menus = (await api('GET', `/api/menu/menus-dia?dia=${hoy}`)).filter(usable);
      if (menus.length < 2) {
        // Si solo hay 1 usable hoy, clonarlo para tener 2 tipos distintos
        // y probar el encadenado entre menús.
        if (menus.length === 1) {
          await api('POST', `/api/menu/menus-dia/${menus[0].id}/copiar`, { dia: hoy });
        }
      }
      const todosHoy = (await api('GET', `/api/menu/menus-dia?dia=${hoy}`)).filter(usable);
      if (todosHoy.length < 2) return { error: 'No se pudo armar 2 menús usables para hoy' };
      const sesion = leerSesion();
      return { menuIdA: todosHoy[0].id, menuIdB: todosHoy[1].id, restauranteId: sesion.restaurant_id };
    });
    if (setup.error) throw new Error(setup.error);
    console.log(`Setup OK — menú A #${setup.menuIdA}, menú B #${setup.menuIdB}`);

    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}&mesa=11`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    console.log('\n── El stepper de la card no abre nada ──');
    const cardA = page.locator(`.menu-dia-card:has(#menu-qty-${setup.menuIdA})`);
    await cardA.locator('.qty-btn.add').click();
    await page.waitForTimeout(150);
    check(await page.locator('.mm-overlay.open').count() === 0, 'Tocar "+" en el stepper NO abre el picker');
    check((await page.locator(`#menu-qty-${setup.menuIdA}`).textContent()).trim() === '1', 'El stepper marca 1');

    await cardA.locator('.qty-btn.add').click();
    await page.waitForTimeout(150);
    check((await page.locator(`#menu-qty-${setup.menuIdA}`).textContent()).trim() === '2', 'Subir a 2 tampoco abre nada');
    check(await page.locator('.mm-overlay.open').count() === 0, 'Sigue sin abrirse el picker');

    // Menú B: 1 unidad
    const cardB = page.locator(`.menu-dia-card:has(#menu-qty-${setup.menuIdB})`);
    await cardB.locator('.qty-btn.add').click();
    await page.waitForTimeout(150);

    console.log('\n── "Elegir opciones" arranca el wizard y encadena ──');
    await cardA.locator('.btn-add-menu:has-text("Elegir opciones")').click();
    await page.waitForTimeout(200);
    check(await page.locator('.mm-overlay.open').count() === 1, 'El picker se abre al tocar "Elegir opciones"');
    check((await page.locator('.mm-progreso').innerText()).includes('1/2'), 'Aviso "1/2" de la primera unidad del menú A');

    // Elegir la primera opción de cada sección requerida y guardar
    async function elegirYGuardar(etiquetaEsperada) {
      // Re-consulta el DOM en cada click en vez de iterar un NodeList
      // capturado una sola vez — cada selección dispara MenuModal.refresh()
      // (ISS-066 en vivo), que reemplaza TODO el cuerpo del modal, así que
      // un NodeList viejo apunta a nodos ya desprendidos del documento.
      await page.evaluate(() => {
        let siguio = true, guard = 0;
        while (siguio && guard++ < 20) {
          siguio = false;
          for (const block of document.querySelectorAll('.seccion-block')) {
            if (!block.querySelector('.seccion-req')) continue;
            if (block.querySelector('.plato-option input[type=radio]:checked')) continue;
            const radio = block.querySelector('.plato-option input[type=radio]');
            if (radio) { radio.click(); siguio = true; break; }
          }
        }
      });
      await page.waitForTimeout(150);
      if (etiquetaEsperada) {
        check((await page.locator('.mm-btn-agregar').textContent()).includes(etiquetaEsperada),
          `El botón dice "${etiquetaEsperada}"`);
      }
      await page.click('.mm-btn-agregar');
      await page.waitForTimeout(250);
    }

    await elegirYGuardar('2/2'); // queda 1 unidad más del menú A
    check((await page.locator('.mm-progreso').innerText()).includes('2/2'), 'Pasa sola a la 2/2 del menú A');
    await elegirYGuardar(); // termina el menú A, debe seguir con el menú B
    check((await page.locator('.mm-progreso').innerText()).includes('1/1'), 'Terminado el menú A, sigue solo con el menú B (1/1)');
    await elegirYGuardar();

    console.log('\n── Termina toda la tanda: cierra y aterriza en el carrito ──');
    check(await page.locator('.mm-overlay.open').count() === 0, 'El picker se cierra solo al terminar todo');
    check(await page.locator('#cart-drawer.open').count() === 1, 'El carrito se abre solo, sin volver a la carta');

    const filas = await page.locator('#drawer-items .cart-item').count();
    check(filas === 3, `3 filas en el carrito, sin agrupar (2 del menú A + 1 del B) (${filas})`);
    check((await page.evaluate(() => cart.length)) === 3, 'cart[] tiene 3 unidades reales');

    console.log('\n── El carrito no se abre con menús a medio pedir ──');
    await page.click('.drawer-close');
    await page.waitForTimeout(200);
    await cardA.locator('.qty-btn.add').click(); // menú A vuelve a quedar con 1 pendiente sin configurar
    await page.waitForTimeout(150);
    await page.click('.cart-btn');
    await page.waitForTimeout(250);
    check(await page.locator('#cart-drawer.open').count() === 0, 'El carrito NO se abre con un menú pendiente sin configurar');
    check(await page.locator('.mm-overlay.open').count() === 1, 'En vez de eso, arranca el picker del menú pendiente');
    check((await page.locator('.mm-progreso').innerText()).includes('3/3'), 'La posición sigue la cuenta real (3ra unidad del menú A)');
    await elegirYGuardar();
    check(await page.locator('#cart-drawer.open').count() === 1, 'Al terminar esa unidad sí abre el carrito');

    console.log('\n── Editar una unidad ya en el carrito ──');
    const primeraFila = page.locator('#drawer-items .cart-item').first();
    await primeraFila.locator('.cart-edit').click();
    await page.waitForTimeout(200);
    check(await page.locator('.mm-overlay.open').count() === 1, 'Editar reabre el picker');
    check((await page.locator('.mm-progreso').innerText()).includes('Estás editando'), 'El aviso dice "Estás editando", no "eligiendo"');
    check((await page.locator('.mm-btn-agregar').textContent()).includes('Guardar cambios'), 'El botón dice "Guardar cambios"');
    await page.click('.mm-btn-agregar');
    await page.waitForTimeout(250);
    check(await page.locator('.mm-overlay.open').count() === 0, 'Guardar cambios cierra el picker (no encadena a otra unidad)');
    check((await page.evaluate(() => cart.length)) === 4, 'Editar NO agrega una fila nueva — sigue habiendo 4 en total');

    console.log('\n── Sin overflow horizontal a 360px ──');
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'Sin scroll horizontal');

    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.error('💥 Error inesperado:', e.message);
    fail++;
  } finally {
    await browser.close();
    console.log(`\n${pass} pasaron, ${fail} fallaron`);
    process.exit(fail ? 1 : 0);
  }
})();
