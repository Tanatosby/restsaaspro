# ISS-012 — Admin: revenue S/0.00 y gráficas de Demanda/Ganancias en blanco
**Estado:** Resuelto
**Módulo:** Admin Dashboard
**Prioridad:** Alta
**Capturas:** issue_admin_demanda.png, issue_admin_demanda_2.png, issue_admin_demanda_3.png
---

## Descripción

El panel admin presentaba tres problemas:
1. La tabla de restaurantes mostraba S/ 0.00 en la columna Revenue aunque el restaurante sí tenía ventas.
2. Las pestañas Demanda y Ganancias del drawer lateral aparecían completamente vacías (sin gráfica).
3. El Overview (stats globales) también mostraba revenue incorrecto.

## Causa raíz

**Bug 1 — Chart.js no incluido:**
`dashboard.html` importaba QRCode.js pero no Chart.js. Las funciones `cargarDemanda()` y `cargarGanancias()` hacían `new Chart(...)` con `Chart` indefinido → error silencioso capturado solo con `console.error`.

**Bug 2 — Lógica de revenue inconsistente:**
El endpoint `GET /api/admin/restaurantes` calculaba revenue sumando `orden_carta_items.precio_unitario * cantidad` (solo carta, solo órdenes con `es_pagado=1`). El endpoint del drawer usaba `sumarGanancias()` que suma `ordenes.total + reservas.total` (carta + menú del día + reservas). Discrepancia: S/0.00 en tabla vs S/460.00 en drawer para el mismo restaurante.

**Bug 3 — Mismo error en stats globales:**
`GET /api/admin/stats` usaba el mismo subquery de `orden_carta_items`, omitiendo menú del día y reservas.

## Archivos modificados

- `public/admin/dashboard.html` — agregar `<script>` de Chart.js CDN
- `routes/admin.js` — `GET /stats`: reemplazar revenue con `SUM(ordenes.total) + SUM(reservas.total)`
- `routes/admin.js` — `GET /restaurantes`: mismo reemplazo en el subquery de revenue

## Solución aplicada

1. Agregado `chart.js@4.4.0` (jsdelivr CDN) en el `<head>` de `dashboard.html`.
2. Revenue en tabla y overview ahora usa `SUM(o.total)` + `SUM(rv.total)`, consistente con `sumarGanancias()` que ya usaba el drawer.
3. `ordenesHoy` corregido para usar `fecha = ?` en vez de `DATE(created_at) = ?` (consistencia con el resto del sistema).
