/**
 * E2E de la detección de comprobante Yape/Plin reutilizado — pregunta real
 * de la dueña de un piloto: "¿qué pasa si un chico comparte su pago de
 * Yape con otro y ambos envían la misma captura?".
 *
 * Diseño: AVISAR al owner (que ya revisa cada comprobante antes de
 * confirmar el pago), no bloquear al comensal — el comensal no ve nada
 * distinto en ningún caso.
 *
 * Uso: PORT=3399 node scripts/test-comprobante-duplicado.js
 */
const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

const BASE  = `http://localhost:${process.env.PORT || 3399}`;
const EMAIL = 'owner@bot.com';
const PASS  = 'BotMenuPro2026!';

let pass = 0, fail = 0;
function check(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

// JPEG mínimo válido (mismo patrón que scripts/test-gate-pago.js)
const FOTO_A = Buffer.from([0xFF,0xD8,0xFF,0xE0,0,0,0,0,0,0,0,0,0,0,0xFF,0xD9]);
const FOTO_B = Buffer.from([0xFF,0xD8,0xFF,0xE0,1,1,1,1,1,1,1,1,1,1,0xFF,0xD9]); // distinta a propósito

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

  const tmpA = path.join(__dirname, '_tmp_comp_a.jpg');
  const tmpB = path.join(__dirname, '_tmp_comp_b.jpg');
  fs.writeFileSync(tmpA, FOTO_A);
  fs.writeFileSync(tmpB, FOTO_B);

  try {
    // ── Setup como owner: Yape activo con teléfono + menú del día usable ──
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASS);
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.waitForLoadState('networkidle');

    const setup = await page.evaluate(async () => {
      await api('PATCH', '/api/menu/config/pagos', { yape_activo: true, yape_telefono: '999888777', efectivo_activo: false });
      const usable = m => {
        const secs = m.secciones || [];
        return secs.some(s => (s.platos || []).length)
            && secs.filter(s => s.requerido).every(s => (s.platos || []).length);
      };
      const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const menus = await api('GET', `/api/menu/menus-dia?dia=${hoy}`);
      let menu = menus.find(usable);
      if (!menu) {
        const todos = await api('GET', '/api/menu/menus-dia');
        const fuente = todos.find(usable);
        if (!fuente) return { error: 'No hay ningún menú usable' };
        await api('POST', `/api/menu/menus-dia/${fuente.id}/copiar`, { dia: hoy });
        const nuevos = await api('GET', `/api/menu/menus-dia?dia=${hoy}`);
        menu = nuevos.find(usable);
        if (!menu) return { error: 'La copia del menú no quedó usable' };
      }
      const sesion = leerSesion();
      return { menuId: menu.id, restauranteId: sesion.restaurant_id };
    });
    if (setup.error) throw new Error(setup.error);
    console.log(`Setup OK — restaurante #${setup.restauranteId}, menú #${setup.menuId}, Yape activo`);

    async function pedirYPagar(mesa, nombre, fotoPath) {
      await page.goto(`${BASE}/menu?restaurante=${setup.restauranteId}&mesa=${mesa}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await page.evaluate((menuId) => {
        const menu = menusDia.find(m => m.id === menuId);
        for (const s of menu.secciones) {
          const p = s.platos[0];
          if (p) selectMenuPlato('pedir', menu.id, s.id_seccion, p.id_componente, p.nombre, s.nombre_seccion, menu.precio, menu.id);
        }
        agregarMenu('pedir', menu.id, !!menu.elegible, menu.precio, menu.nombre);
        openDrawer();
      }, setup.menuId);
      await page.waitForTimeout(300);
      await page.fill('#nombre-cliente', nombre);
      await page.click('#btn-confirmar');
      await page.waitForSelector('#pago-screen.show', { timeout: 5000 });
      await page.click('#btn-met-yape');
      await page.waitForTimeout(200);
      await page.locator('#pago-foto').setInputFiles(fotoPath);
      await page.waitForTimeout(200);
      // ISS-081: "Ya pagué" ya crea la orden de una — sin pantalla de repaso.
      await page.click('#btn-ya-pague');
      await page.waitForTimeout(1200);
      const ok = await page.locator('#confirm-screen').evaluate(el => el.classList.contains('show')).catch(() => false);
      return ok;
    }

    console.log('\n── Pedido 1: sube el comprobante A (primera vez) ──');
    const ok1 = await pedirYPagar(21, 'DupTest Uno', tmpA);
    check(ok1, 'Se confirma normalmente');

    console.log('\n── Pedido 2: sube el MISMO archivo A (la clienta comparte su pago con otra) ──');
    const ok2 = await pedirYPagar(22, 'DupTest Dos', tmpA);
    check(ok2, 'Se confirma normalmente — el comensal NO ve ningún bloqueo ni aviso');

    console.log('\n── Pedido 3: sube un comprobante B distinto (control, no debe avisar) ──');
    const ok3 = await pedirYPagar(23, 'DupTest Tres', tmpB);
    check(ok3, 'Se confirma normalmente');

    console.log('\n── Lo que ve el owner ──');
    const activas = await page.evaluate(async () => {
      const r = await fetch('/api/orders/activas', { credentials: 'same-origin' }).then(r => r.json());
      return r;
    });
    const o1 = activas.find(o => o.nombre_cliente === 'DupTest Uno');
    const o2 = activas.find(o => o.nombre_cliente === 'DupTest Dos');
    const o3 = activas.find(o => o.nombre_cliente === 'DupTest Tres');

    check(!!o1 && !o1.comprobante_repetido_de, 'El primer pedido (el original) NO queda marcado como repetido');
    check(!!o2 && o2.comprobante_repetido_de === o1.id && o2.comprobante_repetido_tipo === 'orden',
      `El segundo pedido queda marcado como repetido del primero (#${o2 && o2.comprobante_repetido_de} → #${o1 && o1.id})`);
    check(!!o3 && !o3.comprobante_repetido_de, 'El tercer pedido (foto distinta) NO se marca como repetido — sin falsos positivos');

    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    try { fs.unlinkSync(tmpA); } catch (_) {}
    try { fs.unlinkSync(tmpB); } catch (_) {}
    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
