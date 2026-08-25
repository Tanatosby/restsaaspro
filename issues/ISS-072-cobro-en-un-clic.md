# ISS-072 — Cobro en 1 clic para todos los métodos de pago

**Estado:** Resuelto — 2026-08-25
**Reportado por:** el usuario, contando una conversación del mismo día con la dueña

## Problema

Cita textual de la dueña: *"No entiendo la función del cobro, ¿por qué son dos clics con yape?
y solo uno cuando paga en efectivo? mejor que sea solo uno para todo, más rápido."* También:
*"me confundo cuando en una mesa uno es en efectivo y 2 en yape, no lo entiendo."*

El paso extra (botón "✓ Confirmar pago" antes de "💰 Cobrar/Completar") era una decisión de
diseño a propósito — servía para que la dueña revisara el comprobante de Yape/Plin antes de
dar el pedido por cobrado (`utils/verificacionPago.js`, backend lo exige también). No era un
bug, era un candado de verificación.

## Por qué se sacó igual

El usuario contó el detalle real de cómo lo usa la dueña, que cambia la lectura del problema:
- **Ya revisa la foto hasta 3 veces** en el camino de un pedido (pendientes → listos → cobrar)
  y **aun así** dice "voy a verificar a yape para verlo" — entra a la app real de Yape y anota
  el nombre en su cuaderno. La verificación en la app no le genera la confianza para la que
  estaba pensada; ella verifica por fuera de todas formas.
- **El paso se puede evadir desde el origen**: comensales eligen "efectivo" en la app para no
  subir foto y después pagan por Yape en persona — el `metodo_pago` guardado ni siquiera
  refleja la realidad en esos casos.
- **No detecta lo que sí importa**: hubo 2 comprobantes subidos por un monto menor al que se
  debía (S/10 en vez de S/11) y la app no avisó nada — el paso de "Confirmar pago" no valida
  montos, solo exige un tap.
- Explicado el porqué del paso extra ("Validación"), la respuesta de la dueña fue explícita:
  *"no no, no entiendo, redúcelo a un clic."*

Dado que el paso extra no cumplía la función para la que se diseñó (la dueña igual verifica
por fuera) y sí sumaba fricción real en hora pico, se sacó — decisión de negocio de la dueña,
no una simplificación unilateral.

## Fix

Un solo botón (💰 Cobrar / Completar / Se cobró, según el panel) hace las 2 llamadas que antes
requerían 2 taps — sin cambios de backend, el candado del servidor
(`requiereConfirmarPagoAntes`) lo sigue satisfaciendo la misma acción, solo que en un tap.
Tocaba 4 lugares con el mismo patrón duplicado:

- `reservas.js` — `confirmarPagoReserva()` → `completarReserva(id, requiereConfirmar)`.
- `ordenes.js` — `confirmarPagoOrden()` → `cobrarOrden(id, requiereConfirmar, flag)`.
- `pedidos.js` (Cola del día) — `confirmarPagoEnCola()`/`ColaOrden`/`ColaReserva` →
  `cobrarColaOrden(id)`/`cobrarColaReserva(id)` (reusan `accionRapidaOrden/Reserva` para el
  paso final, que ya maneja UI optimista + reversión).
- `pedidos.js` (Cierre de caja) — `confirmarPagoCierre()` → `cobrarCierre(tipo, id)` (reusa
  `cerrarPedidoViejo()` para el paso final).

Sin cambios de backend. 34/34 test suites, 458/458 tests.

## Sin implementar — quedan como ideas para más adelante

Dos hallazgos concretos de la conversación, con valor real pero fuera del pedido de hoy:
1. **Aviso de monto distinto** en el comprobante subido vs. el total del pedido (el caso de
   S/10 vs S/11) — necesitaría lectura del monto en la foto o que el comensal lo declare al
   subirla.
2. **Corrección de método de pago** cuando el comensal dijo "efectivo" pero pagó por Yape —
   hoy no hay forma de que la dueña corrija el `metodo_pago` de un pedido después de creado.

## Verificación pendiente

Sin probar en uso real — confirmar que el cobro de 1 clic se siente más simple y no genera
pedidos marcados como cobrados sin que la dueña haya mirado el comprobante al menos una vez
(ya no hay ningún paso que la obligue a abrirlo, aunque la miniatura sigue visible en la
tarjeta).
