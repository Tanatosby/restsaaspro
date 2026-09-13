# ISS-089 — No se puede juntar ni ver la cuenta de una mesa

**Estado:** ✅ Implementado el 2026-09-12 — **sin desplegar**, sin verificar en uso real
**Reportado por:** la dueña del piloto #1, servicio del viernes (2026-09-11, fecha a confirmar)
**Contado por el usuario:** 2026-09-12
**Módulo:** `routes/orders.js` · `utils/colaDia.js` · `modules/pedidos.js` · `modules/mesas.js`
**Prioridad:** 🔴 Alta — toca el momento del cobro, que es donde el sistema tiene que ser exacto

---

## Lo que pasó

Servicio normal, la dueña tomando pedidos manuales desde su celular:

> *"Ese día me pidieron primero 2 menús manuales, y luego llegó un tercer cliente y me pidió 1 jarra
> de chicha pero era el hijo de uno de la misma mesa, y luego pidieron un plato a la carta y quería
> sacarles la cuenta de esa mesa, o juntar todos sus pedidos de esa mesa, y no pude."*

Tres pedidos, una sola mesa, un solo grupo de comensales. El sistema los trata como tres clientes
sin relación.

## Pasos para reproducir

1. Cola del día → **Agregar manual** → Mesa 5 → 2 menús del día → Agregar.
2. Repetir con Mesa 5 → 1 jarra de chicha (carta).
3. Repetir con Mesa 5 → 1 plato a la carta.
4. Intentar ver cuánto debe la mesa 5 en total, o cobrar los tres juntos.

**Resultado:** tres tarjetas independientes que dicen "Mesa 5", cada una con su botón *Cobrar*,
ningún total en pantalla y ninguna forma de sumarlas. Peor: al momento de querer la cuenta, dos de
los tres pedidos seguían en cocina, así que ni siquiera estaban en la misma pestaña.

## Diagnóstico técnico

| # | Hallazgo | Dónde |
|---|----------|-------|
| 1 | Cada pedido crea una **orden nueva e independiente**. `ordenes.mesa` es una etiqueta suelta — no existe ninguna entidad "cuenta de mesa" que las agrupe | `routes/orders.js:306` |
| 2 | **La Cola del día no muestra ningún monto.** El `total` se calcula y persiste recién al marcar la orden como cobrada; antes no existe en ninguna pantalla del panel | `routes/orders.js:447`, `utils/colaDia.js` (el `total` que arma solo suma carta, no menús) |
| 3 | El merge por mesa **ya existe** (Gap 8) pero solo dispara reserva → orden, al marcar `es_cliente_llego` | `routes/reservations.js:558` (`autoMergeReservaEnOrden`) |
| 4 | El plano de mesas es decorativo (`cursor:default`), no es punto de acceso a nada | `public/js/modules/mesas.js` |
| 5 | El cobro es siempre de a un pedido (`cobrarColaOrden`), no hay cobro en bloque | `public/js/modules/pedidos.js` |

**El hallazgo 2 es el prerrequisito de todo:** juntar tres pedidos sin mostrar importes no le resuelve
nada — hoy la suma la hace de cabeza incluso para un pedido solo.

## Opciones evaluadas

Mockups a 360 px con los tokens reales de `owner.css`:
**https://claude.ai/code/artifact/f0a581b8-f510-4a17-aed6-f3da115ce8cb**
(fuente en el repo: `issues/ISS-089-cuenta-por-mesa-mockups.html`)

| Opción | Qué es | Sirve con la mesa en cocina | Toca la BD | Riesgo |
|--------|--------|------------------------------|------------|--------|
| **Prerrequisito** | Monto (`S/`) visible en cada tarjeta de la cola | Sí | No | Bajo |
| **A** | Tocar el chip "Mesa 5" abre una hoja con todos los pedidos activos de la mesa, el total y *Cobrar toda la mesa* | Sí | No | Medio — mesa arrastrada de un cliente anterior |
| **B** | Pestaña "Mesas" en la Cola: índice de mesas ocupadas con su total; abre la hoja de A | Sí | No | Bajo |
| **C** | "Por cobrar" agrupa sola los pedidos de la misma mesa, con total y *Cobrar los 3* | **No** — solo agrupa lo que ya está por cobrar | No | Bajo |
| **D** | Fusión real: al agregar manual sobre una mesa con cuenta abierta, los ítems entran en esa orden (Gap 8 extendido) | Sí | Sí | Alto — el pedido ya salió a cocina; no se puede desfusionar |

## Diseño aprobado (2026-09-12)

Prototipo interactivo, revisión 2, validado con el usuario:
**https://claude.ai/code/artifact/caf02e33-fab5-4bd3-860e-aca6698d77bc**
(fuente en el repo: `issues/ISS-089-cobrar-por-mesa-prototipo.html`)

**"Por cobrar" deja de listar pedidos y pasa a listar mesas** — combinación de B (índice de mesas por
fuera) y A+C (tickets con precio y comprobante por dentro):

- Cada fila: número de mesa, nombre, nº de pedidos, espera y **monto acumulado**; debajo, un botón
  **"💰 Cobrar mesa N · S/ X"** siempre visible — el caso común se cobra **sin abrir nada**.
- Al tocar la fila se despliegan los tickets: título, `#orden`, hora, ítems, precio por pedido,
  badge de pago, miniatura del comprobante (mismo `comprobanteThumb` de hoy, con el aviso de
  comprobante repetido dentro del ticket) y **"Cobrar solo este"** para el que paga aparte.
- **Sin bloque "Total mesa" adentro** — decisión del usuario: el total ya está siempre visible en la
  fila, repetirlo es ruido.
- **Grupo final "Para llevar, delivery y sin mesa"** para todo lo que no tiene mesa (incluido el
  pedido manual sin mesa). **No lleva botón de cobro en bloque**: son clientes distintos, cobrarlos
  de un toque sería un error. Solo cobro por ticket.
- El buscador de ISS-085 se mantiene, ahora filtrando mesas.
- **Deshacer** en el toast tras cobrar — con cobro en bloque, la vuelta atrás deja de ser opcional.

### Decisiones de negocio que quedaron cerradas

1. **Sí hay pago aparte** — cada ticket conserva su "Cobrar solo este".
2. Los pedidos por QR del comensal sobre la misma mesa entran solos en la cuenta (se agrupa por
   `ordenes.mesa`).
3. La mesa arrastrada de un cliente anterior y el cobro con platos aún en cocina siguen abiertos;
   ver "Pendiente de definir" abajo.

### Cerrado el 2026-09-12 (segunda ronda con el usuario)

- **Orden de las mesas: por antigüedad.** La que llegó primero arriba, la última abajo. La antigüedad
  de una mesa es la de su pedido más viejo (`MIN(created_at)` de sus pedidos). El grupo sin mesa
  siempre al final.
- **Mesa sin cerrar de un cliente anterior: sin corte por tiempo, por ahora.** Se evaluó separar
  cuentas por un hueco de 30 min entre pedidos y se descartó como no concluyente (dos pedidos con
  media hora de diferencia bien pueden ser la misma mesa). "Cobrar solo este" lo cubre parcialmente:
  se cobra primero lo que no corresponde y después el resto. Se retoma si aparece seguido en uso real.
- **Fuera de alcance: abrir la cuenta desde otras zonas.** Aclaración del usuario: la dueña pidió la
  cuenta **después** de que todos los platos estaban entregados, no con pedidos en cocina. Los tres
  pedidos siempre van a estar en "Por cobrar", así que esta vista sola resuelve el caso y la opción A
  del primer artifact (chip de mesa tocable en cualquier zona) **no se implementa**.

### Sigue abierto

- ¿Se permite cobrar la mesa con algo todavía en cocina (con aviso) o se bloquea? No bloqueante para
  el caso real; decidir al implementar.

## Issues hermanos (misma sesión, mismo flujo)

Del rediseño de la cola salieron dos cambios separables, cada uno con su issue:

- [ISS-090](ISS-090-pendientes-solo-reservas.md) — "Pendientes" desaparece para órdenes.
- [ISS-091](ISS-091-auto-entregado.md) — auto-entregado configurable + bajar el poll de la cola.

Los tres se tocan: con ISS-091, "Listos" se vacía sola hacia la vista de mesas de este issue.

## Progreso

### ✅ Paso 2 — el monto en la cola (backend), 2026-09-12

`utils/colaDia.js` ahora devuelve el **total real** de cada pedido: carta + menú del día +
`cargo_modalidad`, el mismo criterio que `calcularTotalOrden`/`calcularTotalReserva`
(`utils/totales.js`), que es lo que se persiste al cobrar.

- Antes sumaba **solo los ítems de carta**: un pedido de puros menús valía 0. No se notaba porque la
  Cola no muestra montos — pero el **cierre de caja** sí usa ese campo (`cierreItemOrden` en
  `pedidos.js`), así que ahí un pedido de menús aparecía sin importe. **Arreglado de paso.**
- El precio de un menú se reparte entre sus secciones obligatorias, así que hacían falta `requerido`
  y `total_obligatorias` por línea. `totales.js` los resuelve con una consulta por menú y otra por
  pedido — inviable acá. Se agregó **una sola consulta fija por lista** (`seccionesDeMenus()`) y el
  resto se arma en JS.
- `menu_secciones` **no** se joinea en la consulta de ítems a propósito: esa misma consulta alimenta
  el render, y una fila duplicada se vería como un plato repetido en Cocina. Solo se agregaron
  `precio_menu` e `id_seccion_menu`, que no cambian la cardinalidad.
- `cargo_modalidad` se agregó al SELECT de órdenes y reservas.

**Verificación:**

- `tests/cola-dia.test.js`: 7 tests nuevos de total (**29/29** el archivo, **483/483** jest). Incluye
  uno de **equivalencia contra `calcularTotalOrden`** — si alguien cambia una de las dos fórmulas, el
  test falla: el monto que ve la dueña tiene que ser el mismo que después entra en Ganancias.
- Contra **datos reales** de la BD local: 19 pedidos comparados uno a uno contra
  `calcularTotalOrden`/`calcularTotalReserva`, **19 coinciden, 0 difieren** (8 de ellos con menú del
  día, los que antes daban 0).
- **Carga (restricción de ISS-026):** **5 consultas fijas** con 1, 40 y 200 pedidos en la cola;
  4.7 ms con 200. No crece con la cantidad de pedidos.

El monto *visible* en pantalla llega con el paso 3 (la vista por mesa); acá solo se construye el dato.

### ✅ Paso 3 — "Por cobrar" por mesa, 2026-09-12

**Backend — `POST /api/orders/cobrar-mesa`** (`routes/orders.js`)

- Recibe los **ids explícitos** que la dueña tiene en pantalla, no el número de mesa. Si entre el
  render y el toque entra un pedido nuevo a esa mesa (el comensal pidió desde su celular), cobrar
  "toda la mesa 5" cerraría algo que ella no vio y el monto cobrado no coincidiría con el mostrado.
- **Todo o nada**, en una transacción: si un pedido ya está cobrado o cancelado, no se cobra ninguno
  (409). Con dinero es preferible "no se cobró nada porque el pedido #15 ya estaba cobrado" antes que
  una mesa cobrada a medias sin que nadie sepa cuánto.
- Valida todo **antes** de escribir. Escribe `total` (vía `calcularTotalOrden`/`calcularTotalReserva`)
  y `estado_pago='pagado'` en cada pedido, igual que el cobro de a uno. Cubre órdenes y reservas.
- Conserva la regla de `requiereConfirmarPagoAntes`: un Yape/Plin sin pago registrado no entra al
  lote y se avisa que se cobre por separado.

**Frontend — `pedidos.js` + `owner.css`**

- `renderCobrarPorMesa()` reemplaza el listado de tarjetas de la zona: una fila por mesa con número,
  nombre (sólo si toda la mesa es de un cliente), cantidad de pedidos, espera y **monto acumulado**,
  más el botón **"💰 Cobrar mesa N · S/ X"** sin desplegar nada.
- Arriba, un resumen **"Por cobrar hoy"** con el total de la zona.
- Al desplegar (una mesa a la vez: en 360 px dos abiertas obligan a scrollear para encontrar el
  botón): tickets con `#pedido`, ítems, badges de pago, comprobante, **precio** y "Cobrar solo este".
- Orden por antigüedad (la mesa que llegó primero arriba); el grupo sin mesa siempre al final y
  **sin cobro en bloque**.
- El buscador de ISS-085 pasa a filtrar **por mesa**: se reutiliza `coincideFiltroCobrar()` por
  pedido pero se decide por grupo, para que la cuenta mostrada nunca quede incompleta.
- `fSoles()` nuevo en `utils.js` — los importes dejaron de vivir sólo en el cierre de caja.

**Sin "deshacer":** el prototipo lo mostraba, pero el backend **no permite salir de `es_pagado`** (el
mismo bloqueo que ISS-059 tiene abierto para los cancelados) y no hay `cobrado_at` para acotar una
ventana de reversión. En su lugar, el cobro en bloque **pregunta antes** (`confirm()`, el patrón que
ya usa el panel para lo irreversible). Queda pendiente de decisión: ver "Sigue abierto".

**Verificación:** `scripts/test-iss089-cobrar-por-mesa.js` **31/31** — agrupación, orden por
antigüedad, grupo sin mesa sin cobro en bloque, montos por ticket, filtro por mesa, confirmación
(incluido el caso "cancelar no cobra nada"), cobro en bloque con `total` persistido, y los tres
rechazos del endpoint (409 con un pedido ya cobrado sin tocar el resto, 400 lote vacío, 404
inexistente). Sin regresión: `test-ya-pago-foto-buscador` 25/25, `test-cobrar-homologado` 14/14,
jest 483/483. Capturas reales a 360 px en `issues/screenshots/iss089-cobrar-*.png`, **sin overflow
horizontal**.

## Notas de implementación (para cuando haya decisión)

- El total por pedido ya sabe calcularse: `utils/totales.js` (`calcularTotalOrden` / `calcularTotalReserva`).
  **Ojo con el N+1:** `colaDia.js` es deliberadamente de consultas fijas desde ISS-026 — el total de la
  cola tiene que calcularse en bloque, no llamando `calcularTotalOrden` una vez por pedido.
- El cobro agrupado debería ser **un endpoint transaccional** (no un `for` de `PATCH` desde el
  frontend): si falla el tercero, no puede quedar la mesa cobrada a medias. Cada orden tiene que
  seguir pasando por `requiereConfirmarPagoAntes` (`utils/verificacionPago.js`).
- La agrupación es por `ordenes.mesa` + restaurante + día; las reservas con mesa también deberían
  entrar (ya se fusionan por Gap 8 al marcar "cliente llegó").

## Relación con otros issues

- **Gap 8** (`vision_negocio.md`) — auto-merge cuenta por mesa: la base conceptual, ya en producción.
- **ISS-085** — "Por cobrar" acumulaba ~39 pedidos. Si la cola se agrupa por mesa, además baja el
  conteo visible; conviene mirarlos juntos.
- **ISS-059** — revertir un pedido cancelado: mismo territorio (acciones de cierre que hoy no tienen
  vuelta atrás).
