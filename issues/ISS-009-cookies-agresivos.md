# ISS-009 — Panel "Cola del día" queda en "Cargando…" con JWT expirado

**Estado:** Resuelto — 2026-05-23
**Módulo:** Cola del día / Auth
**Prioridad:** Alta
**Capturas:** cola_no_cargaba.png

---

## Descripción

Al ingresar al panel "Cola del día", quedaba bloqueado en "Cargando…" indefinidamente. El usuario tuvo que borrar cookies y cerrar la página para recuperar el acceso. La consola mostraba errores de extensión de browser (SES/MetaMask) y el panel nunca mostraba un mensaje de error claro.

## Causa raíz

`api()` en `utils.js` lanzaba un `throw` genérico ante cualquier error de servidor, pero **no tenía manejo específico de HTTP 401**. Con un JWT expirado o corrompido, el servidor retorna 401 en todas las llamadas. El `catch` del panel debería mostrar el error, pero la combinación de extensión agresiva del browser (SES removiendo intrinsics) y el estado de carga inicial dejaba el panel en "Cargando…" sin feedback visible.

La solución "borrar cookies" funcionó porque forzó un re-login con un JWT válido.

## Archivos a tocar

- `public/js/modules/utils.js` — función `api()`

## Solución aplicada

**2026-05-23 — `utils.js`:**
- `api()` detecta `res.status === 401` antes de parsear el JSON
- En caso de 401 ejecuta `window.location.replace('/login.html')` inmediatamente
- Evita que el panel quede en estado de carga silencioso cuando la sesión expira
- Aplica a todos los módulos que usan `api()` (utils.js es compartido)
