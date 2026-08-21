# ISS-059 — Sin forma de revertir un pedido cancelado por error

**Estado:** 🔍 **Diagnosticado 2026-08-21, sin implementar.**
**Módulo:** `routes/orders.js`, `routes/reservations.js`, `public/js/modules/pedidos.js`.
**Prioridad:** 🔴 Alta — la dueña pierde una venta real por un toque accidental de la cocinera.
**Origen:** piloto #1, Día 8 (2026-08-21), reportado por el usuario el mismo día. Textual de la
dueña: *"Pedro, no puedo devolverla para que se cuente como menú?"* — la cocinera canceló un
pedido por error y quiere que vuelva a contar como venta, no solo verlo de nuevo en pantalla.

---

## Diagnóstico

Distinto de [`ISS-055`](ISS-055-regresar-listos-a-cocina.md) (Listo → Cocina), donde el backend
ya aceptaba el cambio hacia atrás y solo faltaba el botón. Acá el backend **bloquea
explícitamente** cualquier cambio de estatus una vez que una orden/reserva queda en
`es_cancelado` — es un estado terminal a propósito:

- `orders.js:440` → `if (orden.es_pagado || orden.es_cancelado) return 400 'No se puede cambiar
  una orden cancelada'`
- `reservations.js:282` → misma regla para reservas
- `orders.js:707` (`PUT /api/orders/:id`, usado por la vista de cocina) → misma regla

Además, cancelar **devuelve el stock** de los platos del menú en la misma transacción
(`devolverStock(db, itemsMenuDeOrden(db, id))`, `orders.js:454`). Revertir la cancelación
tendría que **re-descontar** ese stock, y puede fallar si el plato ya se agotó mientras tanto
(otro pedido lo consumió después de la cancelación) — hay que decidir qué pasa en ese caso
(bloquear con aviso claro, o permitir igual y dejar stock en negativo).

Un tercer punto: los pedidos cancelados **desaparecen del todo** de la Cola del día
(`clasificarZonas()` en `pedidos.js` solo tiene `pendientes`/`cocina`/`listos`/`cobrar`, ninguna
zona para cancelados). Solo se ven en el Historial de Órdenes (`ordenes.js`), que es de solo
lectura — no hay ningún botón ahí hoy. Tampoco existe un historial de estados: una vez
cancelado, no queda registro de en qué zona estaba antes, así que "devolver" no puede ser
literal — hay que restaurar a un estado por defecto razonable.

## Solución propuesta (sin implementar)

1. **Backend:** permitir explícitamente la transición `es_cancelado → es_en_cocina` (mismo
   criterio de "aterrizaje" que ISS-055), re-descontando stock; si no alcanza, error claro sin
   romper nada.
2. **Frontend (`pedidos.js`):** zona colapsable "Cancelados (hoy)" en el Kanban de la Cola del
   día, con botón "↩️ Restaurar" por ítem individual (reusa el mecanismo optimista de
   `accionRapidaOrden`/`accionRapidaReserva`).
3. Evaluar si aplica igual a reservas o solo a órdenes (la dueña habló de "menús"/pedidos).

## Verificación pendiente

Tests jest para el nuevo camino de reversión + el caso sin stock suficiente. Sin implementar
todavía — queda para una próxima sesión.
