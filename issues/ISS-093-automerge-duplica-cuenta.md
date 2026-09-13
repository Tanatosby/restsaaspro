# ISS-093 — El auto-merge (Gap 8) deja la reserva activa con sus ítems: la mesa suma doble

**Estado:** 🟡 **Mitigado el 2026-09-12** — el auto-merge quedó apagado para todos. Falta retirar el
código del Gap 8, en su propia sesión (decisión del usuario: *"el merge que hicimos en Gap 8 ya no es
necesario. Por ahora apágalo y documenta posterior eliminación"*).
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

## ✅ Lo que se hizo (2026-09-12)

**Se apagó el auto-merge para todos**, que es la cuarta opción: la más barata y reversible. Y no
porque no hubiera tiempo para la buena, sino porque **la función quedó sin trabajo que hacer**.

### Por qué ya no hace falta

Desde ISS-089, "Por cobrar" **agrupa por número de mesa al mostrar**. La reserva y los pedidos de esa
mesa ya aparecen juntos, con el total correcto, y un solo botón los cobra a todos. El auto-merge
escribía datos (copiar filas) para conseguir un efecto de lectura (verlos juntos) — y esa escritura
era justamente lo que duplicaba.

Verificado con el merge **apagado**, montando el caso completo (reserva con mesa 1 + un pedido más en
la mesa 1, y el botón "🍽 Entregado" tocado):

```
auto_merge_activo ahora: 0
PATCH "Entregado" → 200
ítems en la orden:   1   ← sin merge, no le copió nada
ítems en la reserva: 1

── La fila de la mesa ──
Mesa 1 · Carla | 2 pedidos · espera 40 min | S/ 56.00 | 💰 Cobrar mesa 1 · S/ 56.00

── Desplegada ──
🧾 Pedido #1  Carla  S/ 28.00 → Cobrar solo este
📅 Reserva SINMRG  Carla  S/ 28.00  💚 Yape · ✓ Confirmado → Cobrar solo esta

"Cobrar mesa 1" enviaría → {"ordenes":[89],"reservas":[44],"total":56}
```

**S/ 56, que es lo que el cliente consumió** (con el merge encendido esa misma mesa decía S/ 84).
Captura: `issues/screenshots/iss093-sin-merge.png`.

### Cambio observable, aceptado por el usuario

Con el merge apagado, **la cocina ve dos tickets** (la reserva y el pedido posterior) en vez de uno
con todo junto. Es más fiel a la realidad —son dos momentos de pedido, con horas distintas— y el
usuario lo confirmó: *"lo de la cocina es correcto, esa parte estaría bien"*.

### Cómo quedó apagado

| Dónde | Qué |
|---|---|
| `config/database.js` | Migración de **una sola vez**: `UPDATE restaurantes SET auto_merge_activo = 0`. La columna marcadora `auto_merge_apagado_iss093` es lo que impide que vuelva a correr — si un dueño lo enciende a propósito después, un reinicio **no** le pisa la decisión (verificado). |
| `routes/admin.js` · `routes/auth.js` | Los dos lugares donde nace un restaurante insertan `auto_merge_activo = 0` explícito. La columna quedó con `DEFAULT 1` de cuando se creó el Gap 8 y cambiar el default en SQLite obliga a recrear la tabla — no vale el riesgo por esto. |
| `routes/menu.js` · `config.js` | Los fallbacks pasaron de "encendido" a "apagado" cuando el dato falta. |
| `owner.html` | El toggle sigue, pero con un aviso visible: que cobra de más y que ya no hace falta. |

`jest` 483/483 (los 17 tests del auto-merge siguen pasando: prueban la función, que no se tocó).
`test-iss089-cobrar-por-mesa` 31/31.

## Lo que queda: retirar el Gap 8

Decidido para una sesión propia, sin urgencia. Sería: borrar `autoMergeReservaEnOrden()` y su llamada,
la columna `auto_merge_activo`, el toggle de Configuración, `PATCH /api/menu/config/auto-merge` y
`tests/auto-merge.test.js`. Antes de hacerlo conviene ver un servicio real con la vista por mesa, por
si aparece algún caso que sólo el merge resolvía.

## Cómo reproducir

`node .check-merge.js` (el script del diagnóstico no quedó en el repo; el procedimiento es el de la
evidencia de arriba: orden en una mesa + reserva con esa misma mesa → PATCH `es_cliente_llego` →
comparar `COUNT(*)` de `orden_carta_items` y `reserva_carta_items`).

## Relación

- **Gap 8** (`vision_negocio.md`) — el auto-merge, 17 tests. Ninguno verifica qué pasa con la reserva
  después del merge: sólo que los ítems llegaron a la orden.
- **ISS-089** — la vista por mesa, que lo hace visible.
