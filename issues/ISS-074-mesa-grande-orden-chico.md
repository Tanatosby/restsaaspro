# ISS-074 — Mesa grande / #orden chico en Cola, Cocina, Órdenes y Reservas

**Estado:** Resuelto — 2026-08-25
**Reportado por:** el usuario, contando una conversación del mismo día con la dueña

## Problema

Cita: *"debería aparecer el número de la mesa grande, aparece el # de orden grande y el número
de mesa pequeño, debería ser al revés."* El cocinero/mozo actúa por mesa (a qué mesa llevar el
plato), no por número de orden — pero la jerarquía visual de las tarjetas era la inversa:
`#orden` en negrita, `Mesa N` en texto chico y gris.

## Fix

Se invirtió en las 4 pantallas que comparten el patrón (`Mesa` pasa a `<strong>`, `#orden` pasa
a chico/gris cuando corresponde):

- `cocina.js` — `renderCocinaTicket()` y `renderCocinaReserva()`.
- `ordenes.js` — `renderOrdenCard()`.
- `reservas.js` — `renderReservaCard()`.
- `pedidos.js` (Cola del día) — `renderKanbanOrden()` y `renderKanbanReserva()`.

Para llevar/delivery no tienen mesa — en esos casos `#orden` se queda como lo único visible
(no hay nada más grande que mostrar). En las tarjetas de reserva no hay `#orden` compitiendo,
así que ahí Mesa simplemente se agregó en negrita junto al nombre del cliente, sin quitarle
nada a ningún otro dato.

Sin cambios de backend. 34/34 test suites, 458/458 tests.

## Verificación pendiente

Sin probar en uso real — confirmar en cocina que ahora es más rápido ubicar la mesa a simple
vista.

## Seguimiento — Día 12 del piloto (2026-08-26): achicar no alcanzó

La dueña confirmó que la mesa se ve mejor, pero el `#orden` chico y gris **seguía confundiendo**
al lado de la mesa en Cola y Cocina — pidieron evaluar sacarlo de la vista directamente, no solo
seguir achicándolo.

**Resuelto 2026-08-28:** con mesa, el `#orden` se saca por completo de `renderKanbanOrden()`
(`pedidos.js`) y `renderCocinaTicket()` (`cocina.js`) — queda solo `Mesa N`. Sin mesa (para
llevar/delivery), sigue mostrándose igual que antes: ahí es el único dato que identifica el
pedido, no hay nada que sacar. Alcance acotado a Cola y Cocina — Órdenes/Reservas/Historial no se
tocaron, ahí el número puede seguir sirviendo para búsquedas administrativas y nadie reportó
confusión en esas pantallas. 469/469 jest sin regresiones, verificado a mano en ambas pantallas
con una orden real.
