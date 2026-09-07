/**
 * ISS-060 — Acceso del pensionista a su pantalla.
 *
 * A) menu.html: el link "🧾 ¿Eres pensionista?" existe junto a "Consultar mi
 *    reserva", apunta a /login.html, es táctil (≥44px) y navega.
 * B) pensionista.html: el botón "📲 Instalar app" (widget PwaInstall) está
 *    oculto hasta que la PWA es instalable; al simular `beforeinstallprompt`
 *    aparece y al click dispara el prompt nativo.
 *
 * Uso: PORT=3399 node scripts/test-iss060-acceso-pensionista.js
 *      (requiere server corriendo en ese puerto + usuarios bot)
 */
const { chromium } = require('playwright');

const BASE  = `http://localhost:${process.env.PORT || 3399}`;
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';
const PEN_PASS = 'Pension2026!';
const sufijo   = Date.now();

let pass = 0, fail = 0;
const check = (cond, msg) => {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
};

const fireInstallPrompt = () => {
  const evt = new Event('beforeinstallprompt');
  evt.prompt = () => { window.__promptCalled = true; };
  evt.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(evt);
};

(async () => {
  const browser = await chromium.launch();
  let penId = null;
  let ctxOwner;

  try {
    // ── A) menu.html — link de acceso ────────────────────────────
    console.log('\nA) menu.html — link "¿Eres pensionista?"');
    const ctxCliente = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const errCliente = [];
    const pageCli = await ctxCliente.newPage();
    pageCli.on('pageerror', e => errCliente.push('pageerror: ' + e.message));
    await pageCli.goto(`${BASE}/menu?restaurante=1`, { waitUntil: 'networkidle' });

    const link = pageCli.locator('a.btn-consultar[href="/login.html"]');
    check(await link.count() === 1, 'El link existe (a.btn-consultar → /login.html)');
    check((await link.innerText()).toLowerCase().includes('pensionista'), 'Dice "¿Eres pensionista?"');
    check(await link.isVisible(), 'Es visible en el header');

    const box = await link.boundingBox();
    check(box && box.height >= 44, `Touch target ≥44px (alto real: ${box ? box.height.toFixed(1) : '?'}px)`);

    await link.click();
    await pageCli.waitForURL(/\/login(\.html)?$/, { timeout: 5000 });
    check(/\/login(\.html)?$/.test(pageCli.url()), `Navega a login (${pageCli.url().replace(BASE, '')})`);
    check(errCliente.length === 0, 'Sin errores de página en menu.html' + (errCliente.length ? ' → ' + errCliente.join(' | ') : ''));
    await ctxCliente.close();

    // ── Crear un pensionista de prueba (como owner) ──────────────
    ctxOwner = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const pageOwner = await ctxOwner.newPage();
    await pageOwner.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await pageOwner.fill('#email', EMAIL);
    await pageOwner.fill('#password', PASS);
    await pageOwner.click('#submit-btn');
    await pageOwner.waitForURL(/owner/, { timeout: 8000 });

    const penEmail = `pen-iss060-${sufijo}@menupro.tech`;
    penId = await pageOwner.evaluate(async ({ email, password }) => {
      const res = await fetch('/api/pensionistas', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Pen', apellido: 'ISS060', email, password, saldo_inicial: 50,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'no se pudo crear el pensionista');
      return data.id;
    }, { email: penEmail, password: PEN_PASS });
    console.log(`\n(pensionista de prueba creado: id ${penId}, ${penEmail})`);

    // ── B) pensionista.html — botón Instalar app ─────────────────
    console.log('\nB) pensionista.html — botón "Instalar app" (PwaInstall)');
    const ctxPen = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const errPen = [];
    const pagePen = await ctxPen.newPage();
    pagePen.on('console', m => {
      if (m.type() !== 'error') return;
      // Fotos de platos del restaurante de prueba que no están en disco — ruido
      // de datos, no del cambio (mismo filtro que test-pensionista-cliente.js).
      const url = (m.location() && m.location().url) || '';
      if (/\/uploads\//.test(url) && /Failed to load resource/.test(m.text())) return;
      errPen.push('console.error: ' + m.text());
    });
    pagePen.on('pageerror', e => errPen.push('pageerror: ' + e.message));

    await pagePen.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await pagePen.fill('#email', penEmail);
    await pagePen.fill('#password', PEN_PASS);
    await pagePen.click('#submit-btn');
    await pagePen.waitForURL(/pensionista/, { timeout: 8000 });
    await pagePen.waitForLoadState('networkidle');

    check(await pagePen.evaluate(() => typeof window.PwaInstall === 'object'), 'window.PwaInstall está cargado');
    const btn = pagePen.locator('#btn-instalar-app');
    check(await btn.count() === 1, 'El botón #btn-instalar-app existe');
    check(await btn.evaluate(e => e.hidden) === true, 'Oculto antes de beforeinstallprompt (no instalable en desktop)');

    await pagePen.evaluate(fireInstallPrompt);
    check(await btn.evaluate(e => e.hidden) === false, 'Aparece tras beforeinstallprompt');

    const boxPen = await btn.boundingBox();
    check(boxPen && boxPen.height >= 44, `Touch target ≥44px (alto real: ${boxPen ? boxPen.height.toFixed(1) : '?'}px)`);

    await btn.click();
    await pagePen.waitForTimeout(120);
    check(await pagePen.evaluate(() => window.__promptCalled === true), 'Click dispara el prompt nativo de instalación');

    check(errPen.length === 0, 'Sin errores de consola/página en pensionista.html' + (errPen.length ? ' → ' + errPen.join(' | ') : ''));
    await ctxPen.close();
  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    if (penId && ctxOwner) {
      try {
        const pageOwner = (await ctxOwner.pages())[0];
        await pageOwner.evaluate(async (id) => {
          await fetch(`/api/pensionistas/${id}/activo`, {
            method: 'PATCH', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: 0 }),
          });
        }, penId);
        console.log(`\n(pensionista de prueba ${penId} dado de baja)`);
      } catch (_) {}
    }
    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
