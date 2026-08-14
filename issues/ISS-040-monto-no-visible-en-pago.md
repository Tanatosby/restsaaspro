# ISS-040 — El monto a pagar no se muestra en la pantalla de Yape/Plin

**Estado:** 🔎 Diagnosticado — fix pendiente (no implementado a pedido del usuario, se
documenta primero)
**Módulo:** `public/menu.html` (`showPagoStep`, `pagoPendiente`, `#pago-screen`)
**Prioridad:** 🔴 Crítica — ocurre en el momento exacto en que el comensal necesita el dato
para completar el pago; sin él, no puede terminar la transacción con confianza

---

## Síntoma reportado

El usuario, sobre un comensal pidiendo desde `menu.html`:

> "Cuándo está pidiendo un comensal y pasó a pago alertó que no le aparecía la cantidad que
> tenía que pagar justo cuando quería hacer el yape, no recordaba, justo antes de adjuntar la
> captura."

---

## Diagnóstico

El total del pedido/reserva sí se calcula y se guarda en memoria (`pagoPendiente.total`,
`menu.html:893` para pedidos y `:1003` para reservas), pero **nunca se pinta en la pantalla
de pago** (`showPagoStep()`, `menu.html:1022-1047`). Ese paso —donde el comensal elige
Yape/Plin, ve el número al que transferir y sube la foto del comprobante— solo muestra
`#pago-orden-ref` con la cantidad de ítems ("Tu pedido — 3 ítems"), sin ningún monto.

El monto sí existe en dos pantallas, pero ninguna es la que importa en el momento del pago:

- **Antes:** en el carrito (`cart-total-bar`/`cart-total-drawer`), que el comensal ya cerró
  al pasar a pagar.
- **Después:** recién en el repaso final (`#repaso-total`, `showRepasoStep()`,
  `menu.html:1147`), que aparece **después** de elegir método, subir la foto y tocar
  "Ya pagué" — cuando la transferencia ya se hizo.

Es decir: el único hueco sin el monto es exactamente la pantalla donde el comensal abre su
app de Yape/Plin y necesita el número a transferir. Coincide con lo reportado: se olvida
justo antes de adjuntar la captura.

---

## Reproducción

1. Abrir `menu.html`, agregar ítems al carrito, tocar "Confirmar pedido" con un restaurante
   que tenga Yape/Plin activos.
2. En la pantalla "💳 ¿Cómo vas a pagar?", elegir Yape o Plin.
3. Observar: se muestra el número a transferir y el campo para subir la foto, pero en ningún
   punto de esa pantalla aparece cuánto hay que pagar.

---

## Solución propuesta (sin implementar)

Mostrar `pagoPendiente.total` en `#pago-screen`, visible desde que se entra a la pantalla
hasta que se sube el comprobante — no solo en el repaso final. Cambio acotado a
`showPagoStep()` y al HTML de `#pago-screen`, 100% frontend, sin tocar backend.

---

## Pendiente

- Implementar y verificar con `npx jest` (no debería afectar backend).
- Confirmar que el monto se ve claro también en la pantalla de "efectivo" (sin comprobante,
  pero el comensal igual necesita saber cuánto preparar).
