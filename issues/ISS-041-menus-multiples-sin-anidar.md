# ISS-041 — Dos menús del día en el mismo pedido no se pueden diferenciar

**Estado:** ✅ **Resuelto 2026-08-16** — pendiente de deploy
**Módulo:** `public/menu.html` (`agregarMenu`, `confirmarPedido`, `confirmarReserva`),
`routes/public.js` (`POST /orders`, `POST /reservations`), `routes/orders.js`,
`routes/reservations.js`, tabla `orden_menu_items` / `reserva_menu_items`,
`public/js/modules/ordenes.js`, `public/js/modules/cocina.js`, `public/js/modules/pedidos.js`
**Prioridad:** 🔴 Crítica — afecta directamente a cocina: sin esta info, el cocinero no sabe
qué entrada va con qué segundo cuando un mismo pedido trae 2+ menús

---

## Síntoma reportado

El usuario:

> "un comensal pidió 2 menú por un solo pedido, pero al momento de que el owner del local
> visualiza, no es que los pedidos se anidan, por ejemplo si un comensal pide 2 pedidos con
> entrada y segundo distintos, cómo los puede diferenciar, pienso que puede haber como dentro
> del pedido una sección de anidar."

---

## Diagnóstico

El problema no es solo de presentación — la información se pierde **antes** de llegar al
backend, en el momento de armar el pedido:

1. Cada vez que el comensal agrega un menú del día (`agregarMenu()`, `menu.html:646-685`),
   sus platos elegidos (ej. entrada + segundo) quedan agrupados dentro de **ese** ítem del
   carrito (`payload.menuItems`).
2. Al confirmar, `confirmarPedido()` (`menu.html:873`) y `confirmarReserva()`
   (`menu.html:979`) hacen:
   ```js
   const menuItems = cart.filter(i => i.type === 'menu').flatMap(i => i.payload.menuItems);
   ```
   Esto **aplana todos los menús agregados en un solo array plano** antes de mandarlo al
   backend. Si el comensal agregó 2 menús del mismo tipo (mismo `id_menu_dia`) con
   selecciones distintas, a partir de acá ya no hay forma de saber qué entrada iba con qué
   segundo.
3. La tabla `orden_menu_items` (`routes/orders.js:348`) y su espejo `reserva_menu_items`
   (`routes/public.js:467`) solo guardan `(id_orden, id_menu_dia, id_componente, cantidad)`
   — **no existe ninguna columna que agrupe** los ítems de una misma "instancia de menú". No
   es recuperable después sin cambiar el esquema.
4. El listado plano (sin agrupar) se repite igual en el panel — confirmado en **4 lugares**:
   - `public/js/modules/ordenes.js:87` (`renderOrdenCard`)
   - `public/js/modules/cocina.js:73` y `:101` (`renderCocinaTicket`, `renderCocinaReserva`
     — el más crítico, es la vista del cocinero)
   - `public/js/modules/pedidos.js` (`renderItemLines`, usado en Cola y en cierre de caja)

Ejemplo concreto: 2 comensales piden el mismo "Menú del día" cada uno con su propia elección
de entrada y segundo. Hoy el ticket de cocina muestra algo como:
```
📋 Causa limeña [Entrada]
📋 Ají de gallina [Entrada]
📋 Lomo saltado [Segundo]
📋 Tallarín verde [Segundo]
```
sin ninguna forma de saber si es (Causa + Lomo saltado) + (Ají de gallina + Tallarín verde),
o al revés.

---

## Reproducción

1. Desde `menu.html`, agregar el mismo menú del día dos veces al carrito, cada vez con una
   combinación distinta de entrada/segundo (para menús donde el comensal elige).
2. Confirmar el pedido.
3. Ver el ticket en el panel del owner (Cocina, Órdenes o Cola) — los 4 platos aparecen en
   una lista plana, sin indicar qué entrada corresponde a qué segundo.

---

## Decisiones de producto (tomadas por el usuario sobre mockups, 2026-08-16)

Se le presentaron las opciones renderizadas con el CSS real a 360 px antes de escribir
código. Lo decidido:

| # | Decisión | Elegido | Descartado y por qué |
|---|---|---|---|
| 1 | Pedidos ya existentes | **Sin backfill.** Quedan con `grupo = NULL` y se pintan planos | Deducir el agrupamiento de datos viejos inventaría combinaciones falsas en el ticket, peor que no agrupar |
| 2 | Forma del agrupamiento | **Encabezado por menú** (`🍽️ Menú 1` + platos debajo) | *Recuadro por menú*: con 3 menús empuja el botón "Preparando" fuera de pantalla. *Número al costado*: roba ~30 px de ancho a los nombres de plato, que a 360 px ya se cortan |
| 3 | Cuándo numerar | **Siempre**, aunque los menús sean de tipos distintos | *Solo si se repite* obliga a numerar unos sí y otros no en el caso "2 menús del día + 1 ejecutivo", y duplica la lógica en 4 renders |
| 4 | Nombre del menú en el encabezado | **Solo cuando el pedido mezcla tipos distintos** | Salió de medir: con la letra en escala Máxima, "🍽️ Menú 1 · Menú del día" parte en 2 líneas y suma 50 px. Cuando los menús son del mismo tipo (el caso normal) el nombre no aporta nada |

---

## Solución implementada (2026-08-16)

**1 · Esquema** — `config/database.js`: columna `grupo INTEGER DEFAULT NULL` en
`orden_menu_items` y `reserva_menu_items`, con el patrón `try { ALTER TABLE } catch {}`
idempotente que ya usa el resto del archivo. `NULL` = fila anterior a la migración.

**2 · Armado del pedido** — `public/menu.html`: nueva `numerarGrupos(carrito)` reemplaza al
`flatMap` pelado de `confirmarPedido()` y `confirmarReserva()`, que era donde se perdía el
dato. El número sale de la **posición en el carrito** (1..N), no de un id guardado en el
ítem: si el comensal borra un menú antes de confirmar, la numeración se recalcula sin huecos.

**3 · Escritura** — `grupo` se guarda en los 4 INSERT: `routes/public.js` (orden y reserva
del cliente), `routes/orders.js` (alta desde el panel) y `routes/reservations.js` (el que
convierte una reserva en orden — ahí el grupo se **hereda**, si no se perdería en el
traspaso). Todos usan `item.grupo ?? null`: un cliente con una versión vieja de `menu.html`
cacheada no rompe nada, solo guarda NULL.

**4 · Lectura** — `grupo` + `menu_nombre` (con JOIN a `menus_dia`) se devuelven en los SELECT
de detalle de `utils/colaDia.js` (Cocina y Cola), `routes/orders.js` (×3),
`routes/reservations.js` (×2) y `routes/public.js` (estado de la reserva del cliente).
**No se tocaron** los SELECT de `utils/stock.js`, `utils/totales.js` ni `routes/reportes.js`:
suman cantidades y el agrupamiento les da igual.

**5 · Render** — nueva `renderMenuAgrupado(menuItems, pintarLinea, pintarEncabezado)` en
`public/js/modules/utils.js`, **una sola vez**, usada por las 4 vistas que pintan el detalle
(`cocina.js` ×2, `ordenes.js`, `reservas.js`, `pedidos.js`). Cada vista pasa su propio
formato de línea porque las 4 lo tienen distinto; el agrupamiento vive en un solo lugar.
Reglas: no agrupa si algún ítem viene sin `grupo`, no agrupa si hay un solo menú (el
encabezado sobraría), y agrega el nombre solo si hay más de un tipo. Nueva clase
`.menu-grupo-head` en `owner.css`, en línea propia entre el header y los platos.

**Lo que NO se tocó, a propósito:** `contarUnidadesMenu()` en `utils/menuPricing.js` deduce
cuántos menús físicos hay contando filas obligatorias, con un caso borde documentado que
subestima cuando el menú no tiene secciones obligatorias. Ahora que existe `grupo`, ese
conteo se podría hacer exacto — pero afecta el **cobro del tapper** (Gap 5), no la vista, y
queda fuera del alcance acordado para este issue.

---

## Verificación

- **`tests/cola-dia.test.js`** — 4 tests nuevos: los ítems llegan con su grupo y el nombre
  del menú; los viejos llegan con `grupo: null`; las reservas también lo traen; y el total
  **no cambia** por agregar la columna. Hubo que agregar `menus_dia` al fixture, que no la
  tenía. `npx jest` → **412/412 verde**, 31 suites (eran 408 antes de estos 4).
- **`scripts/test-menus-agrupados.js`** (sin navegador, `vm`) — **26/26**: agrupa con 2+,
  no agrupa con 1 solo, no agrupa pedidos viejos, no agrupa si algún ítem viene sin grupo,
  numera por posición aunque haya huecos (grupos 1 y 3 → "Menú 1" y "Menú 2"), ordena grupos
  desordenados, escapa el nombre del menú (lo escribe el owner), y el badge de ISS-042 sigue
  arriba de los grupos.
- **`scripts/test-grupo-punta-a-punta.js`** — **13/13**, la cadena completa por HTTP real
  contra `POST /api/public/orders`: cada grupo conserva **la combinación exacta** que eligió
  el comensal, llega así a `cocinaDelDia()` y el ticket la pinta separada. Crea el pedido de
  prueba y lo borra al terminar.
- **Visual** a 360 px con `owner.css`, en tema claro y oscuro y en las escalas Normal y
  Máxima: **sin overflow horizontal en ninguna combinación**. Se revisaron los 4 casos
  juntos (2 menús iguales, 2 de tipos distintos, 1 solo menú, pedido viejo sin grupo).

---

## Pendiente

- **Deploy** (lo hace el usuario).
- Verificar en el servicio real del piloto #1 con un pedido de 2 menús.
