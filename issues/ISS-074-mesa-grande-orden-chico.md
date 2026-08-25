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
