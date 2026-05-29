'use strict';
// Funciones compartidas entre todos los flows

const fs = require('fs');

/**
 * Hace login en la app con las credenciales dadas.
 * Devuelve la page ya logueada y en owner.html.
 */
async function login(context, cfg, rol) {
  const creds = cfg.CREDENTIALS[rol];
  const page = await context.newPage();

  await page.goto(`${cfg.BASE_URL}/login.html`, { waitUntil: 'networkidle' });
  await page.fill('#email', creds.email);
  await page.fill('#password', creds.password);
  await page.click('#submit-btn');

  // Esperar redirección post-login
  await page.waitForURL(/owner\.html|menu\.html/, { timeout: 10000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  await delay(cfg.STEP_DELAY);

  return page;
}

/**
 * Navega a un panel específico en owner.html y espera que cargue.
 */
async function irAPanel(page, panelName, cfg) {
  await page.evaluate(name => {
    if (typeof showPanel === 'function') showPanel(name);
  }, panelName);
  await page.waitForLoadState('networkidle');
  await delay(cfg.STEP_DELAY);
}

/**
 * Toma un screenshot y retorna el objeto de paso para el manual.
 */
async function capturar(page, cfg, rol, nombre, titulo, descripcion) {
  const archivo = `${nombre}.png`;
  const ruta    = `${cfg.SCREENSHOTS_DIR}/${rol}/${archivo}`;
  await page.screenshot({ path: ruta, fullPage: false });
  console.log(`  📸 ${nombre}`);
  return {
    titulo,
    descripcion,
    screenshot: `./screenshots/${rol}/${archivo}`,
  };
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { login, irAPanel, capturar, delay };
