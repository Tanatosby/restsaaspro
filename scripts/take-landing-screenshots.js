'use strict';
/**
 * take-landing-screenshots.js
 * Arranca el servidor local, seedea datos demo, sube fotos a los platos
 * y toma las 7 capturas para public/landing/screenshots/.
 *
 * Uso: node scripts/take-landing-screenshots.js
 */

const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');

const BASE       = 'http://localhost:3000';
const OUT_DIR    = path.join(__dirname, '..', 'public', 'landing', 'screenshots');
const ASSETS_DIR = path.join(__dirname, '..', 'landing', 'bot', 'assets');
const ROOT       = path.join(__dirname, '..');

const OWNER_EMAIL = 'owner@bot.com';
const OWNER_PASS  = 'BotMenuPro2026!';

// Mapeo nombre de plato → foto en landing/bot/assets/
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

// ─── helpers ───────────────────────────────────────────────────

function log(msg)  { console.log(`  ${msg}`); }
function ok(msg)   { console.log(`  ✓ ${msg}`); }
function warn(msg) { console.log(`  ⚠ ${msg}`); }

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

async function subirFoto(request, endpoint, fotoPath) {
  try {
    const buffer = fs.readFileSync(fotoPath);
    const r = await request.post(endpoint, {
      multipart: {
        foto: { name: path.basename(fotoPath), mimeType: 'image/jpeg', buffer },
      },
    });
    if (!r.ok()) warn(`subida falló (${r.status()}) → ${endpoint}`);
  } catch (e) {
    warn(`error subiendo ${endpoint}: ${e.message}`);
  }
}

async function shot(page, filename, prepareFn) {
  log(`📸 ${filename}…`);
  try {
    if (prepareFn) await prepareFn(page);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
    ok(`guardada → ${filename}`);
  } catch (e) {
    warn(`fallo en ${filename}: ${e.message}`);
  }
}

// ─── flujo principal ────────────────────────────────────────────

async function main() {
  console.log('\n🎬 take-landing-screenshots — Menú Pro\n');

  // Asegura carpeta de salida
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. Arrancar servidor local
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

    // 2. Seed de datos demo (idempotente)
    log('Seeding datos demo…');
    execSync('node scripts/seed-demo-data.js', { cwd: ROOT, stdio: 'pipe' });
    ok('seed completado');

    // 3. Playwright — viewport mobile 390×844, 2× pixel ratio
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      locale: 'es-PE',
    });
    const page = await context.newPage();

    // --- Login ---
    log('Iniciando sesión…');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', OWNER_EMAIL);
    await page.fill('#password', OWNER_PASS);
    await page.click('#submit-btn');
    await page.waitForURL(`${BASE}/owner.html`, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    ok('sesión iniciada');

    // 4. Subir fotos a platos de menú usando la sesión de Playwright
    log('Subiendo fotos a platos de menú…');
    const platosMenuRes = await context.request.get(`${BASE}/api/menu/platos-menu`);
    const platosMenu = platosMenuRes.ok() ? await platosMenuRes.json() : [];
    for (const p of platosMenu) {
      const f = FOTOS_MENU[p.nombre];
      if (!f) continue;
      const fp = path.join(ASSETS_DIR, f);
      if (!fs.existsSync(fp)) { warn(`no encontrada: ${fp}`); continue; }
      await subirFoto(context.request, `${BASE}/api/menu/platos-menu/${p.id}/foto`, fp);
      ok(`foto → ${p.nombre}`);
    }

    log('Subiendo fotos a platos de carta…');
    const platosCartaRes = await context.request.get(`${BASE}/api/menu/platos-carta`);
    const platosCarta = platosCartaRes.ok() ? await platosCartaRes.json() : [];
    for (const p of platosCarta) {
      const f = FOTOS_CARTA[p.nombre];
      if (!f) continue;
      const fp = path.join(ASSETS_DIR, f);
      if (!fs.existsSync(fp)) { warn(`no encontrada: ${fp}`); continue; }
      await subirFoto(context.request, `${BASE}/api/menu/platos-carta/${p.id}/foto`, fp);
      ok(`foto → ${p.nombre}`);
    }

    // 5. Screenshots del owner panel
    await page.goto(`${BASE}/owner.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    // owner-panel.png — Home con 4 hubs
    await shot(page, 'owner-panel.png', async p => {
      await p.evaluate(() => window.showPanel?.('home'));
    });

    // feature-plano-mesas.png — Plano de mesas (tab en Órdenes)
    await shot(page, 'feature-plano-mesas.png', async p => {
      await p.evaluate(() => window.showPanel?.('ordenes'));
      await p.waitForTimeout(600);
      const tab = p.locator('button[data-tab="plano"], [data-tab="plano"]').first();
      if (await tab.count() > 0) await tab.click();
      else {
        // fallback: buscar por texto
        const btnPlano = p.locator('button, [role="tab"]').filter({ hasText: 'Plano' }).first();
        if (await btnPlano.count() > 0) await btnPlano.click();
      }
    });

    // feature-reportes.png — Reportes con gráficas
    await shot(page, 'feature-reportes.png', async p => {
      await p.evaluate(() => window.showPanel?.('reportes'));
      await p.waitForTimeout(1500); // espera carga de gráficas
    });

    // paso2-cocina-panel.png — Panel Cocina
    await shot(page, 'paso2-cocina-panel.png', async p => {
      await p.evaluate(() => window.showPanel?.('cocina'));
    });

    // paso3-cobrar.png — Cola del día, tab "Por cobrar"
    await shot(page, 'paso3-cobrar.png', async p => {
      await p.evaluate(() => window.showPanel?.('pedidos'));
      await p.waitForTimeout(500);
      // busca el tab "Por cobrar" por texto
      const tab = p.locator('button, [role="tab"]').filter({ hasText: /[Cc]obrar/ }).first();
      if (await tab.count() > 0) await tab.click();
    });

    // 6. Screenshots de menu.html (vista del cliente)
    await page.goto(`${BASE}/menu?restaurante=1&mesa=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // espera fotos y animaciones

    // hero-menu-cliente.png — vista inicial del menú QR
    await shot(page, 'hero-menu-cliente.png');

    // paso1-cliente-elige.png — modal de selección de menú del día abierto
    await shot(page, 'paso1-cliente-elige.png', async p => {
      // intenta abrir el modal del primer menú del día
      const btn = p.locator('button:has-text("Ver opciones"), button:has-text("Ver"), .btn-add-menu').first();
      if (await btn.count() > 0) {
        await btn.click();
        await p.waitForTimeout(800);
      }
    });

    await browser.close();
    ok('\n✅ 7 capturas guardadas en public/landing/screenshots/\n');

  } finally {
    server.kill();
    log('Servidor detenido.');
  }
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
