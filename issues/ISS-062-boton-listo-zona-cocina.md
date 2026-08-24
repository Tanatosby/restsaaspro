# ISS-062 — Zona "Cocina" de la Cola del día solo permitía cancelar, no marcar "Listo"

**Estado:** ✅ **Resuelto 2026-08-24.**
**Módulo:** `public/js/modules/pedidos.js` (Cola del día).
**Prioridad:** 🔴 Alta — bloqueaba el flujo normal de cocina.
**Origen:** piloto #1, Día 9 (2026-08-22), reportado por el usuario el 2026-08-24.

---

## Diagnóstico

`btnOrden()`/`btnReserva()` en `pedidos.js` manejaban los casos `zona === 'pendientes'`,
`'listos'` y `'cobrar'`, pero **no `zona === 'cocina'`** — en esa columna `btnAccion` quedaba
vacío y la única acción visible era "✗ Cancelar" (siempre presente, ver `renderKanbanOrden`/
`renderKanbanReserva`). No había forma de avanzar un pedido de "En cocina" a "Listo" desde la
Cola del día.

## Solución implementada

Un caso nuevo en cada función, mismo patrón que los demás (reusa `accionRapidaOrden`/
`accionRapidaReserva`, ya con guard de doble tap y actualización optimista):

```js
if (zona === 'cocina' && o.es_en_cocina)
  return `<button class="btn btn-primary btn-sm" onclick="accionRapidaOrden(${o.id},'es_listo')">✅ Listo</button>`;
```

(análogo en `btnReserva`). El backend ya aceptaba esta transición — el mismo botón "→ Listo" ya
existe en `ordenes.js` y en `cocina.js` para `es_en_cocina → es_listo`. Como "↩️ Regresar a
cocina" ya existe en la zona Listos (ISS-055), el ciclo queda simétrico: cualquier toque
accidental tiene salida en ambas direcciones.

## Verificación

454/454 jest sin regresiones (backend sin cambios). Verificado a mano invocando
`btnOrden`/`btnReserva` con un ítem `es_en_cocina` en zona `'cocina'` — devuelven el botón
"✅ Listo" apuntando a `accionRapidaOrden/Reserva(id, 'es_listo')`.
