/**
 * E2E de "Cambiar contraseña" en pensionista.html — faltaba, reportado por
 * el usuario 2026-08-19. Reusa el mismo endpoint que ya usa el owner
 * (PATCH /api/auth/me/password, cualquier usuario autenticado), así que el
 * backend no necesitó cambios — solo la UI que le faltaba a esta pantalla.
 *
 * Uso: PORT=3399 node scripts/test-pensionista-password.js
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

const sufijo   = Date.now();
const EMAIL_P  = `pen-pwd-${sufijo}@menupro.tech`;
const PASS_P   = 'Pension2026!';
const PASS_P2  = 'NuevaPass2026!';

async function loginComo(browser, email, password) {
  const ctx  = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#submit-btn');
  await page.waitForURL(/pensionista/, { timeout: 8000 });
  await page.waitForLoadState('networkidle');
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch();
  const ctxOwner = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const pageOwner = await ctxOwner.newPage();
  let idPensionista = null;

  try {
    await pageOwner.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await pageOwner.fill('#email', EMAIL);
    await pageOwner.fill('#password', PASS);
    await pageOwner.click('#submit-btn');
    await pageOwner.waitForURL(/owner/, { timeout: 8000 });
    await pageOwner.waitForLoadState('networkidle');

    idPensionista = await pageOwner.evaluate(async ({ email, passP }) => {
      const r = await api('POST', '/api/pensionistas', { nombre: 'Cliente', apellido: 'Password', email, password: passP, saldo_inicial: 0 });
      return r.id;
    }, { email: EMAIL_P, passP: PASS_P });
    console.log(`Pensionista de prueba creado: #${idPensionista}`);

    console.log('\n── Login y abrir el modal ──');
    const { ctx, page } = await loginComo(browser, EMAIL_P, PASS_P);
    // Los 400 esperados de las validaciones de abajo (contraseña corta, actual
    // incorrecta, etc.) los loguea Chrome como "Failed to load resource" — se
    // arma el listener recién después de esa parte, no desde el arranque.
    const errors = [];

    check(await page.locator('.pen-pwd-btn').isVisible(), 'El botón "🔑 Contraseña" está visible en el header');
    await page.click('.pen-pwd-btn');
    await page.waitForTimeout(200);
    check(await page.locator('#modal-pwd').evaluate(el => el.style.display === 'flex'), 'El modal se abre');

    console.log('\n── Validaciones ──');
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(200);
    check(/requeridos/.test(await page.locator('#pwd-error').textContent()), 'Campos vacíos → error');

    await page.fill('#pwd-actual', PASS_P);
    await page.fill('#pwd-nueva', '123');
    await page.fill('#pwd-confirmar', '123');
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(200);
    check(/8 caracteres/.test(await page.locator('#pwd-error').textContent()), 'Contraseña corta → error');

    await page.fill('#pwd-nueva', PASS_P2);
    await page.fill('#pwd-confirmar', 'otra-cosa');
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(200);
    check(/no coinciden/.test(await page.locator('#pwd-error').textContent()), 'Confirmación distinta → error');

    await page.fill('#pwd-actual', 'contraseña-incorrecta');
    await page.fill('#pwd-confirmar', PASS_P2);
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(400);
    check(/incorrecta/.test(await page.locator('#pwd-error').textContent()), 'Contraseña actual equivocada → error del backend');

    console.log('\n── Cambio real ──');
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await page.fill('#pwd-actual', PASS_P);
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);
    check(await page.locator('#modal-pwd').evaluate(el => el.style.display === 'none'), 'El modal se cierra al guardar con éxito');

    console.log('\n── La contraseña nueva funciona de verdad ──');
    await ctx.close();
    const { ctx: ctx2, page: page2 } = await loginComo(browser, EMAIL_P, PASS_P2);
    check(/pensionista\.html/.test(page2.url()), `Login con la contraseña NUEVA funciona (${page2.url()})`);
    await ctx2.close();

    const ctx3 = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const page3 = await ctx3.newPage();
    await page3.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page3.fill('#email', EMAIL_P);
    await page3.fill('#password', PASS_P);
    await page3.click('#submit-btn');
    await page3.waitForTimeout(1500);
    check(!/pensionista\.html/.test(page3.url()), `La contraseña VIEJA ya no funciona (sigue en ${page3.url()})`);
    await ctx3.close();

    console.log('\n── Touch target del botón ──');
    const { ctx: ctx4, page: page4 } = await loginComo(browser, EMAIL_P, PASS_P2);
    const altura = await page4.locator('.pen-pwd-btn').evaluate(el => el.getBoundingClientRect().height);
    check(altura >= 44, `Botón "Contraseña" ≥44px (${Math.round(altura)}px)`);
    check(!(await page4.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'Sin overflow horizontal a 360px');
    await ctx4.close();

    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    if (idPensionista) {
      try { await pageOwner.evaluate(async (id) => { await api('PATCH', `/api/pensionistas/${id}/activo`, { activo: 0 }); }, idPensionista); } catch (_) {}
    }
    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
