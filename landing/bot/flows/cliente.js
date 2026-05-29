'use strict';

const { capturar, delay } = require('./helpers');

module.exports = async function runClienteFlows(context, cfg) {
  const steps = [];
  const ROL   = 'cliente';
  const MENU_URL = `${cfg.BASE_URL}/menu.html?restaurante=${cfg.RESTAURANT_ID}`;

  let page;
  try {
    page = await context.newPage();
    await page.goto(MENU_URL, { waitUntil: 'networkidle' });
    await delay(cfg.STEP_DELAY * 2);

    steps.push(await capturar(page, cfg, ROL, '01-menu-inicio',
      'Menú QR — Pantalla de bienvenida',
      'El cliente escanea el código QR de la mesa y su celular abre el menú del restaurante. ' +
      'Ve la foto del restaurante, el nombre y el menú disponible del día. ' +
      'No necesita descargar ninguna app ni crear una cuenta.'));

    // Scroll para ver el menú del día
    await page.evaluate(() => window.scrollBy(0, 300));
    await delay(cfg.STEP_DELAY);
    steps.push(await capturar(page, cfg, ROL, '02-menu-del-dia',
      'Menú QR — Menú del Día',
      'El menú del día muestra el precio, las secciones disponibles y los platos. ' +
      'Si el menú es **Elegible**, el cliente puede seleccionar qué quiere en cada sección. ' +
      'Si es **Fijo**, el restaurante sirve lo que hay.'));

    // Intentar seleccionar modalidad
    const modalidad = await page.$('[name="modalidad"], .modalidad-option, input[type="radio"]');
    if (modalidad) {
      await modalidad.click().catch(() => {});
      await delay(cfg.STEP_DELAY);
      steps.push(await capturar(page, cfg, ROL, '03-modalidad',
        'Menú QR — Elegir modalidad',
        'El cliente elige cómo quiere recibir su pedido: ' +
        '**Comer en local** (precio base), **Para llevar** (suma el costo del tapper) ' +
        'o **Delivery** si el restaurante lo tiene activado. ' +
        'El precio se actualiza en tiempo real al cambiar la modalidad.'));
    }

    // Scroll a carta si existe
    await page.evaluate(() => window.scrollBy(0, 400));
    await delay(cfg.STEP_DELAY);
    steps.push(await capturar(page, cfg, ROL, '04-carta',
      'Menú QR — Platos a la Carta',
      'Además del menú del día, el cliente puede agregar **platos a la carta**: ' +
      'ceviche, lomo saltado, bebidas, postres. ' +
      'Cada plato muestra foto, descripción y precio. ' +
      'Puede combinar menú del día con platos a la carta en el mismo pedido.'));

    // Buscar botón de confirmar pedido / hacer reserva
    const btnConfirmar = await page.$('[onclick*="confirm"], button:has-text("Confirmar"), button:has-text("Pedir"), .btn-primary');
    if (btnConfirmar) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await delay(cfg.STEP_DELAY);
      steps.push(await capturar(page, cfg, ROL, '05-confirmar-pedido',
        'Menú QR — Confirmar pedido',
        'Al terminar de armar el pedido, el cliente ve el resumen con el detalle y el total. ' +
        'Si pide "para llevar", ve el desglose: precio del menú + cargo del tapper. ' +
        'Puede indicar su nombre y una hora de llegada (opcional).'));

      await btnConfirmar.click().catch(() => {});
      await delay(cfg.STEP_DELAY * 2);
      steps.push(await capturar(page, cfg, ROL, '06-paso-pago',
        'Menú QR — Paso de Pago',
        'El cliente elige cómo pagar: **Yape**, **Plin** o **Efectivo**. ' +
        'Al tocar "Pagar con Yape", se abre la app de Yape directamente con el número del restaurante pre-cargado. ' +
        'Solo ingresa el monto y confirma. Después toca "Ya pagué" para enviar el comprobante.'));
    }

    // Intentar llegar a la pantalla del código de reserva
    // (Si el servidor procesó el pedido, debería aparecer el código)
    await delay(cfg.STEP_DELAY * 2);
    const codigoReserva = await page.$('.codigo-reserva, [class*="codigo"], h1:has-text("Reserva"), .reserva-codigo');
    if (codigoReserva) {
      steps.push(await capturar(page, cfg, ROL, '07-codigo-reserva',
        'Menú QR — Código de Reserva',
        'Una vez confirmado el pedido, el sistema genera un **código único** (ej: r7Xk2mQ). ' +
        '¡IMPORTANTE! El cliente debe guardar este código — es la clave para identificarse ' +
        'al llegar al restaurante. Puede sacarle screenshot a esta pantalla.'));
    } else {
      steps.push(await capturar(page, cfg, ROL, '07-pantalla-post-pedido',
        'Menú QR — Confirmación del Pedido',
        'Tras confirmar el pago, el sistema muestra la confirmación con el código de reserva. ' +
        'El cliente guarda el código (screenshot) y lo presenta al llegar al restaurante. ' +
        'Desde el menú QR también puede consultar el estado de su pedido en tiempo real.'));
    }

    // Buscar pantalla de consulta de estado
    const linkConsultar = await page.$('[href*="consultar"], button:has-text("Consultar"), .btn:has-text("mi reserva")');
    if (linkConsultar) {
      await linkConsultar.click().catch(() => {});
      await delay(cfg.STEP_DELAY * 2);
      steps.push(await capturar(page, cfg, ROL, '08-estado-reserva',
        'Menú QR — Consultar estado del pedido',
        'El cliente puede revisar el estado de su reserva en cualquier momento ingresando su código. ' +
        'El estado se actualiza automáticamente: Confirmada → En Preparación → Listo → Entregado.'));
    }

  } catch (err) {
    console.error('  ✗ Error en cliente flow:', err.message);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  console.log(`  ✓ ${steps.length} screenshots del cliente`);
  return steps;
};
