'use strict';

const { login, irAPanel, capturar, delay } = require('./helpers');

module.exports = async function runOwnerFlows(context, cfg) {
  const steps = [];
  const ROL   = 'owner';

  let page;
  try {
    // ── 1. LOGIN ──────────────────────────────────────────────────────────────
    const loginPage = await context.newPage();
    await loginPage.goto(`${cfg.BASE_URL}/login.html`, { waitUntil: 'networkidle' });
    steps.push(await capturar(loginPage, cfg, ROL, '01-login',
      'Pantalla de inicio de sesión',
      'Accedé al sistema desde tu celular ingresando tu correo y contraseña. ' +
      'El sistema funciona como una app instalable — podés agregarlo a tu pantalla de inicio desde el navegador.'));
    await loginPage.close();

    // Login real
    page = await login(context, cfg, ROL);

    // ── 2. PANEL INICIAL ─────────────────────────────────────────────────────
    steps.push(await capturar(page, cfg, ROL, '02-panel-inicial',
      'Panel principal — Menú del Día',
      'Al ingresar, el sistema muestra el panel de **Menú del Día** con los menús activos de hoy. ' +
      'Desde el menú lateral podés navegar a cualquier módulo del sistema.'));

    // ── 3. MENÚ DEL DÍA — lista de menús ─────────────────────────────────────
    await irAPanel(page, 'menu-dia', cfg);
    steps.push(await capturar(page, cfg, ROL, '03-menu-dia-lista',
      'Módulo Menú del Día — lista de menús',
      'Acá creás y gestionás los menús del día. Podés tener varios menús activos al mismo tiempo ' +
      '(ej: Menú Universitario + Menú Ejecutivo). Cada menú tiene su precio y modalidades habilitadas.'));

    // Click en primer menú para ver sus secciones/platos
    const firstMenu = await page.$('.menu-dia-card, .card, [data-menu-id]');
    if (firstMenu) {
      await firstMenu.click().catch(() => {});
      await delay(cfg.STEP_DELAY);
    }
    steps.push(await capturar(page, cfg, ROL, '04-menu-dia-secciones',
      'Módulo Menú del Día — secciones y platos',
      'Dentro de un menú podés configurar las **secciones** (Entrada, Fondo, Postre, Refresco) ' +
      'y asignar los **platos** a cada sección. Marcá una sección como "Obligatoria" para que ' +
      'el precio del menú la incluya siempre.'));

    // ── 4. CARTA ─────────────────────────────────────────────────────────────
    await irAPanel(page, 'carta', cfg);
    steps.push(await capturar(page, cfg, ROL, '05-carta-categorias',
      'Módulo Carta — categorías',
      'La carta contiene los platos individuales que vendés aparte del menú del día: ' +
      'ceviche, lomo saltado, causa, bebidas, etc. Primero creás las **categorías** ' +
      '(Entradas, Platos fuertes, Postres, Bebidas).'));

    // Ver platos de carta
    const btnPlatos = await page.$('[onclick*="platos"], .tab[data-tab="platos"], #tab-carta-platos');
    if (btnPlatos) {
      await btnPlatos.click().catch(() => {});
      await delay(cfg.STEP_DELAY);
    }
    steps.push(await capturar(page, cfg, ROL, '06-carta-platos',
      'Módulo Carta — platos',
      'Dentro de una categoría podés agregar los platos con nombre, precio y foto. ' +
      'El toggle "Activo/Inactivo" te permite ocultar temporalmente un plato del menú QR ' +
      'sin borrarlo (ej: si se agotó).'));

    // ── 5. COLA DEL DÍA (KANBAN) ─────────────────────────────────────────────
    await irAPanel(page, 'pedidos', cfg);
    await delay(cfg.STEP_DELAY * 2);
    steps.push(await capturar(page, cfg, ROL, '07-cola-dia-pendientes',
      'Cola del Día — tab Pendientes',
      'La **Cola del Día** es el centro de operaciones. Muestra todas las órdenes y reservas ' +
      'activas organizadas en 4 zonas: Pendientes, En Cocina, Listos y Por Cobrar. ' +
      'El badge naranja indica cuántos pedidos hay en cada zona.'));

    // Click en tab "En Cocina"
    const tabCocina = await page.$('.tab:has-text("En Cocina"), .tab:has-text("Cocina"), [data-tab="cocina"]');
    if (tabCocina) {
      await tabCocina.click().catch(() => {});
      await delay(cfg.STEP_DELAY);
    }
    steps.push(await capturar(page, cfg, ROL, '08-cola-dia-cocina',
      'Cola del Día — tab En Cocina',
      'En la zona **En Cocina** ves los pedidos que están siendo preparados. ' +
      'Cada tarjeta muestra qué pidió el cliente, la mesa o código de reserva, ' +
      'y los botones de acción para avanzar al siguiente estado.'));

    // ── 6. ÓRDENES ────────────────────────────────────────────────────────────
    await irAPanel(page, 'ordenes', cfg);
    await delay(cfg.STEP_DELAY * 2);
    steps.push(await capturar(page, cfg, ROL, '09-ordenes-plano',
      'Módulo Órdenes — Plano de Mesas',
      'El plano de mesas muestra el estado actual de cada mesa en tiempo real. ' +
      '🟢 Verde = libre, 🟠 Naranja = ocupada, 🔵 Azul = reserva confirmada. ' +
      'Toca una mesa ocupada para ver los detalles de la orden activa.'));

    // Tab historial
    const tabHistOrd = await page.$('[onclick*="historial"], .tab:has-text("Historial")');
    if (tabHistOrd) {
      await tabHistOrd.click().catch(() => {});
      await delay(cfg.STEP_DELAY * 2);
    }
    steps.push(await capturar(page, cfg, ROL, '10-ordenes-historial',
      'Módulo Órdenes — Historial',
      'El historial guarda todas las órdenes completadas y canceladas. ' +
      'Podés filtrar por fecha y descargar el reporte en Excel con un solo toque.'));

    // ── 7. RESERVAS ───────────────────────────────────────────────────────────
    await irAPanel(page, 'reservas', cfg);
    await delay(cfg.STEP_DELAY * 2);
    steps.push(await capturar(page, cfg, ROL, '11-reservas-activas',
      'Módulo Reservas — Activas',
      'Aquí ves las **reservas del día** — pedidos anticipados que los clientes hacen desde el menú QR. ' +
      'Cada reserva muestra el código único (ej: r7Xk2mQ), la hora de llegada, qué pidió el cliente ' +
      'y el estado actual. Las reservas con pago pendiente muestran el badge ⚠️.'));

    // Tab historial reservas
    const tabHistRes = await page.$('[onclick*="historial"], .tab:has-text("Historial")');
    if (tabHistRes) {
      await tabHistRes.click().catch(() => {});
      await delay(cfg.STEP_DELAY * 2);
    }
    steps.push(await capturar(page, cfg, ROL, '12-reservas-historial',
      'Módulo Reservas — Historial',
      'El historial de reservas muestra todas las reservas completadas y canceladas. ' +
      'Podés descargar el reporte en Excel para llevar el control de ingresos por reservas.'));

    // ── 8. COCINA ─────────────────────────────────────────────────────────────
    await irAPanel(page, 'cocina', cfg);
    await delay(cfg.STEP_DELAY * 2);
    steps.push(await capturar(page, cfg, ROL, '13-cocina-cola',
      'Módulo Cocina — Cola unificada',
      'El panel de cocina muestra **órdenes y reservas juntas** ordenadas por urgencia. ' +
      'Las reservas aparecen primero si su hora de llegada está próxima. ' +
      'El cocinero marca cada pedido como "Listo 🍽" cuando termina de prepararlo.'));

    // ── 9. REPORTES ───────────────────────────────────────────────────────────
    await irAPanel(page, 'reportes', cfg);
    await delay(cfg.STEP_DELAY * 2);
    steps.push(await capturar(page, cfg, ROL, '14-reportes-clientes',
      'Módulo Reportes — Curva de Demanda',
      'Los reportes te muestran en qué días y horarios viene más gente. ' +
      'La curva de demanda ayuda a planificar cuánto menú preparar cada día ' +
      'y cuándo necesitás más personal.'));

    // Cambiar tab a ganancias
    const tabGanancias = await page.$('.tab:has-text("Ganancias"), [data-tab="ganancias"]');
    if (tabGanancias) {
      await tabGanancias.click().catch(() => {});
      await delay(cfg.STEP_DELAY * 2);
    }
    steps.push(await capturar(page, cfg, ROL, '15-reportes-ganancias',
      'Módulo Reportes — Ganancias',
      'La sección de ganancias muestra el ingreso total, por período y desglosado ' +
      'entre órdenes y reservas. Podés descargar el reporte en Excel para tu contabilidad.'));

    // ── 10. CONFIGURACIÓN ─────────────────────────────────────────────────────
    await irAPanel(page, 'configuracion', cfg);
    await delay(cfg.STEP_DELAY * 2);
    steps.push(await capturar(page, cfg, ROL, '16-config-general',
      'Módulo Configuración — Datos del restaurante',
      'En configuración personalizás la apariencia que verán tus clientes: ' +
      'foto de portada del menú QR, color de marca, nombre del restaurante ' +
      'y el tiempo de preparación para las reservas (cuántos minutos antes pasan a cocina automáticamente).'));

    // Scroll para ver QR y métodos de pago
    await page.evaluate(() => window.scrollBy(0, 400));
    await delay(cfg.STEP_DELAY);
    steps.push(await capturar(page, cfg, ROL, '17-config-qr-pagos',
      'Módulo Configuración — QR y Métodos de Pago',
      'El **código QR** de tu menú se genera automáticamente — descargalo e imprímelo en cada mesa. ' +
      'En **Métodos de pago** activás Yape, Plin y Efectivo. ' +
      'Solo ingresá tu número de teléfono y tus clientes podrán yapear directamente desde el menú.'));

    // ── 11. USUARIOS ──────────────────────────────────────────────────────────
    await irAPanel(page, 'usuarios', cfg);
    await delay(cfg.STEP_DELAY * 2);
    steps.push(await capturar(page, cfg, ROL, '18-usuarios-lista',
      'Módulo Usuarios — Lista de usuarios',
      'Acá creás las cuentas de tu equipo: cocineros y mozos. ' +
      'Cada usuario solo ve las partes del sistema que necesita para su trabajo.'));

    // Scroll al formulario de creación
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(cfg.STEP_DELAY);
    steps.push(await capturar(page, cfg, ROL, '19-usuarios-crear',
      'Módulo Usuarios — Crear usuario',
      'Al crear un usuario asignás su rol (Cocinero o Mozo) y los **permisos granulares** ' +
      'que tendrá: qué módulos puede ver y qué acciones puede hacer. ' +
      'Un mozo con permiso "Cola del día" puede gestionar pedidos desde su celular.'));

    // ── 12. CAMBIAR CONTRASEÑA ────────────────────────────────────────────────
    // Buscar botón de cambio de contraseña en el sidebar
    const btnPassword = await page.$('[onclick*="password"], [data-action*="password"], .sidebar-footer button');
    if (btnPassword) {
      await btnPassword.click().catch(() => {});
      await delay(cfg.STEP_DELAY);
      const modal = await page.$('.modal, .modal-overlay, [id*="modal-password"]');
      if (modal) {
        steps.push(await capturar(page, cfg, ROL, '20-cambiar-password',
          'Cambiar contraseña',
          'Podés cambiar tu contraseña en cualquier momento desde el botón en la parte inferior del menú. ' +
          'Ingresá tu contraseña actual y la nueva dos veces para confirmar.'));
        // Cerrar modal
        await page.keyboard.press('Escape').catch(() => {});
        await delay(cfg.STEP_DELAY);
      }
    }

  } catch (err) {
    console.error('  ✗ Error en owner flow:', err.message);
  } finally {
    if (page) await page.close().catch(() => {});
  }

  console.log(`  ✓ ${steps.length} screenshots del owner`);
  return steps;
};
