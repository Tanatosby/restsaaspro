# ISS-073 — Anti-parpadeo extendido a Cocina, Órdenes activas y Reservas activas

**Estado:** Resuelto — 2026-08-25
**Reportado por:** el usuario, contando una conversación del mismo día con la dueña

## Problema

Cita: *"Cocina tiene un refresco de 20 segundos, a todas las zonas debes hacerle lo mismo que
le hiciste a cola, eso de no recargar todo el tiempo, porque en cocina por ejemplo el refresco
también es bastante."*

Confirmado en el código: Cocina refresca cada **30s** (no 20, pero cerca) y, al igual que
Reservas activas y Órdenes activas (ambas cada 20s, ver ISS-071), borraba la lista entera a
"Cargando…" en cada corrida sin comparar si algo había cambiado — el mismo parpadeo que
ISS-067 ya había arreglado, pero solo en la Cola del día (`pedidos.js`), nunca portado a estos
otros 3 paneles.

## Fix

Se extrajo el mecanismo de ISS-067 a un helper compartido en `utils.js` —
`pintarSiCambio(zonaId, elId, itemsParaFirma, html)` — que solo toca el DOM si los datos son
distintos a lo último pintado, y preserva el scroll de `.content` al repintar. La Cola del día
**no se tocó** (`renderZona()`/`_ultimaFirmaZona` siguen como estaban, ya funcionaban bien) —
el helper nuevo es solo para los 3 paneles que no lo tenían:

- `cocina.js` — `loadColaCocina()`.
- `ordenes.js` — `loadOrdenesActivas()`.
- `reservas.js` — `loadReservasActivas()`.

Sin cambios de backend. 34/34 test suites, 458/458 tests.

## Verificación pendiente

Sin probar en uso real — confirmar en cocina que ya no se siente el parpadeo constante.
