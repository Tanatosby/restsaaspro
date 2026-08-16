# ISS-038 — Modal de zoom de foto aparece tapado al elegir platos de un menú

**Estado:** ✅ Resuelto (2026-08-13) · **Prioridad:** Media (usabilidad móvil) · **Módulo:** `public/menu.html`, `public/css/menu.css`

---

## Cómo apareció

Reportado por el usuario probando el flujo de reservas/pedidos: al elegir los platos de un
menú del día (paso "elige tus platos"), tocar la foto de un plato no mostraba el zoom
sobre la pantalla — "por debajo". Recién al tocar "Agregar pedido" aparecía el fondo negro
con la foto del plato.

## El problema

El paso "elige tus platos" lo muestra el widget `MenuModal` (`public/js/widgets/menu-modal.js`)
como una hoja bottom-sheet (`.mm-overlay`), con **`z-index: 1500`**. Dentro de esa hoja,
cada plato con foto (`plato-thumb`) llama a `openPhotoModal(...)` al tocarla, que abre
`#photo-modal` — pero ese modal tenía **`z-index: 110`** (`menu.css`).

`110 < 1500`: el modal de foto sí se abría (`classList.add('open')`, `display: flex`),
pero quedaba **apilado detrás** de la hoja de selección, que sigue cubriendo toda la
pantalla por encima. Al tocar "Agregar pedido", `MenuModal.close()` oculta la hoja
(`display: none`) — y como el modal de foto seguía abierto sin que nadie lo hubiera
cerrado, recién ahí se hacía visible.

## Solución

Subido el `z-index` de `.photo-modal` de `110` a **`1600`** (`menu.css:757`) — por encima
de `.mm-overlay` (1500), el único otro overlay que carga `menu.html` (solo incluye
`menu-modal.js`; los demás widgets con z-index alto — `plato-picker.js` 1400,
`photo-editor.js` 1200, `form-modal.js` 1300 — son de `owner.html`, no de esta pantalla).

## Verificación

Nuevo script `scripts/test-photo-modal-zindex.js` (Playwright, no jest) — abre `MenuModal`
con datos sintéticos, simula el tap en la foto de un plato (igual que el flujo real) y
verifica con `document.elementFromPoint()` que el elemento visible en el centro de
pantalla pertenece a `#photo-modal`, no a `.mm-sheet`. **6/6 verde.** Además confirma que
cerrar solo la foto no afecta a `MenuModal` (sigue abierto).

`npx jest tests/`: **408/408 verde** (cambio de CSS puro, sin tocar backend).

**Verificado en producción 2026-08-13** — el usuario confirmó visualmente: la foto del
plato aparece arriba de la hoja de selección, ya no queda tapada. Issue cerrado por
completo.
