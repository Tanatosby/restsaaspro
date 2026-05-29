'use strict';
// Genera imágenes placeholder para platos peruanos usando Playwright.
// Se usa cuando upload.wikimedia.org está rate-limited (HTTP 429).
// Uso: node landing/bot/generate-placeholder-images.js

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');
const cfg  = require('./config');

const PLATOS = [
  { local: 'lomo-saltado.jpg',     emoji: '🥩', nombre: 'Lomo Saltado',        color: '#8B2500' },
  { local: 'aji-de-gallina.jpg',   emoji: '🍗', nombre: 'Ají de Gallina',       color: '#C47700' },
  { local: 'ceviche.jpg',          emoji: '🐟', nombre: 'Ceviche',              color: '#1565C0' },
  { local: 'causa-rellena.jpg',    emoji: '🥗', nombre: 'Causa Rellena',        color: '#F9A825' },
  // papa-huancaina.jpg ya descargada — se omite
  { local: 'arroz-con-leche.jpg',  emoji: '🍚', nombre: 'Arroz con Leche',      color: '#880E4F' },
  { local: 'chicha-morada.jpg',    emoji: '🥤', nombre: 'Chicha Morada',        color: '#6A1B9A' },
  { local: 'pollo-brasa.jpg',      emoji: '🍖', nombre: 'Pollo a la Brasa',     color: '#BF360C' },
  { local: 'seco-pollo.jpg',       emoji: '🫕', nombre: 'Seco de Pollo',        color: '#33691E' },
  { local: 'tacu-tacu.jpg',        emoji: '🫘', nombre: 'Tacu Tacu',            color: '#795548' },
  { local: 'mazamorra-morada.jpg', emoji: '🍮', nombre: 'Mazamorra Morada',     color: '#4A148C' },
  { local: 'chicharron.jpg',       emoji: '🥓', nombre: 'Chicharrón',           color: '#4E342E' },
];

function buildHtml(emoji, nombre, color) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 640px; height: 480px;
    background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
  }
  .emoji { font-size: 120px; line-height: 1; margin-bottom: 24px; }
  .nombre {
    font-size: 36px; font-weight: 700;
    color: rgba(255,255,255,0.95);
    text-shadow: 0 2px 8px rgba(0,0,0,0.4);
    text-align: center; padding: 0 32px;
    letter-spacing: -0.5px;
  }
  .badge {
    margin-top: 16px;
    font-size: 13px; color: rgba(255,255,255,0.6);
    letter-spacing: 2px; text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="emoji">${emoji}</div>
  <div class="nombre">${nombre}</div>
  <div class="badge">Menú Pro · Cocina Peruana</div>
</body>
</html>`;
}

async function main() {
  const assetsDir = cfg.ASSETS_DIR;
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const pendientes = PLATOS.filter(p => {
    const dest = path.join(assetsDir, p.local);
    return !(fs.existsSync(dest) && fs.statSync(dest).size > 5000);
  });

  if (pendientes.length === 0) {
    console.log('✅ Todas las imágenes ya existen — nada que hacer.');
    return;
  }

  console.log(`\n🎨 Generando ${pendientes.length} imágenes placeholder con Playwright...\n`);

  const browser = await chromium.launch();
  const page    = await browser.newPage();
  await page.setViewportSize({ width: 640, height: 480 });

  for (const plato of pendientes) {
    const dest = path.join(assetsDir, plato.local);
    const html = buildHtml(plato.emoji, plato.nombre, plato.color);

    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: dest, type: 'jpeg', quality: 88 });

    const kb = Math.round(fs.statSync(dest).size / 1024);
    console.log(`  ✓  ${plato.nombre.padEnd(22)} → ${plato.local} (${kb}KB)`);
  }

  await browser.close();

  // Regenerar index.json con los 12 platos (incluye papa-huancaina ya existente)
  const todosLosPlatos = [
    ...PLATOS,
    { local: 'papa-huancaina.jpg', nombre: 'Papa a la Huancaína' },
  ];
  const indice = todosLosPlatos.map(p => ({
    archivo:     p.local,
    descripcion: p.nombre,
    disponible:  fs.existsSync(path.join(assetsDir, p.local)) &&
                 fs.statSync(path.join(assetsDir, p.local)).size > 5000,
  }));
  fs.writeFileSync(path.join(assetsDir, 'index.json'), JSON.stringify(indice, null, 2), 'utf8');

  const listos = indice.filter(i => i.disponible).length;
  console.log(`\n✅ ${listos}/${indice.length} imágenes disponibles en assets/`);
  console.log('  📋 index.json actualizado\n');
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
