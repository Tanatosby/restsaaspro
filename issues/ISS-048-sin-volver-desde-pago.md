# ISS-048 — Sin forma de volver atrás desde "¿Cómo vas a pagar?"

**Estado:** 🟡 **Diagnosticado, sin implementar.**
**Módulo:** `public/menu.html` (`#pago-screen`).
**Prioridad:** 🟠 Alta — es la pantalla donde el comensal está a punto de subir plata (Yape/Plin)
o confirmar, y si se olvidó de un ítem no tiene cómo corregirlo sin cerrar la pestaña.

---

## Síntoma reportado

Reportado por el usuario (2026-08-19): parado en la pantalla "💳 ¿Cómo vas a pagar?", no hay
forma de retroceder a la carta para revisar o agregar algo que se olvidó. La pantalla "📋 Revisa
tu pedido" (el paso siguiente) sí tiene una flechita `←` que vuelve al paso anterior.

## Diagnóstico

`menu.html:228` (`#pago-screen`) no tiene ningún botón de "volver" — ni flecha, ni X, ni cierre
por backdrop. Comparado con `#repaso-screen` (`menu.html:268`), que sí tiene:

```html
<button onclick="volverAPago()" aria-label="Volver" ...>←</button>
```

`volverAPago()` solo sabe volver **un paso** (de repaso a pago) — no hay ningún camino de vuelta
más allá, hacia la carta/carrito.

**Confirmado que es seguro arreglarlo sin tocar nada de datos:** en este punto del flujo
**todavía no se creó la orden ni la reserva**. `crearOrden()`/`crearReserva()` recién se llaman
desde `confirmarEnvioFinal()`, en el repaso — es decir, **un paso después** de `pago-screen`
(`confirmarPedido()` / `confirmarReserva()`, `menu.html:1006-1020` y `:1115-1129`, comentario:
*"el pedido recién se envía al confirmar en la pantalla de repaso"*). El array `cart` / `resCart`
tampoco se vacía al entrar a `pago-screen`. O sea: no hay nada que deshacer en el backend, es
puramente un hueco de navegación en el frontend.

La única asimetría entre los dos flujos: `confirmarPedido()` llama `closeDrawer()` antes de
`showPagoStep()` (el pedido usa un drawer superpuesto sobre la carta), mientras que
`confirmarReserva()` no cierra nada (el carrito de reserva es contenido inline de la pestaña
"Reservar", no un drawer). El botón de volver tiene que contemplar los dos casos.

## Alcance propuesto (sin implementar todavía)

Agregar un botón `←` en `#pago-screen`, simétrico al de `#repaso-screen`, que:
- oculte `pago-screen`
- para el flujo de **pedido**: reabra el drawer del carrito (`openDrawer()`) — los ítems siguen
  intactos en `cart`.
- para el flujo de **reserva**: alcanza con ocultar `pago-screen`; el carrito ya está visible
  inline debajo.

No toca backend, no toca datos — cambio acotado a `menu.html` (HTML + una función nueva de
navegación).
