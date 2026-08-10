// Verificación de la escala tipográfica del panel del owner.
//
// Comprueba, para cada uno de los 3 niveles y en un viewport de 360px:
//   1) que la página NO scrollea en horizontal en ningún panel
//   2) que el texto alcanza los tamaños esperados
//   3) que los touch targets siguen cumpliendo el mínimo de 44px
//   4) que la preferencia persiste tras recargar
//   5) que una preferencia guardada con el esquema viejo migra hacia arriba
//
// Uso: PORT=3999 node app.js &
//      TEST_EMAIL=... TEST_PASS=... node scripts/test-escala-tipografica.js
const { chromium } = require('playwright');

const BASE  = process.env.BASE || 'http://localhost:3999';
const EMAIL = process.env.TEST_EMAIL;
const PASS  = process.env.TEST_PASS;

if (!EMAIL || !PASS) {
  console.error('Faltan TEST_EMAIL y TEST_PASS en el entorno.');
  process.exit(1);
}

const PANELES = ['home', 'gestion-menus', 'operaciones', 'ajustes', 'menu-dia', 'carta',
                 'ordenes', 'reservas', 'cocina', 'pedidos', 'usuarios', 'reportes', 'configuracion'];
const ESCALAS = [1.15, 1.4, 1.7];
const ESPERADO = { 1.15: 16.1, 1.4: 19.6, 1.7: 23.8 };

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

async function login(page) {
  await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  if (page.url().includes('owner.html')) return;
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASS);
  await page.click('#submit-btn');
  await page.waitForURL('**/owner.html', { timeout: 15000 });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  await login(page);
  await page.waitForTimeout(1200);

  // ── 1 y 2: overflow y tamaños por escala ─────────────────────────────
  for (const escala of ESCALAS) {
    console.log(`\n[Escala ${escala}×] esperado root ${ESPERADO[escala]}px`);
    await page.evaluate(s => window.setFontScale(s), escala);
    await page.waitForTimeout(300);

    const root = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    check(Math.abs(root - ESPERADO[escala]) < 0.3, `root = ${root.toFixed(1)}px`);

    const desbordan = [];
    for (const panel of PANELES) {
      await page.evaluate(p => showPanel(p), panel);
      await page.waitForTimeout(380);

      // Overflow REAL: no basta con scrollWidth, se comprueba que la página
      // efectivamente se pueda desplazar en horizontal.
      const r = await page.evaluate(() => {
        const doc = document.documentElement;
        const diff = doc.scrollWidth - doc.clientWidth;
        if (diff <= 1) return { diff: 0, scrollea: false };
        window.scrollTo(80, window.scrollY);
        const scrollea = window.scrollX > 0;
        window.scrollTo(0, window.scrollY);
        return { diff, scrollea };
      });
      if (r.scrollea) desbordan.push(`${panel} (+${r.diff}px)`);
    }
    check(desbordan.length === 0,
      desbordan.length ? `paneles con scroll horizontal: ${desbordan.join(', ')}` : 'ningún panel scrollea en horizontal');
  }

  // ── 3: touch targets ─────────────────────────────────────────────────
  console.log('\n[Touch targets] mínimo 44px en la escala más grande');
  await page.evaluate(() => window.setFontScale(1.7));
  await page.evaluate(() => showPanel('pedidos'));
  await page.waitForTimeout(500);
  const chicos = await page.evaluate(() => {
    const malos = [];
    document.querySelectorAll('.panel.active button, .nav-item, .tab').forEach(b => {
      const r = b.getBoundingClientRect();
      if (r.height > 0 && r.height < 43.5) malos.push(`${b.textContent.trim().slice(0, 18)} (${Math.round(r.height)}px)`);
    });
    return malos;
  });
  check(chicos.length === 0, chicos.length ? `botones bajo 44px: ${chicos.join(', ')}` : 'todos los botones ≥ 44px');

  // Los inputs nunca deben bajar de 16px (evita el zoom automático de iOS)
  await page.evaluate(() => showPanel('configuracion'));
  await page.waitForTimeout(500);
  const inputsChicos = await page.evaluate(() => {
    const malos = [];
    document.querySelectorAll('.panel.active input[type=text], .panel.active input[type=number], .panel.active input[type=time]').forEach(i => {
      const fs = parseFloat(getComputedStyle(i).fontSize);
      if (fs < 16) malos.push(`${i.id || i.name} (${fs.toFixed(1)}px)`);
    });
    return malos;
  });
  check(inputsChicos.length === 0, inputsChicos.length ? `inputs bajo 16px: ${inputsChicos.join(', ')}` : 'todos los inputs ≥ 16px');

  // ── 4: persistencia ──────────────────────────────────────────────────
  console.log('\n[Persistencia] la preferencia sobrevive a la recarga');
  await page.evaluate(() => window.setFontScale(1.7));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const trasRecarga = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  check(Math.abs(trasRecarga - 23.8) < 0.3, `sigue en ${trasRecarga.toFixed(1)}px tras recargar`);

  const activo = await page.evaluate(() => {
    showPanel('configuracion');
    return new Promise(r => setTimeout(() => {
      const b = document.querySelector('.font-scale-btn.active');
      r(b ? b.dataset.scale : null);
    }, 700));
  });
  check(activo === '1.7', `el botón "Muy grande" queda marcado (real: ${activo})`);

  // ── 5: migración desde el esquema viejo ──────────────────────────────
  console.log('\n[Migración] una preferencia vieja sube de nivel, nunca baja');
  for (const [viejo, esperado] of [['1', 1.15], ['1.15', 1.4], ['1.3', 1.7]]) {
    // Estado de un usuario que viene del esquema anterior: solo la key vieja
    await page.evaluate(v => {
      localStorage.removeItem('mp-font-scale-v2');
      localStorage.setItem('mp-font-scale', v);
    }, viejo);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    const ahora = await page.evaluate(() => parseFloat(localStorage.getItem('mp-font-scale-v2')));
    const px    = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    check(ahora === esperado, `tenía ${viejo} → migra a ${ahora} = ${px.toFixed(1)}px (esperado ${esperado})`);
  }

  // Sin preferencia previa (usuario nuevo)
  await page.evaluate(() => {
    localStorage.removeItem('mp-font-scale');
    localStorage.removeItem('mp-font-scale-v2');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const sinPref = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  check(Math.abs(sinPref - 16.1) < 0.3, `sin preferencia previa arranca en ${sinPref.toFixed(1)}px (antes 14px)`);

  await browser.close();
  console.log(`\n${'─'.repeat(52)}`);
  console.log(`RESULTADO: ${pass} ✅   ${fail} ❌`);
  process.exit(fail ? 1 : 0);
})();
