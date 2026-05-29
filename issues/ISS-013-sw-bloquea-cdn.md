# ISS-013 — Service worker rompe CDN/fuentes cross-origin (landing sin estilos)

- **Módulo:** PWA / Service Worker (`public/sw.js`)
- **Fecha:** 2026-05-29
- **Estado:** ✅ Resuelto
- **Prioridad:** Alta (afecta la cara pública del producto y potencialmente owner/menu para usuarios recurrentes)

## Síntoma

La landing (`/`) se ve **completamente sin estilos** (HTML crudo: links azules, fuente serif por defecto, sin layout) en el navegador del usuario. En un navegador limpio (sin haber entrado nunca a la app) se ve perfecta.

Captura del usuario: `para_test3.png`.

## Diagnóstico

Reproducido con Playwright headless:

- **Navegador limpio (sin SW):** landing renderiza OK — botón terracota `rgb(200,105,42)`, nav `flex`, Tailwind inyectado. ✅
- **Tras visitar `/login` (que registra `/sw.js` con scope `/`) y luego ir a `/`:** el SW controla la landing y la consola muestra:
  ```
  [reqfail] https://cdn.tailwindcss.com/ :: net::ERR_FAILED
  [pageerror] tailwind is not defined
  [reqfail] https://fonts.googleapis.com/css2?... :: net::ERR_FAILED
  ```
  Tailwind no carga → página sin estilos.

### Causa raíz

El handler `fetch` de `sw.js` interceptaba **todas** las peticiones (incluidas las cross-origin) y las reenviaba con `fetch(e.request)`. Al reenviar peticiones cross-origin `no-cors` (Tailwind CDN, Google Fonts, Chart.js, etc.), fallan con `net::ERR_FAILED`.

Como el SW se registra con scope `/` desde `login.html`, `owner.html` y `menu.html`, una vez que el usuario entró **una sola vez** a cualquiera de esas páginas, el SW queda controlando **todo el origen**, incluida la landing pública. Por eso fallaba en el navegador del usuario pero no en uno limpio.

Riesgo extendido: owner.html (Chart.js + Google Fonts) y menu.html (Fraunces/DM Sans de Google Fonts) podían sufrir el mismo fallo para usuarios recurrentes.

## Solución

En `public/sw.js`:

1. **Ignorar peticiones cross-origin** — dejar que vayan directo a la red sin que el SW las toque:
   ```js
   if (url.origin !== self.location.origin) return;
   ```
2. Bump de `CACHE` `menupro-v1` → `menupro-v2` para que el handler `activate` purgue la caché vieja y el SW nuevo tome control limpio.

Verificado con Playwright tras el fix: con el SW activo y controlando la landing, Tailwind se inyecta, botón terracota, nav flex, **sin `ERR_FAILED`**.

## Nota para el usuario

El navegador que ya tenía el SW v1 activo se autocorrige al recargar (el SW nuevo usa `skipWaiting()` + `clients.claim()`). Si persiste: DevTools → Application → Service Workers → *Unregister*, o recargar con caché vacía.
