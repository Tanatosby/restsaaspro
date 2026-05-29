'use strict';

const { login, irAPanel, capturar, delay } = require('./helpers');

module.exports = async function runMozoFlows(context, cfg) {
  const steps = [];
  const ROL   = 'mozo';

  let page;
  try {
    page = await login(context, cfg, 'mozo');
    await delay(cfg.STEP_DELAY * 2);

    steps.push(await capturar(page, cfg, ROL, '01-mozo-panel',
      'Panel del Mozo — Vista inicial',
      'El mozo ingresa al sistema con su propio usuario y ve solo los módulos ' +
      'que necesita: el plano de mesas y la cola del día. ' +
      'El sistema vive en su celular — lo tiene en la mano durante todo el turno.'));

    // Cola del día
    await irAPanel(page, 'pedidos', cfg);
    await delay(cfg.STEP_DELAY * 2);
    steps.push(await capturar(page, cfg, ROL, '02-mozo-cola',
      'Cola del Día — Vista del Mozo',
      'La **Cola del Día** le muestra al mozo exactamente qué plato va a qué mesa. ' +
      '"Mesa 3 — Lomo saltado — Reserva r7Xk2mQ". Sin adivinar. Sin confundirse. ' +
      'El badge de cada tab indica cuántos pedidos hay en esa etapa.'));

    // Tab "Listos"
    const tabListos = await page.$('.tab:has-text("Listo"), .tab:has-text("Listos")');
    if (tabListos) {
      await tabListos.click().catch(() => {});
      await delay(cfg.STEP_DELAY);
    }
    steps.push(await capturar(page, cfg, ROL, '03-mozo-listos',
      'Cola del Día — Platos Listos para entregar',
      'Cuando el cocinero marca un plato como listo, aparece en esta zona. ' +
      'El mozo toca **"🍽 Entregar"** cuando lleva el plato a la mesa, ' +
      'y el pedido pasa automáticamente a **"Por Cobrar"**.'));

    // Plano de mesas
    await irAPanel(page, 'ordenes', cfg);
    await delay(cfg.STEP_DELAY * 2);
    steps.push(await capturar(page, cfg, ROL, '04-mozo-mesas',
      'Plano de Mesas',
      'El plano muestra el estado de cada mesa en tiempo real. ' +
      '🟢 **Libre** — podés sentar a clientes. ' +
      '🟠 **Ocupada** — hay una orden activa. ' +
      '🔵 **Reservada** — tiene una reserva confirmada con hora de llegada próxima. ' +
      'Tocá cualquier mesa para ver los detalles y cobrar.'));

  } catch (err) {
    console.error('  ✗ Error en mozo flow:', err.message);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  console.log(`  ✓ ${steps.length} screenshots del mozo`);
  return steps;
};
