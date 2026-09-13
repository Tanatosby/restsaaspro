# ISS-092 — `test-agregar-manual.js` y un comentario de `pedidos.js` quedaron en la versión vieja del modal manual

**Estado:** ✅ Resuelto el 2026-09-13 — se arregló junto con el bug del nombre obligatorio, que vive
en el mismo modal
**Encontrado:** 2026-09-12, validando ISS-090 (el script es uno de los E2E que se corrieron para
comprobar que no hubiera regresión)
**Módulo:** `scripts/test-agregar-manual.js` · comentario en `public/js/modules/pedidos.js`
**Prioridad:** 🟢 Baja — deuda de tests y de comentarios, ningún usuario lo ve

---

## Qué pasa

`scripts/test-agregar-manual.js` falla 1 de 5 checks:

```
❌ El chip vacío dice "+ Elegir [sección]" (no un <select>)
```

y después rompe esperando `.pp-overlay.open`, así que los checks siguientes no llegan a correr
(queda en 3/5).

## Por qué

El test describe el modal tal como lo dejó **ISS-053** (2026-08-20): cada sección del menú se elegía
con un chip "+ Elegir [sección]" que abría el widget **PlatoPicker** (grid de fotos).

**ISS-075** (2026-08-25, día 11 del piloto) lo simplificó: la dueña pedía algo más rápido en hora
pico, así que el picker con fotos se cambió por una **lista plana de botones**, uno por plato
disponible, con el elegido marcado con `●`. Es lo que hace hoy `renderManualSeccion()`
(`public/js/modules/pedidos.js`) — sin chips, sin `PlatoPicker`, sin `.pp-overlay`. La novedad de ese
día ya lo anunciaba así: *«"Agregar manual" es más simple: lista de platos sin fotos»*.

El test nunca se actualizó. **El código está bien; el test mide una UI que ya no existe.**

## De paso: un comentario obsoleto en el código

La cabecera de la sección "Agregar manual" en `public/js/modules/pedidos.js` todavía dice:

> *"Con fotos (2026-08-19): antes cada plato se elegía con un `<select>` de texto plano. Ahora reusa
> PlatoPicker — el mismo selector visual (grid de fotos)…"*

Eso describe ISS-053, no el estado actual. Conviene corregirlo en la misma pasada: un comentario que
afirma que se usa un widget que ya no se usa es peor que no tener comentario — manda a buscar código
que no está ahí.

## Qué se hizo (2026-09-13)

Se resolvió junto con el bug del **nombre obligatorio** del mismo modal (el campo decía "(opcional)"
pero el formulario lo exigía), porque no tenía sentido arreglar ese bug sin un test que lo cubriera.

1. `scripts/test-agregar-manual.js` reescrito contra la UI real: botón por plato dentro de
   `#manual-secciones-<idMenu>`, marcado con `●` al elegirlo, deselección al volver a tocarlo
   (ISS-069), y comprobación de que **no** se abre ningún `.pp-overlay`.
2. Se le agregó el caso nuevo: enviar sin nombre no da error y crea la orden con
   `nombre_cliente NULL`. Como la limpieza del script borra por
   `nombre_cliente LIKE 'AgregarManualTest%'`, esa orden se recuerda por id.
3. El comentario de `pedidos.js` ahora cuenta las tres etapas del selector (`<select>` → PlatoPicker
   en ISS-053 → lista plana en ISS-075) en vez de afirmar que usa un widget que dejó de usar.

**Resultado: 3/5 (roto) → 35/35.**

## Nota

`PlatoPicker` (`public/js/widgets/plato-picker.js`) **sigue en uso** en Configuración → Menú del día
(armado de secciones). El widget no es el problema: lo que cambió es que "Agregar manual" dejó de
usarlo.
