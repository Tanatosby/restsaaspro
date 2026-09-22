'use strict';
/**
 * take-showcase-screenshots.js
 * Arranca el servidor local, seedea datos demo (pedidos en distintos estados
 * de la Cola del día) y toma 2 capturas reales para la sección "showcase" de
 * la landing (id="producto"): la vista de Cocina (owner.html) y el menú del
 * cliente (menu.html), ambas desde un viewport de celular. La 3ra imagen de
 * la sección — Cola del día en escritorio — es una captura real que tomó el
 * usuario a mano (ver public/landing/screenshots/showcase-cola-desktop.png,
 * recortada del chrome del navegador con scripts/crop-browser-chrome.py) y
 * no la genera este script.
 *
 * Uso: node scripts/take-showcase-screenshots.js
 */

const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');

const BASE    = 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, '..', 'public', 'landing', 'screenshots');
const ROOT    = path.join(__dirname, '..');

const OWNER_EMAIL = 'owner@bot.com';
const OWNER_PASS  = 'BotMenuPro2026!';

const ASSETS_DIR = path.join(__dirname, '..', 'landing', 'bot', 'assets');
// Mismo mapeo que take-landing-screenshots.js — fotos para el menú del día
// (la mayoría son ilustraciones genéricas de landing/bot/assets/, no fotos
// reales — por eso "Lomo saltado" y "Chicha morada" se pisan más abajo con
// fotos reales de Wikimedia Commons).
const FOTOS_MENU = {
  'Sopa criolla':    'papa-huancaina.jpg',
  'Causa limeña':    'causa-rellena.jpg',
  'Ensalada fresca': 'causa-rellena.jpg',
  'Arroz con pollo': 'pollo-brasa.jpg',
  'Lomo saltado':    'lomo-saltado.jpg',
  'Tallarín verde':  'seco-pollo.jpg',
  'Ají de gallina':  'aji-de-gallina.jpg',
  'Mazamorra morada':'mazamorra-morada.jpg',
  'Arroz con leche': 'arroz-con-leche.jpg',
  'Chicha morada':   'chicha-morada.jpg',
  'Limonada':        'chicha-morada.jpg',
};
const FOTOS_CARTA = {
  'Ceviche clásico':    'ceviche.jpg',
  'Tequeños (6 u.)':   'chicharron.jpg',
  'Lomo saltado':       'lomo-saltado.jpg',
  'Arroz con mariscos': 'tacu-tacu.jpg',
  'Chicha morada (1L)': 'chicha-morada.jpg',
  'Inca Kola (500ml)':  'chicha-morada.jpg',
};

function log(msg)  { console.log(`  ${msg}`); }
function ok(msg)   { console.log(`  ✓ ${msg}`); }
function warn(msg) { console.log(`  ⚠ ${msg}`); }

async function subirFoto(request, endpoint, fotoPath) {
  try {
    const buffer = fs.readFileSync(fotoPath);
    const r = await request.post(endpoint, {
      multipart: { foto: { name: path.basename(fotoPath), mimeType: 'image/jpeg', buffer } },
    });
    if (!r.ok()) warn(`subida falló (${r.status()}) → ${endpoint}`);
  } catch (e) {
    warn(`error subiendo ${endpoint}: ${e.message}`);
  }
}

async function waitServer(maxMs = 30000) {
  const t = Date.now();
  while (Date.now() - t < maxMs) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('El servidor no respondió en 30s');
}

async function main() {
  console.log('\n🎬 take-showcase-screenshots — sección "producto" de la landing\n');

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  log('Arrancando servidor en puerto 3000…');
  const server = spawn('node', ['app.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: '3000', NODE_ENV: 'development' },
    stdio: 'ignore',
  });
  server.on('error', e => { console.error('Error arranque:', e); process.exit(1); });

  try {
    await waitServer();
    ok('servidor listo en ' + BASE);

    log('Seeding datos demo (pedidos en Pendientes / En cocina / Listos)…');
    execSync('node scripts/seed-demo-data.js', { cwd: ROOT, stdio: 'pipe' });
    ok('seed completado');

    const browser = await chromium.launch({ headless: true });

    // ── owner.html en viewport de celular: login, fotos reales, Cocina ──
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        locale: 'es-PE',
      });
      const page = await context.newPage();

      log('Iniciando sesión como owner…');
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
      await page.fill('#email', OWNER_EMAIL);
      await page.fill('#password', OWNER_PASS);
      await page.click('#submit-btn');
      await page.waitForURL(`${BASE}/owner.html`, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      ok('sesión iniciada');

      // Cierra el modal "Qué hay de nuevo" si aparece (bloquea los clicks)
      const btnCerrarNov = page.locator('.nov-btn-cerrar').first();
      if (await btnCerrarNov.count() > 0) {
        await btnCerrarNov.click();
        await page.waitForTimeout(300);
      }

      // Sube fotos a los platos del menú del día (para el celular)
      log('Subiendo fotos a platos de menú…');
      const platosMenuRes = await context.request.get(`${BASE}/api/menu/platos-menu`);
      const platosMenu = platosMenuRes.ok() ? await platosMenuRes.json() : [];
      for (const p of platosMenu) {
        const f = FOTOS_MENU[p.nombre];
        if (!f) continue;
        const fp = path.join(ASSETS_DIR, f);
        if (!fs.existsSync(fp)) { warn(`no encontrada: ${fp}`); continue; }
        await subirFoto(context.request, `${BASE}/api/menu/platos-menu/${p.id}/foto`, fp);
      }
      const platosCartaRes = await context.request.get(`${BASE}/api/menu/platos-carta`);
      const platosCarta = platosCartaRes.ok() ? await platosCartaRes.json() : [];
      for (const p of platosCarta) {
        const f = FOTOS_CARTA[p.nombre];
        if (!f) continue;
        const fp = path.join(ASSETS_DIR, f);
        if (!fs.existsSync(fp)) { warn(`no encontrada: ${fp}`); continue; }
        await subirFoto(context.request, `${BASE}/api/menu/platos-carta/${p.id}/foto`, fp);
      }
      ok('fotos subidas');

      // Pisa "Lomo saltado" y "Chicha morada" con fotos reales (Wikimedia
      // Commons, CC BY-SA 4.0 / CC BY 2.0) y fija el lomo saltado como
      // portada del menú del día.
      const ASSETS_WEB = path.join(__dirname, '..', 'landing', 'bot', 'assets-web');
      const fotosReales = [
        { nombre: 'Lomo saltado', archivo: 'lomo-saltado-real.jpg', portada: true },
        { nombre: 'Chicha morada', archivo: 'chicha-morada-real.jpg', portada: false },
      ];
      let idPortada = null;
      for (const { nombre, archivo, portada } of fotosReales) {
        const fp = path.join(ASSETS_WEB, archivo);
        if (!fs.existsSync(fp)) { warn(`no encontrada: ${fp}`); continue; }
        const plato = platosMenu.find(p => p.nombre === nombre);
        if (!plato) { warn(`no se encontró el plato "${nombre}"`); continue; }
        await subirFoto(context.request, `${BASE}/api/menu/platos-menu/${plato.id}/foto`, fp);
        ok(`foto real → ${nombre}`);
        if (portada) idPortada = plato.id;
      }
      if (idPortada) {
        const menusDiaRes = await context.request.get(`${BASE}/api/menu/menus-dia`);
        const menusDia = menusDiaRes.ok() ? await menusDiaRes.json() : [];
        const menuHoy = menusDia.find(m => m.nombre === 'Menú del día');
        if (menuHoy) {
          const r = await context.request.patch(`${BASE}/api/menu/menus-dia/${menuHoy.id}/portada`, {
            data: { id_plato_portada: idPortada },
          });
          if (r.ok()) ok('portada del menú del día → foto real de lomo saltado');
          else warn(`no se pudo fijar portada (${r.status()})`);
        } else {
          warn('no se encontró el menú del día de hoy para fijar portada');
        }
      }

      // Fotos reales también para la carta (Bebidas: Chicha morada 1L, visible
      // en la parte baja del showcase-menu.png)
      const fotosCartaReales = [
        { nombre: 'Chicha morada (1L)', archivo: 'chicha-morada-real.jpg' },
      ];
      for (const { nombre, archivo } of fotosCartaReales) {
        const fp = path.join(ASSETS_WEB, archivo);
        if (!fs.existsSync(fp)) continue;
        const plato = platosCarta.find(p => p.nombre === nombre);
        if (!plato) continue;
        await subirFoto(context.request, `${BASE}/api/menu/platos-carta/${plato.id}/foto`, fp);
        ok(`foto real → ${nombre}`);
      }

      // ── Cocina (owner.html → panel "cocina"), viewport de celular ──
      await page.evaluate(() => window.showPanel?.('cocina'));
      await page.waitForTimeout(800);
      try {
        await page.screenshot({ path: path.join(OUT_DIR, 'showcase-cocina.png'), fullPage: false });
        ok('guardada → showcase-cocina.png');
      } catch (e) {
        warn(`fallo showcase-cocina.png: ${e.message}`);
      }
      await context.close();
    }

    // ── Menú del cliente (menu.html), viewport de celular ──
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        locale: 'es-PE',
      });
      const page = await context.newPage();
      await page.goto(`${BASE}/menu?restaurante=1&mesa=1`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      try {
        await page.screenshot({ path: path.join(OUT_DIR, 'showcase-menu.png'), fullPage: false });
        ok('guardada → showcase-menu.png');
      } catch (e) {
        warn(`fallo showcase-menu.png: ${e.message}`);
      }
      await context.close();
    }

    await browser.close();
    ok('\n✅ Capturas guardadas en public/landing/screenshots/\n');

  } finally {
    server.kill();
    log('Servidor detenido.');
  }
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
