# ISS-048 — Sin forma de volver atrás desde "¿Cómo vas a pagar?"

**Estado:** ✅ **Resuelto 2026-08-19.**
**Módulo:** `public/menu.html` (`#pago-screen`).
**Prioridad:** 🟠 Alta — es la pantalla donde el comensal está a punto de subir plata (Yape/Plin)
o confirmar, y si se olvidó de un ítem no tiene cómo corregirlo sin cerrar la pestaña.
**Origen:** encontrado por el usuario probando la app (no reportado por la dueña del piloto).

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

## Solución implementada

Botón `←` en `#pago-screen`, mismo estilo/posición que el de `#repaso-screen`, con una función
nueva `volverDePago()`:

```js
function volverDePago() {
  document.getElementById('pago-screen').classList.remove('show');
  if (pagoPendiente?.tipo === 'orden') openDrawer();
}
```

Contempla los dos casos del diagnóstico: para **pedido** reabre el drawer (que `confirmarPedido()`
había cerrado); para **reserva** alcanza con ocultar la pantalla, porque nunca se cerró nada. No
toca backend ni borra `pagoPendiente` — si el comensal vuelve a confirmar, `confirmarPedido()`/
`confirmarReserva()` lo reconstruyen con el carrito actual.

**Verificación:** `scripts/test-iss048-volver-pago.js` nuevo, **15/15** — cubre pedido y reserva:
llega a la pantalla de pago, vuelve, confirma que no se creó nada en el backend con solo volver,
que el carrito sigue intacto, que confirmar de nuevo después de volver funciona igual que la
primera vez, touch target del botón (46px) y sin overflow a 360px. 449/449 jest y
`test-modalidad-mixta` 19/19 sin regresiones (mismo archivo, `menu.html`).
