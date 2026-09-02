# ISS-084 — Tocar la foto del menú no agregaba + botón de letra "A" no se entendía

**Estado:** ✅ Resuelto — 2026-09-02
**Módulo:** `public/menu.html`, `public/css/menu.css`
**Prioridad:** 🟡 Media — fricción de descubribilidad en la carta del cliente, no bloquea.

---

## Reporte del usuario (día 15 del piloto — recopila lunes 31/08 y martes 01/09)

1. **Foto del menú:** *"cuando piden presionan la foto del menú e intentan algunas veces, y
   luego recién hacer el clic de +"*. En el flujo de "Pedir" (ISS-080, cantidad primero) la
   foto del menú no hacía nada al tocarla; los comensales la tocan igual —es lo más grande de
   la tarjeta— antes de encontrar el botón `+`.
2. **Botón de tamaño de letra:** *"la A para cambiar letra no se entendía, que mejor se
   pusiera (Aumentar letra) en vez de solo A"*. El botón de ISS-057 era una `A` que solo crecía
   de tamaño, sin texto.

---

## Diagnóstico

- `renderMenuDiaCard(m, 'pedir')` no ponía ningún handler en `.menu-dia-photo`. Solo el
  stepper `+/−` (`cambiarCantidadMenuPedir`) cambiaba la cantidad.
- `#btn-font-scale` tenía `textContent` fijo `A`; `pintarBotonFontScale()` solo ajustaba
  `font-size` y el `aria-label`. Nunca decía qué hacía.

**Decisión de diseño (evaluada con un prototipo interactivo antes de codear):** tocar la foto
**suma 1**, NO abre el picker. Abrir el picker en el tap reacoplaría lo que ISS-080 separó a
propósito (era la causa de perder pedidos a mitad de armar), e ISS-080 todavía no está validado
en servicio real.

## Solución

- `menu.html` — `renderMenuDiaCard(m, 'pedir')`: `.menu-dia-photo` pasa a `role="button"`
  `tabindex="0"` con `onclick`/`onkeydown` → `agregarMenuDesdeFoto(m.id, this)`, que llama a
  `cambiarCantidadMenuPedir(m.id, 1)` y dispara un "+1" flotante. El zoom de la foto pasa a un
  botón `🔍` en la esquina (antes en Pedir no había zoom). El stepper `+/−` queda igual. Rama
  `'reservar'` **sin cambios**.
- `menu.html` — `mostrarMasUnoMenu()`: el "+1" se ancla con `position:fixed` (calculado desde
  `getBoundingClientRect`) porque `renderPedirContent()` destruye la card enseguida. Respeta
  `prefers-reduced-motion`.
- El primer `+1` (mientras no hay ninguna unidad configurada) hace latir el botón
  "Elegir opciones (n)" (`.btn-add-menu--pulse`, 2 iteraciones) para empujar al siguiente paso.
- `menu.html` — `pintarBotonFontScale()`: el botón ahora muestra `🔤 Aumentar letra`, y en el
  nivel máximo `🔤 Volver a normal` (el próximo toque vuelve a Normal). Se quitó el crecimiento
  de `font-size` del propio botón.
- `menu.css` — `.btn-font-scale` pasó de círculo fijo 44×44 a pill de ancho automático con
  alto mínimo 44 y `font-size` fijo (`.field input`-friendly). Nuevas clases
  `.menu-dia-photo--add` / `.menu-dia-zoom` / `.menu-dia-add-hint` / `.menu-dia-plusone` /
  `.btn-add-menu--pulse`, todas con su bloque `prefers-reduced-motion`.

Sin cambios de backend. El versionado de assets (BUILD por hash, T0) recoge `menu.html` y
`menu.css` solo.

## Verificación

- `scripts/test-ya-pago-foto-buscador.js` nuevo (25/25) — parte C: `renderMenuDiaCard(m,'pedir')`
  produce `menu-dia-photo--add` + `agregarMenuDesdeFoto(99, this)` + `🔍`, conserva el stepper, y
  `'reservar'` sigue abriendo el picker. Parte D: el botón arranca en "🔤 Aumentar letra", en el
  máximo dice "🔤 Volver a normal", y al ciclar vuelve a "🔤 Aumentar letra" con `--font-scale` = 1.
- 478/478 jest sin regresiones.
- `scripts/test-pedir-cantidad-primero.js` no se pudo correr en la BD local (no hay un menú del
  día "usable" —secciones obligatorias con platos— para hoy); el comportamiento de
  `renderMenuDiaCard` queda cubierto por el test nuevo.

## Relacionado

Ajuste sobre ISS-080 (flujo de Pedir) e ISS-057 (letra ajustable en la carta del cliente).
