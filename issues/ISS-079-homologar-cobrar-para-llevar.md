# ISS-079 — Homologar "Cobrar": para llevar/delivery se cerraba sin pasar por esa pestaña

**Estado:** ✅ Resuelto — 2026-08-27
**Módulo:** `public/js/modules/pedidos.js`, `public/js/modules/reservas.js`
**Prioridad:** 🔴 Alta — sin un lugar fijo para confirmar si un pedido/reserva para llevar
efectivamente se cobró.

---

## Reporte del usuario

Surgió al preguntar por qué varias reservas no llegaban a "Cobrar":

> "la idea es homologar, que tanto reservas como órdenes aparezcan en cobrar para saber si
> pagaron o no, eso se puede?"

Confirmado luego que el caso real era para llevar/delivery, no reservas con mesa. Día 13 del
piloto (2026-08-27).

---

## Diagnóstico

En la Cola del día, la zona "Listos" tenía una bifurcación por modalidad:

- Con mesa (`en_local`): botón "🍽 Entregar"/"🍽 Entregado" → marca `es_entregado`/
  `es_cliente_llego` → **aparece en la pestaña "Cobrar"** con su botón final.
- Para llevar/delivery: botón "💰 Cobrar"/"💰 Completar" **directo desde "Listos"** → cierra la
  orden/reserva de un solo toque, sin pasar nunca por "Cobrar".

Esto era simétrico entre órdenes y reservas (mismo criterio en las dos), pero dejaba a para
llevar/delivery sin ningún lugar donde el owner pudiera confirmar "esto ya se cobró" antes de que
desapareciera de la Cola del día — el toque que marca "listo para entregar" y el que cobra eran el
mismo, sin punto de control intermedio.

## Solución

- `pedidos.js` — `btnOrden()`/`btnReserva()`: la zona "Listos" ya no se bifurca por modalidad.
  Ambas hacen la misma parada intermedia (`es_entregado`/`es_cliente_llego`), solo cambia la
  etiqueta del botón: **"🍽 Entregar"/"🍽 Entregado"** con mesa, **"📦 Recogido"** para llevar o
  delivery. La zona "Cobrar" no cambió — ya mostraba genéricamente cualquier orden `es_entregado`
  o reserva `es_cliente_llego`, así que las homologadas caen ahí solas.
- `reservas.js` (panel clásico "Reservas", accesible desde el menú lateral desde ISS-071) — mismo
  cambio en `renderReservaCard()`, para que no quede una segunda pantalla con el comportamiento
  viejo.
- Sin cambios de backend: los flags (`es_entregado`, `es_cliente_llego`) ya eran válidos para
  cualquier modalidad — la restricción era solo de qué botón mostraba el frontend.

## Verificación

- `scripts/test-cobrar-homologado.js` nuevo (14/14): confirma por función (`btnOrden`/`btnReserva`
  con datos sintéticos, las 4 combinaciones modalidad×zona) y punta a punta con una orden y una
  reserva para llevar reales — ambas pasan por "Listos" sin estar todavía en "Cobrar", el toque
  "📦 Recogido" las hace aparecer ahí, y recién el cobro final las cierra.
- `scripts/test-modalidad-mixta.js` sin regresiones (19/19).
- 469/469 jest.

**Hallazgo colateral, no corregido (fuera de alcance):** `scripts/test-cola-carrera.js` falla por
un dato hardcodeado (`Plato #1 no disponible`) que ya no existe así en la BD local — no tiene
relación con este cambio, no se investigó más a fondo.

## Relacionado

Consecuencia de ISS-047 (modalidad por ítem) e ISS-071 (Reservas oculto del bottom-nav, pero el
panel clásico sigue vivo).
