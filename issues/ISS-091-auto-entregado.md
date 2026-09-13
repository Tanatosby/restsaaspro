# ISS-091 — Auto-entregado: "Listos" se vacía sola

**Estado:** 🟢 Decidido por el usuario (2026-09-12), **sin implementar**
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

## A verificar al implementar

- El job tiene que filtrar por restaurante y por fecha de hoy (mismo criterio que `colaDia.js`).
- No tocar órdenes ya pagadas/canceladas.
- `better-sqlite3` es síncrono: el tick debe ser una consulta acotada, no un barrido de todo el
  historial (mismo cuidado que ISS-026).
- Tests: replicar la estructura de los de `autoPreparacion`.
