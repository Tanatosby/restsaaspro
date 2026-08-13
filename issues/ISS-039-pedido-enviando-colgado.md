# ISS-039 — Pedido queda trabado en "Enviando…" desde la vista del cliente

**Estado:** ✅ Resuelto y desplegado — commit `1a85a89`, deploy confirmado por el usuario 2026-08-13. Falta verificación en campo (conexión real lenta).
**Módulo:** `public/menu.html` (`confirmarEnvioFinal`, `crearOrden`, `crearReserva`), `routes/public.js` (`POST /orders`, `PATCH /pago/orden/:id`)
**Prioridad:** 🔴 Alta — ocurre en el momento más crítico del flujo (el cliente confirmando su pedido) y puede duplicar pedidos en cocina

---

## Síntoma reportado

El usuario, sobre la vista del cliente que escanea el QR y hace un pedido:

> "hace clic y queda en ese status... 'enviando'. Actualicé la página y funcionó, pero al
> principio no."

---

## Diagnóstico

El botón "Confirmar pedido" dispara dos peticiones HTTP **en serie**, no una:

1. `crearOrden()` → `POST /api/public/orders` (JSON liviano). **Acá la orden ya se crea de
   verdad**: `routes/public.js:311-343` la inserta en una transacción `better-sqlite3`
   (síncrona) y responde 201 casi al instante.
2. Inmediatamente después, `confirmarEnvioFinal()` sube la foto del comprobante de pago →
   `PATCH /api/public/pago/orden/:id` con `FormData` (imagen de hasta 5MB,
   `routes/public.js:23-36`).

El botón pasa a `disabled = true` / texto `"Enviando…"` en `menu.html:1158` y **no se
restaura hasta que ambos `await` terminan** (`try/catch/finally` en `menu.html:1160-1182`).

**Causa raíz:** ninguno de los `fetch()` del archivo (`crearOrden`, `crearReserva`, el PATCH
de pago) tiene timeout ni `AbortController`. En una conexión móvil floja — el escenario
esperado según `vision_negocio.md`, restaurantes de menú pequeños sin infraestructura de
red — el paso 2 (subir la foto, el más pesado de los dos) puede quedar esperando respuesta
indefinidamente: sin error, sin éxito, sin feedback. El botón queda pegado en "Enviando…"
sin límite de tiempo y sin forma de cancelar.

**Agravante — posible pedido duplicado:** como el paso 1 ya insertó la orden en la base
*antes* de que arranque la subida de la foto, si el usuario ve el botón colgado y decide
refrescar la página y reintentar, el segundo intento vuelve a llamar `crearOrden()` desde
cero. Es probable que quede **un pedido duplicado en la cola de cocina**: el primero con el
pago sin confirmar (`estado_pago` en su default) y el segundo completo. Falta confirmar
contra la base si esto pasó en el incidente reportado.

---

## Reproducción

No reproducido de forma determinística todavía — depende de latencia de red real. Hipótesis
para reproducir en local: throttlear la conexión (Chrome DevTools → Network → Slow 3G) y
confirmar un pedido con foto de comprobante (Yape/Plin); observar si el botón queda en
"Enviando…" más allá de lo razonable y si, al refrescar y reintentar, aparecen dos órdenes
con el mismo `nombre_cliente`/mesa en el panel del owner.

---

## Solución implementada

Todo en `public/menu.html`, sin tocar backend:

1. **Timeout en todas las peticiones del flujo de pedido/reserva.** Nueva
   `fetchConTimeout(url, options, timeoutMs)`: envuelve `fetch` con `AbortController`,
   default 15s. Si se agota, lanza un error legible ("No hubo respuesta del restaurante.
   Revisa tu conexión e intenta de nuevo.") en vez de dejar el `await` colgado para
   siempre. `crearOrden()` y `crearReserva()` la usan con el default; el PATCH de
   comprobante usa 30s (sube una imagen, más lento en redes flojas).
2. **Ya no se puede duplicar el pedido en un reintento.** `confirmarEnvioFinal()` guarda
   `pagoPendiente.creado = { id, codigo }` apenas el paso 1 (crear orden/reserva) tiene
   éxito. Si falla o hace timeout el paso 2 (subir foto) y el usuario vuelve a tocar
   "Confirmar", el código detecta `pagoPendiente.creado` ya presente y **salta directo al
   PATCH de pago** — no vuelve a llamar `crearOrden()`/`crearReserva()`. Antes, cualquier
   reintento recreaba el pedido desde cero.
3. **Mensajes de paso en el botón**, pedido explícitamente por el usuario junto con el fix:
   - `"Enviando pedido…"` / `"Enviando reserva…"` durante el paso 1 (crear).
   - `"Subiendo comprobante…"` durante el paso 2, solo si hay foto (Yape/Plin);
     `"Confirmando pago…"` si es efectivo (no hay foto que subir).
   - Los botones de los flujos sin pago (`confirmarPedido()`, `confirmarReserva()`, para
     restaurantes sin Yape/Plin/efectivo activos) también pasaron de `"Enviando…"` genérico
     a `"Enviando pedido…"` / `"Enviando reserva…"` por consistencia.

**Verificación:** sintaxis del script de `menu.html` chequeada con `new Function()` (ambos
bloques `<script>` compilan). Suite completa `npx jest` — **754/754 verde**, sin
regresiones (el fix es 100% frontend, no se tocó ninguna ruta ni util del backend).

No se armó un script Playwright de verificación end-to-end: los timeouts (15s/30s) están
fijos en el código y no hay forma de acortarlos desde afuera para un test rápido sin
modificar la implementación. Si se quiere automatizar, la vía es exponerlos como
parámetro/constante inyectable para simular el timeout en segundos en vez de en minutos.

---

## Pendiente

- ~~Commit + deploy~~ — hecho: commit `1a85a89`, deploy confirmado por el usuario el
  2026-08-13, mismo día.
- Verificación en campo: confirmar que, ante una conexión lenta real, el botón ya no queda
  congelado sin mensaje y que un reintento no genera un pedido duplicado.
- Punto 4 del diagnóstico original (confirmar si el incidente reportado dejó una orden
  duplicada en la base) sigue sin resolver — no bloqueante para cerrar el fix, pero vale la
  pena chequearlo si se tiene acceso a la base de ese momento.
