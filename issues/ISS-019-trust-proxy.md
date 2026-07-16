# ISS-019 — `trust proxy` no configurado — rate-limiter falla en casi cada request

**Módulo:** `app.js` (infraestructura)
**Prioridad:** 🔴 Alta (infra)
**Estado:** ✅ Resuelto 2026-07-13

## Reporte original

Al revisar `pm2 logs menupro --err` en producción (a pedido, para diagnosticar ISS-021) apareció el error `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` repetido en casi cada request registrada.

## Diagnóstico

El servidor corre detrás de Nginx (`deploy.md §6.2`, `proxy_pass http://localhost:3000` + `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`), pero `app.js` nunca configuraba `app.set('trust proxy', ...)`. Sin eso, Express no confía en el header `X-Forwarded-For` que Nginx agrega, y `express-rate-limit` no puede identificar la IP real de cada cliente — lanza esta validación en cada request que pasa por `limiterGeneral`/`limiterAuth`.

## Fix

`app.js` — agregado `app.set('trust proxy', 1)` justo después de crear la instancia de `express()`, antes de los rate-limiters.

## Verificación

Servidor local con `curl -H "X-Forwarded-For: 190.116.65.70" http://localhost:3311/api/public/restaurante/1` → `200 OK`, **0 ocurrencias** de `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` en el log (antes aparecía en casi cada request). **254/254 jest verde.** Pendiente: desplegar a producción.
