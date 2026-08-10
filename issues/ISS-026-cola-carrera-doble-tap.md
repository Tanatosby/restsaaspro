# ISS-026 — Cola del día: los pedidos no cambian de etapa, o vuelven atrás

**Estado:** ✅ Resuelto — 2026-08-10
**Módulo:** `public/js/modules/pedidos.js`, `routes/orders.js`, `utils/colaDia.js`
**Prioridad:** 🔴 Alta — bloquea la operación en el momento de mayor presión (hora punta)

---

## Síntoma reportado

El usuario, sobre la operación real con apenas 2-3 pedidos simultáneos:

> "Cuando intentas pasar de un lugar de la cola a otro, ahora mismo se pone lento y a veces
> no te pasa el pedido a la siguiente parte de la cola, o se queda esperando mucho tiempo o
> sale error que ya se envió el pedido a cobrados por ejemplo y no desaparece de la cola."

Tres síntomas distintos que resultaron ser tres defectos que se realimentaban entre sí.

---

## Diagnóstico

### 1. Doble tap → error falso "ya se envió a cobrados"

`accionRapidaOrden()` / `accionRapidaReserva()` no bloqueaban el botón mientras viajaba el
`PATCH`. Como no pasaba nada visible, el owner tocaba de nuevo:

- el primer `PATCH` se aplicaba correctamente;
- el segundo chocaba con la guarda de `routes/orders.js` →
  `No se puede cambiar una orden pagado` (mismo patrón en `reservations.js`);
- el toast de error aparecía **por una acción que sí había funcionado**.

### 2. El poll repintaba el estado viejo → "no desaparece de la cola"

`initPedidosPoll()` recargaba cada 30 s con 6 requests en paralelo. Si un poll arrancaba
justo antes del `PATCH`, sus respuestas llegaban **después** y `renderZona()` reemplazaba el
HTML completo con datos anteriores al cambio: el pedido reaparecía en su zona anterior. No
existía ningún token de secuencia que descartara respuestas obsoletas.

### 3. Cero feedback inmediato → "se queda esperando"

No había actualización optimista. Entre el tap y el repintado corrían 1 `PATCH` + 6 `GET`,
cada uno con su N+1 de ítems, sobre `better-sqlite3` — que es **síncrono** y bloquea el
proceso Node entero mientras resuelve. Eso alimentaba directamente el defecto 1.

### 4. (Encontrado en el camino) "Confirmar pago" desde la Cola no refrescaba la Cola

Los botones llamaban a `confirmarPagoOrden()`/`confirmarPagoReserva()` de
`ordenes.js`/`reservas.js`, que refrescan **sus propios paneles** (`loadOrdenesActivas()` /
`loadReservasActivas()`). Tocados desde la Cola, el pago se confirmaba en el servidor pero la
card no cambiaba hasta el siguiente poll.

### 5. (Agravante de fondo) Órdenes viejas acumuladas para siempre

`GET /api/orders/activas` filtraba por `es_pagado = 0 AND es_cancelado = 0` **sin filtro de
fecha**: toda orden que nunca se marcó como cobrada seguía "activa" indefinidamente,
arrastrando su N+1 en cada poll. En la BD de desarrollo ya había 5 órdenes de junio así.

---

## Solución

**Frontend — `public/js/modules/pedidos.js`:**

- **Guard por ítem** (`_enVuelo`, clave `o12`/`r34`): el segundo tap se ignora en vez de
  disparar un `PATCH` duplicado.
- **Token de secuencia** (`_cargaSeq`): cada carga guarda el suyo y descarta su resultado si
  mientras tanto empezó otra o se ejecutó una acción. Mata la carrera del punto 2.
- **Actualización optimista**: `aplicarFlagLocal()` mueve la card de zona al instante y
  `renderColaDesdeCache()` repinta sin esperar al servidor. Si el backend rechaza, se
  revierte al estado previo y se muestra el error real.
- **`reiniciarPoll()`** tras cada acción, para que el refresco automático no caiga encima del
  cambio recién hecho.
- **`confirmarPagoColaOrden()` / `confirmarPagoColaReserva()`**: versiones propias de la Cola
  que refrescan la Cola (punto 4).

**Backend — `utils/colaDia.js` (nuevo) + `routes/orders.js`:**

- **`GET /api/orders/cola`**: órdenes + reservas activas en **una sola llamada**, con un
  número **fijo** de consultas (6) sin importar cuántos pedidos haya — se acabó el N+1.
  Reemplaza las 6 requests que hacía `pedidos.js`.
- **Filtro por fecha**: las órdenes se limitan a hoy. Las reservas usan `>= hoy` y no `= hoy`,
  porque las futuras **sí** deben verse en la cola: hay que poder confirmarlas antes del día.
- **`substr(fecha,1,10)`** en vez de comparación directa: `ordenes.fecha` tiene formatos
  mezclados en la BD (`'2026-08-10'` y `'2026-06-04 03:46:13'`), y un `WHERE fecha = ?` nunca
  habría matcheado los del formato largo.
- **`GET /api/orders/sin-cerrar`** para el cierre de caja (ver abajo).

**Lo que quedó abierto de días anteriores no se oculta.** `total` solo se escribe al marcar la
orden como cobrada (`routes/orders.js`) y Ganancias suma `WHERE total IS NOT NULL`
(`routes/reportes.js`): mientras sigan abiertos, **ese dinero no aparece en ningún reporte**.
Ocultarlos sin más habría sido perderlos. Por eso se agregó el **cierre de caja**: un banner en
la Cola con el conteo y un modal donde el dueño marca cada pedido como "💰 Se cobró"
(entra a Ganancias) o "✗ No se concretó" (se cancela y devuelve el stock).

Opción elegida por el usuario entre 4 alternativas; se descartó explícitamente el auto-cierre
nocturno: nada que involucre dinero se cierra solo.

---

## Verificación

`scripts/test-cola-carrera.js` (Playwright, no forma parte de jest) — **21/21 verde**:

| Test | Qué prueba |
|---|---|
| 1 | Doble tap → un solo `PATCH`, sin el error falso, estatus correcto en BD |
| 2 | Respuesta de poll retenida 3 s que llega después de la acción → el pedido **no** reaparece |
| 3 | Con el `PATCH` retrasado 2,5 s, la card ya está en la zona nueva a los 400 ms |
| 4 | Si el backend responde 400, la card vuelve a su zona y la BD queda intacta |
| 5 | Cierre de caja: banner, modal, y `total` pasa de `NULL` a persistido tras cobrar |
| 6 | Sesión persistente (ISS-027) |

`tests/cola-dia.test.js` — 15 casos jest sobre `utils/colaDia.js`: separación hoy/anteriores,
reservas futuras visibles, formatos de fecha mezclados, agrupación de ítems sin N+1,
aislamiento por restaurante.

**317/317 jest verde.**

---

## Pendiente relacionado

`GET /api/orders/activas` (el que usa el panel de **Órdenes**, no la Cola) conserva su N+1 y su
falta de filtro por fecha. No se tocó para no cambiar el comportamiento de ese panel en el
mismo trabajo. Si el owner reporta lentitud ahí, la migración a `utils/colaDia.js` es directa.
