# ISS-055 — Sin forma de regresar un pedido de "Listo" a "Cocina"

**Estado:** ✅ **Resuelto 2026-08-21.**
**Módulo:** `public/js/modules/pedidos.js` (Cola del día).
**Prioridad:** 🔴 Alta — la cocinera quedaba sin salida ante un toque accidental.
**Origen:** piloto #1, Día 7 (2026-08-20), reportado por el usuario el 2026-08-21. Textual de
la cocinera: *"Pedro, no me puedes hacer que de Listos pueda regresar a cocina, mandé algunos
menús a listo por casualidad y no podía volver a cocina."* Pidió que el regreso sea por orden
individual (ej. el pedido #12 vuelve a #12, sin tocar el #11 ni el #13).

---

## Diagnóstico

En la zona **Listos** de la Cola del día (`btnOrden`/`btnReserva` en `pedidos.js`) solo existía
un botón hacia adelante (`Entregar`/`Cobrar`) — ningún camino de vuelta. El backend, en cambio,
**ya permitía el cambio hacia atrás**: `PATCH /api/orders/:id/estatus` y
`PATCH /api/reservations/:id/estatus` aceptan cualquier `flag` válido mientras la orden/reserva
no esté pagada ni cancelada (`orders.js:434`, `reservations.js:284`) — no hay ninguna regla que
obligue a que el flujo de estatus avance solo hacia adelante. Era 100% un hueco de frontend.

## Solución implementada

Dos funciones nuevas en `pedidos.js`, que reusan el mecanismo optimista ya existente
(`accionRapidaOrden`/`accionRapidaReserva`) con `flag: 'es_en_cocina'`:

```js
function btnRegresarACocinaOrden(o) {
  return `<button class="btn btn-ghost btn-sm" onclick="accionRapidaOrden(${o.id},'es_en_cocina')">↩️ Regresar a cocina</button>`;
}
function btnRegresarACocinaReserva(r) {
  return `<button class="btn btn-ghost btn-sm" onclick="accionRapidaReserva(${r.id},'es_en_cocina')">↩️ Regresar a cocina</button>`;
}
```

Se agregan junto al botón principal solo en la zona `listos` de `btnOrden`/`btnReserva` (para
las 3 combinaciones posibles ahí: entrega en mesa, para llevar y sin mesa) — nunca en `pendientes`
ni `cobrar`, donde no tiene sentido regresar. `.btn-ghost` ya existía en `owner.css` como estilo
secundario, y `.btn-sm` ya cumple el mínimo táctil de 44×44px — sin cambios de CSS.

El regreso es por ítem individual (mismo mecanismo de `accionRapida()` con clave `o{id}`/`r{id}`),
así que el pedido #12 vuelve a cocina sin tocar el #11 ni el #13, tal como lo pidió la cocinera.

## Verificación

457/457 jest sin regresiones (el backend no cambió). Sin test E2E nuevo — el cambio reusa un
endpoint y un mecanismo de estado optimista ya cubiertos por la suite existente de la Cola del
día; el riesgo nuevo es puramente de UI (un botón más), verificado a mano.
