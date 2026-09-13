# ISS-091 — Auto-entregado: "Listos" se vacía sola

**Estado:** ✅ Implementado el 2026-09-13 — **sin desplegar**, sin verificar en uso real
**Origen:** revisión del flujo de la cola durante ISS-089
**Módulo:** `utils/` (job nuevo) · `config/database.js` · `routes/menu.js` (config) · `modules/config.js` · `modules/pedidos.js`
**Prioridad:** 🟡 Media — ataca de frente la acumulación de ISS-085

---

## El problema

Una orden marcada "Listo" en cocina se queda en la zona **Listos** hasta que alguien toca
"🍽 Entregar". En hora pico nadie lo toca: la bandeja se acumula y el pedido nunca llega a "Por
cobrar". Es la misma raíz que ISS-085 (día 15: ~39 pedidos acumulados sin cerrar).

## Qué se hace

Un job periódico mueve las órdenes de `es_listo` → `es_entregado` pasados **X minutos**, configurable
por restaurante desde el panel. **Default: 3 minutos.**

El molde ya existe: `utils/autoPreparacion.js` es un job con `setInterval` que mueve reservas a
"En cocina" solo, con umbral configurable (`minutos_preparacion` en `restaurantes`). Copiar ese
patrón — nueva columna (ej. `minutos_auto_entregado INTEGER DEFAULT 3`), nuevo tick, mismo estilo.

### Alcance, decidido con el usuario

| Punto | Decisión |
|-------|----------|
| **Modalidad** | Aplica a **todas las órdenes**, sin distinguir. Una orden "para llevar" es alguien que está en el local y se lleva su plato — se lo dan ahí mismo. Y **una orden nunca puede ser delivery**: `MODALIDADES_ORDEN = ['en_local','para_llevar','mixto']` (`routes/public.js:295`) ya lo impide; el delivery solo existe en reservas. |
| **Reservas** | **Fuera, enteras.** Una reserva necesita que alguien confirme que el cliente llegó, o que el pedido salió con el repartidor. Son datos reales, no los puede poner un reloj. |
| **Deshacer** | **↩️ Regresar a cocina** (ISS-055, pedido por la cocinera) hoy existe **solo** en la zona Listos. Si el pedido se va solo, el botón lo tiene que seguir: agregarlo también en "Por cobrar". |
| **Poll de la cola** | Baja de 60 s a **20 s** (decidido 2026-09-12). El motivo del valor alto era el parpadeo del día 11, ya resuelto con la firma por zona (`_ultimaFirmaZona` en `pedidos.js` — solo repinta si cambiaron los datos). Tocar las 3 constantes de `initPedidosPoll`/`reiniciarPoll`. |

## Riesgo a tener presente

Junto con ISS-090, una orden pasa a **avanzar sola hasta la caja**: nace en cocina, sale de Listos sin
que nadie la toque y aparece en la cuenta de su mesa (ISS-089). Es lo buscado, pero significa que
**ningún humano confirma nada hasta el cobro**. Por eso "Regresar a cocina" en Por cobrar y el
"Deshacer" del cobro (ISS-089) dejan de ser adornos: son la única red que queda.

## Qué se hizo (2026-09-13)

### `listo_at` — lo que faltaba y no estaba previsto

La orden **no guardaba cuándo había pasado a "Listo"**, solo `created_at`. Contar los minutos desde
la creación haría que un pedido que estuvo 40 minutos en cocina se marcara entregado **en el mismo
instante** en que la cocinera lo pone listo, sin que nadie lo lleve a la mesa. Se agregó
`ordenes.listo_at`, que se escribe en los **dos** caminos por los que una orden llega a listo:
`PATCH /:id/estatus` y el `PUT` de cocina.

> **Bug que apareció al probarlo:** el `SELECT` de `PATCH /:id/estatus` traía sólo
> `id, nombre, es_pagado, es_cancelado`, así que `nuevoEstatus.es_listo` era `undefined` y la rama
> nueva nunca se ejecutaba — `listo_at` quedaba en NULL y el job no movía nada. Lo atrapó el E2E
> (verificación A). Se agregó `es_listo` al SELECT.

### El job — `utils/autoEntregado.js`

Calcado de `utils/autoPreparacion.js`: tick cada 60 s, arrancado en `app.js`. Pasa a `es_entregado`
las órdenes `es_listo` cuyo `listo_at` ya cumplió `minutos_auto_entregado`.

| Decisión | Cómo quedó |
|---|---|
| **Solo órdenes** | Las reservas no se tocan: "cliente llegó" y "salió con el repartidor" son datos reales que alguien confirma, no un reloj. |
| **Todas las modalidades** | Una orden "para llevar" es alguien que está en el local; y una orden nunca puede ser delivery (`MODALIDADES_ORDEN`). |
| **Órdenes sin `listo_at`** | Se ignoran a propósito: son las que ya estaban en "Listos" antes del deploy. Vaciarlas de golpe marcaría como entregados platos que quizá siguen en la barra. Se cierran a mano, una sola vez. |
| **Volver a cocina** | Al salir de nuevo a listo, `listo_at` se reescribe: el reloj arranca de cero. |
| **Apagar** | `minutos_auto_entregado = 0` → el job no toca nada y todo funciona como antes. |

### Lo demás

- **"↩️ Regresar a cocina" también en "Por cobrar"** (`btnOrden`): antes vivía solo en "Listos", donde
  el pedido esperaba indefinidamente. Ahora el pedido se mueve solo a los 3 min, así que la ventana
  para deshacer un "Listo" tocado por error (ISS-055, pedido de la cocinera) se cerraría sola.
- **Poll de la cola: 60 s → 20 s** (`POLL_COLA_MS`). El valor alto venía del parpadeo del día 11, ya
  resuelto por la firma por zona (`_ultimaFirmaZona`). Ahora hace falta más frescura porque los
  pedidos se mueven solos y la dueña no toca nada para verlos aparecer. El texto del panel lo dice.
- **Configuración:** tarjeta nueva "🍽 Pasar solo de Listos a Por cobrar" +
  `PATCH /api/menu/config/minutos-auto-entregado` (valida 0–180).

### Verificación

- `tests/auto-entregado.test.js` — **10/10**, sobre todo de lo que el job **no** debe tocar:
  reservas, pedidos que no cumplieron el tiempo, sin `listo_at`, con el umbral en 0, ya cobrados o
  cancelados, y el umbral propio de cada restaurante. **jest 493/493**.
- `scripts/test-iss091-auto-entregado.js` — **22/22**: registro de `listo_at`, el job moviendo lo que
  corresponde y dejando el resto, reservas intactas, los dos botones de "Regresar a cocina", el
  reinicio del reloj, la validación del endpoint y el poll en 20 s.
- **El job corriendo dentro del servidor**, no solo la función: pedido sembrado con 20 min en
  "Listos" y umbral de 2 → el servidor lo movió solo **a los ~30 s**, sin que nadie tocara nada.
- Sin regresión: `test-iss089-cobrar-por-mesa` 31/31, `test-iss090-pedido-directo-cocina` 17/17,
  `test-cobrar-homologado` 14/14, `test-ya-pago-foto-buscador` 25/25.

## Nota al desplegar

Los pedidos que estén en "Listos" en ese momento tienen `listo_at` en NULL y **el job no los va a
mover**: hay que cerrarlos a mano esa primera vez. Los nuevos ya nacen con la hora registrada.
