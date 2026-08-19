# ISS-049 — El pedido se pierde si la pestaña se recarga sola al salir a pagar

**Estado:** ✅ **Resuelto 2026-08-19.**
**Módulo:** `public/menu.html` (`pagoPendiente`, `seleccionarMetodoPago()`, `init()`).
**Prioridad:** 🔴 Crítica — pasa en el paso final de cada pedido, no en un caso raro.

---

## Síntoma reportado

Contado por el usuario (2026-08-19, "ayer" respecto a esa fecha — día 5 del piloto): una persona
estaba pidiendo, copió el número de Yape, cambió a la app de Yape para pagar y, al volver a la
pestaña del navegador, la página "ya había expirado" — tuvo que rehacer el pedido entero. La
dueña, textual: *"Uy, ¿ahí no se puede hacer algo? porque si se les reinicia cada vez que pagan
van a aburrirse de usar la app."*

## Diagnóstico

`menu.html` no persistía absolutamente nada del pedido en curso — `cart`, `resCart`,
`pagoPendiente`, todo vivía solo en memoria del navegador, sin `localStorage`/`sessionStorage`
ni manejo de `visibilitychange`/`pagehide`.

El flujo de pago obliga a salir de la pestaña (abrir Yape/Plin, una app pesada) y volver. En un
celular de gama media con RAM limitada, es un comportamiento normal de Chrome **descargar la
pestaña de fondo** para liberar memoria mientras el comensal está en la otra app. Al volver,
la pestaña **no se reanuda**: se recarga desde cero, y `init()` arranca con todo vacío. No es
que "expiró" nada — es que la recarga completa borra todo lo que vivía en memoria.

Esto no es un caso raro: es **el camino normal de pago del sistema** (copiar número → salir a
pagar → volver a confirmar). Pasa cada vez que alguien paga con Yape o Plin.

## Solución implementada

Se persiste `pagoPendiente` en `localStorage` desde el momento en que el comensal **elige un
método de pago** (`seleccionarMetodoPago()`) — es el punto justo antes de salir a pagar. También
se guarda al entrar a la pantalla de pago (`confirmarPedido()`/`confirmarReserva()`) y cuando ya
se creó la orden/reserva en el backend (`confirmarEnvioFinal()`, evita que un reintento la
duplique).

**La foto del comprobante NO se persiste** — un `File` no sobrevive un `JSON.stringify`. Si el
comensal ya la había elegido antes de que la pestaña se recargara, tiene que volver a adjuntarla;
el resto del pedido (ítems, total, nombre, método elegido) se recupera solo.

`init()` llama a `restaurarPagoPendienteLocal()` al final: si hay un pago guardado del mismo
restaurante/mesa y no pasaron más de 2 horas, reconstruye `pagoPendiente`, vuelve a mostrar
"¿Cómo vas a pagar?" con el método ya marcado, y avisa con un toast "Recuperamos tu pedido". Se
limpia el guardado al confirmar con éxito, al volver a la carta (ISS-048) o al reiniciar todo.

**Fuera de alcance a propósito:** esto solo cubre el pedido desde que entra a pagar en adelante,
no el carrito mientras arma el pedido navegando la carta — es el caso reportado y el de mayor
impacto (el comensal ya decidió qué quiere; perderlo ahí es lo que más frustra). Persistir el
carrito completo desde el inicio queda como extensión futura si aparece un caso real que lo pida.

## Verificación

`scripts/test-iss049-recuperar-pago.js` nuevo, **12/12**. Usa `page.reload()` para simular
exactamente el caso real (borra todo el estado en memoria, conserva `localStorage` — igual que
Chrome matando una pestaña de fondo): arma el carrito, elige método, recarga, confirma que
vuelve solo a la pantalla de pago con el mismo total y método ya marcado, que el pedido se puede
terminar de confirmar sin duplicar la orden, y que una visita nueva después de confirmar no trae
de vuelta nada viejo. 449/449 jest + `test-iss048-volver-pago` 15/15 y `test-modalidad-mixta`
19/19 sin regresiones (mismo archivo, `menu.html`).
