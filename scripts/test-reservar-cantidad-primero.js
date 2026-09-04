/**
 * E2E del flujo "cantidad primero" portado a Reservar (menu.html) — ISS-087,
 * 2026-09-04.
 *
 * Antes de este cambio, Reservar tenía su propio camino: tocar la card abría
 * el picker directo (`abrirMenuModal()`), agregando de a uno, con un atajo
 * "+1 mismo menú" (ISS-064) para repetir sin reabrir. Pedir ya había dejado
 * ese patrón atrás con ISS-080/081 (validado con 95% de valoración positiva,
 * encuesta de ISS-081) — este test cubre que Reservar ahora usa exactamente
 * el mismo mecanismo: elegir cuántos con el stepper de la card (sin abrir
 * nada), tocar "Elegir opciones" y configurar cada unidad en secuencia
 * ("1/n", "2/n"...), encadenando entre menús distintos, aterrizando en
 * #res-drawer al terminar. El carrito de reserva tampoco se abre con menús a
 * medio configurar.
 *
 * Distinto de Pedir a propósito, sin tocar en este cambio: el drawer de
 * Reservar sigue AGRUPANDO menús idénticos con su propio stepper "+"/"−"
 * (`agruparMenusCarrito` / ISS-064) en vez de una fila por unidad — ver
 * scripts/test-repetir-menu.js para esa cobertura.
 *
 * Uso: PORT=3399 node scripts/test-reservar-cantidad-primero.js
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
      if (menus.length === 1) {
        // Clonarlo para tener 2 tipos distintos y probar el encadenado entre menús.
        await api('POST', `/api/menu/menus-dia/${menus[0].id}/copiar`, { dia: hoy });
      }
      const todosHoy = (await api('GET', `/api/menu/menus-dia?dia=${hoy}`)).filter(usable);
      if (todosHoy.length < 2) return { error: 'No se pudo armar 2 menús usables para hoy' };
      const sesion = leerSesion();
      return { menuIdA: todosHoy[0].id, menuIdB: todosHoy[1].id, restauranteId: sesion.restaurant_id };
    });
    if (setup.error) throw new Error(setup.error);
    console.log(`Setup OK — menú A #${setup.menuIdA}, menú B #${setup.menuIdB}`);

    // Sin `&mesa=` → activeMode arranca en 'reservar' (ver switchMode() en menu.html)
    await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    console.log('\n── El stepper de la card no abre nada ──');
    const cardA = page.locator(`.menu-dia-card:has(#menu-qty-reservar-${setup.menuIdA})`);
    await cardA.locator('.qty-btn.add').click();
    await page.waitForTimeout(150);
    check(await page.locator('.mm-overlay.open').count() === 0, 'Tocar "+" en el stepper NO abre el picker');
    check((await page.locator(`#menu-qty-reservar-${setup.menuIdA}`).textContent()).trim() === '1', 'El stepper marca 1');

    await cardA.locator('.qty-btn.add').click();
    await page.waitForTimeout(150);
    check((await page.locator(`#menu-qty-reservar-${setup.menuIdA}`).textContent()).trim() === '2', 'Subir a 2 tampoco abre nada');
    check(await page.locator('.mm-overlay.open').count() === 0, 'Sigue sin abrirse el picker');

    // Menú B: 1 unidad
    const cardB = page.locator(`.menu-dia-card:has(#menu-qty-reservar-${setup.menuIdB})`);
    await cardB.locator('.qty-btn.add').click();
    await page.waitForTimeout(150);

    console.log('\n── "Elegir opciones" arranca el wizard y encadena ──');
    await cardA.locator('.btn-add-menu:has-text("Elegir opciones")').click();
    await page.waitForTimeout(200);
    check(await page.locator('.mm-overlay.open').count() === 1, 'El picker se abre al tocar "Elegir opciones"');
    check((await page.locator('.mm-progreso').innerText()).includes('1/2'), 'Aviso "1/2" de la primera unidad del menú A');

    async function elegirYGuardar(etiquetaEsperada) {
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

    console.log('\n── Termina toda la tanda: cierra y aterriza en #res-drawer ──');
    check(await page.locator('.mm-overlay.open').count() === 0, 'El picker se cierra solo al terminar todo');
    check(await page.locator('#res-drawer.open').count() === 1, 'El drawer de reserva se abre solo, sin volver a la lista');

    check((await page.evaluate(() => resCart.length)) === 3, 'resCart[] tiene 3 unidades reales');
    // A diferencia de Pedir (filas sin agrupar), Reservar sigue agrupando por
    // contenido (`agruparMenusCarrito`, sin tocar en ISS-087) — ver docstring
    // arriba. Cuántas filas salgan depende de si el menú de prueba B terminó
    // con la misma selección que A (ambos "primera opción disponible"), así
    // que se verifica la suma mostrada, no un número de filas fijo.
    const stepperNums = await page.locator('#res-cart-items .menu-stepper-num').allTextContents();
    const totalMostrado = stepperNums.reduce((s, n) => s + Number(n.trim()), 0);
    check(totalMostrado === 3, `El drawer muestra 3 unidades en total, agrupadas o no (${totalMostrado})`);

    console.log('\n── El drawer no se abre con menús a medio configurar ──');
    await page.click('#res-drawer .drawer-close');
    await page.waitForTimeout(200);
    await cardA.locator('.qty-btn.add').click(); // menú A vuelve a quedar con 1 pendiente sin configurar
    await page.waitForTimeout(150);
    await page.click('.res-bar-btn');
    await page.waitForTimeout(250);
    check(await page.locator('#res-drawer.open').count() === 0, 'El drawer NO se abre con un menú pendiente sin configurar');
    check(await page.locator('.mm-overlay.open').count() === 1, 'En vez de eso, arranca el picker del menú pendiente');
    check((await page.locator('.mm-progreso').innerText()).includes('3/3'), 'La posición sigue la cuenta real (3ra unidad del menú A)');
    await elegirYGuardar();
    check(await page.locator('#res-drawer.open').count() === 1, 'Al terminar esa unidad sí abre el drawer');

    console.log('\n── El payload arma grupos completos (ISS-041) ──');
    const gruposPayload = await page.evaluate(() => numerarGrupos(resCart));
    const gruposDistintos = new Set(gruposPayload.map(i => i.grupo));
    check(gruposDistintos.size === 4, `4 grupos distintos (4 unidades totales), no mezclados (${gruposDistintos.size})`);
    check(gruposPayload.every(i => i.grupo != null), 'Ninguna línea del payload quedó con grupo sin definir');

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
