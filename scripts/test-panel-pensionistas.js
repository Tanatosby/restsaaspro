/**
 * E2E del panel de Pensionistas (owner.html → Ajustes → Pensionistas).
 * Fase 1 del módulo: el backend ya existía desde 2026-08-11, esto verifica el
 * panel que faltaba. Cubre el ciclo completo que la dueña va a usar: crear un
 * pensionista con saldo, recargarle, ver sus movimientos, editarlo, darlo de
 * baja y reactivarlo — más el aviso de saldo bajo y el redirect del login.
 *
 * Uso: PORT=3399 node scripts/test-panel-pensionistas.js
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
const EMAIL_P  = `pensionista${sufijo}@menupro.tech`;
const PASS_P   = 'Pension2026!';

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

  let idPensionista = null;

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');
    console.log('Login OK →', page.url());

    console.log('\n── El panel existe y se llega desde Ajustes ──');
    await page.evaluate(() => showPanel('ajustes'));
    await page.waitForTimeout(300);
    check(await page.locator('#hub-pensionistas').isVisible(), 'Tarjeta «Pensionistas» en el hub Ajustes');
    await page.click('#hub-pensionistas');
    await page.waitForTimeout(700);
    check(await page.locator('#panel-pensionistas').evaluate(el => el.classList.contains('active')),
      'La tarjeta abre el panel');
    check(await page.locator('#page-title').textContent() === 'Pensionistas', 'El título dice «Pensionistas»');

    console.log('\n── Validaciones del alta ──');
    await page.fill('#pen-nombre', 'Luis');
    await page.fill('#pen-apellido', 'Quispe');
    await page.fill('#pen-email', 'luis@gmail.com');       // dominio inválido a propósito
    await page.fill('#pen-password', 'Pension2026!');
    await page.click('button:has-text("+ Crear pensionista")');
    await page.waitForTimeout(400);
    check(/@menupro\.tech/.test(await page.locator('#err-pensionista').textContent()),
      'Rechaza email fuera de @menupro.tech');

    await page.fill('#pen-email', EMAIL_P);
    await page.fill('#pen-password', '123');               // muy corta a propósito
    await page.click('button:has-text("+ Crear pensionista")');
    await page.waitForTimeout(400);
    check(/8 caracteres/.test(await page.locator('#err-pensionista').textContent()),
      'Rechaza contraseña de menos de 8 caracteres');

    console.log('\n── Alta con saldo inicial ──');
    await page.fill('#pen-password', PASS_P);
    await page.fill('#pen-telefono', '987654321');
    await page.fill('#pen-saldo', '50');
    await page.click('button:has-text("+ Crear pensionista")');
    await page.waitForTimeout(1200);

    const creado = await page.evaluate(async (email) => {
      const lista = await api('GET', '/api/pensionistas');
      return lista.find(p => p.email === email) || null;
    }, EMAIL_P);
    check(!!creado, `Pensionista creado (#${creado ? creado.id : '—'})`);
    if (!creado) throw new Error('no se creó el pensionista');
    idPensionista = creado.id;
    check(creado.saldo === 50, `Saldo inicial guardado (S/ ${creado.saldo})`);
    check(creado.telefono === '987654321', 'Teléfono guardado');

    const card = page.locator(`#pen-card-${idPensionista}`);
    check(await card.count() > 0, 'Aparece su card en la lista');
    check(/Luis Quispe/.test(await card.textContent()), 'La card muestra nombre y apellido');
    check(/S\/ 50\.00/.test(await card.textContent()), 'La card muestra el saldo');

    console.log('\n── El formulario se limpia tras crear ──');
    const vacios = await page.evaluate(() =>
      ['pen-nombre','pen-apellido','pen-email','pen-telefono','pen-password','pen-saldo']
        .every(id => document.getElementById(id).value === ''));
    check(vacios, 'Los 6 campos quedan vacíos (no se recrea sin querer al segundo tap)');

    console.log('\n── Recarga de saldo ──');
    await card.locator('button:has-text("Recargar")').click();
    await page.waitForTimeout(500);
    await page.fill('#fm-f-monto', '25.50');
    await page.fill('#fm-f-nota', 'Recarga de prueba');
    await page.click('.fm-btn-submit');
    await page.waitForTimeout(1200);

    const trasRecarga = await page.evaluate(async (id) => {
      const lista = await api('GET', '/api/pensionistas');
      return lista.find(p => p.id === id);
    }, idPensionista);
    check(trasRecarga.saldo === 75.5, `Saldo tras recargar: S/ ${trasRecarga.saldo} (esperado 75.50)`);

    console.log('\n── Historial de movimientos ──');
    await page.locator(`#pen-card-${idPensionista} button:has-text("Movimientos")`).click();
    await page.waitForTimeout(800);
    const movs = await page.locator(`#pen-movs-${idPensionista}`).textContent();
    check(/Saldo inicial/.test(movs), 'Aparece el movimiento del saldo inicial');
    check(/Recarga de prueba/.test(movs), 'Aparece la nota de la recarga');
    check(/\+S\/ 25\.50/.test(movs), 'La recarga se muestra con su monto');
    check(/queda S\/ 75\.50/.test(movs), 'Muestra el saldo resultante de cada movimiento');

    // El mismo botón cierra el historial
    await page.locator(`#pen-card-${idPensionista} button:has-text("Movimientos")`).click();
    await page.waitForTimeout(400);
    check(await page.locator(`#pen-movs-${idPensionista}`).isHidden(), 'El botón vuelve a cerrar el historial');

    console.log('\n── Editar datos ──');
    await page.locator(`#pen-card-${idPensionista} button:has-text("Editar")`).click();
    await page.waitForTimeout(500);
    await page.fill('#fm-f-telefono', '999888777');
    await page.click('.fm-btn-submit');
    await page.waitForTimeout(1000);
    const editado = await page.evaluate(async (id) => {
      const lista = await api('GET', '/api/pensionistas');
      return lista.find(p => p.id === id);
    }, idPensionista);
    check(editado.telefono === '999888777', `Teléfono actualizado (${editado.telefono})`);

    console.log('\n── Umbral de saldo bajo ──');
    // El panel necesita el umbral para resaltar a quien está por quedarse sin
    // saldo; antes de esta fase la config no lo devolvía.
    const umbral = await page.evaluate(async () => {
      const cfg = await api('GET', '/api/menu/restaurante/config');
      return cfg.pensionista_saldo_aviso;
    });
    check(typeof umbral === 'number', `La config expone el umbral (S/ ${umbral})`);
    check(!/por quedarse sin saldo/.test(await page.locator('#list-pensionistas').textContent()),
      `Con saldo S/ 75.50 sobre un umbral de S/ ${umbral}, no se muestra el aviso`);

    console.log('\n── Baja lógica y reactivación ──');
    page.once('dialog', d => d.accept());
    await page.locator(`#pen-card-${idPensionista} button:has-text("Dar de baja")`).click();
    await page.waitForTimeout(1100);
    const baja = await page.evaluate(async (id) => {
      const lista = await api('GET', '/api/pensionistas');
      return lista.find(p => p.id === id);
    }, idPensionista);
    check(baja.activo === 0, 'Queda dado de baja (activo=0)');
    check(await page.locator(`#pen-card-${idPensionista}`).evaluate(el => el.classList.contains('inactivo')),
      'La card se ve atenuada');
    check(await page.locator(`#pen-card-${idPensionista} button:has-text("Recargar")`).count() === 0,
      'No se le puede recargar estando de baja');

    await page.locator(`#pen-card-${idPensionista} button:has-text("Reactivar")`).click();
    await page.waitForTimeout(1100);
    const react = await page.evaluate(async (id) => {
      const lista = await api('GET', '/api/pensionistas');
      return lista.find(p => p.id === id);
    }, idPensionista);
    check(react.activo === 1, 'Se puede reactivar');

    console.log('\n── El pensionista puede iniciar sesión ──');
    // Antes de este fix, ROLE_REDIRECT no tenía 'pensionista' y el login
    // mandaba a `undefined`.
    const page2 = await ctx.newPage();
    await page2.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page2.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
    await page2.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page2.fill('#email', EMAIL_P);
    await page2.fill('#password', PASS_P);
    await page2.click('#submit-btn');
    await page2.waitForTimeout(2500);
    const destino = page2.url();
    check(!/undefined/.test(destino), `El login NO lo manda a undefined (${destino})`);
    check(/pensionista\.html/.test(destino), `Lo manda a pensionista.html (${destino})`);
    await page2.close();

    console.log('\n── Sin overflow horizontal a 360px ──');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(!overflow, 'El panel no scrollea de costado');

    console.log('\n── Touch targets ──');
    const chicos = await page.evaluate(id => {
      const card = document.getElementById(`pen-card-${id}`);
      return [...card.querySelectorAll('button')]
        .filter(b => b.getBoundingClientRect().height < 44)
        .map(b => `${b.textContent.trim()} (${Math.round(b.getBoundingClientRect().height)}px)`);
    }, idPensionista);
    check(chicos.length === 0, `Todos los botones ≥44px${chicos.length ? ' → ' + chicos.join(', ') : ''}`);

    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    // Limpieza: el pensionista de prueba se da de baja para no ensuciar la lista
    if (idPensionista) {
      try {
        await page.evaluate(async (id) => { await api('PATCH', `/api/pensionistas/${id}/activo`, { activo: 0 }); }, idPensionista);
        console.log(`\n(pensionista de prueba #${idPensionista} dado de baja)`);
      } catch (_) {}
    }
    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
