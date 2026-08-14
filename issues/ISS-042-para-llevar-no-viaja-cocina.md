# ISS-042 — La etiqueta "para llevar" no llega a la vista de cocina

**Estado:** 🔎 Diagnosticado — fix pendiente (no implementado a pedido del usuario, se
documenta primero)
**Módulo:** `public/js/modules/cocina.js` (`renderCocinaTicket`, `renderCocinaReserva`)
**Prioridad:** 🔴 Crítica — el cocinero prepara el plato sin saber si va servido en mesa o
tiene que envasarse para llevar, con riesgo real de preparar/emplatar distinto a lo pedido

---

## Síntoma reportado

El usuario:

> "la etiqueta 'para llevar' también tiene que viajar a cocina para que la persona de cocina
> lo lea y pueda preparar los platos de una manera correcta."

---

## Diagnóstico

El dato ya existe y ya viaja hasta el frontend — el problema es que la vista de Cocina nunca
lo pinta.

- El backend que alimenta el panel de Cocina (`GET /api/orders/cola-cocina`) usa
  `cocinaDelDia()` en `utils/colaDia.js`, que **sí selecciona `modalidad`** tanto para
  órdenes (`utils/colaDia.js:123`) como para reservas (`utils/colaDia.js:163`). El dato llega
  al navegador en cada objeto `o`/`r`.
- Pero `public/js/modules/cocina.js` **no tiene ninguna referencia a `modalidad` en todo el
  archivo** — confirmado por búsqueda. Ni `renderCocinaTicket()` (línea 69, para órdenes) ni
  `renderCocinaReserva()` (línea 100, para reservas) lo leen ni lo muestran en el ticket.

Es decir: el cocinero ve el mismo ticket sin importar si el pedido es para comer en el local,
para llevar o delivery. Otras pantallas del panel (`ordenes.js`, `pedidos.js`) sí usan
`modalidad` para lógica de cobro/tapper, pero Cocina —la vista que más lo necesita para
decidir cómo emplatar y envasar— nunca lo recibió visualmente.

---

## Reproducción

1. Desde `menu.html`, hacer un pedido con modalidad "Para llevar" (si el restaurante la tiene
   activa).
2. Ver el ticket en el panel Cocina del owner.
3. Comparar con un pedido idéntico en modalidad normal (para consumir en el local) — los dos
   tickets se ven exactamente iguales, sin ninguna marca de "para llevar".

---

## Solución propuesta (sin implementar)

Fix acotado y de bajo riesgo, 100% frontend — el dato ya llega desde el backend:

1. Agregar un badge/etiqueta visible en `renderCocinaTicket()` y `renderCocinaReserva()`
   cuando `o.modalidad`/`r.modalidad` sea `'para_llevar'` o `'delivery'` (ej. "🥡 Para
   llevar" / "🚚 Delivery"), igual de prominente que el badge de estatus que ya existe.
2. Verificar que el badge sea legible en el ticket sin romper el layout mobile-first (el
   panel de Cocina se usa en celular, igual que el resto).
3. `npx jest` — no debería haber impacto en backend, es un cambio de renderizado puro.

---

## Pendiente

- Confirmar con el usuario si conviene resolver junto con ISS-041 (ambos tocan el
  renderizado de tickets en `cocina.js`) o antes, ya que este es más simple (no requiere
  migración de esquema).
