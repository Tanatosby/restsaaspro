# ISS-087 — Reservar pasa al flujo "cantidad primero" de Pedir

**Estado:** ✅ Resuelto — 2026-09-04
**Módulo:** `public/menu.html`, `public/css/menu.css`
**Prioridad:** 🟡 Media — homogeniza el flujo de armado de carrito entre los dos modos, sin
bloquear nada en producción.

---

## Pedido del usuario

Reservar seguía en la versión vieja de "conteo de menús" (tocar la card abría el picker directo,
un menú a la vez) mientras Pedir ya había pasado al flujo de "cantidad primero" con ISS-080 y la
encuesta de ISS-081 lo validó con **95% de valoración positiva**. El usuario pidió portar el
mismo flujo a Reservar "para homogeneizar todo", ahora que ya se evaluaron los comentarios de
Pedir y salieron buenos.

Confirmado antes de codear: **el flujo de pago (ISS-086, misma sesión) ya era compartido** entre
Pedir y Reservar — la única pieza distinta era el armado del carrito (esta).

## Diagnóstico

El patrón de ISS-080 no era una sola función sino una cadena de ~9 funciones ancladas
exclusivamente a las variables de Pedir (`cart`, `menuSelections`, `menuPending`, `menusDia`,
`renderPedirContent`, `openDrawer`): `configuradosDeMenu` → `targetDeMenu` →
`cambiarCantidadMenuPedir` → `quitarUltimaUnidadMenu` → `elegirOpcionesPedir` →
`abrirUnidadPedir` → `continuarWizardPedir` → `proximoMenuPendientePedir` → `abrirCarritoPedir`.

Se generalizaron todas para aceptar `mode` (`'pedir'`/`'reservar'`) en vez de duplicarlas —
mismo criterio que ya usa el resto del archivo (`agregarMenu`, `selectMenuPlato`,
`changeQty`, `duplicarMenuEnIdx`, etc.).

## Solución

- **Estado:** nuevo `resMenuPending = {}` (espejo de `menuPending`), reseteado en
  `renderReservarContent()` (cambio de fecha) y en el reset general.
- **`renderReservarContent()` dividida en dos:** la fetch+reset por fecha (sin cambios de
  comportamiento) ahora delega el pintado a **`renderReservarCards()`**, nueva función síncrona
  que repinta desde el estado ya cargado — sin fetch ni reset — igual que `renderPedirContent()`
  hace para Pedir. Necesaria porque el wizard repinta tras cada tap del stepper y cada cierre del
  picker; llamar a la función vieja ahí habría disparado un fetch de red y borrado
  `resMenuSelections`/`resCart` en cada interacción.
- **`renderMenuDiaCard(m, mode)`:** se eliminó el branch temprano de `'reservar'`
  (`abrirMenuModal`, "Ver opciones →") — ahora ambos modos usan la misma plantilla (stepper en la
  card, tap-en-la-foto suma 1, botón "Elegir opciones (n)" con el pulso la primera vez).
- **Bug latente detectado y corregido de paso:** el id `menu-qty-${m.id}` no llevaba namespace
  por modo. Como Reservar arranca con la fecha en "hoy" (igual que Pedir), el mismo `menuId`
  podía aparecer en los dos contenedores del DOM a la vez (`#main-content` y
  `#res-menu-content`, uno oculto por CSS pero ambos presentes) → **ids duplicados**. Pasa a
  `menu-qty-${mode}-${m.id}`, mismo patrón que ya usaba la carta (`qty-${mode}-${p.id}`).
- **`abrirCarritoConWizard(mode)`** (antes solo `abrirCarritoPedir`): mismo criterio para los dos
  modos — si hay un menú con cantidad marcada pero sin configurar, el carrito no se abre, arranca
  el wizard de esa unidad primero. El botón "Ver reserva" (`.res-bar-btn`) pasó de
  `openResDrawer()` directo a `abrirCarritoReservar()`.
- **Retirado — atajo "+1 mismo menú" (ISS-064, Día 9 del piloto):** con la cantidad decidida de
  antemano en el stepper de la card (en los dos modos ahora), no queda ningún camino donde
  agregar un menú deje pendiente repetirlo a mano — Pedir ya lo había dejado atrás con ISS-080;
  Reservar era el último que lo necesitaba. Se eliminaron `mostrarAtajoRepetirMenu()`,
  `ocultarAtajoRepetirMenu()`, `duplicarUltimoMenu()`, `_ultimoMenuAgregado`,
  `_atajoRepetirTimer`, la función ya muerta `abrirMenuModal()`, y el CSS `.atajo-repetir`
  (`menu.css`).
- **Sin tocar, a propósito:** el carrito de Reservar sigue **agrupando** menús idénticos con su
  propio stepper "+"/"−" (`agruparMenusCarrito` / ISS-064, en `updateResCartSummary()`) — eso es
  un mecanismo aparte, de la vista del carrito ya armado, no del armado en sí. Pedir muestra cada
  unidad en su propia fila (decisión ya tomada en ISS-080); Reservar sigue agrupando. No formaba
  parte de lo pedido y se deja igual.
- **Sin tocar:** "✏️ Editar" una unidad ya en el carrito (`editarUnidadPedir`) sigue siendo
  exclusivo de Pedir — el carrito agrupado de Reservar no tiene ese botón por fila; fuera de
  alcance de este cambio.

## Verificación

- Los `<script>` de `menu.html` parsean sin error de sintaxis; `menu.css` con llaves balanceadas.
- 478/478 jest, sin regresiones (cambio frontend puro).
- **94/94 verificaciones E2E (Playwright), 5 scripts:**
  - `test-pedir-cantidad-primero.js` — 24/24, sin regresión en Pedir (ids del stepper
    actualizados a `menu-qty-pedir-N`).
  - `test-reservar-cantidad-primero.js` — **nuevo**, 21/21. Mismo flujo que el de Pedir: stepper
    no abre nada, "Elegir opciones" encadena entre menús distintos ("1/2"→"2/2"→"1/1"), aterriza
    en `#res-drawer`, el drawer no se abre con menús a medio configurar, `numerarGrupos` arma
    grupos completos (ISS-041).
  - `test-repetir-menu.js` — reescrito, 9/9. Ya no depende del atajo retirado (agrega 2 unidades
    directo vía `agregarMenu()`); sigue cubriendo el agrupado + stepper del carrito de Reservar,
    que no se tocó.
  - `test-ya-pago-foto-buscador.js` (ISS-084/085) — 25/25. La sección C (foto = +1) se actualizó:
    antes confirmaba que Reservar *no* cambiaba, ahora confirma que usa el mismo
    `agregarMenuDesdeFoto` que Pedir.
  - `test-iss048-volver-pago.js` — 15/15, sin regresión (usa `selectMenuPlato`/`agregarMenu`
    directo, ya generalizados desde antes).
- **`test-gate-pago.js` no se pudo correr limpio** — falla en un paso no relacionado
  (`#btn-met-plin` no aparece) porque el restaurante #1 de esta BD de desarrollo tiene Yape/Plin
  desactivados (`yape_activo=0`, `plin_activo=0`, confirmado por consulta directa a la BD).
  Preexistente a este cambio, no lo causa.

## Pendiente

- **Sin desplegar.** Falta tu ok para el deploy.
- Sin verificar en uso real — falta un comensal reservando con 2+ menús para confirmarlo en el
  piloto.

## Relacionado

ISS-080/081 (el flujo que se está portando, ya validado), ISS-064 (el atajo que queda retirado),
ISS-084 (`agregarMenuDesdeFoto`, ahora compartido), ISS-041 (`numerarGrupos`, sin cambios),
ISS-086 (misma sesión — confirmó que el flujo de pago ya era compartido).
