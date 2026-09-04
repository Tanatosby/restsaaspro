# ISS-088 — Colapsar el resumen "Tu pedido" en la pantalla de pago

**Estado:** ✅ Resuelto — 2026-09-04
**Módulo:** `public/menu.html`
**Prioridad:** 🟢 Baja — ajuste visual, no bloquea nada.

---

## Reporte del usuario

El usuario, probando el flujo de Reservar (ISS-087, ya en producción): al llegar al paso de
adjuntar el comprobante, justo debajo aparece el resumen "Tu pedido" (lista de ítems, agregada en
ISS-081 cuando se sacó la pantalla de repaso). Pedido: que no aparezca texto ahí, solo la acción de
adjuntar la imagen.

## Decisión

Se preguntó al usuario entre 3 opciones (eliminar el resumen del todo, colapsarlo detrás de un
link, o moverlo más arriba lejos del comprobante). Eligió **colapsarlo detrás de un link** — sin
texto suelto por defecto, pero sigue disponible con un toque, sin perder la garantía de ISS-081
(poder revisar qué se está pagando sin salir de esta pantalla).

## Solución

- `#pago-items-wrap` pasa de mostrar siempre el título "Tu pedido" + la lista, a un botón
  **"Ver mi pedido"** (`togglePagoItems()`, `min-height:44px` — mobile-first) que despliega
  `#pago-items-collapse` y cambia su propio texto a "Ocultar mi pedido".
- `showPagoStep()` reinicia el colapso a cerrado ("Ver mi pedido") cada vez que se abre la
  pantalla de pago desde cero.
- Sin cambios en cómo se arma `#pago-items` (`showPagoStep()` sigue poblándolo igual) — solo
  cambia la visibilidad por defecto.

## Verificación

- `menu.html` parsea sin error de sintaxis.
- 478/478 jest.
- E2E sin regresión: `test-iss048-volver-pago.js` (15/15), `test-pedir-cantidad-primero.js`
  (24/24), `test-reservar-cantidad-primero.js` (21/21). `test-gate-pago.js`: la verificación del
  resumen del pedido sigue en verde (ajustado el texto del check — el ítem sigue armado en el DOM,
  solo colapsado); el resto del script sigue con la falla preexistente de Yape/Plin desactivados
  en el restaurante #1 de esta BD de desarrollo, no relacionada a este cambio.

## Pendiente

- Sin desplegar. Falta tu ok para el deploy.
- Sin verificar en uso real.

## Relacionado

ISS-081 (agregó el resumen a esta pantalla), ISS-086 (mismo principio de "menos texto" aplicado
al plegado de Yape/Plin al volver), ISS-087 (feedback surgió probando este cambio).
