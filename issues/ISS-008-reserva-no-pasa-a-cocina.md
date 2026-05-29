# ISS-008 — Reserva no aparece en cola de cocina al pasar a "En preparación"

**Estado:** Resuelto — 2026-05-23
**Módulo:** Cocina / Reservas
**Prioridad:** Alta
**Capturas:** issue_reserva_nopaso_acocina.png, issue_reserva_no_paso_acocina2.png

---

## Descripción

Cuando el owner avanza una reserva al estado `es_en_cocina` (botón "🍳 A cocina"), la reserva desaparece del panel Reservas (correcto — ya no está en estados iniciales/confirmada) pero **no aparece en el panel Cocina**. El cocinero ve "¡Todo al día! Sin órdenes pendientes" aunque haya reservas pendientes de preparar.

Capturas:
- `issue_reserva_nopaso_acocina.png` — Panel Reservas: reserva de "Pedro Rotta" con botón "✅ Listo" visible (confirmando que está en `es_en_cocina`)
- `issue_reserva_no_paso_acocina2.png` — Panel Cocina: vacío, "¡Todo al día! Sin órdenes pendientes"

## Causa raíz

`public/js/modules/cocina.js` — función `loadColaCocina()` (línea 15):

```js
const ordenes = await api('GET', '/api/orders/activas');
```

Solo fetcha **órdenes**. Nunca fetcha reservas. Las reservas con `es_en_cocina = 1` existen en BD y el endpoint `GET /api/reservations?flag=es_en_cocina` funciona correctamente, pero `cocina.js` no lo llama.

## Archivos a tocar

- `public/js/modules/cocina.js`
  - `loadColaCocina()`: agregar `GET /api/reservations?flag=es_en_cocina`
  - Agregar sección "Reservas en preparación" en el HTML renderizado
  - Agregar función `renderCocinaReserva(r)` con botón "✅ Listo" que llama a `cambiarEstatusReservaFlag(r.id, 'es_listo')`
  - Badge de cocina debe contar `ordenes activas + reservas en cocina`

## Solución aplicada

**2026-05-23 — `public/js/modules/cocina.js`:**
- `loadColaCocina()`: ahora fetcha en paralelo `GET /api/orders/activas` y `GET /api/reservations?flag=es_en_cocina` con `Promise.all`
- Badge de cocina: cuenta órdenes activas + reservas en cocina
- Nueva sección "Reservas en preparación" (borde violeta `#818cf8`) renderizada después de las órdenes
- Nueva función `renderCocinaReserva(r)`: muestra nombre cliente, mesa, hora de llegada, código, ítems de menú y carta, badge "Reserva"
- Nueva función `marcarReservaListaCocina(id)`: llama a `PATCH /api/reservations/:id/estatus { flag: 'es_listo' }` — mismo endpoint que usa el owner desde el panel Reservas
