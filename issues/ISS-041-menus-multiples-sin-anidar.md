# ISS-041 — Dos menús del día en el mismo pedido no se pueden diferenciar

**Estado:** 🔎 Diagnosticado — fix pendiente (no implementado a pedido del usuario, se
documenta primero). Requiere migración de esquema, no es solo un cambio de vista.
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

## Solución propuesta (sin implementar) — requiere cambio de esquema

1. Migración idempotente: columna `grupo` (o `linea`) en `orden_menu_items` y
   `reserva_menu_items`.
2. Frontend: asignar un índice de grupo por cada menú agregado al carrito y viajarlo en el
   payload en vez de aplanarlo sin esa info.
3. Backend: guardar `grupo` al insertar (`routes/public.js`), devolverlo en los `SELECT` de
   detalle (`routes/orders.js`, `routes/reservations.js` — varios puntos cada uno).
4. Frontend: agrupar por `grupo` antes de renderizar en los 4 lugares identificados — algo
   como "🍽️ Menú 1: Entrada X + Segundo Y" / "🍽️ Menú 2: Entrada A + Segundo B".
5. Tests nuevos/actualizados + `npx jest` completo.

---

## Pendiente

- Decidir si se implementa junto con ISS-042 (comparten el mismo módulo de renderizado en
  cocina) o por separado — este toca esquema de datos, ISS-042 es solo frontend.
- Confirmar alcance: ¿aplica también cuando se mezclan tipos de menú distintos en el mismo
  pedido (no solo 2 del mismo tipo)? El diseño de `grupo` propuesto cubre ambos casos igual.
