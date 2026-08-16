# ISS-042 — La etiqueta "para llevar" no llega a la vista de cocina

**Estado:** ✅ **Resuelto 2026-08-16** — pendiente de deploy
**Módulo:** `public/js/modules/cocina.js` (`renderCocinaTicket`, `renderCocinaReserva`)
**Prioridad:** 🔴 Crítica — el cocinero prepara el plato sin saber si va servido en mesa o
tiene que envasarse para llevar, con riesgo real de preparar/emplatar distinto a lo pedido

---

## Síntoma reportado

El usuario:

> "la etiqueta 'para llevar' también tiene que viajar a cocina para que la persona de cocina
> lo lea y pueda preparar los platos de una manera correcta."

---

## Diagnóstico

El dato ya existe y ya viaja hasta el frontend — el problema es que la vista de Cocina nunca
lo pinta.

- El backend que alimenta el panel de Cocina (`GET /api/orders/cola-cocina`) usa
  `cocinaDelDia()` en `utils/colaDia.js`, que **sí selecciona `modalidad`** tanto para
  órdenes (`utils/colaDia.js:123`) como para reservas (`utils/colaDia.js:163`). El dato llega
  al navegador en cada objeto `o`/`r`.
- Pero `public/js/modules/cocina.js` **no tiene ninguna referencia a `modalidad` en todo el
  archivo** — confirmado por búsqueda. Ni `renderCocinaTicket()` (línea 69, para órdenes) ni
  `renderCocinaReserva()` (línea 100, para reservas) lo leen ni lo muestran en el ticket.

Es decir: el cocinero ve el mismo ticket sin importar si el pedido es para comer en el local,
para llevar o delivery. Otras pantallas del panel (`ordenes.js`, `pedidos.js`) sí usan
`modalidad` para lógica de cobro/tapper, pero Cocina —la vista que más lo necesita para
decidir cómo emplatar y envasar— nunca lo recibió visualmente.

---

## Reproducción

1. Desde `menu.html`, hacer un pedido con modalidad "Para llevar" (si el restaurante la tiene
   activa).
2. Ver el ticket en el panel Cocina del owner.
3. Comparar con un pedido idéntico en modalidad normal (para consumir en el local) — los dos
   tickets se ven exactamente iguales, sin ninguna marca de "para llevar".

---

## Solución implementada (2026-08-16)

Resuelto **antes que ISS-041 y por separado**, decisión del usuario: este es 100% frontend
y ISS-041 requiere migración de esquema. Aunque los dos tocan `cocina.js`, mezclarlos habría
atado un fix chico y seguro a uno grande.

1. **`badgeModalidad()` se movió de `ordenes.js` a `utils.js`.** No se duplicó en `cocina.js`:
   es el mismo widget que ya usaban Órdenes, Reservas y Cola del día, y duplicarlo dejaba
   cuatro copias del mismo badge para mantener. Desde `utils.js` además **deja de depender
   del orden de carga** de los `<script>` de `owner.html`, donde `cocina.js` se carga en la
   línea 18 y `ordenes.js` recién en la 19.
2. **Nuevo parámetro `grande`** en `badgeModalidad(modalidad, grande = false)`: sube el badge
   de 11px a 15px para el ticket de cocina, sin tocar cómo se ve en las otras tres pantallas
   (que lo siguen llamando con un solo argumento). El cocinero lee este dato de reojo
   mientras cocina.
3. **`renderCocinaTicket()` y `renderCocinaReserva()`** pintan el badge **en línea propia,
   entre el header y la lista de platos** — no dentro del header: a 360px competiría con el
   badge de estatus / "Reserva", y va antes de los platos porque es lo que define cómo se
   emplata. En reservas explica de paso por qué no hay mesa (para llevar y delivery nunca
   la tienen).

Se mantuvo el 🛵 de delivery que ya usa el resto del panel, en vez del 🚚 que proponía el
diagnóstico: el cocinero ya asocia ese ícono con delivery en las otras pantallas.

Sin cambios de backend ni de esquema. **No hace falta bumpear el SW:** los módulos JS no
están en `ASSETS` de `sw.js` (se sirven de red — ver T11 en `backlog.md`).

---

## Verificación

`scripts/test-badge-modalidad-cocina.js` — sin navegador ni servidor: `renderCocinaTicket()`
y `renderCocinaReserva()` solo devuelven strings, así que se cargan `utils.js` + `cocina.js`
en un contexto de `vm` y se inspecciona el HTML. **15/15:**

- para llevar y delivery pintan su badge, en órdenes y en reservas;
- `en_local`, `null` y una orden **sin** la propiedad `modalidad` (registros viejos) no
  pintan nada ni imprimen `"undefined"`;
- `grande` cambia el tamaño solo cuando se pide;
- regresión: platos, botones de acción y el resto del ticket siguen intactos, y el badge
  queda antes de la lista de platos.

`npx jest` → **408/408 verde**. Revisado también en captura a 360px (claro y oscuro) con los
cuatro casos juntos: para llevar, delivery, en local y reserva para llevar.

---

## Pendiente

- **Deploy** (lo hace el usuario).
- Confirmar con la persona de cocina del piloto #1 que el badge se ve durante el servicio.
