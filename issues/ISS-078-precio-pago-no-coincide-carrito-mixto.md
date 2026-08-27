# ISS-078 — El total de la pantalla de pago no coincidía con el del carrito (carrito mixto)

**Estado:** ✅ Resuelto — 2026-08-27
**Módulo:** `public/menu.html`
**Prioridad:** 🔴 Alta — el comensal pagaba de menos por Yape/Plin; pérdida de dinero real, no solo
un número mal mostrado.

---

## Reporte del usuario

> "otros hallazgos que tuve. Cuando una persona eligió para llevar un menú y para comer acá otro,
> la cuenta le apareció 23.50 en el carrito, pero en pasar a la vista del pago de yape le apareció
> 22. (Discrepancia de precios)"

Día 13 del piloto (2026-08-27), reportado en conversación de escritorio.

---

## Diagnóstico

Desde **ISS-047** la modalidad (para llevar / en local) vive por ítem del carrito, y
`getModalidadOrden()` resume todo el pedido como `'en_local' | 'para_llevar' | 'mixto'`.

- El carrito (`updateCart()`) calcula el cargo del tapper con `contarTappersLlevar(cart)` — cuenta
  solo los ítems marcados "para llevar". Correcto: con 1 menú para llevar cobra 1 tapper.
- `confirmarPedido()`, al armar `pagoPendiente.total` para la pantalla "¿Cómo vas a pagar?", seguía
  usando una condición previa a ISS-047: `getModalidadOrden() === 'para_llevar'` — solo aplicaba el
  cargo si **todo** el pedido era para llevar. Con un carrito mixto, `getModalidadOrden()` da
  `'mixto'`, la condición es falsa, y el cargo del tapper se caía a **0** → el total de la pantalla
  de pago salía S/ 1.50 más barato que el del carrito.

**Impacto real:** el monto de la pantalla de pago es el que el comensal usa para transferir por
Yape/Plin. El backend (`calcularCargoModalidad()`, ISS-029/ISS-047) sí calcula el total correcto al
crear el pedido — el sistema registraba S/ 23.50, pero el comensal transfería S/ 22.00. La
discrepancia nunca se hubiera notado en `scripts/test-modalidad-mixta.js`: ese test crea la orden
con un `fetch` directo a `/api/public/orders`, sin pasar por `confirmarPedido()` ni por la pantalla
de pago — el camino exacto donde vivía el bug.

## Solución

- `public/menu.html` — `confirmarPedido()`: el cálculo del cargo pasa de
  `getModalidadOrden() === 'para_llevar' ? contarTappers(cart) * costo_tapper : 0` a
  `contarTappersLlevar(cart) * costo_tapper` — misma cuenta por ítem que ya usa `updateCart()`, así
  el total de la pantalla de pago siempre coincide con el del carrito.
- Reservas (`updateResCartSummary()`/`confirmarReserva()`) **no tenían este bug**: la modalidad de
  una reserva se elige con un radio button para todo el pedido (no por ítem), así que no existe el
  caso de carrito mixto ahí — ambas funciones ya coincidían entre sí.

## Verificación

- `scripts/test-pago-mixto.js` nuevo (5/5): arma el carrito mixto real (1 menú en local + 1 para
  llevar), activa Yape, y compara el total mostrado en el carrito contra el que arma la pantalla de
  pago — deben coincidir. Con el código viejo este test fallaba (S/ 30.00 en pago vs. S/ 31.50 en
  el carrito).
- `scripts/test-modalidad-mixta.js` sin regresiones (19/19).
- 469/469 jest.

## Relacionado

[ISS-047](ISS-047-modalidad-por-menu.md) (modalidad por ítem), [ISS-029](ISS-029-cargo-tapper-fijo.md)
(cargo del tapper por unidad).
