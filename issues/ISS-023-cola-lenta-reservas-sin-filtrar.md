# ISS-023 — Cola del día se pone lenta en horas pico: `GET /api/reservations` traía todo el historial

**Módulo:** `public/js/modules/pedidos.js`, `routes/reservations.js`
**Prioridad:** 🔴 Alta — bloquea el proceso Node entero (better-sqlite3 es síncrono), no solo la pantalla de un usuario
**Estado:** ✅ Resuelto 2026-07-14

## Reporte original

"Hay una cuestión bien lenta, cuando vuelve a la app demora en abrir." Al pedir detalle: lo nota cuando hay varios pedidos, se queda cargando y luego carga; incómodo en momentos pico. Ahora mismo (sin pico) está rápido.

## Diagnóstico

`loadColaDia()` en `pedidos.js` (Cola del día, con polling automático cada 15s mientras el panel está abierto) llamaba `GET /api/reservations` **sin ningún query param**. El endpoint (`routes/reservations.js`) solo filtra por `id_restaurante` si no se pasa `fecha_desde`/`fecha_hasta`/`estatus`/`flag` — es decir, devolvía **todo el historial de reservas del restaurante**, sin importar cuán viejas. Encima, por cada reserva devuelta el endpoint hace 2 consultas SQL adicionales (ítems de carta + de menú) — un patrón N+1 clásico.

El filtro correcto (`!es_full && !es_cancelado`, es decir "solo activas") ya se aplicaba, pero **del lado del cliente, después de traer todo**. El panel de Reservas (`reservas.js`) sí lo hace bien: pide 5 listas separadas por `flag` (`es_inicial`, `es_confirmada`, `es_en_cocina`, `es_listo`, `es_cliente_llego`), cada una acotada en el servidor. `pedidos.js` era el único que no seguía ese patrón ya probado.

**Por qué se siente peor en horas pico:** las consultas de `better-sqlite3` son **síncronas** — mientras Node procesa esta única request (incluyendo el N+1 de cientos/miles de reservas históricas), **bloquea el event loop completo**, retrasando cualquier otra request en curso (de otros mozos/cocineros/clientes) en ese instante. A más historial acumulado (inevitable con el tiempo) y más gente usando el sistema a la vez (hora pico), peor.

**Auditoría cuantitativa** (`scripts/audit-carga-cola.js`, sembrando 3000 reservas históricas realistas — 80% completadas, 15% canceladas, 5% activas — contra el restaurante piloto):

| | Sin filtro (antes) | Con filtro por flag (después) |
|---|---|---|
| Tiempo | 540ms | 38ms |
| Registros devueltos | 3027 (todo el historial) | 152 (solo activas) |
| Mejora | — | **14.2× más rápido, 95% menos datos** |

## Fix

**`public/js/modules/pedidos.js`** — `loadColaDia()` reemplaza la llamada única sin filtro por las mismas 5 llamadas paralelas por `flag` que ya usa `reservas.js` (los 7 estados posibles de una reserva son mutuamente excluyentes; los 5 no cubiertos por `es_full`/`es_cancelado` son exactamente los "activos"). Sin cambios de backend — el endpoint ya soportaba el filtro por `flag`, solo no se estaba usando desde Cola del día.

## Verificación

`scripts/audit-carga-cola.js` (nuevo, no forma parte de jest) — siembra 3000 reservas históricas realistas, mide antes/después, limpia los datos sembrados al final. **267/267 jest verde** (cambio puramente de qué parámetros se mandan al endpoint existente, sin lógica nueva de backend).

## Pendiente

Desplegar a producción. Recomendación a futuro: si el volumen de órdenes activas simultáneas alguna vez crece mucho (poco probable para un restaurante de menú pequeño), el mismo patrón N+1 en `GET /api/orders/activas` merecería revisarse — hoy está acotado por diseño (solo activas) así que no es urgente.
