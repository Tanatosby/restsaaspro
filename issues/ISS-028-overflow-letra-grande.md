# ISS-028 — Scroll horizontal en el panel al agrandar la letra

**Estado:** ✅ Resuelto — 2026-08-10
**Módulo:** `public/owner.html`, `public/css/owner.css`
**Prioridad:** 🟡 Media-Alta — afectaba a producción sin haber sido reportado

---

## Cómo apareció

No fue un reporte del usuario: apareció al medir, antes de subir la escala tipográfica pedida en el
punto 3.1 del backlog ("la letra más grande aún"). La medición con Playwright a 360px sobre 10 paneles
× 8 escalas mostró que **el techo no era el espacio disponible, sino dos bugs de layout ya presentes**.

El más grave ya estaba activo en producción: **quien eligiera el nivel "Grande" (1.15×) tenía scroll
horizontal en Configuración** — precisamente la pantalla donde vive el control de tamaño de letra.

---

## Diagnóstico

### 1. Bloque "Link del menú" + QR (Configuración) — desde 1.15×

```html
<div style="display:flex;flex-direction:column;...">   <!-- sin min-width:0 -->
  <label>Link del menú</label>
  <input style="flex:1;min-width:0">
  <button class="btn btn-ghost btn-sm">Copiar</button>
  <button class="btn btn-primary btn-sm">⬇ Descargar PNG</button>
</div>
```

El contenedor de la columna derecha es un flex item **sin `min-width: 0`**. Su ancho quedaba fijado por
el contenido más largo (`⬇ Descargar PNG`) y nunca encogía, aunque el input de adentro sí tuviera
`min-width: 0`. Medido: 386px de ancho en un viewport de 360px a 1.4× (+68px de desborde).

### 2. `.page-title` del topbar — desde 1.4×, en TODOS los paneles

```css
.page-title { ...; flex: 1; }   /* sin min-width: 0 */
```

Mismo mecanismo: un flex item con `flex: 1` **no encoge por debajo de su min-content**. Con la letra
grande, el título ("Configuración", "Cola del día") empujaba el hamburger, el toggle de tema y el de
sonido fuera de la pantalla. Como el topbar es `sticky` y siempre visible, rompía todos los paneles.

Agravante: `padding: 0.8rem 1.6rem` en `rem` — el padding crecía con la letra, comiéndose el ancho
disponible justo cuando más falta hacía.

---

## Solución

- **Configuración:** `flex: 1 1 200px; min-width: 0` en la columna del QR, `flex-wrap: wrap` en la fila
  del input, `max-width: 100%` en el botón de descarga.
- **Topbar:** `min-width: 0` + `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` en
  `.page-title` — ahora el título se corta con puntos suspensivos en vez de desbordar. El corte no
  pierde información: cada panel repite su nombre en el `.sec-title`, en grande, justo debajo.
- **Topbar en móvil:** `padding: 0.8rem 0.75rem; gap: 0.5rem` dentro de `@media (max-width: 768px)`,
  desacoplado del tamaño de letra.

---

## Falsos positivos descartados

La primera medición señaló también los tabs, el carrusel de Home y la tabla de Usuarios. Una segunda
pasada — que comprueba si la página **efectivamente se desplaza** (`window.scrollTo(80,…)` y verificar
`scrollX > 0`) en vez de confiar solo en `scrollWidth`, e ignora los elementos cuyo ancestro tiene
`overflow-x: auto` con contenido desbordado — mostró que los tres ya estaban resueltos:

| Elemento | Por qué NO era un bug |
|---|---|
| `.tab` (Órdenes/Reservas) | `.tabs` ya tiene `overflow-x: auto` (`owner.css:348`) |
| `.home-card` | Carrusel horizontal intencional con `scroll-snap-align` |
| `<table>` de Usuarios | Ya vive dentro de `.table-wrap { overflow-x: auto }` (`owner.css:419`) |

Sin esa segunda medición se habrían "arreglado" tres cosas que funcionaban bien.

---

## Verificación

`scripts/test-escala-tipografica.js` (nuevo, Playwright, fuera de jest) — **14/14 verde**:

- 3 niveles × 13 paneles: ninguno produce scroll horizontal real a 360px.
- Touch targets ≥ 44px y inputs ≥ 16px (anti-zoom de iOS) en la escala máxima.
- Persistencia de la preferencia tras recargar y botón activo correcto.
- 4 casos de migración desde el esquema viejo.

Capturas visuales de Cola del día y Configuración a 1,7× revisadas — entra todo, sin recortes.

---

## Relacionado

Se resolvió junto con la subida de escala a **1,15 / 1,4 / 1,7 (16,1 / 19,6 / 23,8px)**, que es lo que
había pedido el usuario. Sin estos dos fixes, subir la escala habría empeorado el problema en vez de
ayudar.
