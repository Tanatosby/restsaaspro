# ISS-068 — Marcar "Agotado" era demasiado lento en plena hora pico

**Estado:** ✅ **Resuelto 2026-08-24** — pendiente de deploy.
**Módulo:** `public/js/modules/pedidos.js`, `public/owner.html`.
**Prioridad:** 🟡 Media — causó pedidos fallidos en cocina por platos ya agotados.

---

## Síntoma reportado

Visita en persona del usuario al restaurante piloto, Día 10 (ver `pilotos.md` Día 10 — visita en
persona). La dueña no estima cantidades de stock al inicio del día ("estimar las cantidades aún
no le da"), así que cuando un plato se acaba intenta ajustarlo sobre la marcha — pero el camino
para hacerlo (Configuración → Menú del día → sección → plato → botón "⋯" → Agotado) es
demasiado profundo para un ajuste de emergencia en medio del servicio. Para cuando lo
encontraba, varios comensales ya habían pedido ese plato y el pedido llegaba incompleto a
cocina.

## Fix

Nuevo botón **"📦 Stock"** en el header de la Cola del día (`panel-pedidos`) — acceso directo
desde donde la dueña ya está mirando todo el tiempo, sin pasar por Configuración. Abre un modal
con la lista **plana** de todos los platos del/los menú(s) activos de hoy (sin el acordeón de
secciones), cada fila con nombre + sección + un botón de 1 tap "⛔ Agotado" / "✔ Disponible".

Reusa el mismo endpoint que ya existía
(`PATCH /api/menu/menus-dia/:id/secciones/:seccionId/platos/:componenteId/agotado`) — cero
cambios de backend, solo un camino más corto para llegar a la misma acción.

## Verificación

- Sintaxis verificada (`node --check`); suite jest sin cambios de backend, sigue 34/34 · 458/458.
- Pendiente de probar en uso real por el usuario.
