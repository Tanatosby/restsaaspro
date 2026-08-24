# ISS-063 — En Reservas se pedían los datos del comensal antes de mostrar la carta

**Estado:** ✅ **Resuelto 2026-08-24.**
**Módulo:** `public/menu.html`, `public/css/menu.css` (modo "Reservar").
**Prioridad:** 🟡 Media — fricción de flujo, no bloqueante.
**Origen:** piloto #1, Día 9 (2026-08-22), reportado por el usuario el 2026-08-24. Mockup
aprobado antes de implementar (artifact de comparación antes/después, generado en la misma
sesión).

---

## Diagnóstico

`#res-panel` ponía el formulario completo (modalidad, fecha, hora, nombre, teléfono) **arriba de
todo**, antes de que el comensal viera qué menú/carta había disponible — al revés que "Pedir",
donde primero se navega la carta y los datos se piden recién al abrir el carrito. El comensal
tenía que llenar sus datos a ciegas, sin saber todavía qué iba a reservar.

## Solución implementada

Mismo patrón que el carrito de "Pedir":

- `#res-panel` ahora solo tiene un selector de fecha compacto (`.res-fecha-bar`, siempre visible
  — determina qué menú se muestra) seguido directo de `#res-menu-content` (la carta).
- Datos del comensal (modalidad, hora, nombre, teléfono) + resumen + botón "Confirmar reserva"
  se movieron a un drawer nuevo, `#res-drawer` (mismo mecanismo que `#cart-drawer`: `.drawer`/
  `.drawer-backdrop`, `openResDrawer()`/`closeResDrawer()`).
- La barra sticky inferior (`#res-bar`) ya no confirma directo — ahora abre el drawer
  (`onclick="openResDrawer()"`, CTA cambiado a "Continuar →").
- `confirmarReserva()` cierra el drawer al pasar a la pantalla de pago y al confirmar con éxito,
  igual que `confirmarPedido()` con `#cart-drawer`.
- `volverDePago()` reabre `#res-drawer` si `pagoPendiente.tipo === 'reserva'` (antes no hacía
  falta: el formulario de reserva vivía siempre visible, nunca se cerraba nada).

CSS: `.res-fecha-bar` nueva (input ≥44px, font-size 16px — regla mobile-first). Se eliminaron
`.res-form-card`/`.res-form-title`/`.res-info-box`, que quedaron sin uso.

## Scripts de prueba actualizados

`scripts/test-iss048-volver-pago.js` y `scripts/test-gate-pago.js` interactuaban con
`#res-nombre`/`#btn-reservar` asumiendo que estaban siempre visibles — se actualizaron para
abrir `#res-drawer` primero (clic en `.res-bar-btn`, o `openResDrawer()` vía JS cuando el ítem se
agrega directo al `resCart` por script), igual que ya hacían con `#cart-drawer` en el flujo de
"Pedir".

## Verificación

454/454 jest. E2E: `test-iss048-volver-pago.js` (15/15, incluye volver desde reserva y
reapertura del drawer), `test-gate-pago.js` (24/24, incluye el gate de pago en reserva).
