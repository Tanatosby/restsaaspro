# ISS-014 — Reportería owner: Revenue Total y Ganancia de hoy siempre S/0.00

- **Módulo:** REPORTES
- **Fecha:** 2026-06-03
- **Estado:** ✅ Resuelto 2026-06-03
- **Prioridad:** Alta (afecta al dueño)

## Síntoma

Al momento de entrar a reportería, el REVENUE TOTAL y la ganancia de hoy se mantenían en S/0.00 aunque hubiera órdenes cobradas.

## Diagnóstico

### Causa raíz — Bug 1: Revenue total siempre S/0.00

`loadReportes()` en `reportes.js:168` calculaba:
```js
const revenue = ordenes.filter(o => o.es_pagado).reduce(...)
```
`ordenes` viene de `GET /api/orders`, cuyo SELECT solo incluye `eo.nombre AS estatus` — nunca `eo.es_pagado`. Entonces `o.es_pagado` es `undefined` en todos los objetos → el filtro retorna array vacío → revenue = 0 siempre, aunque hubiera cientos de órdenes cobradas.

### Causa raíz — Bug 2: Ganancia de hoy S/0.00 en horario nocturno Lima

`sumarGanancias()` en `routes/reportes.js` usaba `fecha = date('now')`. `date('now')` en SQLite devuelve la fecha en **UTC**. Las fechas de las órdenes se guardan con `fechaLima()` (Lima, UTC-5). A partir de las 19:00h Lima, `date('now')` UTC apunta al día siguiente → ninguna orden del día Lima matchea → ganancia de hoy = 0.

Lo mismo afectaba a `mes` y `semana` del resumen.

## Solución

**Fix Bug 1** (`public/js/modules/reportes.js`):
- Agregado `api('GET', '/api/reportes/ganancias/resumen')` al `Promise.all` de `loadReportes()`
- Reemplazado el cálculo manual roto por `resumen.total` (endpoint correcto, suma solo órdenes/reservas con `total IS NOT NULL`)

**Fix Bug 2** (`routes/reportes.js`):
- `fecha = date('now')` → `fecha = date('now', '-5 hours')`
- También corregidos `mes` y `semana` del resumen: `strftime(…, 'now')` → `strftime(…, 'now', '-5 hours')`
