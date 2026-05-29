# ISS-003 — PATCH estatus con flag retorna 500 (órdenes y reservas)

**Estado:** ✅ cerrado — 2026-05-21
**Módulo:** Órdenes y Reservas / owner.html
**Reproducible:** siempre
**Fecha detectado:** 2026-05-21
**Captura:** [issues_reservas_rotos.png](screenshots/issues_reservas_rotos.png)

---

## Descripción

Al tocar "✓ Confirmar" (o cualquier botón de cambio de estatus via flag) en una reserva
desde `owner.html`, el backend retorna 500 Internal Server Error. El toast muestra
"Error interno del servidor". Mismo problema aplica a órdenes (mismo código).

## Causa raíz

En `routes/reservations.js` y `routes/orders.js` (2 lugares), la query que busca el
estatus por flag tenía una condición `AND id_restaurante IS NULL` que no existe en
ninguna de las dos tablas (`estatus_reserva`, `estatus_orden`):

```javascript
// routes/reservations.js — antes del fix
db.prepare(`SELECT id, nombre, es_full FROM estatus_reserva WHERE ${flag} = 1 AND id_restaurante IS NULL`).get();

// routes/orders.js — antes del fix (×2)
db.prepare(`SELECT id, nombre, es_pagado FROM estatus_orden WHERE ${flag} = 1 AND id_restaurante IS NULL`).get();
```

SQLite lanza "no such column: id_restaurante" → Express captura la excepción → 500.
El `AND id_restaurante IS NULL` era un vestigio de REFACTOR-001 que nunca fue válido.

## Fix aplicado

Eliminado `AND id_restaurante IS NULL` de los 3 lugares (2 en `orders.js`, 1 en `reservations.js`):

```javascript
// Después del fix
db.prepare(`SELECT id, nombre, es_full FROM estatus_reserva WHERE ${flag} = 1`).get();
db.prepare(`SELECT id, nombre, es_pagado FROM estatus_orden WHERE ${flag} = 1`).get();
```
