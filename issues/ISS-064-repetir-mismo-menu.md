# ISS-064 — Pedir 2 menús idénticos exigía reabrir el picker y volver a elegir todo

**Estado:** ✅ **Resuelto 2026-08-24.**
**Módulo:** `public/menu.html`, `public/css/menu.css` (carrito de "Pedir" y de "Reservar").
**Prioridad:** 🟡 Media.
**Origen:** piloto #1, Día 9 (2026-08-22), reportado por el usuario el 2026-08-24. Mockup
aprobado antes de implementar.

---

## Diagnóstico

`agregarMenu()` empuja cada menú como una fila nueva del carrito, sin campo de cantidad. Pedir 2
menús idénticos (mismo tipo, misma selección de platos) obligaba a reabrir `MenuModal` y volver
a marcar cada sección obligatoria desde cero — a diferencia de la carta, que ya tiene un stepper
(`+`/`−`) para repetir un plato.

Restricción técnica real: cada fila del carrito es un "grupo" (ISS-041) — necesario para que
cocina sepa qué entrada va con qué segundo de cada menú. No se podía resolver con un simple
campo `cantidad` en la fila sin romper esa numeración.

## Solución implementada

Cada unidad **sigue siendo su propia fila** en `cart`/`resCart` (compatible con ISS-041 sin
tocar el backend) — lo que cambia es la capa visual:

- `agruparMenusCarrito(cartArr)`: agrupa filas de `type: 'menu'` con igual `label` + `subLabel` +
  `modalidad` (la carta no se agrupa, sigue una fila por línea).
- `duplicarMenuEnIdx(mode, idx)` / `quitarUnidadEnIdx(mode, idx)`: suman/restan una unidad,
  clonando (`clonarItemCarrito`) e insertando justo después del original para que
  `numerarGrupos()` mantenga las unidades contiguas.
- **Atajo al agregar:** `mostrarAtajoRepetirMenu(mode, item)` — un toast con botón interactivo
  "+1 mismo menú" (a diferencia de `showMsg()`, que es mudo/`pointer-events:none`) que aparece 4.5s
  y reemplaza al toast simple "¡Menú agregado!". Guarda la referencia al ítem, no el índice, por
  si el carrito cambia de orden mientras el atajo sigue visible.
- **Stepper en el carrito:** cada grupo de menús idénticos se pinta en una sola fila con
  contador (`.menu-stepper`, botones 44×44px — regla mobile-first) en vez de filas repetidas.
  Aplica igual en `#drawer-items` (Pedir) y `#res-cart-items` (Reservar).
- `toggleModalidadGrupo()`: el chip de modalidad de una fila agrupada mueve las N unidades juntas,
  no solo la primera (antes solo existía `toggleModalidadItem()` por índice individual).

Precio, tapper y numeración de grupos siguen calculándose sobre el `cart`/`resCart` plano
(sin cambios) — el agrupado es puramente de render.

## Verificación

454/454 jest. E2E nuevo: `scripts/test-repetir-menu.js` (17/17) — cubre el atajo al agregar, el
agrupado visual, el stepper +/−, que el payload real (`numerarGrupos`) arma 2 grupos completos y
no uno mezclado, y que el mismo comportamiento aplica en Reservar. Sin regresiones en
`test-modalidad-mixta.js` (19/19 — 2 menús con selecciones distintas siguen sin agruparse) ni en
`test-grupo-punta-a-punta.js` (13/13 — numeración de grupos en el backend, sin cambios).
