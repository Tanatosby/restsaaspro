'use strict';
// Orquestador principal del bot de documentación y captura de errores.
// Uso: node landing/bot/bot.js

const { chromium }    = require('playwright');
const { spawn }       = require('child_process');
const fs              = require('fs');
const path            = require('path');
const http            = require('http');
const cfg             = require('./config');
const runOwnerFlows   = require('./flows/owner');
const runCocinaFlows  = require('./flows/cocina');
const runMozoFlows    = require('./flows/mozo');
const runClienteFlows = require('./flows/cliente');
const generateManuals = require('./generate-manuals');

// ── Utilidades ──────────────────────────────────────────────────────────────

function mkdirSafe(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function esperarServidor(url, intentos = 30, delay = 1000) {
  return new Promise((resolve, reject) => {
    let restantes = intentos;
    function intentar() {
      http.get(url, res => {
        if (res.statusCode < 500) { resolve(); return; }
        reintentar();
      }).on('error', () => reintentar());
    }
    function reintentar() {
      restantes--;
      if (restantes <= 0) { reject(new Error(`Servidor no responde en ${url}`)); return; }
      setTimeout(intentar, delay);
    }
    intentar();
  });
}

async function capturarErrores(context) {
  const errores = [];
  context.on('console', msg => {
    if (msg.type() === 'error') {
      errores.push({ tipo: 'console.error', texto: msg.text(), url: msg.location()?.url || '' });
    }
  });
  context.on('pageerror', err => {
    errores.push({ tipo: 'page.error', texto: err.message, stack: err.stack || '' });
  });
  return errores;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🤖 Bot Menú Pro — Generador de Manuales\n');

  // Preparar directorios de salida
  mkdirSafe(cfg.SCREENSHOTS_DIR);
  mkdirSafe(path.join(cfg.SCREENSHOTS_DIR, 'owner'));
  mkdirSafe(path.join(cfg.SCREENSHOTS_DIR, 'cocina'));
  mkdirSafe(path.join(cfg.SCREENSHOTS_DIR, 'mozo'));
  mkdirSafe(path.join(cfg.SCREENSHOTS_DIR, 'cliente'));
  mkdirSafe(cfg.OUTPUT_DIR);
  mkdirSafe(cfg.ERRORS_DIR);

  // Levantar servidor Express
  console.log('▶ Levantando servidor Express en puerto', cfg.PORT, '...');
  const serverProc = spawn('node', ['app.js'], {
    cwd: path.join(__dirname, '../..'),
    env: { ...process.env, NODE_ENV: 'development', PORT: String(cfg.PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProc.stdout.on('data', d => process.stdout.write('  [server] ' + d));
  serverProc.stderr.on('data', d => process.stderr.write('  [server] ' + d));

  try {
    await esperarServidor(`${cfg.BASE_URL}/health`);
    console.log('✓ Servidor listo\n');
  } catch (e) {
    console.error('✗ Servidor no arrancó:', e.message);
    serverProc.kill();
    process.exit(1);
  }

  // Iniciar Chromium
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport:  cfg.VIEWPORT,
    locale:    'es-PE',
    timezoneId: 'America/Lima',
  });

  const erroresCapturados = await capturarErrores(context);

  const resultados = { owner: [], cocina: [], mozo: [], cliente: [] };

  try {
    console.log('── Flow: Owner ────────────────────────────');
    resultados.owner = await runOwnerFlows(context, cfg);

    console.log('\n── Flow: Cocina ───────────────────────────');
    resultados.cocina = await runCocinaFlows(context, cfg);

    console.log('\n── Flow: Mozo ─────────────────────────────');
    resultados.mozo = await runMozoFlows(context, cfg);

    console.log('\n── Flow: Cliente ──────────────────────────');
    resultados.cliente = await runClienteFlows(context, cfg);

  } catch (err) {
    console.error('\n✗ Error en flujos:', err.message);
    console.error(err.stack);
  }

  await browser.close();
  serverProc.kill('SIGTERM');
  console.log('\n✓ Servidor detenido');

  // Guardar errores de consola
  guardarErrores(erroresCapturados);

  // Generar manuales markdown
  console.log('\n── Generando manuales markdown ────────────');
  generateManuals(resultados, cfg);

  console.log('\n✅ Bot completado. Archivos en landing/bot/output/\n');
}

function guardarErrores(errores) {
  const archivo = path.join(cfg.ERRORS_DIR, 'errors-report.md');
  const ahora = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

  let md = `# Reporte de Errores de Consola\n\nGenerado: ${ahora}\n\n`;

  if (errores.length === 0) {
    md += '> Sin errores de consola detectados durante la navegación.\n';
  } else {
    md += `> **${errores.length} error(es) detectado(s)** durante la navegación del bot.\n\n`;
    md += '---\n\n';
    errores.forEach((e, i) => {
      md += `## Error ${i + 1} — \`${e.tipo}\`\n\n`;
      md += `**Mensaje:** ${e.texto}\n\n`;
      if (e.url) md += `**Origen:** \`${e.url}\`\n\n`;
      if (e.stack) md += `**Stack:**\n\`\`\`\n${e.stack}\n\`\`\`\n\n`;
      md += '---\n\n';
    });
  }

  fs.writeFileSync(archivo, md, 'utf8');
  console.log(`\n✓ Errores guardados en errors/errors-report.md (${errores.length} errores)`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('ERROR FATAL:', err);
    process.exit(1);
  });
}

module.exports = { main };
