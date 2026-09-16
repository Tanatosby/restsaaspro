# ISS-095 — "Agregar manual" no tenía forma de marcar un pedido para llevar

## Descripción

Surgió de una pregunta directa del usuario (2026-09-16, no de un reporte del piloto): *"¿puedes
revisar si en órdenes manuales también se puede indicar si alguna es para llevar o no?"*

Diagnóstico sobre el código: **no se podía.** El flujo del comensal (`menu.html` →
`POST /api/public/orders`) maneja modalidad por completo desde ISS-047 — toggle por ítem, cargo
por tapper (ISS-029), validación contra la config del restaurante. Pero `POST /api/orders`, la
ruta que usa el botón "+ Agregar manual" de la Cola del día, **no aceptaba ningún campo de
modalidad**. La columna `modalidad` de `ordenes` existe (`DEFAULT 'en_local'`), pero nada la tocaba
desde ese formulario — todo pedido manual quedaba "en el local" sin excepción, sin cobrar el
envase aunque el mozo tomara un pedido para llevar por teléfono o de palabra.

## Pasos para reproducir (antes del fix)

1. Abrir "+ Agregar manual" en la Cola del día.
2. Cargar cualquier plato/menú y enviar.
3. El pedido queda con `modalidad = 'en_local'` sin importar si en la realidad era para llevar —
   no había ningún control en el modal para decirlo.

## Diagnóstico técnico

- `routes/orders.js` `POST /api/orders`: el INSERT de `ordenes` solo escribía mesa, nombre, fecha,
  estatus, método de pago y `es_manual` — sin `modalidad` ni `cargo_modalidad`.
- `public/js/modules/pedidos.js` `enviarPedidoManual()`: no mandaba ningún campo de modalidad.
- `calcularCargoModalidad()` (el cálculo del cargo por tapper, ISS-029) vivía solo en
  `routes/public.js`, sin poder reusarse desde `routes/orders.js` sin duplicar la lógica.

## Decisión de diseño

Mockup con 4 pantallas a 360px, aprobado por el usuario antes de codear —
[`issues/ISS-095-manual-para-llevar-mockups.html`](ISS-095-manual-para-llevar-mockups.html)
(artifact: https://claude.ai/artifact/G5pjUBxzi6qa1cXhoHWJBZ).

**Un solo toggle "🍽 Comer aquí / 🥡 Para llevar" para todo el pedido, no por ítem** — a diferencia
de `menu.html` (ISS-047), acá el mozo toma un pedido a la vez, así que separar por ítem hubiera
sido complejidad sin necesidad real. Solo aparece si el restaurante tiene `para_llevar_activo`
(mismo criterio que ya usa `menu.html`).

## Solución

- **`utils/modalidadPedido.js`**: se movieron acá `enriquecerMenuItems()` y
  `calcularCargoModalidad()` (antes solo en `routes/public.js`), recibiendo `db` como parámetro
  (mismo patrón que `utils/totales.js`) para evitar dependencias circulares. `routes/public.js`
  pasa a importarlas de ahí — sin cambio de comportamiento, 0 líneas de lógica duplicadas.
- **`routes/orders.js`** `POST /api/orders`: acepta `modalidad` (`'en_local'` | `'para_llevar'`,
  default `'en_local'`), valida contra `restaurante.para_llevar_activo`, normaliza los ítems con
  `normalizarModalidades()`/`resumirModalidad()` (aplicando el mismo valor a todo el pedido) y
  calcula `cargo_modalidad` con la función ya compartida. Se guarda en `ordenes.modalidad` +
  `ordenes.cargo_modalidad`, y por línea en `orden_menu_items.modalidad` /
  `orden_carta_items.modalidad` — mismas columnas que ya usa el flujo por QR.
- **`public/owner.html`** + **`pedidos.js`**: nuevo campo "Modalidad" en el modal de Agregar
  manual (`setModalidadManual()`/`renderModalidadManual()`), oculto si el restaurante no tiene
  "para llevar" activo. Arranca en "Comer aquí"; al elegir "Para llevar" muestra
  `+ S/ X.XX por envase` con el costo real configurado. `enviarPedidoManual()` manda el campo.
- **Sin cambios** en `pedidos.js`/`cocina.js` (render de la Cola del día) ni en "Por cobrar" — ya
  sabían pintar `badgeModalidad()` y agrupar por mesa sin importar si el pedido vino por QR o
  manual, tal como se diagnosticó en el mockup.

## Verificación

- `npx jest` — 524/524, sin regresión.
- `scripts/test-agregar-manual.js` — 35/35, sin regresión (el flujo sin tocar el toggle sigue
  igual: `modalidad` por defecto `'en_local'`, `cargo_modalidad = 0`).
- `scripts/test-modalidad-mixta.js` — 19/19, sin regresión en el flujo por QR tras mover
  `calcularCargoModalidad()`.
- `scripts/test-badge-modalidad-cocina.js` — 15/15, sin regresión.
- `scripts/test-pago-mixto.js` — 5/5, sin regresión.
- **`scripts/test-iss095-manual-para-llevar.js`** (nuevo) — 19/19: toggle oculto sin
  `para_llevar_activo`, arranca en "Comer aquí", cargo visible solo en "Para llevar", pedido
  guardado con la modalidad y el cargo correctos (S/1.50 de prueba), ítem de carta con su propia
  `modalidad`, badge "🥡 Para llevar" visible en Cocina junto al badge "Pedido manual", y el
  backend rechaza `para_llevar` sin la config activa o cualquier modalidad fuera de
  `en_local`/`para_llevar`.

**Estado: implementado y verificado en local. Pendiente de deploy.**
