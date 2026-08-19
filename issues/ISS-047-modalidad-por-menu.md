# ISS-047 — No se puede pedir un menú para llevar y otro para comer en el local

**Estado:** ✅ **Resuelto 2026-08-19** — **pendiente de deploy**.
**Módulo:** `config/database.js`, `routes/public.js`, `routes/orders.js`,
`routes/reservations.js`, `public/menu.html`, `public/js/modules/utils.js`,
`public/js/modules/cocina.js`, `public/js/modules/pedidos.js`.
**Prioridad:** 🟠 Alta — sale del uso real, y además hay un **cobro de más** asociado.

---

## Síntoma reportado

Día 5 del piloto (2026-08-18), contado por el usuario: una persona pidió **2 menús**, uno
quería llevárselo y el otro comerlo en el local. **No se puede separar** — o todo es para
llevar, o todo es para comer ahí.

## Diagnóstico

`modalidad` es una columna de **`ordenes`** y **`reservas`** (`config/database.js:475` y `:481`),
o sea **una sola por pedido**. No existe dónde guardar que el menú 1 se lleva y el menú 2 no.

El selector del comensal es coherente con ese modelo: `menu.html` tiene un solo grupo de radios
(`orden-modalidad` / `reserva-modalidad`) que aplica al pedido entero.

**El gancho que falta ya existe.** ISS-041 agregó la columna `grupo` a `orden_menu_items` y
`reserva_menu_items`: identifica cada instancia de menú dentro del pedido. Y
`renderMenuAgrupado()` (`utils.js:56`) ya agrupa por ahí y pinta un encabezado por menú — que es
justo donde va el badge 🥡.

### Un cobro de más, encontrado al diagnosticar

`calcularCargoModalidad()` (`routes/public.js:92`) cobra el tapper por **todas** las unidades
del pedido cuando la modalidad es `para_llevar`:

```js
const totalTappers = unidadesMenu + unidadesCarta;
let cargo = totalTappers * (rest.costo_tapper ?? 0);
```

En el caso del día 5 —1 menú para llevar y 1 para comer ahí— la única forma de registrarlo hoy
es marcar el pedido entero como "para llevar", y entonces **se cobran 2 tappers en vez de 1**.
No es solo una funcionalidad que falta: es plata cobrada de más, hoy.

## Diseño (cerrado con el usuario sobre mockup, 2026-08-18)

Mockup de las dos vistas: <https://claude.ai/code/artifact/80079977-29bb-4d6a-be75-7c0c5f8c192e>

### Alcance

Se mezcla **comer aquí / para llevar**. El **delivery queda a nivel de pedido** — es un solo
viaje, partirlo no tiene sentido.

### Modelo de datos

`modalidad` pasa a las **líneas**, no a una tabla nueva:

- `orden_menu_items` / `reserva_menu_items` — todas las líneas de un mismo `grupo` comparten
  valor (una instancia de menú se lleva entera o no se lleva).
- `orden_carta_items` / `reserva_carta_items` — cada plato de carta es una unidad suelta y
  lleva la suya.

`ordenes.modalidad` **se conserva** y pasa a ser un resumen derivado: `en_local` si todas las
líneas lo son, `para_llevar` si todas lo son, `mixto` si están mezcladas, `delivery` si el
pedido es delivery. Así no se rompe el código que hoy lee `o.modalidad` (cocina, `colaDia.js`,
`pedidos.js:270` y `:286`).

### A2 — lado del comensal (elegida)

Selector arriba del carrito que funciona como **atajo y espejo**:

| Estado | Se ve | Cuándo |
|---|---|---|
| 1 | «🪑 Todo aquí» marcado | Inicial de todo pedido |
| 2 | «🥡 Todo para llevar» marcado | Un tap desde el 1 — marca **todos** los menús |
| 3 | Ninguno marcado + «Mezclado — N de M para llevar» | Se llega cambiando el chip de un menú |

Cada menú del carrito lleva un chip `🪑 Comer aquí · cambiar` / `🥡 Para llevar · cambiar`.
**Nunca queda nada sin marcar:** el default de cada línea es `en_local`. Desde el estado 3,
tocar cualquiera de los dos botones de arriba vuelve a emparejar todo.

Descartadas: **A1** (toggle en cada línea, sin atajo — le cobra taps al caso común, que es el
de una sola modalidad) y **A3** (elegir al agregar el menú — la decisión se toma al final, no al
armar el plato, y corregirse obligaría a borrar el menú y rehacerlo).

### B2 — lado del restaurante (elegida)

En el ticket de cocina y en la Cola del día:

- **Resumen arriba:** el badge grande que ISS-042 ya instaló, ahora diciendo *cuántos*
  (`🥡 1 de 2 para llevar` cuando es mixto).
- **Detalle por menú:** badge chico dentro del `menu-grupo-head` que ISS-041 ya dibuja, para
  responder *cuál*.

Descartadas: **B1** (solo badge por menú — sin nada arriba, de reojo no se ve que hay algo que
envasar) y **B3** (partir el ticket en bloques «Comer aquí» / «Para llevar»). B3 se veía mejor y
mapea a la acción física, pero **reordena el ticket entero dos semanas después de que ISS-041 le
enseñó al cocinero a leer "Menú 1 / Menú 2" en ese orden**; cambiar la estructura dos veces en un
mes tiene un costo real en una cocina que está aprendiendo el sistema en pleno servicio. Queda
como paso siguiente natural si el pedido mixto se vuelve común.

## Compatibilidad con datos viejos

La migración pone `en_local` por defecto y **no borra** `ordenes.modalidad`. Un pedido anterior
marcado "para llevar" a nivel de orden se sigue leyendo bien por la columna vieja. Sin pérdida
ni relleno hacia atrás inventado — mismo criterio que ISS-041 usó con `grupo`.

## Lo implementado

- **`utils/modalidadPedido.js`** (nuevo) — normaliza la modalidad de cada línea, deriva el
  resumen del pedido y cuenta los menús que se llevan. Compartido por órdenes y reservas.
- **Migración** en `config/database.js`: `modalidad` en las 4 tablas de líneas.
- **`routes/public.js`**: normaliza al crear orden y reserva, guarda el resumen, y
  `calcularCargoModalidad()` cobra solo lo que se lleva. `'mixto'` entra en el whitelist
  (el backend igual lo re-deriva, el valor del cliente no manda).
- **`routes/reservations.js`**: la modalidad viaja al convertir reserva → orden, igual que `grupo`.
- **`menu.html` + `menu.css`**: toggle A2 arriba del carrito, chip por ítem, cargo por unidad
  llevada. `getModalidadOrden()` ya no lee un radio: se deriva del carrito.
- **`utils.js` / `cocina.js` / `pedidos.js`**: badge de resumen con el conteo + badge por menú
  dentro del encabezado de grupo. `renderMenuAgrupado()` ahora pasa las líneas del grupo al
  callback del encabezado.

### Dos huecos de seguridad cerrados de paso

Con la modalidad en las líneas, el whitelist del resumen dejó de alcanzar: un cliente
manipulado podía mandar líneas `para_llevar` a un restaurante que no lo ofrece. Se valida
ahora sobre las líneas ya normalizadas, en órdenes y reservas. **Las órdenes nunca habían
validado `para_llevar_activo`** — era un hueco previo a este issue.

## Verificación

- `tests/modalidad-por-menu.test.js` — 19/19 unitarios del util (normalización por grupo,
  resumen, conteo de tappers, cliente viejo sin el campo, delivery).
- `scripts/test-modalidad-mixta.js` — 19/19 E2E punta a punta: el carrito con modalidades
  distintas, el toggle en sus tres estados, el POST, lo que quedó en la BD (incluido
  **S/ 1.00 de envase y no S/ 2.00**) y lo que ve la cocina.
- Suite completa **449/449 jest**; `test-grupo-punta-a-punta.js` 13/13 y `test-menu-wizard.js`
  51/51 sin regresiones. Las dos vistas revisadas por captura, no solo por asserts.
- `tests/cola-dia.test.js` necesitó `modalidad` en su schema in-memory.

**Nota:** `scripts/test-gate-pago.js` falla en este entorno, pero **falla igual sin estos
cambios** (verificado con `git stash`): es un fallo previo por datos locales, no una regresión.

## Fuera de alcance

El selector por menú se implementó en el **pedido** (el caso del día 5 es una orden de mesa).
La **reserva** conserva su selector de pedido completo; el backend la normaliza igual, así que
todas sus líneas heredan esa modalidad y nada se rompe. Queda pendiente si aparece el caso.

## Riesgo de deploy

🔴 **Rojo** en la escala de `backlog.md`: toca Cola del día y Cocina, los módulos que reciben la
carga real. Desplegar fuera de la ventana de servicio (12:00–18:00) y verificar con calma.
