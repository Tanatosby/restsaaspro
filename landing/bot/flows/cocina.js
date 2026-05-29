'use strict';

const { login, capturar, delay } = require('./helpers');

module.exports = async function runCocinaFlows(context, cfg) {
  const steps = [];
  const ROL   = 'cocina';

  let page;
  try {
    page = await login(context, cfg, 'cocinero');
    await delay(cfg.STEP_DELAY * 2);

    steps.push(await capturar(page, cfg, ROL, '01-cocina-panel',
      'Panel de Cocina — Vista principal',
      'Al ingresar como cocinero, el sistema muestra directamente el **panel de cocina** ' +
      'con todos los pedidos activos ordenados por urgencia. No hay acceso a configuración ' +
      'ni reportes — solo lo que necesitás para trabajar.'));

    // Esperar que carguen los pedidos
    await delay(cfg.STEP_DELAY * 2);
    steps.push(await capturar(page, cfg, ROL, '02-cocina-pedidos',
      'Cola de Cocina — Pedidos en preparación',
      'La cola muestra **órdenes y reservas juntas**. Las reservas tienen hora de llegada ' +
      'y se marcan en azul para diferenciarlas. Al terminar de preparar un pedido, ' +
      'tocá el botón **"🍽 Listo"** para notificar al mozo.'));

    // Scroll para ver más pedidos si los hay
    await page.evaluate(() => window.scrollBy(0, 300));
    await delay(cfg.STEP_DELAY);
    steps.push(await capturar(page, cfg, ROL, '03-cocina-scroll',
      'Cola de Cocina — Más pedidos',
      'Si hay muchos pedidos, hacé scroll para ver todos. ' +
      'El panel se actualiza automáticamente cada 15 segundos — ' +
      'si llega un pedido nuevo, un sonido de alerta te avisa.'));

  } catch (err) {
    console.error('  ✗ Error en cocina flow:', err.message);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  console.log(`  ✓ ${steps.length} screenshots de cocina`);
  return steps;
};
