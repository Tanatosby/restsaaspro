# ISS-085 — "Por cobrar" se acumula: cerrar el pago desde "Listos" + buscador por mesa

**Estado:** ✅ Resuelto — 2026-09-02
**Módulo:** `public/js/modules/pedidos.js`, `public/owner.html`
**Prioridad:** 🔴 Alta — la cola de cobros crece sin cerrarse; la dueña se pierde y el dinero
queda con `total NULL` (invisible en Ganancias hasta el cierre de caja).

---

## Reporte del usuario (día 15 del piloto)

La dueña acumula ~**39** pedidos en "Por cobrar" sin cerrarlos. Lo que hace: mira el Yape en
"Listos", pasa el pedido a "Cobrar", **pero no le da "Cobrar"**. Cuando son muchos y quiere
revisar una mesa puntual, se pierde.

Su modelo mental (en sus palabras, vía el usuario): *"se va a la mesa, veo sus rostros y
verifico que me pagaron entrando a la app y a Yape al mismo tiempo"* — quiere verificar
**cuando el comensal se va**. Pero *"tiene que entregar pedidos, la mesa se fue, no vio ningún
rostro y luego tiene una cola inmensa en cobrar que nunca verificó"*. Su lectura: *"su lógica
se aplicaría en pocas mesas, pero durante atención no puede"*.

El usuario ya le insistió de palabra ("si ya verificó el Yape en Listos, páselo a cobrar y
libere la cola") sin efecto — ella misma dice *"así debería hacerlo, ¿por qué no lo hago?"* y
no lo hace.

Confirmado además: **sí abre el comprobante** (desde "Pendientes" incluso), no solo mira la
miniatura.

---

## Diagnóstico / reencuadre

Los 39 en "Por cobrar" **no son pedidos sin revisar** — ya revisó el comprobante en "Listos".
Son la intención de un segundo chequeo "en la despedida" que en hora pico nunca llega a hacer.
Distinto de la hipótesis del día 11 (conciliación contra el cuaderno): acá el bloqueo es que su
ritual depende de estar en la mesa cuando el comensal se va, y con volumen eso no pasa.

Un buscador solo ataca "me pierdo entre 39", no el 39. El fix de fondo es **mover el cierre al
momento de menos fricción**: "Listos", donde ella ya tiene el comprobante abierto.

## Solución

**A · Botón "✅ Ya pagó" en la zona "Listos"** (`pedidos.js`, `btnOrden()`/`btnReserva()`):

- Para órdenes con `metodo_pago` ∈ {`yape`,`plin`}: junto a "🍽 Entregar / 📦 Recogido" aparece
  **"✅ Ya pagó"**, que llama a `cobrarColaOrden(id)` — la misma función de ISS-072
  (`confirmar-pago` + `es_pagado`). El backend permite el salto `es_listo → es_pagado`
  directamente (`routes/orders.js` no exige secuencia lineal, solo `requiereConfirmarPagoAntes`).
  El pedido se cierra y sale de la Cola sin pasar por "Por cobrar".
- **Efectivo** NO muestra el botón — sigue por "Por cobrar", que sí necesita a la dueña presente
  para el vuelto.
- Para **reservas**: "✅ Ya pagó" (→ `cobrarColaReserva`, `es_full`) **solo si es sin mesa**
  (`para_llevar`/`delivery`). Con mesa, marcar `es_cliente_llego` dispara
  `autoMergeReservaEnOrden()` — fusiona los ítems en la orden abierta de esa mesa; saltarlo
  dejaría esos ítems fuera de la cuenta.

Se descartó "armar" el botón solo tras abrir el comprobante: como ella lo abre siempre (incluso
desde Pendientes), el filtro no aportaba nada y agregaba una máquina de estado frágil. Si en el
uso real empieza a cerrar sin mirar, se condiciona entonces.

**B · Buscador en "Por cobrar"** (`owner.html` + `pedidos.js`):

- Input `#cobrar-buscador` (type=search, 16px, solo visible cuando la zona activa es "cobrar" —
  lo togglea `switchZona()`).
- `filtrarColaCobrar()` guarda `_filtroCobrar` y repinta desde el cache (sin tocar el servidor).
- `renderColaDesdeCache()` filtra los ítems de "cobrar" con `coincideFiltroCobrar()` (mesa /
  "mesa N" / `nombre_cliente` / `#numero_dia`). El **badge de la pestaña sigue mostrando el
  total real** de la cola, no el filtrado.
- `renderZona()` mete el filtro en la "firma" anti-parpadeo (repinta al escribir) y muestra un
  empty-state propio ("Ninguna mesa coincide con « … »").

Sin cambios de backend. Solo Cola del día (`pedidos.js`); el panel clásico "Reservas"
(`reservas.js`) no se tocó.

## Verificación

- `scripts/test-ya-pago-foto-buscador.js` nuevo (25/25) — parte A: "✅ Ya pagó" aparece para
  Yape/Plin en "Listos" (orden y reserva sin mesa), NO para efectivo, NO para reserva con mesa,
  y "Por cobrar" sigue con "💰 Cobrar" sin regresión. Parte B: `coincideFiltroCobrar()` matchea
  por número de mesa, "mesa N", nombre y `#orden`, y descarta lo que no coincide.
- `scripts/test-cobrar-homologado.js` sin regresiones (14/14) — la homologación de ISS-079 sigue
  intacta.
- `scripts/test-menus-agrupados.js` (26/26) y `scripts/test-numero-dia-pedido.js` (10/10) sin
  regresiones (ambos ejercen `renderZona`).
- 478/478 jest.

**Pre-existente, no de este cambio:** `scripts/test-agregar-manual.js` 3/4 (falla igual sin los
cambios) y `scripts/test-cola-carrera.js` / `test-escala-tipografica.js` piden `TEST_EMAIL`/
`TEST_PASS` en el entorno.

## Pendiente

- Deploy (lo hace el usuario). Toca el flujo de "Listos", que ISS-080 y cambios recientes también
  tocaron — verificar con la dueña **antes y después**.
- Sin verificar en uso real: si "✅ Ya pagó" en "Listos" alcanza para que la cola de cobros no se
  acumule. Si no, la siguiente pieza sería un "Cobrar todos los verificados" en bloque.

## Relacionado

ISS-072 (cobro en 1 clic — reusa `cobrarColaOrden`/`cobrarColaReserva`), ISS-079 (homologar
"Cobrar"), ISS-067 (firma anti-parpadeo de `renderZona`).
