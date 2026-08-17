# ISS-044 — Tras un deploy el panel puede aparecer vacío hasta cerrar sesión

**Estado:** 🔎 Diagnosticado — **ocurrió en producción el 2026-08-16**, fix pendiente
**Módulo:** `public/owner.html` (carga de los `<script>`), `public/sw.js`
**Prioridad:** 🔴 Crítica — le puede pasar a la dueña del piloto en pleno servicio, y el
síntoma que ve es "se borraron todos mis platos"

---

## Síntoma reportado

El usuario, minutos después de desplegar `291c15b`:

> "hubo un problema en el ultimo despliegue cuando hemos hecho la migracion idempotente, los
> datos se han eliminado creo porque no me aparece ningun menu configurado, ningun plato,
> como puedo hacer para restablecer el backup de la base de datos"

Y al rato:

> "ya apareció, cerré sesión y volví a iniciar y ya aparecieron los platos... sí estaban ahí,
> la base está ahí pesa 223kb"

**No se perdió ningún dato.** Pero durante unos minutos el owner creyó que sí, y estuvo a
punto de restaurar un backup encima de una base sana — lo que sí habría destruido datos.

---

## Diagnóstico

El deploy dejó al navegador con archivos de **dos versiones distintas** conviviendo:

| Archivo | ¿En `ASSETS` de `sw.js`? | Cómo se actualiza |
|---|---|---|
| `owner.html`, `owner.css`, `menu.html` | **Sí** | Con el bump de `CACHE` (`menupro-v10`) |
| `js/modules/*.js`, `js/widgets/*.js` | **No** | Por red, sujeto al caché HTTP del navegador |

Los módulos JS **no tienen ninguna estrategia de versionado**: `owner.html` los pide siempre
con la misma URL (`/js/modules/utils.js`, sin query ni hash), así que el navegador puede
servir una copia vieja indefinidamente mientras el HTML que los carga sí se actualizó.

En este deploy eso era suficiente para romper el panel: `badgeModalidad()` se movió a
`utils.js` (ISS-042) y se agregó `renderMenuAgrupado()` ahí (ISS-041). Con un `utils.js`
viejo y un `cocina.js`/`ordenes.js` nuevos, la llamada revienta con `ReferenceError` y
**el render se corta: las listas quedan vacías**. Los datos están intactos en la BD; no se
pintan.

Cerrar sesión lo resolvió porque el ciclo de logout/login vuelve a pedir los archivos.

### Por qué es peor de lo que parece

1. **El síntoma miente.** "No hay ningún plato" se lee como pérdida de datos, no como un
   error de caché. La reacción natural del owner es restaurar un backup — encima de una base
   sana.
2. **Se dispara justo después de cada deploy**, que es cuando nadie está mirando el panel con
   ojo crítico.
3. **Le puede tocar a la dueña del piloto en pleno servicio**, y ella ya necesita más
   acompañamiento que el resto (ver `pilotos.md`, Día 3).
4. **Va a repetirse** en cualquier deploy futuro que toque un módulo compartido como
   `utils.js`.

Es la misma causa raíz que ya estaba anotada en **T11** (`backlog.md`): el SW no cachea ni
versiona los módulos JS. T11 lo mira desde la lentitud de arranque; esto lo mira desde la
consistencia entre versiones.

---

## Reproducción

1. Desplegar un cambio que agregue una función a `public/js/modules/utils.js` y la use desde
   otro módulo.
2. Abrir el panel en un navegador que ya tenía la versión anterior (sin borrar caché).
3. Según lo que el navegador decida servir, las listas del panel aparecen vacías. La consola
   muestra un `ReferenceError` sobre la función nueva.

---

## Solución propuesta (sin implementar)

**Versionar los `<script src>` con la misma versión que el service worker**, para que un
deploy no pueda dejar mezcla de versiones:

1. Una sola constante de versión de build compartida por `sw.js` y `owner.html`/`menu.html`.
2. Los `<script>` la llevan en la URL: `/js/modules/utils.js?v=10`. Al cambiar la versión, la
   URL cambia y el navegador **está obligado** a bajar el archivo nuevo; nunca puede mezclar.
3. Como `owner.html` sí está precacheado y se renueva con el bump del SW, el HTML nuevo pide
   automáticamente los JS nuevos. Queda una sola perilla que mover por deploy.

Alternativa más completa (se solapa con **T11**): meter los módulos JS en `ASSETS` del SW,
que además arregla el arranque lento. Conviene resolver las dos juntas y no dos veces.

---

## Mitigación mientras tanto

Si el panel aparece vacío después de un deploy: **cerrar sesión y volver a entrar.** No es
pérdida de datos. Verificado en producción el 2026-08-16.

---

## Pendiente

- Implementar el versionado (decidir si junto con T11/ISS-036).
- Avisar a la dueña del piloto #1 de la mitigación mientras no esté el fix.
