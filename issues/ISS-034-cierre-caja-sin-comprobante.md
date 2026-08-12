# ISS-034 — Cierre de caja: exige confirmar el pago pero no muestra el comprobante

**Estado:** ✅ Resuelto (2026-08-12) · **Prioridad:** Alta · **Módulo:** `public/js/modules/pedidos.js`

---

## Cómo apareció

Reportado por la **dueña del piloto #1** en una sesión de uso real, no por un test.
Intentando cerrar varios pedidos de días anteriores desde el cierre de caja, algunos le
daban error. Cita textual:

> *"Ah claro, pero es que tiene razón, debo confirmar el pago, pero no me sale la foto
> del pago aquí, ¿cómo hago para confirmarlo?"*

Su expectativa era la correcta: en esa zona se había definido que solo hubiera **cerrar o
cancelar**. El pedido de confirmar el pago no estaba previsto ahí.

## El problema

Las tarjetas del modal de cierre (`cierreItemOrden()` / `cierreItemReserva()`) tenían solo
dos botones: **"💰 Se cobró"** y **"✗ No se concretó"**. El primero dispara
`PATCH /estatus` con `es_pagado` (órdenes) o `es_full` (reservas), y el backend lo bloquea:

```js
// routes/orders.js:405  (y reservations.js:270)
if (nuevoEstatus.es_pagado && requiereConfirmarPagoAntes(orden.metodo_pago, orden.estado_pago))
  return res.status(400).json({ error: 'Confirma el pago (revisa el comprobante) antes de completar la orden' });
```

`requiereConfirmarPagoAntes()` (`utils/verificacionPago.js`) salta cuando el método es
**Yape o Plin** y nadie confirmó el comprobante. En efectivo no salta — por eso unos
pedidos le cerraban y otros no, sin patrón visible para ella.

**Y el error no tenía salida.** La tarjeta del cierre no mostraba el comprobante ni el
botón de confirmar. Esos elementos existían **solo en la Cola del día**, en Órdenes y en
Reservas — pero estos pedidos son de **días anteriores**, así que ya no aparecen en la
Cola. El sistema le exigía una acción que en esa pantalla era imposible de ejecutar.

**Workaround que se usó mientras tanto:** el panel **Órdenes** sí los mostraba, porque
`GET /api/orders/activas` no filtra por fecha y seguía listando los pedidos viejos.

> ⚠️ Justamente por eso, **el filtro de fecha en `/api/orders/activas` no debía hacerse
> antes que este fix**: era la única salida que le quedaba. Ver `backlog.md` sección C
> (T1 antes que T4).

## Solución

El backend ya devolvía todo lo necesario: `pedidosSinCerrar()` (`utils/colaDia.js:222`)
reusa `ordenesActivas()`/`reservasActivas()`, que ya seleccionan `metodo_pago`,
`estado_pago` y `comprobante_url`. **No hizo falta tocar backend ni la consulta.**

En `pedidos.js`:

- Las dos tarjetas del cierre ahora muestran `badgePago(x)` + `comprobanteThumb(x)`, las
  mismas funciones que usan las tarjetas de la Cola (`comprobanteThumb` vive en
  `utils.js:43` desde ISS-021, `badgePago` en `ordenes.js:16`).
- El botón principal es condicional, igual que en `btnOrden()`/`btnReserva()`: si
  `requiereConfirmarPago(x)` es verdadero muestra **"✓ Confirmar pago"**; si no, el
  **"💰 Se cobró"** de siempre.
- Nueva `confirmarPagoCierre(tipo, id)`. **No se reutiliza `confirmarPagoEnCola()`**
  porque esa opera sobre `_cache` y repinta la Cola con `renderColaDesdeCache()`; acá la
  lista es `_sinCerrar` y el modal tiene su propio `renderCierreCaja()`. Sin eso, el pago
  se confirmaba en el servidor pero la tarjeta no cambiaba hasta reabrir el modal — el
  mismo bug que ya se había corregido para la Cola.
- Actualización optimista con reversión y guard `_enVuelo`, mismo patrón que el resto del
  módulo desde ISS-026 (evita el doble tap).

El flujo queda: **Confirmar pago → la tarjeta se repinta con "Se cobró" → cerrar**, todo
sin salir del modal.

## Verificación

406/406 jest verde (sin cambios de cobertura: es frontend). `node --check` sobre
`pedidos.js`. Helpers verificados en scope: `badgePago`, `comprobanteThumb` y
`requiereConfirmarPago` son globales (scripts clásicos, no ES modules) y `ordenes.js`
carga antes que `pedidos.js` en el `<head>` de `owner.html`.

**Pendiente: prueba manual en producción** — reproducir el caso con un pedido viejo de
Yape/Plin sin confirmar.
