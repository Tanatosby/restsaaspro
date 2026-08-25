# ISS-071 — "Reservas" en el medio del bottom-nav causaba toques por error

**Estado:** Resuelto — 2026-08-25
**Reportado por:** el usuario, contando algo que le dijo la dueña (no en visita de piloto)

## Problema

El bottom-nav de `owner.html` (la barra de acceso rápido, fija abajo del celular) tiene 5
botones: Cola · Cocina · Reservas · Menú · Inicio. "Reservas" queda en el medio (posición 3 de
5) — la dueña, queriendo entrar a "Cola" (Cola del día), tocaba por error "Reservas" al estar
justo al lado/en el medio de la barra.

## Por qué ya no hace falta el atajo

Desde ISS-067 (2026-08-24), la Cola del día ya muestra las reservas del día mezcladas con las
órdenes, con las mismas acciones operativas (`renderKanbanReserva()` en `pedidos.js`: Confirmar
/ A cocina / Listo / Cancelar / Completar, igual que el panel de Reservas). El atajo del
bottom-nav quedó redundante para el uso del día a día.

## Fix

`public/owner.html` — el botón `#bn-reservas` del bottom-nav se marca `hidden` (clase CSS ya
existente, `.bottom-nav-item.hidden { display:none !important }`) — queda fuera de la barra, sin
tocar el resto (Cola/Cocina/Menú/Inicio se redistribuyen solos, el CSS ya usa `flex:1` por
ítem). El panel Reservas **no se elimina** — sigue accesible desde el menú lateral
(`nav-reservas`) para historial y reservas de fechas futuras que la Cola del día no cubre (esa
solo muestra el día de hoy).

Sin cambios de backend. 34/34 test suites, 458/458 tests.

## Hallazgos aparte, sin implementar (fuera de lo pedido en esta conversación)

Investigando este pedido encontré 2 cosas más, relacionadas pero distintas — quedan anotadas
para decidir después, no se tocaron:

1. **El panel "Reservas activas" (no el bottom-nav) parpadea en cada refresco.**
   `reservas.js:loadReservasActivas()` corre cada 20s (`owner.html:2456`, no cada "~5s" como
   se percibía) pero borra la lista entera a "Cargando reservas…" en cada corrida, sin
   comparar si algo cambió — el mismo patrón que ISS-067 ya arregló en la Cola del día
   (`renderZona()`), pero nunca se aplicó acá porque es un archivo/panel distinto. Explica por
   qué el refresco se siente mucho más frecuente de lo que realmente es.
2. **No hay expiración de reservas viejas.** `GET /api/reservations?flag=...` no filtra por
   fecha — una reserva que nunca se marca "Completar" ni "Cancelar" se queda en "activas" para
   siempre, sin importar qué tan vieja sea. Si la dueña vio una reserva fechada muy atrás en el
   panel Reservas, es un dato real atascado, no un bug de renderizado.
