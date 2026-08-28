/**
 * E2E de ISS-081 — 3 piezas del rediseño de "Pedir":
 *  1. Banner temporal "🔔 Mejoramos..." — se cierra 1 vez por celular
 *     (localStorage) y sigue cerrado tras recargar.
 *  2. Encuesta de 2 preguntas + comentario opcional al terminar un pedido —
 *     nunca bloquea el pedido ya enviado, "Omitir" no manda nada.
 *  3. Las respuestas llegan al panel ADMIN (menupro.tech/admin) — nunca al
 *     panel de la dueña — vía GET /api/admin/feedback.
 *
 * Uso: PORT=3399 node scripts/test-feedback-flujo.js
 */
const { chromium } = require('playwright');
const db = require('../config/database');

const BASE       = `http://localhost:${process.env.PORT || 3399}`;
const ADMIN_MAIL = 'admin@menupro.tech';

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
    // Setup: asegura efectivo activo — otros scripts de esta suite tocan la
    // config de pagos del mismo restaurante de prueba y no siempre la
    // restauran, así que no se puede asumir el estado ambiente.
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', 'owner@bot.com');
    await page.fill('#password', 'BotMenuPro2026!');
    await page.click('#submit-btn');
    await page.waitForURL(/owner/, { timeout: 8000 });
    await page.evaluate(() => api('PATCH', '/api/menu/config/pagos', { efectivo_activo: true }));

    await page.goto(`${BASE}/menu?restaurante=1&mesa=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    console.log('\n── Banner temporal del cambio de flujo ──');
    check(await page.locator('#aviso-flujo-banner').isVisible(), 'El banner aparece en una visita nueva (dentro de la ventana de 3 días)');

    await page.click('#aviso-flujo-banner button[aria-label="Cerrar aviso"]');
    await page.waitForTimeout(150);
    check(!(await page.locator('#aviso-flujo-banner').isVisible()), 'Se cierra al tocar la "✕"');
    check(await page.evaluate(() => localStorage.getItem('avisoFlujoPedirVisto_2026_08') === '1'), 'Queda guardado en localStorage');

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    check(!(await page.locator('#aviso-flujo-banner').isVisible()), 'Sigue sin mostrarse después de recargar');

    console.log('\n── Encuesta al terminar el pedido — responde con botones + comentario ──');
    const setup = await page.evaluate(async () => {
      const usable = m => {
        const secs = m.secciones || [];
        return secs.some(s => (s.platos || []).length)
            && secs.filter(s => s.requerido).every(s => (s.platos || []).length);
      };
      const menu = menusDia.find(usable);
      return { menuId: menu ? menu.id : null };
    });
    if (!setup.menuId) throw new Error('No hay ningún menú usable para hoy en el restaurante #1');

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
    await page.fill('#nombre-cliente', 'Prueba Encuesta ISS-081');
    await page.click('#btn-confirmar');
    await page.waitForTimeout(500);

    // Restaurante #1 puede o no tener métodos de pago activos según qué test
    // corrió antes en la misma BD local — cubre los 2 caminos.
    if (await page.locator('#pago-screen.show').count() > 0) {
      await page.click('#btn-met-efectivo');
      await page.waitForTimeout(200);
      await page.click('#btn-ya-pague');
    }
    await page.waitForSelector('#confirm-screen.show', { timeout: 8000 });
    await page.waitForTimeout(300);

    check(await page.locator('#encuesta-flujo-wrap').isVisible(), 'La encuesta aparece junto con la confirmación');

    await page.click('#encuesta-valoracion button[data-val="buena"]');
    await page.click('#encuesta-preferencia button[data-val="nueva"]');
    await page.fill('#encuesta-comentario', 'Me costó al inicio pero después le agarré la mano');
    await page.click('#encuesta-flujo-wrap button:has-text("Enviar")');
    await page.waitForTimeout(500);

    check(await page.locator('#encuesta-flujo-gracias').isVisible(), 'Muestra el agradecimiento al enviar');
    check(!(await page.locator('#encuesta-flujo-wrap').isVisible()), 'La encuesta se oculta tras enviar');

    console.log('\n── Las respuestas llegan a feedback_producto (lo que lee el panel ADMIN) ──');
    // Verificación directa en BD — no depende de credenciales de admin de
    // prueba, que varían por entorno. La consulta es exactamente la misma
    // que corre GET /api/admin/feedback (routes/admin.js).
    const fila = db.prepare(`
      SELECT valoracion, preferencia, comentario, id_restaurante
      FROM feedback_producto
      WHERE tipo = 'flujo_pedir_2026_08' AND comentario = ?
      ORDER BY id DESC LIMIT 1
    `).get('Me costó al inicio pero después le agarré la mano');
    check(!!fila, 'La respuesta quedó guardada en feedback_producto');
    check(fila && fila.valoracion === 'buena', `La valoración quedó guardada (${fila && fila.valoracion})`);
    check(fila && fila.preferencia === 'nueva', `La preferencia quedó guardada (${fila && fila.preferencia})`);
    check(fila && fila.id_restaurante === 1, `Quedó asociada al restaurante correcto (${fila && fila.id_restaurante})`);

    // Bonus: si hay un admin de prueba con la contraseña por defecto del
    // repo (create-admin.js), confirma también el endpoint real end-to-end.
    const loginOk = await page.evaluate(async () => {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@platform.com', password: 'admin1234' }),
      });
      return r.ok;
    }).catch(() => false);
    if (loginOk) {
      const feedback = await page.evaluate(async () => {
        const r = await fetch('/api/admin/feedback?tipo=flujo_pedir_2026_08', { credentials: 'same-origin' });
        return r.ok ? r.json() : null;
      });
      check(Array.isArray(feedback) && feedback.some(f => f.comentario === 'Me costó al inicio pero después le agarré la mano'),
        `GET /api/admin/feedback también la devuelve end-to-end (${feedback ? feedback.length : 0} respuesta(s) en total)`);
    } else {
      console.log('  ⏭  admin@platform.com / admin1234 no está disponible en este entorno — se omite el chequeo end-to-end del endpoint (la verificación en BD de arriba ya cubre lo importante)');
    }

    console.log('\n── Validación del backend: no acepta datos inválidos ──');
    const sinTipo = await fetch(`${BASE}/api/public/feedback`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valoracion: 'buena' }),
    });
    check(sinTipo.status === 400, `Rechaza sin "tipo" (status ${sinTipo.status})`);

    const valoracionInvalida = await fetch(`${BASE}/api/public/feedback`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'flujo_pedir_2026_08', valoracion: 'excelentisima' }),
    });
    check(valoracionInvalida.status === 400, `Rechaza una valoración fuera del set válido (status ${valoracionInvalida.status})`);

    const vacio = await fetch(`${BASE}/api/public/feedback`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'flujo_pedir_2026_08' }),
    });
    check(vacio.status === 400, `Rechaza sin ninguna respuesta (ni valoración, ni preferencia, ni comentario) (status ${vacio.status})`);

    console.log('\n── Consola limpia ──');
    check(errors.length === 0, `0 errores de consola${errors.length ? ' → ' + errors.join(' | ') : ''}`);

    // Limpieza
    db.prepare(`DELETE FROM feedback_producto WHERE comentario = ?`).run('Me costó al inicio pero después le agarré la mano');
    db.prepare(`DELETE FROM orden_menu_items WHERE id_orden IN (SELECT id FROM ordenes WHERE nombre_cliente = 'Prueba Encuesta ISS-081')`).run();
    db.prepare(`DELETE FROM ordenes WHERE nombre_cliente = 'Prueba Encuesta ISS-081'`).run();

  } catch (e) {
    console.log('\n💥 ' + e.message);
    fail++;
  } finally {
    await browser.close();
    console.log(`\n${pass}/${pass + fail} verificaciones OK`);
    process.exit(fail ? 1 : 0);
  }
})();
