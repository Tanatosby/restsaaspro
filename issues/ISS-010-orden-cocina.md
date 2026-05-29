# ISS-010 — Orden de visualización incorrecto en Panel Cocina

**Estado:** Resuelto — 2026-05-23
**Módulo:** Cocina
**Prioridad:** Alta
**Capturas:** issue_orden.png

---

## Descripción

En el panel Cocina, la sección "Pendientes" aparecía antes que "En preparación". El cocinero necesita ver primero lo que ya está cocinando (para presionar "✅ Listo") y luego lo que falta iniciar.

## Causa raíz

`cocina.js::loadColaCocina()` renderizaba en orden: Pendientes → En preparación → Reservas en preparación. El orden correcto de urgencia para el cocinero es el inverso.

## Archivos a tocar

- `public/js/modules/cocina.js`

## Solución aplicada

**2026-05-23 — `cocina.js`:**
- Orden de render cambiado a: **En preparación → Reservas en preparación → Pendientes**
- `margin-top` de cada sección ahora es condicional (0 si es la primera sección visible)
