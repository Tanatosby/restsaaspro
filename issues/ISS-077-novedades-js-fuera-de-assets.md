# ISS-077 — `novedades.js` no está en el precache del service worker

**Estado:** Diagnosticado, sin implementar — 2026-08-26
**Reportado por:** hallazgo propio, al correr `scripts/test-version-assets.js` mientras se
verificaba un cambio no relacionado (cambio de nombre del restaurante).

## Problema

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
misma versión a la vez).

**No es la causa** de la confusión del usuario el 2026-08-25 sobre el modal de novedades
(esa se explica por el `stale-while-revalidate` de los HTML, ver conversación del 2026-08-26 en
`status.md`) — es un descuido separado que salió a la luz de casualidad al correr el script de
verificación por otro motivo.

## Fix propuesto (sin implementar)

Agregar `v('/js/modules/novedades.js')` al array `ASSETS` en `public/sw.js`, junto al resto de
los módulos.

## Pendiente

- Aprobación del usuario para implementar (fuera del alcance de la sesión que lo encontró).
- Tras el fix, volver a correr `scripts/test-version-assets.js` (server local en `PORT=3311`)
  para confirmar las 25/25.
