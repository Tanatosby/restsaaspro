# ISS-044 — Tras un deploy el panel puede aparecer vacío hasta cerrar sesión

**Estado:** ✅ **Resuelto 2026-08-16** — **desplegado 2026-08-17** (confirmado por el usuario,
junto con T0/ISS-045/ISS-046, commit `a47d132`). Resuelto junto con **T11**
(arranque lento), que compartía la causa raíz.
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

## Solución implementada (2026-08-16)

Se hizo la alternativa completa: **una sola versión de build que viaja en la URL de cada
asset y en el nombre del caché del SW**, más el precache de los módulos JS que pedía T11.

**1 · Una sola perilla** — `utils/buildVersion.js` exporta `BUILD`. Es el único número que se
toca por deploy. Los HTML y el `sw.js` guardan el placeholder `__BUILD__` en disco, y `app.js`
lo reemplaza al servirlos (middleware antes de `express.static`, con fallback: si el reemplazo
falla, se sirve el archivo tal cual y la app nunca queda inaccesible).

**2 · Todas las URLs cambian juntas** — los 17 assets locales de `owner.html` y los 2 de
`menu.html` se piden como `/js/modules/utils.js?v=11`. Al subir `BUILD`, **cambian todas a la
vez**: el navegador no puede servir un `utils.js` viejo junto a un `cocina.js` nuevo, que era
exactamente el bug.

**3 · El SW precachea el juego completo (T11)** — `ASSETS` pasó de 7 entradas a 22: ahora
incluye los 15 módulos JS y los widgets. Antes no había **ni un solo** JS precacheado, así que
cada arranque los pedía a la red uno por uno.

**4 · `cache: 'reload'` al precachear** — sin esto, `addAll` puede guardar dentro del SW una
copia vieja que el navegador tenía en su caché HTTP: el mismo bug, pero fosilizado.

**5 · Los HTML se sirven *stale-while-revalidate*** — son los únicos sin `?v=` en la URL, así
que son los únicos que podrían quedar viejos. Se sirven del caché (rápido) y se revalidan en
segundo plano, de modo que la apertura siguiente ya tiene la versión nueva. Los HTML y el
`sw.js` van con `Cache-Control: no-cache`.

### Lo que NO se hizo, y por qué

**`defer` en los 15 `<script>` locales de `owner.html`** — era el tercer punto de T11 y quedó
fuera. El bloque inline de `owner.html:1138` llama a `leerSesion()` en el nivel superior y
define las funciones globales que usan los `onclick` del HTML. Los scripts `defer` se ejecutan
**después** de los inline, así que el guard reventaría con `leerSesion is not defined` y la app
no arrancaría. Sacarlo requiere mover ~1200 líneas de inline a un archivo aparte: es una
refactorización propia, no algo para meter en el mismo cambio que toca el caché con un piloto
activo. Sí se les puso `defer` a los CDN externos (Chart.js, qrcodejs), que era lo pesado.

---

## Verificación

- **`scripts/test-version-assets.js`** — **25/25** contra el servidor real: los HTML salen sin
  `__BUILD__` sin reemplazar, ningún asset local queda sin versionar, el `sw.js` usa la misma
  versión que el servidor, los 16 scripts de `owner.html` están en `ASSETS`, las 19 URLs
  versionadas responden 200, y el `?v=` no altera el contenido servido. Incluye el chequeo que
  define el bug: **`utils.js` y `cocina.js` piden la misma versión**.
- **`scripts/test-sw-precache.js`** — **11/11** en Chromium real: el SW instala, queda **un
  solo caché** (`menupro-v11`, sin restos viejos), precachea **17 módulos JS** (antes 0) todos
  con su `?v=`, y en la segunda visita los assets se sirven sin tocar la red. También verifica
  que cargar `menu.html` y `owner.html` **no tire ningún error de JavaScript** — que era el
  síntoma exacto del bug.
- `npx jest` → **412/412**.

### Medición del arranque (T11), sin adornos

Con red limitada (~1,6 Mbps, 150 ms de latencia) y 4 corridas alternadas:

| | Antes | Después |
|---|---|---|
| `menu.html` — primer pintado | 569 ms | **538 ms** |
| `menu.html` — recursos en el camino crítico | 13 | **6** |

La mejora por quitar bloqueantes es **modesta (≈30 ms)**, no espectacular. En `owner.html` no
se pudo medir de forma confiable en local. **La ganancia real de T11 no está en esos
milisegundos sino en el precache**: los 17 módulos ya no se piden a la red en cada arranque,
que es justo el síntoma que se reportó ("la primera apertura no entra, la segunda sí"). Esa
parte sí está verificada en navegador.

---

## Mitigación (ya no hace falta, queda como referencia)

Si el panel aparece vacío después de un deploy: **cerrar sesión y volver a entrar.** No es
pérdida de datos. Verificado en producción el 2026-08-16.

---

## Pendiente

- **Deploy.**
- ~~Al desplegar cambios de frontend, subir `BUILD` en `utils/buildVersion.js`~~ — ✅ **ya no
  aplica, T0 (2026-08-17):** `BUILD` se calcula solo (hash del contenido), no hay número que
  subir a mano.
