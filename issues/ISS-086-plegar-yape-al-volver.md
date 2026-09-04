# ISS-086 — Al volver de Yape/Plin, plegar el total + tarjeta + 3 pasos en una línea

**Estado:** ✅ Resuelto — 2026-09-04
**Módulo:** `public/menu.html`, `public/css/menu.css`
**Prioridad:** 🟡 Media — no bloquea el pago, pero es la fricción #1 que la dueña reportó de
comensales reales a 1 semana de cumplirse el mes de piloto.

---

## Reporte del usuario

A una semana de cumplirse el mes del piloto 1, lo más incómodo del flujo para el comensal sigue
siendo el ir-y-venir entre la web y la app de Yape/Plin para pagar. Ya está documentado en
`vision_negocio.md` (cita textual: *"lo único incómodo es que tenemos que entrar a Yape, hacer el
Yape, capturar y luego recién subir la captura... es medio incómodo tantos pasos"*) y cerrado por
diseño el 2026-07-13 (Gap 16 — un deep link real requiere pasarela de pago afiliada, con costo por
transacción; inviable por ahora).

Esta sesión no reabre esa decisión — ataca la fricción *alrededor* del salto, no el salto en sí.

## Iteración (3 prototipos probados en artifact antes de tocar código)

1. **Copiar número + monto juntos** (un solo botón, un solo texto en el portapapeles) — probado y
   **descartado por el usuario**: "va a confundir, incluso si copiamos ambos por separado". No se
   implementa.
2. **Colapsar la tarjeta de Yape al volver** — bien recibido, pero la primera versión repetía el
   monto dos veces (banner "Total a pagar" arriba + la misma cifra en el resumen colapsado) y
   usaba 3 tratamientos de color distintos a la vez (banner naranja, tarjeta verde, resalte
   naranja del comprobante) — feedback: "se siente muy denso... menos texto".
3. **v2 — todo lo que no es la foto se pliega a una sola línea sin caja de color**, resaltando
   solo el comprobante. Aceptado. El usuario señaló además que la app real tiene un bloque de 3
   pasos (ISS-056) que el prototipo no incluía — se agregó y se confirmó que también se pliega
   (es 100% redundante una vez que la persona ya volvió).

## Solución implementada

- **`copiarNumeroPago(tel, btn)`** reemplaza el `onclick` inline que solo copiaba al
  portapapeles. Ahora además marca `copiadoParaPago = true` y guarda `pagoCopiadoTel` — la señal
  de que la persona ya tiene lo que necesita para salir a pagar.
- **`document.addEventListener('visibilitychange', …)`**: si la pestaña se oculta y se vuelve a
  mostrar con `copiadoParaPago` activo y `#pago-screen` abierta, dispara `colapsarPagoAlVolver()`.
  Funciona con el regreso real desde la app de Yape/Plin en el celular, no solo cambiando de
  pestaña.
- **`colapsarPagoAlVolver()`**: oculta `#pago-total-wrap` (banner "Total a pagar") y
  `#pago-metodo-detalle` (tarjeta Yape/Plin + los 3 pasos de ISS-056) — todo ya cumplido — y
  muestra `#pago-resumen-vuelta`, una sola línea sin caja ni color de fondo: *"✓ Pagaste S/ X a
  NÚMERO"*, con un link "Ver de nuevo" para el que copió mal, pagó a otro número, o quiere
  revisar (`expandirPagoDetalle()` — no se pierde nada, el detalle sigue en el DOM, solo se
  vuelve a mostrar).
- **`#pago-comprobante-wrap.pago-comprobante-en-turno`** (`menu.css`): único acento visual que
  queda en pantalla al volver — borde y fondo `var(--accent)`, pulso de 2 iteraciones
  (`prefers-reduced-motion` respetado, mismo patrón que `.btn-add-menu--pulse`), scroll
  automático hasta el bloque.
- **`resetPagoResumenVuelta()`**: reinicia todo (`showPagoStep()` al abrir la pantalla de pago
  desde cero, y al cambiar de método en `seleccionarMetodoPago()` — el plegado de un método ya no
  aplica si eligió otro).
- Efectivo no participa — no hay salto de app, nada que copiar ni que plegar.

## Verificación

- Los 3 `<script>` de `menu.html` parsean sin error de sintaxis (chequeo con `new Function()`).
- 478/478 jest — sin regresiones (el cambio es frontend puro, no toca backend).
- Pendiente: probarlo en un celular real saliendo de verdad a Yape/Plin y volviendo (confirmar
  que `visibilitychange` dispara igual que cambiando de pestaña en el navegador de escritorio).

## Pendiente

- **Sin desplegar.** Falta tu ok para el deploy (regla del proyecto: los deploys los hace el
  usuario).
- Sin verificar en uso real — falta un comensal del piloto probándolo.

## Relacionado

ISS-056 (los 3 pasos que ahora se pliegan), ISS-049 (persistencia del pedido si la pestaña se
recarga — no se toca), Gap 16 (`vision_negocio.md` — por qué no hay deep link real de Yape).
