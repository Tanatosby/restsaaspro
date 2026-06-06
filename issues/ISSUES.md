# Issues — Menú Pro

## Abiertos

| ID | Título | Módulo | Reproducible | Prioridad |
|----|--------|--------|--------------|-----------|
| [ISS-015](ISS-015-foto-plato-menu-error.md) | La foto de un plato no se actualiza en pantalla tras "Cambiar foto" (caché por nombre de archivo fijo) | Menú del día / Carta | Sí | Alta |




## En análisis

_(vacío)_

## Fix pendiente (diagnosticado, sin implementar)

_(vacío)_

## Resueltos

| ID | Título | Fecha resolución | Solución |
|----|--------|-----------------|---------|
| [ISS-014](ISS-014-reporteria-owner.md) | Revenue Total y Ganancia de hoy siempre S/0.00 en reportería | 2026-06-03 | Bug 1: `GET /api/orders` no devuelve `es_pagado` → filtro siempre vacío → revenue = 0. Fix: usar `resumen.total` de `/api/reportes/ganancias/resumen`. Bug 2: `date('now')` en SQLite usa UTC, fechas en BD usan Lima (UTC-5) → ganancia de hoy = 0 después de 19h. Fix: `date('now', '-5 hours')` en resumen/mes/semana. |
| [ISS-013](ISS-013-sw-bloquea-cdn.md) | Service worker rompe CDN/fuentes cross-origin (landing sin estilos) | 2026-05-29 | `sw.js` interceptaba peticiones cross-origin y las reenviaba con `fetch(e.request)` → `ERR_FAILED` en Tailwind CDN / Google Fonts. Fix: `if (url.origin !== self.location.origin) return;` para no tocar cross-origin + bump cache `v1`→`v2`. Afectaba landing y potencialmente owner/menu para usuarios recurrentes. |
| [ISS-010](ISS-010-orden-cocina.md) | Orden incorrecto en panel Cocina — Pendientes antes que En preparación | 2026-05-23 | Render reordenado en `cocina.js`: En preparación → Reservas en prep → Pendientes |
| [ISS-009](ISS-009-cookies-agresivos.md) | Panel "Cola del día" queda en "Cargando…" con JWT expirado | 2026-05-23 | `api()` en `utils.js` detecta 401 y redirige a `/login.html` automáticamente |
| [ISS-008](ISS-008-reserva-no-pasa-a-cocina.md) | Reserva no aparece en cola de cocina al pasar a "En preparación" | 2026-05-23 | `cocina.js` fetcha `GET /api/reservations?flag=es_en_cocina` en paralelo; nueva sección + `renderCocinaReserva()` + `marcarReservaListaCocina()` |
| [ISS-007](ISS-007-kitchen-no-eliminado.md) | kitchen.html no eliminado + cocinero a página en blanco + falta permiso Cocina | 2026-05-23 | login.html redirect corregido; kitchen.html → redirect; permiso `cocina` en PERMISOS_DEF; guard extendido para rol cocinero |
| [ISS-006](ISS-006-eleccion-+status-reserva.md) | Solo dos estatus en reservas — flujo incompleto | 2026-05-23 | Agregados flags intermedios al SELECT; `loadReservasActivas` fetcha 5 estados; botones completos en tarjetas |
| ISS-012 | Usuarios con permiso de reservas/órdenes reciben 403 al cambiar estatus | 2026-05-25 | `authorize('owner','mozo')` reemplazado por `authorizePermiso()` en 7 endpoints de `reservations.js` y `orders.js`. Afectaba: PATCH estatus, PATCH mesa, PATCH confirmar-pago (reservas); PATCH estatus, PATCH confirmar-pago, GET queue, PUT kitchen (órdenes). |
| [ISS-002](ISS-002-pago-plin.md) | Botón "Ya pagué con Plin/Yape" deshabilitado en segunda transacción | 2026-05-27 | `showPagoStep()` ocultaba el botón pero no reseteaba `disabled`. En una segunda orden de la misma sesión, el botón aparecía con `disabled=true`. Fix: `btnPague.disabled = false` en `showPagoStep()` + en cada rama de `seleccionarMetodoPago()`. |
| [ISS-012-admin](ISS-012-admin.md) | Admin: Revenue S/0.00 en tabla + gráficas Demanda/Ganancias vacías | 2026-05-26 | Chart.js faltante en dashboard.html; revenue calculaba solo carta omitiendo menú del día y reservas. |
| [ISS-011](ISS-011-security-policy.md) | Console Issues: CSP eval() + 27 "No label" en form fields | 2026-05-25 | 27 inputs/selects con `<label>` sin `for` corregidos en `owner.html` y `menu.html` (añadido `for="id"` en todos). Inputs sin label: `aria-label` añadido. eval() es de QRCode.js CDN — documentado en `deploy.md` sección 8.2 (CSP Helmet con `'unsafe-eval'` para esa CDN). |
| [ISS-005](ISS-005-uploads-missing-dirs.md) | ENOENT al subir foto de plato en laptop nueva | 2026-05-22 | `mkdirSync` en arranque de `routes/menu.js` para las 3 subcarpetas de uploads |
| [ISS-004](ISS-004-bom-encoding.md) | Caracteres corruptos en owner.html tras edición con PowerShell | 2026-05-22 | PowerShell 5.1 `Set-Content -Encoding utf8` agrega BOM — re-guardado con `[System.Text.UTF8Encoding]::new($false)` |
| [ISS-001](ISS-001-pago-plin.md) | Confirmar pago con Plin falla a veces (owner.html) | 2026-05-21 | Eliminado el doble mecanismo: botón "Confirmar pago" removido de tarjetas; al pasar a `es_full`/`es_pagado` el backend setea `estado_pago='pagado'` automáticamente (REFACTOR-001) |
| [ISS-003](ISS-003-estatus-flag-500.md) | PATCH estatus con flag retorna 500 (órdenes y reservas) | 2026-05-21 | Eliminado `AND id_restaurante IS NULL` inválido de 3 queries en `orders.js` y `reservations.js` |

---

## Refactors pendientes

| ID | Título | Estado |
|----|--------|--------|

## Refactors cerrados

| ID | Título | Fecha cierre |
|----|--------|--------------|
| [REFACTOR-001](REFACTOR-001-estatus-dinamicos.md) | Estatus dinámicos por flags (bloqueante para pagos) | 2026-05-21 ✅ |
