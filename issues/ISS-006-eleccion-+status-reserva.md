# ISS-006 — Solo dos estatus disponibles en tarjetas de reserva

**Estado:** Resuelto — 2026-05-23
**Módulo:** Reservas (owner.html)
**Prioridad:** Alta
**Capturas:** ninguna

---

## Descripción

El owner solo ve dos botones de acción en las tarjetas de reserva activas:
- ✓ Confirmar (es_inicial → es_confirmada)
- ✓ Completar (es_confirmada → es_full)

Los estatus intermedios `es_en_cocina`, `es_listo` y `es_cliente_llego` existen en BD y tienen flags semánticos desde REFACTOR-001, pero no tienen botón de avance en la UI.

Además, `loadReservasActivas` solo fetcha reservas con `es_inicial` y `es_confirmada` — las que ya están en cocina, listas o con el cliente llegado no aparecen en el panel activo.


## Flujo correcto según vision_negocio.md

```
es_inicial
  → ✓ Confirmar → es_confirmada
  → ✗ Cancelar  → es_cancelado

es_confirmada
  → 🍳 Enviar a cocina → es_en_cocina
  → ✗ Cancelar         → es_cancelado

es_en_cocina
  → ✅ Listo → es_listo

es_listo
  → 👤 Cliente llegó → es_cliente_llego

es_cliente_llego
  → 💰 Completar → es_full
```

## Causa raíz

`public/js/modules/reservas.js` — función `renderReservaCard` (líneas 66-71):
- Solo renderiza botón "Confirmar" cuando `r.es_inicial`
- Solo renderiza botón "Completar" cuando `r.es_confirmada`
- No hay botones para `es_en_cocina`, `es_listo`, `es_cliente_llego`

`public/js/modules/reservas.js` — función `loadReservasActivas` (líneas 9-12):
- Solo fetcha `?flag=es_inicial` y `?flag=es_confirmada`
- Las reservas en estados posteriores desaparecen del panel activo

## Archivos a tocar

- `public/js/modules/reservas.js`
  - `loadReservasActivas`: agregar fetch de `es_en_cocina`, `es_listo`, `es_cliente_llego`
  - `renderReservaCard`: agregar botones para cada estado del workflow

## Solución aplicada

**2026-05-23:**
- `routes/reservations.js` — SELECT agrega `er.es_en_cocina`, `er.es_listo`, `er.es_cliente_llego` a la respuesta del GET /api/reservations
- `reservas.js` `loadReservasActivas` — fetcha los 5 estados activos: `es_inicial`, `es_confirmada`, `es_en_cocina`, `es_listo`, `es_cliente_llego`
- `reservas.js` `renderReservaCard` — botones de avance completos: Confirmar → A cocina → Listo → Cliente llegó → Completar. Cancelar solo visible en estados que lo permiten.
- `reservas.js` `mesaSelector` — visible en todos los estados activos (no solo inicial/confirmada)
