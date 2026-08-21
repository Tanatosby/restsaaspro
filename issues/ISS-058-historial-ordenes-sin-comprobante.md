# ISS-058 — Historial de Órdenes no mostraba la foto del comprobante

**Estado:** ✅ **Resuelto 2026-08-21.**
**Módulo:** `routes/orders.js` (`GET /api/orders`).
**Prioridad:** 🔴 Alta — la dueña no podía revalidar si había cobrado un pedido viejo.
**Origen:** piloto #1, Día 7 (2026-08-20), reportado por el usuario el 2026-08-21. Textual de
la dueña: *"¿No puedo ver las fotos pasadas? porque quiero revalidar por si acaso se me pasa
uno que no estoy segura que cobré."*

---

## Diagnóstico

Primer diagnóstico (equivocado): el frontend ya llama `comprobanteThumb(o)` en
`renderOrdenCard()` (`ordenes.js:96`), así que parecía que el Historial de Órdenes ya mostraba
las fotos — el usuario corrigió en la misma sesión que en producción no se ve.

Causa real: la query de `GET /api/orders` (`routes/orders.js`, la que alimenta la pestaña
Historial con filtro de fecha) **nunca seleccionaba** `metodo_pago`, `estado_pago`,
`comprobante_url`, `comprobante_repetido_de/tipo` ni `es_manual` — solo `id, mesa,
nombre_cliente, fecha, created_at, modalidad` y el estatus. El render de `ordenes.js:130` solo
pinta el bloque de pago (`badgeManual` + `badgePago` + `comprobanteThumb`) si
`o.metodo_pago || o.es_manual`, condición que con esos campos siempre `undefined` daba falso —
la miniatura nunca llegaba a intentarse.

`GET /api/orders/activas` (la vista de órdenes activas, sin filtro de fecha) sí traía esos
campos desde siempre — por eso el problema pasó desapercibido: solo afectaba al Historial.
`GET /api/reservations` (historial de reservas) tampoco tenía el bug — ya seleccionaba
`metodo_pago`, `estado_pago`, `comprobante_url` y los campos de duplicado.

## Solución implementada

Se agregaron las columnas faltantes al `SELECT` de `GET /api/orders`:

```sql
o.metodo_pago,
o.estado_pago,
o.comprobante_url,
o.comprobante_repetido_de,
o.comprobante_repetido_tipo,
o.es_manual,
```

Sin cambios de frontend — `renderOrdenCard()` ya sabía pintar estos campos, solo le faltaba
recibirlos.

## Verificación

457/457 jest sin regresiones.
