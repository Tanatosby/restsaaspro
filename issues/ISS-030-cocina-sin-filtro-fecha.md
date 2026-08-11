# ISS-030 — Cocina sin filtro por día + intervalos de refresco muy cortos

**Estado:** ✅ Resuelto — 2026-08-11
**Módulo:** `public/js/modules/cocina.js`, `routes/orders.js`, `utils/colaDia.js`, `public/owner.html`
**Prioridad:** 🟡 Media — mismo patrón que ISS-026, sin haber explotado aún en producción

---

## Reporte del usuario

> "la cocina no tiene esa misma funcionalidad de por día que en cola, me gusta como aparece en la cola,
> pero en cocina también debería tener esa funcionalidad, que solo muestre por día"
>
> "el refresh de cada parte tiene una duración de 15 segundos creo para cocina por ejemplo y 15 segundos
> para reservas, podemos subir el tiempo de esa espera para actualizar datos?"

---

## Diagnóstico

**1. Cocina sin filtro de fecha.** `cocina.js` pedía `GET /api/orders/activas` (sin filtro de fecha, con
N+1 de consultas por ítem) + `GET /api/reservations?flag=es_en_cocina` (tampoco filtra fecha). Cualquier
orden/reserva vieja que quedara "en cocina" sin cerrarse se acumulaba ahí para siempre. Era exactamente
el mismo problema que ISS-026 ya resolvió para Cola del día — quedó anotado como "riesgo conocido a
vigilar" en la sesión 2026-08-10 (parte 4) y no se había migrado.

**2. Intervalos de polling.** Valores reales (el usuario los recordaba aproximados):
- Cocina (`cocina.js`): 15s
- Órdenes + Reservas + Mesas (un solo `setInterval` en `owner.html`): 10s
- Cola del día (`pedidos.js`): 30s

Con la primera atención masiva del piloto (+60 menús, 2026-08-12) generando más celulares polleando en
simultáneo sobre better-sqlite3 (síncrono, bloquea el proceso por consulta), valía la pena subirlos.

---

## Solución

- `utils/colaDia.js` — nueva `cocinaDelDia(db, id_restaurante, hoy)`: reutiliza `ordenesActivas`/
  `reservasActivas` (ya filtradas por fecha desde ISS-026) y las acota a lo que le importa a cocina
  (`es_inicial`/`es_en_cocina` en órdenes, `es_en_cocina` en reservas). Las reservas futuras nunca tienen
  `es_en_cocina=1` todavía (el job de auto-preparación solo las dispara el mismo día), así que no hace
  falta un filtro de fecha exacto adicional.
- `routes/orders.js` — nuevo `GET /api/orders/cola-cocina`, mismo patrón que `GET /api/orders/cola`.
- `public/js/modules/cocina.js` — `loadColaCocina()` pasa a usar el endpoint único (elimina también el
  N+1 de paso).
- Intervalos: Cocina 15s→**30s** (igual que Cola del día), Órdenes/Reservas/Mesas 10s→**20s**.

---

## Verificación

`tests/cola-dia.test.js` ampliado con `describe('cocinaDelDia', ...)` (5 casos nuevos, 20 en total en el
archivo): pendientes/en preparación de hoy sí aparecen, lo ya entregado no, una orden "en preparación" de
ayer ya no aparece (el bug reportado), reservas `es_en_cocina` de hoy sí aparecen y de ayer no, listas
vacías cuando corresponde. 330/330 jest verde.

---

## Relacionado

Mismo patrón que [ISS-026](ISS-026-cola-carrera-doble-tap.md). Cierra el "riesgo conocido a vigilar"
anotado en la sesión 2026-08-10 (parte 4) sobre `GET /api/orders/activas`.
