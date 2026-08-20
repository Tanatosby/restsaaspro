# ISS-054 — "Agregar manual" no respetaba el stock por plato

**Estado:** ✅ **Resuelto 2026-08-20.**
**Módulo:** `public/js/modules/pedidos.js`.
**Prioridad:** 🔴 Alta — permitía tomar pedidos de platos sin porciones restantes.
**Origen:** reportado por el usuario ("al momento de hacer un ingreso manual ahora mismo no
leyó el kardex, es decir seguían apareciendo platos").

---

## Diagnóstico

El picker de "Agregar manual" (`renderManualSeccion` / `abrirPickerManual`, sumado en ISS-053)
filtraba los platos elegibles con `seccion.platos.filter(p => !p.agotado)` — solo miraba el
toggle manual "Disponible/Agotado", nunca `stock_restante`. Un plato con control de stock activo
que se quedó en 0 porciones (`componentes_menu_dia.stock_restante = 0`) seguía apareciendo como
elegible en el modal, aunque nadie lo hubiera marcado "Agotado" a mano.

El lado del cliente (`menu.html` → `GET /api/public/menu` → `routes/public.js`) sí filtraba las
dos condiciones desde siempre:
```sql
WHERE ... AND cmd.agotado = 0 AND (cmd.stock_restante IS NULL OR cmd.stock_restante > 0)
```
`POST /api/orders` valida el stock real al guardar (`utils/stock.js` → `descontarStock`, 409 si
no alcanza) — pero recién ahí, al final del flujo, no en el picker.

Se confirmó además que el descuento de stock es correcto y ocurre exactamente al confirmar
(no antes, no después): `routes/public.js` (orden/reserva del cliente), `routes/orders.js`
(orden del mozo/manual) y `routes/reservations.js` (reserva del owner) llaman `descontarStock`
dentro de la misma transacción del INSERT, y se devuelve al cancelar. El bug era puramente de
lectura/filtro en el picker de "Agregar manual", no del cálculo de stock en sí.

## Solución implementada

Nueva función compartida `platoDisponibleManual(p)` en `pedidos.js`:
```js
function platoDisponibleManual(p) {
  return !p.agotado && (p.stock_restante === null || p.stock_restante > 0);
}
```
Reemplaza el filtro `!p.agotado` en los dos lugares del picker (`renderManualSeccion`,
`abrirPickerManual`) — mismo criterio que ya usaba `menu.html`/`routes/public.js`.

## Verificación

`scripts/test-agregar-manual.js` — sumado fixture de un plato con `stock_restante = 0` (sin
marcar "Agotado") y verificación de que no aparece en el `PlatoPicker`. **30/30** (antes 28).
457/457 jest sin regresiones.
