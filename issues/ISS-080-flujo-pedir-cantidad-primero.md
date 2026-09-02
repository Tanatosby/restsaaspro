# ISS-080 — Rediseño del flujo de "Pedir": cantidad primero, configurar después

**Estado:** ✅ Resuelto — 2026-08-27
**Módulo:** `public/menu.html`, `public/js/widgets/menu-modal.js`, `public/css/menu.css`
**Prioridad:** 🔴 Alta — resuelve 3 hallazgos reales del Día 12 del piloto (stock a mitad de
pedido, no se puede editar un menú puntual, carrito poco descubrible) más una confusión de flujo
reportada el día 13.

---

## Contexto

Día 12 del piloto (2026-08-26), 3 hallazgos con la misma causa raíz:
1. Stock agotado a mitad de armar un pedido con varios menús → obligaba a rehacer todo desde cero.
2. No se podía editar un menú puntual ya en el carrito (mismo síntoma, misma causa).
3. Botón del carrito poco descubrible.

Además, el usuario probó un prototipo interactivo (aprobado el día 13) y encontró 2 problemas de
flujo antes de aprobar el diseño final:
- Tocar "+1" en el stepper de cantidad no puede empujar directo a llenar el formulario — probando
  pedir 2 varias veces, el toque accidental de un "+" de más ya te mete a elegir.
- Un menú ya configurado, con carta agregada, y se va al carrito sin haber terminado de configurar
  el otro menú pendiente → el carrito muestra la carta pero el menú "desaparece" (en realidad nunca
  se configuró, solo estaba marcada la cantidad).

## Diagnóstico

En el código real, tocar una card de "Menú del día" abría el picker (`MenuModal`) **directo**, de a
una unidad: `agregarMenu()` empujaba un ítem al carrito y cerraba. No existía forma de:
- Elegir la cantidad antes de configurar cada unidad.
- Editar la composición de una unidad ya agregada (solo borrar la fila entera y volver a armar
  desde cero).
- Impedir que el comensal llegara al carrito con una cantidad marcada pero sin configurar.

## Solución

**Alcance: solo "Pedir".** Reservar no se tocó — sigue con `abrirMenuModal()` de siempre (decisión
tomada con el usuario antes de empezar, por riesgo de cambiar 2 flujos a la vez en producción).

- **`renderMenuDiaCard()`** (menu.html) — bifurca por modo. Reservar: sin cambios. Pedir: stepper
  de cantidad en la card (mismo patrón que ya usa la carta) + CTA "Elegir opciones (N)" que recién
  ahí abre el picker.
- **`elegirOpcionesPedir()` / `continuarWizardPedir()`** — arrancan (o retoman) la configuración de
  las unidades pendientes de un menú, encadenando unidad tras unidad ("1/2", "2/2"…) y, si se
  pidieron 2+ tipos de menú a la vez, siguiendo directo con el próximo menú pendiente al terminar
  uno — sin volver a la lista entre medio.
- **`abrirCarritoPedir()`** — reemplaza el `onclick` del botón "Ver pedido": si queda algún menú
  con cantidad marcada sin configurar, arranca el wizard ahí en vez de abrir el carrito.
- **`editarUnidadPedir()` / `guardarEdicionMenuPedir()`** — reabren el picker precargado con la
  selección real de una unidad puntual del carrito y la reemplazan in-place al guardar (conserva
  la modalidad 🪑/🥡 que ya tenía). Resuelve directamente los hallazgos #1 y #2 del Día 12.
- **`validarSeleccionMenu()` / `armarItemMenu()`** — la validación (sección obligatoria, ISS-046,
  ISS-066) y el armado del ítem se extrajeron de `agregarMenu()` a funciones compartidas, para que
  agregar y editar apliquen exactamente las mismas reglas sin duplicar código.
- **`menu-modal.js`** — extendido con `posicion`/`total` (aviso "Estás eligiendo tu Menú X i/n"),
  `onAdded` (permite encadenar en vez de cerrar solo) y `onSave` (modo edición, reemplaza el
  llamado a `agregarMenu()`). Sin estas 3 opciones, el modal se comporta exactamente igual que
  siempre — así Reservar, que no las manda, queda intacto.
- **`updateCart()`** — cada unidad de menú es su propia fila, siempre (antes se agrupaban los
  menús idénticos con un stepper +/−; decisión tomada con el usuario: con el flujo nuevo cada
  unidad ya pasó por su propio picker, tiene sentido que se pueda editar por separado). Cada fila
  suma el botón "✏️ Editar". Reservar sigue agrupando igual que siempre (`agruparMenusCarrito()`
  sin tocar).
- **Retirado para Pedir:** el atajo "+1 mismo menú" (ISS-064) — ya no hace falta, la cantidad se
  decide antes con el stepper. Sigue existiendo tal cual para Reservar.
- **Limpieza:** `toggleModalidadGrupo()` quedó sin ningún llamador (ni Pedir ni Reservar la usaban
  ya) — se eliminó.

## Verificación

- `scripts/test-pedir-cantidad-primero.js` nuevo (24/24) — cubre el stepper sin abrir nada, el
  encadenado dentro de un menú y entre 2 tipos de menú distintos, el freno del carrito con
  pendientes sin configurar, y editar una unidad sin agregar una fila nueva.
- `scripts/test-repetir-menu.js` recortado a solo Reservar (11/11) — la parte de Pedir que probaba
  el atajo retirado ya no aplica.
- Sin regresiones: `test-modalidad-mixta.js` (19/19), `test-pago-mixto.js` (5/5),
  `test-iss048-volver-pago.js` (15/15), `test-iss049-recuperar-pago.js` (12/12),
  `test-gate-pago.js` (24/24), `test-comprobante-duplicado.js` (7/7),
  `test-numero-dia-pedido.js` (10/10), `test-pensionista-cliente.js` (29/29),
  `test-carta-export.js` (16/16), `test-cobrar-homologado.js` (14/14),
  `test-version-assets.js` (25/25). 469/469 jest.

**Hallazgos colaterales, sin relación con este cambio (no corregidos, fuera de alcance):**
- `scripts/test-cola-carrera.js` — falla por un dato hardcodeado (`Plato #1 no disponible`) que
  ya no existe así en la BD local (visto en ISS-079).
- `scripts/test-horario-atencion.js` — un caso espera que reservar sin hora con el restaurante
  cerrado devuelva 400, pero desde ISS-065 (2026-08-24) reservar sin hora nunca se bloquea — el
  test quedó desactualizado tras ese fix, antes de esta sesión.
- `scripts/test-fixes-pago-comprobante.js` — nunca llena `#nombre-cliente` antes de llamar
  `confirmarPedido()`, que lo exige — parece roto desde antes de esta sesión, sin relación con el
  rediseño.
- Varios scripts mutan la config de pagos/horario del restaurante de prueba sin restaurarla al
  terminar (`test-pago-mixto.js`, `test-gate-pago.js`, `test-horario-atencion.js`) — eso hizo que
  correrlos en cierto orden dejara al restaurante sin Yape/Plin activos a mitad de esta sesión.
  Se restauró a mano (`yape_activo`/`plin_activo`/`efectivo_activo` = 1) — no es un problema del
  código, es que los scripts no son buenos vecinos entre sí en la BD local compartida.

## Validación en producción

Desplegado el 2026-08-28 (`3e1d922`, junto con ISS-079). En servicio real desde entonces en el
piloto 1; la dueña lo ha visto funcionar con sus comensales a lo largo del piloto. La encuesta de
producto de [ISS-081](ISS-081-pago-en-un-paso-mas-banner-y-encuesta.md) (banner + 2 preguntas al
terminar el pedido, activa del 28 al 30 de agosto) recogió **24 respuestas de comensales reales**:
**95% valoración positiva** (14 Excelente / 6 Buena / 1 Regular / 0 Mala) y **94% prefiere el
flujo nuevo** frente al anterior (17 vs. 1). El único voto en contra fue de una persona el 30/08.
El rediseño de "Pedir" queda **validado del lado del comensal** — ver ISS-081 §Resultados.

Ajuste posterior a partir de la observación en servicio real: los comensales tocaban la foto del
menú esperando que agregara → [ISS-084](ISS-084-foto-menu-suma-boton-letra.md) (tap en la foto =
+1), sin reabrir el picker para no reacoplar lo que este rediseño separó.

## Relacionado

Prototipo interactivo aprobado el mismo día (artifact "Pedido Directo") — el usuario probó el
flujo completo antes de aprobar la migración a código real. Consecuencia de ISS-047 (modalidad por
ítem, que se conserva sin cambios), ISS-046/ISS-066 (validación de secciones, reusada sin
duplicar), ISS-064 (atajo retirado solo para Pedir).
