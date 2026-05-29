# ISS-001 — Confirmar pago con Plin (o Yape) falla a veces

**Estado:** ✅ cerrado — 2026-05-21  
**Módulo:** Pagos / Reservas  
**Reproducible:** a veces  
**Fecha detectado:** 2026-05-21  
**Relacionado con:** [REFACTOR-001](REFACTOR-001-estatus-dinamicos.md)

---

## Descripción

Al intentar confirmar un pago con Plin (y posiblemente Yape) desde `owner.html`, a veces funciona y a veces no. El comportamiento es inconsistente — no hay un patrón claro de cuándo falla.

## Hipótesis principal (pendiente de confirmar)

Existe un doble mecanismo de confirmación para reservas:

1. **Botón "✓ Confirmar pago"** en la tarjeta de reserva → actualiza `estado_pago = 'confirmado'` vía `PATCH /api/reservations/:id/confirmar-pago`
2. **Mover la reserva a estatus `es_full`** → cierra la reserva y la manda al historial

Si el owner hace las dos cosas en distinto orden, o si alguna de las dos falla silenciosamente, el estado queda inconsistente. Por ejemplo:
- Si la reserva ya está en `es_full` (historial) cuando se intenta confirmar el pago, el endpoint puede no encontrarla en la vista activa.
- Si el estatus dinámico fue renombrado por el admin (nombre != 'completada'), la lógica que busca por nombre de texto falla.

## Pasos para reproducir (conocidos)

1. Cliente hace una reserva desde `menu.html` y paga con Plin
2. Cliente toca "Ya pagué" → `estado_pago = 'enviado'`
3. Owner ve la reserva en `owner.html` con badge "pago enviado"
4. Owner toca "✓ Confirmar pago" → **a veces falla**

## Comportamiento esperado

El pago se confirma siempre que `estado_pago = 'enviado'`.

## Comportamiento actual

A veces el botón responde con error (se desconoce el mensaje exacto — ver sección Capturas).

## Capturas

_(pendiente — cuando se reproduzca, agregar captura de F12 > Console y F12 > Network con la request fallida)_

## Contexto técnico

**Endpoint involucrado:** `PATCH /api/reservations/:id/confirmar-pago`

```javascript
// routes/reservations.js (aproximado)
router.patch('/:id/confirmar-pago', authorize('owner', 'mozo'), (req, res) => {
  const reserva = db.prepare(`
    SELECT id, estado_pago FROM reservas WHERE id = ? AND id_restaurante = ?
  `).get(req.params.id, req.user.restaurant_id);

  if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
  ...
```

Si la reserva ya pasó a historial (estatus es_full), puede que la consulta falle o que
el estado de la reserva ya no sea el esperado.

**Fix aplicado en REFACTOR-001 (2026-05-21):**
- ✅ Botón "Confirmar pago" eliminado de tarjetas de reserva y de órdenes en `owner.html`
- ✅ Cuando el backend mueve una reserva a `es_full = 1`, setea automáticamente `estado_pago = 'pagado'`
- ✅ Ídem para órdenes con `es_pagado = 1`
- Un solo mecanismo, inconsistencia eliminada

## Información necesaria para diagnóstico completo

Para confirmar la hipótesis necesito:
1. Captura de `F12 > Console` en el momento del error (mensaje exacto)
2. Captura de `F12 > Network` filtrando por "confirmar-pago" — ver el request y la respuesta del servidor (status code + body)
3. Saber si el owner había movido la reserva a otro estatus antes de intentar confirmar el pago
