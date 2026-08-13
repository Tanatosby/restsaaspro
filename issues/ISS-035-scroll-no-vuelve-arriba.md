# ISS-035 — Al cambiar de panel el scroll no vuelve arriba: el botón "← Volver" nace fuera de pantalla

**Estado:** ✅ Resuelto (2026-08-12) · **Prioridad:** Alta (usabilidad móvil) · **Módulo:** `public/owner.html`

---

## Cómo apareció

Reportado por la **dueña del piloto #1** en una sesión de uso real. Se le pidió cambiar
las entradas de su menú a opcionales, y contó que entraba a Configuración de menú y
*"no me aparecen las fechas, me aparece directo el menú y los platos"*. No veía el botón
de volver: hubo que decirle **"subí un poquito, ahí está la flecha"**, y recién ahí la vio.

## El problema

No era que no lo viera. **El botón no estaba en pantalla.**

En todo `owner.html` no había **ni un solo** `scrollTo`, `scrollTop` ni `scrollIntoView`
(verificado con grep: 0 resultados). Ni `showPanel()` ni `switchTab()` reseteaban el
scroll. Al tocar otra sección estando scrolleada hacia abajo, el panel nuevo se renderiza
**con la vista en la misma posición**, y como el `← Volver` (`owner.html:255`) y el
stepper de 3 pasos están arriba de todo, quedan fuera del viewport.

En un celular, donde los paneles son largos, esto pasa **casi siempre**. Y tiene un efecto
secundario peor que no ver un botón: sin el stepper a la vista, no hay forma de saber que
el panel Menú del día tiene 3 pasos (1 Secciones → 2 Platos → 3 Menú del día) ni en cuál
se está parado. Las fechas viven en el paso 3.

## El detalle que casi hace fallar el fix

La corrección obvia es `window.scrollTo(0, 0)` — **y no habría hecho nada.**

El scroll no está en el documento: está en `.content`, que tiene `overflow-y: auto`
(`css/owner.css:322`). Se verificó además que en móvil sigue igual — dentro de
`@media (max-width: 768px)` (línea 598) `.content` solo cambia el `padding`, así que
hereda el `overflow-y` y **sigue siendo el contenedor que scrollea**.

## Solución

Nueva `scrollPanelArriba()` en `owner.html`, llamada desde `showPanel()` y `switchTab()`:

```js
function scrollPanelArriba() {
  const cont = document.querySelector('.content');
  if (cont) cont.scrollTop = 0;
  window.scrollTo(0, 0);   // fallback por si el scroll vuelve al documento
}
```

Actúa sobre el contenedor real y deja el `window.scrollTo()` como red de seguridad por si
el layout cambia en el futuro. Beneficia a **todos** los paneles, no solo al de menús.

## Service worker

`owner.html` está en el `ASSETS` precacheado de `sw.js`, así que **este fix no llega a los
celulares con la PWA instalada sin bumpear el caché**. Bumpeado a **`menupro-v8`** con su
nota. Es exactamente el escenario de ISS-022.

## Verificación

`grep` confirma `scrollPanelArriba` definida una vez (`owner.html:1280`) y llamada dos
(`:1298` en `showPanel`, `:1318` en `switchTab`). 406/406 jest verde.

**Verificado en celular real 2026-08-13** — el usuario confirmó: el scroll vuelve arriba
al cambiar de panel y la flecha "← Volver" aparece con claridad. El bump a `menupro-v8`
sí llegó a la PWA instalada. Issue cerrado por completo.
