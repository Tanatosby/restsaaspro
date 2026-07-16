# ISS-022 — Service Worker sirve `owner.html`/`owner.css` viejos aunque el deploy sea correcto

**Módulo:** `public/sw.js` (PWA — todos los que hayan visitado `owner.html` alguna vez)
**Prioridad:** 🔴 Alta — explica por qué varios fixes recientes "no se veían" pese a estar deployados
**Estado:** ✅ Resuelto 2026-07-14

## Reporte original

El usuario reportó no ver la card nueva "🔤 Tamaño de letra" en Configuración tras el deploy de la sesión. Captura (`issue_texto.png`) mostrando `owner.html` con la card "Colores del tema" como última card visible — la nueva simplemente no existe en la página que le sirve el navegador.

## Diagnóstico

`public/sw.js` usa una estrategia **cache-primero** para los assets estáticos (línea 41-43): si la URL ya está en el Cache Storage, la sirve directo, **sin siquiera consultar la red**. El único mecanismo que refresca ese caché es el evento `install`, que el navegador dispara **solo cuando el contenido de `sw.js` mismo cambia** (comparación byte a byte que hace el navegador contra el `sw.js` ya registrado).

`const CACHE = 'menupro-v2'` no se tocó desde el commit `a4f8d7` (**2026-05-29**). Cualquier visita a `owner.html`/`menu.html` desde esa fecha dejó cacheada esa versión de `/owner.html` y `/css/owner.css` (están en `ASSETS`) de forma **permanente** para ese navegador — sin importar cuántos deploys posteriores se hicieran, hasta que el usuario borre manualmente los datos del sitio o desinstale/reinstale la PWA.

Esto probablemente explica retroactivamente por qué varios fixes de sesiones anteriores (ISS-016 a ISS-021, Gap 17, Gap 18) parecían "no funcionar" pese a estar bien deployados: el navegador del usuario nunca llegó a pedirle la versión nueva al servidor.

**Nota:** los módulos JS (`config.js`, `pedidos.js`, etc.) y la mayoría de assets **no** están en `ASSETS`, así que ese código sí se sirve fresco desde la red en cada visita — el problema es específico de `owner.html`, `menu.html`, `owner.css` y el manifest/íconos.

## Fix

- **`public/sw.js`**: `CACHE = 'menupro-v2'` → `'menupro-v3'`. Al cambiar el contenido del script, el navegador detecta la diferencia, instala el SW nuevo (que ya tiene `self.skipWaiting()`), borra el caché viejo en `activate` (`self.clients.claim()` ya presente) y vuelve a poblar `ASSETS` desde la red.

**Recomendación para el futuro:** bumpear `CACHE` en cada deploy que toque `owner.html`, `menu.html` o `owner.css` — o, mejor, migrar a una estrategia *network-first* (o *stale-while-revalidate*) para esos 3 archivos específicamente, ya que son los que cambian con más frecuencia y donde un usuario viendo contenido desactualizado causa más confusión (a diferencia de íconos/manifest, que casi no cambian).

## Verificación

Con Playwright: se simuló el escenario exacto del usuario — caché `menupro-v2` con un `owner.html` deliberadamente viejo (sin la card nueva), se registró el `sw.js` actual (con `CACHE='menupro-v3'`), y se confirmó que:
- El caché viejo (`menupro-v2`) se borra en `activate`.
- El caché nuevo (`menupro-v3`) queda poblado con el `owner.html` real, actualizado (contiene "Tamaño de letra").
- Tras recargar la página (con sesión de owner válida), el DOM real muestra los 3 botones `.font-scale-btn`.

**267/267 jest verde** (cambio de infraestructura de cacheo, sin lógica de negocio afectada).

## Pendiente

Desplegar este fix a producción (`git pull` + `pm2 restart menupro`) — y avisar al usuario que, además del deploy, probablemente necesite **cerrar y reabrir la PWA una vez** (o recargar `owner.html` dos veces seguidas) para que el navegador note el `sw.js` nuevo y purgue el caché viejo la primera vez.
