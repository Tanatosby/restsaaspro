# REFACTOR-001 — Estatus dinámicos por flags

**Estado:** ✅ COMPLETO — 2026-05-21  
**Prioridad:** ~~BLOQUEANTE~~ resuelto  
**Archivos afectados:** 8 + `utils/orderStatus.js` (eliminado)  
**Pasos totales:** 20 (10 sesiones)  
**Relacionado con:** [ISS-001](ISS-001-pago-plin.md)

> El sistema ya no depende de nombres de estatus en ningún punto del código.
> El admin puede renombrar cualquier estatus desde el panel sin romper pagos, historial ni reportes.

---

## Concepto central

El sistema actualmente busca estatus por **nombre de texto** (`WHERE nombre = 'completado'`).
Si el super admin renombra un estatus, todo se rompe.

La solución es agregar **flags semánticos** a las tablas de estatus y buscar por flag.
Los nombres pueden cambiar; los flags no.

---

## PASO 0 — Migración de base de datos ⚠️ PREREQUISITO

**Archivo:** `config/database.js`  
**Tipo:** migración idempotente (igual que todas las anteriores en ese archivo)

### Flags a agregar a `estatus_orden` (5 columnas nuevas):
```sql
es_inicial   INTEGER DEFAULT 0  -- el "pendiente"   → se asigna al crear una orden
es_pagado    INTEGER DEFAULT 0  -- el "completado"  → owner cobra, va a historial
es_cancelado INTEGER DEFAULT 0  -- el "cancelado"   → va a historial sin cobro
es_en_cocina INTEGER DEFAULT 0  -- el "preparando"  → cocina lo está trabajando
es_listo     INTEGER DEFAULT 0  -- el "entregando"  → en mesa, pendiente de cobro
```

### Flags a agregar a `estatus_reserva` (3 columnas nuevas — `es_full` YA EXISTE):
```sql
es_inicial    INTEGER DEFAULT 0  -- el "pendiente"   → al crear una reserva
es_cancelado  INTEGER DEFAULT 0  -- el "cancelada"   → va a historial sin cobro
es_confirmada INTEGER DEFAULT 0  -- el "confirmada"  → aparece en el plano de mesas
```

### Backfill inicial (setear flags en registros existentes):
```sql
UPDATE estatus_orden SET es_inicial   = 1 WHERE nombre = 'pendiente';
UPDATE estatus_orden SET es_en_cocina = 1 WHERE nombre = 'preparando';
UPDATE estatus_orden SET es_listo     = 1 WHERE nombre = 'entregando';
UPDATE estatus_orden SET es_pagado    = 1 WHERE nombre = 'completado';
UPDATE estatus_orden SET es_cancelado = 1 WHERE nombre = 'cancelado';

UPDATE estatus_reserva SET es_inicial    = 1 WHERE nombre = 'pendiente';
UPDATE estatus_reserva SET es_confirmada = 1 WHERE nombre = 'confirmada';
UPDATE estatus_reserva SET es_cancelado  = 1 WHERE nombre = 'cancelada';
-- es_full ya existe y ya tiene valor correcto
```

### Endpoints admin nuevos (en `routes/admin.js`):
Para que el super admin pueda cambiar qué estatus tiene cada flag:
```
PATCH /api/admin/estatus-orden/:id/set-pagado
PATCH /api/admin/estatus-orden/:id/set-cancelado
PATCH /api/admin/estatus-orden/:id/set-inicial
PATCH /api/admin/estatus-orden/:id/set-en-cocina
PATCH /api/admin/estatus-orden/:id/set-listo
PATCH /api/admin/estatus-reserva/:id/set-inicial
PATCH /api/admin/estatus-reserva/:id/set-cancelado
PATCH /api/admin/estatus-reserva/:id/set-confirmada
(set-full ya existe)
```
Cada uno pone el flag en 1 para ese estatus y en 0 para todos los demás (único por tabla).

---

## SESIÓN 1 — Crear órdenes con es_inicial (2 cambios)

### Paso 1.1 — `routes/public.js` línea ~221
**Contexto:** cliente crea orden desde menu.html  
**Antes:**
```sql
(SELECT id FROM estatus_orden WHERE nombre = 'pendiente')
```
**Después:**
```sql
(SELECT id FROM estatus_orden WHERE es_inicial = 1)
```

### Paso 1.2 — `routes/orders.js` línea ~266
**Contexto:** owner/mozo crea orden desde owner.html  
**Antes:**
```sql
(SELECT id FROM estatus_orden WHERE nombre = 'pendiente')
```
**Después:**
```sql
(SELECT id FROM estatus_orden WHERE es_inicial = 1)
```

---

## SESIÓN 2 — Crear reservas con es_inicial (2 cambios)

### Paso 2.1 — `routes/public.js` línea ~318
**Contexto:** cliente crea reserva desde menu.html  
**Antes:**
```sql
(SELECT id FROM estatus_reserva WHERE nombre = 'pendiente')
```
**Después:**
```sql
(SELECT id FROM estatus_reserva WHERE es_inicial = 1)
```

### Paso 2.2 — `routes/reservations.js` línea ~165
**Contexto:** owner/mozo crea reserva desde owner.html  
**Antes:**
```sql
(SELECT id FROM estatus_reserva WHERE nombre = 'pendiente')
```
**Después:**
```sql
(SELECT id FROM estatus_reserva WHERE es_inicial = 1)
```

---

## SESIÓN 3 — Inmutabilidad por flags (3 cambios)

Actualmente la inmutabilidad ("no puedo cambiar una orden completada/cancelada") se verifica
comparando el nombre del estatus actual. Con flags, se verifica directamente.

### Paso 3.1 — `routes/orders.js` línea ~346
**Contexto:** PATCH /:id/estatus — bloquear órdenes cerradas  
**Antes:**
```javascript
if (orden.estatus_actual === 'completado' || orden.estatus_actual === 'cancelado')
```
**Después:** el SELECT de la orden debe traer los flags y verificar:
```javascript
// SELECT ahora incluye eo.es_pagado, eo.es_cancelado
if (orden.es_pagado || orden.es_cancelado)
```

### Paso 3.2 — `routes/orders.js` línea ~607
**Contexto:** PUT /:id (kitchen) — bloquear órdenes cerradas  
**Antes:**
```javascript
if (['completado', 'cancelado'].includes(orden.estatus_actual))
```
**Después:**
```javascript
if (orden.es_pagado || orden.es_cancelado)
```

### Paso 3.3 — `routes/reservations.js` línea ~226
**Contexto:** PATCH /:id/estatus — bloquear reservas cerradas  
**Antes:**
```javascript
if (reserva.estatus_actual === 'completada' || reserva.estatus_actual === 'cancelada')
```
**Después:**
```javascript
if (reserva.es_full || reserva.es_cancelado)
```

---

## SESIÓN 4 — Calcular total por flag y validación dinámica (3 cambios)

### Paso 4.1 — `routes/orders.js` línea ~332
**Contexto:** PATCH /:id/estatus — lista ESTATUS_VALIDOS hardcodeada  
**Antes:**
```javascript
const ESTATUS_VALIDOS = ['pendiente', 'preparando', 'entregando', 'completado', 'cancelado'];
if (!ESTATUS_VALIDOS.includes(estatus))
```
**Después:** consultar BD dinámicamente (igual que ya hace reservations.js):
```javascript
const estatusValidos = db.prepare(`SELECT nombre FROM estatus_orden`).all().map(e => e.nombre);
if (!estatusValidos.includes(estatus))
```

### Paso 4.2 — `routes/orders.js` línea ~353
**Contexto:** PATCH /:id/estatus — disparar cálculo de total  
**Antes:**
```javascript
if (estatus === 'completado') {
```
**Después:** el SELECT de nuevoEstatus debe traer `es_pagado`, verificar por flag:
```javascript
if (nuevoEstatus.es_pagado) {
```

### Paso 4.3 — `routes/reservations.js` — confirmar-pago + es_full
**Contexto:** cuando reserva pasa a es_full, setear estado_pago automáticamente  
**Fix ISS-001:** en el endpoint `PATCH /:id/estatus`, cuando `nuevoEstatus.es_full = 1`:
```javascript
db.prepare(`UPDATE reservas SET id_estatus = ?, total = ?, estado_pago = 'pagado' WHERE id = ?`)
  .run(nuevoEstatus.id, total, req.params.id);
```
Y eliminar el botón "Confirmar pago" de tarjetas de reserva en `owner.html`.

---

## SESIÓN 5 — Filtros de vistas activas y plano de mesas (4 cambios)

### Paso 5.1 — `routes/orders.js` línea ~44
**Contexto:** GET /activas — órdenes activas para vista owner  
**Antes:**
```sql
AND eo.nombre IN ('pendiente', 'preparando', 'entregando')
```
**Después:**
```sql
AND eo.es_pagado = 0 AND eo.es_cancelado = 0
```

### Paso 5.2 — `routes/orders.js` línea ~98
**Contexto:** GET /queue — cola para cocina  
**Antes:**
```sql
AND eo.nombre IN ('pendiente', 'preparando')
```
**Después:** excluye también entregando (es_listo):
```sql
AND eo.es_pagado = 0 AND eo.es_cancelado = 0 AND eo.es_listo = 0
```

### Paso 5.3 — `routes/mesas.js` línea ~62
**Contexto:** GET /estado — mesas con orden activa  
**Antes:**
```sql
AND eo.nombre IN ('pendiente','preparando','entregando')
```
**Después:**
```sql
AND eo.es_pagado = 0 AND eo.es_cancelado = 0
```

### Paso 5.4 — `routes/mesas.js` línea ~73
**Contexto:** GET /estado — reservas confirmadas para plano  
**Antes:**
```sql
AND er.nombre = 'confirmada'
```
**Después:**
```sql
AND er.es_confirmada = 1
```

---

## SESIÓN 6 — Admin: revenue por flags (3 cambios)

### Paso 6.1 — `routes/admin.js` línea ~28
**Contexto:** GET /stats — revenue total  
**Antes:** `WHERE eo.nombre = 'completado'`  
**Después:** `WHERE eo.es_pagado = 1`

### Paso 6.2 — `routes/admin.js` línea ~43
**Contexto:** GET /stats — revenueHoy  
**Antes:** `WHERE eo.nombre = 'completado'`  
**Después:** `WHERE eo.es_pagado = 1`

### Paso 6.3 — `routes/admin.js` línea ~83
**Contexto:** GET /restaurantes — revenue por restaurante  
**Antes:** `AND eo.nombre = 'completado'`  
**Después:** `AND eo.es_pagado = 1`

---

## SESIÓN 7 — Reportes: excluir cancelados por flag (8 cambios)

Todos en `routes/reportes.js`. Son 8 ocurrencias del mismo patrón:

| Línea | Tabla | Antes | Después |
|-------|-------|-------|---------|
| ~21  | ordenes  | `e.nombre != 'cancelado'`  | `e.es_cancelado = 0` |
| ~30  | reservas | `e.nombre != 'cancelada'`  | `e.es_cancelado = 0` |
| ~65  | ordenes  | `e.nombre != 'cancelado'`  | `e.es_cancelado = 0` |
| ~73  | reservas | `e.nombre != 'cancelada'`  | `e.es_cancelado = 0` |
| ~294 | ordenes  | `e.nombre != 'cancelado'`  | `e.es_cancelado = 0` |
| ~306 | reservas | `e.nombre != 'cancelada'`  | `e.es_cancelado = 0` |
| ~317 | ordenes  | `e.nombre != 'cancelado'`  | `e.es_cancelado = 0` |
| ~328 | reservas | `e.nombre != 'cancelada'`  | `e.es_cancelado = 0` |

---

## SESIÓN 8 — Backfill en database.js (1 cambio)

### Paso 8.1 — `config/database.js` línea ~349
**Contexto:** backfill de totales para órdenes completadas al arranque del servidor  
**Antes:**
```sql
WHERE e.nombre = 'completado' AND o.total IS NULL
```
**Después:**
```sql
WHERE e.es_pagado = 1 AND o.total IS NULL
```
(El backfill de reservas ya usa `e.es_full = 1`, que es correcto — no cambia)

---

## SESIÓN 9 — utils/orderStatus.js (1 cambio + revisión)

**Contexto:** este archivo mapea status en inglés (kitchen.html) a español (BD).  
Con la migración al panel Cocina dentro de owner.html y los flags, este mapeo puede
simplificarse o eliminarse.

Acción: revisar si sigue siendo necesario una vez que el panel Cocina esté en owner.html.
Si ya no se usa el mapeo inglés↔español, el archivo puede reducirse o eliminarse.

---

## Resumen por sesión

| Sesión | Cambios | Archivos | Dificultad |
|--------|---------|----------|------------|
| 0 — Migración BD + admin endpoints | ~10 (migraciones + 8 endpoints) | `config/database.js`, `routes/admin.js` | Media-Alta |
| 1 — Crear órdenes con es_inicial | 2 | `routes/public.js`, `routes/orders.js` | Baja |
| 2 — Crear reservas con es_inicial | 2 | `routes/public.js`, `routes/reservations.js` | Baja |
| 3 — Inmutabilidad por flags | 3 | `routes/orders.js`, `routes/reservations.js` | Baja |
| 4 — Total por flag + fix ISS-001 | 3 | `routes/orders.js`, `routes/reservations.js`, `owner.html` | Media |
| 5 — Filtros vistas activas y mesas | 4 | `routes/orders.js`, `routes/mesas.js` | Baja |
| 6 — Admin revenue | 3 | `routes/admin.js` | Baja |
| 7 — Reportes cancelados | 8 | `routes/reportes.js` | Baja (mecánica) |
| 8 — Backfill database.js | 1 | `config/database.js` | Baja |
| 9 — orderStatus.js revisión | 1 | `utils/orderStatus.js` | Baja |

**Total: ~37 cambios atómicos en 8 archivos, organizados en 10 sesiones.**

---

## Orden recomendado

Sesión 0 es el prerequisito duro — sin las columnas en BD nada funciona.
Las sesiones 1–9 son independientes entre sí y pueden hacerse en cualquier orden
una vez que la migración esté aplicada.
