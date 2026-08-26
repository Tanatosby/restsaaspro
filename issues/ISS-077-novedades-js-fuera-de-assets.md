# ISS-077 — Módulos JS fuera del precache del service worker

**Estado:** Diagnosticado, sin implementar — 2026-08-26 (extendido el mismo día, segundo caso)
**Reportado por:** hallazgo propio, al correr `scripts/test-version-assets.js` mientras se
verificaba un cambio no relacionado (cambio de nombre del restaurante).

## Caso 1 — `novedades.js` (owner.html)

`public/js/modules/novedades.js` (ISS-076, `mostrarNovedadesSiHay()`) no está en el array
`ASSETS` de `public/sw.js`, a diferencia de los otros 18 módulos JS de `owner.html`. El propio
`scripts/test-version-assets.js` ya tiene un chequeo que lo detecta:

```
❌ los 19 scripts locales de owner.html están en ASSETS → faltan: /js/modules/novedades.js
```

Efecto: `novedades.js` no se precachea junto con el resto. Cuando el fetch handler del SW no
encuentra una copia en caché, pasa directo a la red (`caches.match(e.request).then(cached =>
cached || fetch(e.request))`), así que el módulo siempre depende de la conexión en ese momento
— pierde la garantía que sí tienen `utils.js`, `cocina.js`, etc. de servirse desde el precache
sin ir a la red (la misma garantía que evita el bug de ISS-044: todos los módulos piden la
misma versión a la vez). El script sí lleva `?v=<BUILD>` en `owner.html`, así que al menos no
puede quedar una copia vieja sirviéndose para siempre — solo pierde la garantía de "sin red".

**No es la causa** de la confusión del usuario el 2026-08-25 sobre el modal de novedades
(esa se explica por el `stale-while-revalidate` de los HTML, ver `status.md` 2026-08-26) — es un
descuido separado que salió a la luz de casualidad al correr el script de verificación por otro
motivo.

## Caso 2 — `charts-theme-admin.js` (admin/dashboard.html) — más grave

Al comparar **todos** los módulos JS en disco (`public/js/modules/` + `public/js/widgets/`)
contra `ASSETS`, apareció un segundo faltante: `js/modules/charts-theme-admin.js`, cargado por
`public/admin/dashboard.html:11`.

Este caso es distinto y peor:

1. **`admin/dashboard.html` no registra el service worker.** No hay `navigator.serviceWorker
   .register(...)` en ese HTML — el admin no es una PWA, nunca lo fue. El array `ASSETS` de
   `sw.js` es irrelevante para esta página específica; agregar el archivo ahí no resolvería nada
   porque el SW nunca intercepta sus requests.
2. **El script se pide sin `?v=`:**
   ```html
   <script src="/js/modules/charts-theme-admin.js"></script>
   ```
   A diferencia de todo lo versionado en `owner.html`/`menu.html`, no hay cache-busting. Depende
   enteramente de los headers `Cache-Control` que Express le ponga a los estáticos (no
   investigado en este hallazgo) y del caché HTTP del navegador — el mismo mecanismo de fondo
   que causó ISS-044, pero en una página que no tiene ninguna de las mitigaciones que ya se
   aplicaron ahí (ni versión en la URL, ni precache, ni revalidación).
3. **Impacto:** un cambio en `charts-theme-admin.js` (colores/tema de los gráficos del
   dashboard) podría no reflejarse en el navegador del usuario hasta un hard refresh o que el
   caché HTTP expire por su cuenta. Menor severidad que ISS-044 (el admin lo usa solo el
   usuario, no la dueña en producción, y no hay riesgo de "parece que se perdieron los datos"),
   pero mismo patrón de causa raíz sin resolver.

## Fix propuesto (sin implementar)

- Caso 1: agregar `v('/js/modules/novedades.js')` al array `ASSETS` en `public/sw.js`.
- Caso 2: agregar `?v=<BUILD>` al `<script>` de `charts-theme-admin.js` en
  `admin/dashboard.html` (requiere que `app.js` inyecte `__BUILD__` también en ese HTML, a
  revisar si ya lo hace). El SW no aplica acá salvo que se decida registrar uno para el admin
  también — evaluar si vale la pena o si alcanza con el `?v=`.

## Confirmado tras revisar `app.js`

`admin/dashboard.html` **no** está en `PLANTILLAS` (`app.js:99-104`) — no recibe reemplazo de
`__BUILD__` ni el header `Cache-Control: no-cache` que sí llevan `owner.html`/`menu.html`/
`pensionista.html`/`sw.js`. Se sirve como estático plano vía `express.static(public/)`
(`app.js:135`), **sin `maxAge` configurado** en ese bloque (a diferencia de `/uploads`, que sí
tiene `maxAge: '1y'`). Sin `maxAge` explícito, `serve-static` no fija un `Cache-Control`
agresivo — el navegador revalida por heurística (`Last-Modified`/`ETag`), no lo trata como
"fresco" por mucho tiempo. **Esto baja la severidad real** respecto a lo que el patrón de
ISS-044 sugeriría: la ventana de servir una copia vieja es más corta, aunque sigue sin la
garantía dura que da el `?v=` explícito.

## Pendiente

- Aprobación del usuario para implementar (fuera del alcance de la sesión que lo encontró).
- Tras el fix del caso 1, volver a correr `scripts/test-version-assets.js` (server local en
  `PORT=3311`) para confirmar las 25/25. El caso 2 no está cubierto por ese script — habría que
  extenderlo o verificar a mano.
