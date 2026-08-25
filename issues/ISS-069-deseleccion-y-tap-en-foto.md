# ISS-069 — No se puede deseleccionar un plato del menú + tap en la foto no elige

**Estado:** Resuelto — 2026-08-25
**Reportado por:** el usuario, conversación de escritorio (no en visita de piloto)

## Problema 1 — no se puede deseleccionar un plato ya elegido

Dentro del modal de "elige tus platos" (`MenuModal`, usado en `menu.html` para pedir y
reservar), cada plato de una sección se renderiza como `<input type="radio">`. Un radio
nativo **no se puede desmarcar con un segundo tap** — es una limitación del elemento HTML,
no de la lógica. Una vez elegido un plato en una sección, incluso si esa sección es
**opcional**, no había forma de volver al estado "sin selección" salvo eligiendo otro plato
de la misma sección.

## Problema 2 — tocar la foto no selecciona el plato

En la misma fila (`<label class="plato-option">`), la miniatura (`.plato-thumb`) tenía su
propio `onclick` con `event.preventDefault();event.stopPropagation();openPhotoModal(...)`,
que interceptaba el tap y abría la foto ampliada en vez de dejar que el `<label>` seleccione
el radio. Varios comensales — sobre todo nuevos — tocan primero la foto (más grande, lado
derecho) en vez del radio (círculo pequeño, lado izquierdo), y terminaban viendo una foto
ampliada en lugar de elegir el plato.

## Causa raíz compartida

Al investigar el problema 1 se encontró que `render()` en `menu-modal.js` **nunca marcaba
el radio como `checked`** según la selección ya guardada (`seleccionActual` / `getSel()`).
Como `MenuModal.refresh()` reconstruye `.mm-body` con `innerHTML` completo tras cada
selección (ISS-066 lo agregó para reflejar el bloqueo de secciones en vivo), el radio recién
elegido perdía su marca visual en cada refresco — el estado interno (`sel[menuId][...]`)
quedaba correcto, pero visualmente no se notaba. Esto también rompía cualquier intento de
"tocar el mismo plato de nuevo para deseleccionar", porque el navegador ya no lo veía como
marcado tras el refresco.

## Fix

- `menu-modal.js` — el radio ahora recibe `checked` cuando `seleccionActual[seccion].id_componente`
  coincide con el plato, así el estado visual sobrevive a cada `refresh()`.
- `menu-modal.js` — el `<label>` de cada plato registra en `onpointerdown` si su radio ya
  estaba marcado (antes de que el click lo procese). Si el usuario vuelve a tocar esa misma
  fila (radio, texto o foto — toda la fila cuenta), el `onclick` del radio lo desmarca y llama
  a la nueva función `deselectMenuPlato()`.
- `menu.html` — nueva función `deselectMenuPlato(mode, menuId, seccionId)`: borra
  `sel[menuId][seccionId]` y refresca el modal. Mismo patrón que `selectMenuPlato`.
- `menu-modal.js` — se quitó el `onclick` de zoom en la foto para platos **elegibles**: ahora
  tocar la foto selecciona el plato, igual que el resto de la fila. La foto ampliada se queda
  igual para el menú fijo (`plato-fijo`, sin selección posible) y para la carta libre — ahí no
  hay conflicto porque no hay nada que elegir.

Sin cambios de backend. 34/34 test suites, 458/458 tests — sin regresión (cambios de frontend
puro, sin tests de UI para este flujo).

## Verificación pendiente

Sin probar todavía en un piloto real — verificar con un comensal nuevo que: (a) tocar la foto
de un plato lo selecciona, sin abrir ninguna foto ampliada; (b) tocar de nuevo un plato ya
elegido en una sección opcional lo deja "sin selección"; (c) el resumen del footer/carrito
refleja ambos casos correctamente.
