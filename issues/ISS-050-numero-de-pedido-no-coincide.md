# ISS-050 — El número de pedido que ve el comensal no coincide con el de la dueña

**Estado:** ✅ **Resuelto 2026-08-19.**
**Módulo:** `routes/public.js` (`POST /orders`), `public/menu.html` (`showConfirm()`).
**Prioridad:** 🔴 Crítica — genera confusión real al momento de identificar el pedido.

---

## Síntoma reportado

Contado por el usuario (2026-08-19, sobre un caso del día anterior): una clienta dijo *"mi orden
de pedido me sale 96"*, pero la dueña solo ve órdenes del 1 al 22 ese día. El usuario ya
sospechaba la causa: la pantalla del comensal no se reinicia, sigue de corrido; la dueña revisa
día a día.

## Diagnóstico

Confirmado exactamente lo que sospechaba el usuario — **dos numeraciones distintas para el mismo
pedido**:

- El owner (Cola del día, Órdenes, Cocina) ya muestra `numero_dia` — 1, 2, 3… por restaurante y
  por día, calculado con `ROW_NUMBER() OVER (PARTITION BY o.fecha ORDER BY o.id ASC)` en
  `routes/orders.js`.
- `menu.html` (`showConfirm()`, `public/menu.html:1462`) le mostraba al comensal `id_orden` —
  el id **crudo** de la tabla `ordenes`, un autoincrement que nunca se reinicia y no está
  acotado por día ni (para el caso de una instancia con varios restaurantes) por restaurante.

`POST /api/public/orders` nunca calculaba ni devolvía `numero_dia` — por eso el frontend del
comensal no tenía otra opción que mostrar el id crudo.

Más que un número "feo", esto rompe la comunicación real: si el comensal le dice al mozo "soy el
pedido 96", la dueña no tiene ningún pedido con ese número en su lista de hoy.

## Solución implementada

`POST /api/public/orders` calcula `numero_dia` con el mismo criterio que ya usa el owner
(`COUNT(*) FROM ordenes WHERE id_restaurante = ? AND fecha = ? AND id <= ?` — equivalente al
`ROW_NUMBER()` de `routes/orders.js` para esa fila puntual) y lo devuelve en la respuesta.
`menu.html` lo usa en la pantalla de confirmación (`Número de orden: #N`) en los dos caminos que
crean una orden — con pago (`confirmarEnvioFinal()`) y sin pago (`confirmarPedido()`) — con el id
crudo como respaldo si el campo no viniera (versión vieja del backend en caché del navegador).

**Fuera de alcance:** las reservas no tienen este problema — ya usan un código aleatorio
(`r7Xk2mQ`), no un número secuencial, por diseño (`vision_negocio.md` §4).

## Verificación

`scripts/test-numero-dia-pedido.js` nuevo. Crea 2 pedidos seguidos por la UI del comensal (uno
sin pantalla de pago, uno con "efectivo") y confirma que el número que ve cada uno en "¡Pedido
enviado!" coincide exactamente con el `numero_dia` que la dueña ve para esa misma orden en
`GET /api/orders`.
