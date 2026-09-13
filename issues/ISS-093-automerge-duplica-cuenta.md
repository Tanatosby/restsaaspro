# ISS-093 — El auto-merge (Gap 8) deja la reserva activa con sus ítems: la mesa suma doble

**Estado:** 🔴 Diagnosticado con evidencia, **sin arreglar** — necesita una decisión del usuario
**Encontrado:** 2026-09-12, implementando ISS-089 (la vista por mesa lo hace visible)
**Módulo:** `routes/reservations.js` (`autoMergeReservaEnOrden`)
**Prioridad:** 🔴 Alta — afecta el monto que se cobra y lo que entra en Ganancias

---

## Qué pasa

`autoMergeReservaEnOrden()` (Gap 8, en producción desde 2026-05-25) copia los ítems de la reserva a
la orden abierta de la misma mesa cuando se marca **"cliente llegó"**. Pero **no borra los ítems de
la reserva ni la cierra**: la reserva queda en `es_cliente_llego`, activa, con sus ítems intactos.

Resultado: los mismos platos existen **dos veces** — en la orden (copiados) y en la reserva
(originales) — y las dos siguen apareciendo en "Por cobrar".

## Evidencia (ejecutado contra el código real, 2026-09-12)

Orden abierta en la mesa 77 con 1 ceviche (S/ 28) + reserva de la misma mesa con 1 ceviche (S/ 28).
Se marca "cliente llegó" por la API real:

```
auto_merge_activo: 1
ANTES   → ítems en la orden: 1 | ítems en la reserva: 1
PATCH es_cliente_llego → 200 {"estatus":"cliente llegó"}
DESPUÉS → ítems en la orden: 2 | ítems en la reserva: 1
estado de la reserva: { nombre: 'cliente llegó', es_full: 0 }

En la cola de la mesa 77:
  orden   → total 56
  reserva → total 28
  SUMA QUE MOSTRARÍA LA MESA: 84   ← el cliente consumió 56
```

## Por qué importa ahora

- **El dinero.** Si se cobran las dos (que es lo que la cola invita a hacer: las dos están en "Por
  cobrar"), `total` se persiste en ambas y **Ganancias cuenta S/ 84 donde hubo S/ 56**. Esto ya pasa
  hoy, no lo introduce ISS-089 — lo que pasaba es que **sin montos en pantalla nadie podía notarlo**.
- **ISS-089 lo pone en la cara.** La vista por mesa suma los pedidos activos de la mesa, así que
  muestra el total inflado en grande. Un número equivocado a la vista es peor que ningún número:
  la dueña puede cobrarlo.

## Opciones de arreglo (decisión del usuario)

1. **Cerrar la reserva al fusionarla.** Los ítems se "mudaron" a la orden, así que la reserva pasa a
   `es_full` con `total = 0` y sale de la cola. La cuenta queda una sola, en la orden de la mesa.
   Es lo más fiel a lo que ya hace el merge, pero deja reservas "completadas" que nunca se cobraron
   por sí mismas — hay que ver cómo queda el historial y los reportes de reservas.
2. **Borrar los ítems de la reserva al copiarlos.** La reserva sigue en la cola pero vale 0. Más
   simple, aunque una reserva sin ítems se ve rara en el historial.
3. **No copiar: vincular.** Un `id_orden` en `reservas` y que la cuenta de la mesa lea de un solo
   lado. Es el arreglo correcto de fondo y el más caro: toca el modelo y todo lo que hoy lee ítems
   de reserva.

**Mientras no se decida:** el riesgo existe igual (es anterior a ISS-089), pero conviene resolverlo
antes de que la dueña se acostumbre a cobrar por el número de la mesa.

## Cómo reproducir

`node .check-merge.js` (el script del diagnóstico no quedó en el repo; el procedimiento es el de la
evidencia de arriba: orden en una mesa + reserva con esa misma mesa → PATCH `es_cliente_llego` →
comparar `COUNT(*)` de `orden_carta_items` y `reserva_carta_items`).

## Relación

- **Gap 8** (`vision_negocio.md`) — el auto-merge, 17 tests. Ninguno verifica qué pasa con la reserva
  después del merge: sólo que los ítems llegaron a la orden.
- **ISS-089** — la vista por mesa, que lo hace visible.
