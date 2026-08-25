# ISS-070 — Compatibilidad de platos (Exige/No permite sección) visible, Opción A

**Estado:** Resuelto — 2026-08-25
**Contexto:** decisión de diseño pausada el 24 de agosto (ver `backlog.md`), retomada y
cerrada en conversación de escritorio con mockup ["Compatibilidad de Platos"](https://claude.ai/code/artifact/76b60128-c12a-4a3b-98f8-98a937a745c3).

## Problema

La relación entre un plato y otra sección opcional (ISS-046 "exige sección" / ISS-066 "no
permite sección") vivía detrás de "⋯", con nombres técnicos ("Exige sección" / "No permite
sección"). La dueña no la encontraba sola — reportado el Día 10 del piloto sobre el caso real
de "ají de gallina" servido como plato libre.

## Decisión

De las 3 alternativas del mockup, el usuario eligió la **Opción A** — control de 3 estados
siempre visible, pegado a cada plato: 🔓 Puede llevar / ✅ Necesita / 🚫 No lleva. Antes de
implementar se resolvió una duda de vocabulario (el estado neutral se llamaba "🤷 Como quiera"
y no se entendía — pasó a "Puede llevar") y se agregó un botón ⓘ con tooltip explicando los 3
estados, a pedido del usuario.

## Pregunta abierta que quedó resuelta al implementar

`requiere_seccion_id` y `no_permite_seccion_id` son 2 columnas independientes por plato — un
plato puede necesitar una sección opcional Y no llevar otra distinta a la vez. La Opción A
generaliza a esto mostrando **un control de 3 estados por cada sección opcional del menú
relacionada** (no solo una) — con el caso real de hoy (1 sección opcional en el menú) es 1
control por plato, igual que en el mockup.

## Implementación

- `public/owner.html` (`mcSeccionAcordeon`) — nuevo bloque `.mc-compat` siempre visible bajo
  cada plato, un control de 3 estados por cada sección opcional del menú (excluyendo la propia
  del plato). Se calcula `otrasOpcionales` una sola vez por sección, no por plato.
- Nueva función `setCompatibilidadPlato(menuId, seccionId, componenteId, otraSeccionId, estado)`
  — reusa los 2 endpoints PATCH existentes (`/requiere-seccion`, `/no-permite-seccion`), sin
  cambios de backend. Limpia la columna contraria **solo si apuntaba a esa misma sección**
  (si apuntaba a una sección distinta relacionada, se deja intacta).
- Nueva función `buscarComponente(componenteId)` — helper para leer el estado actual del plato
  desde `configMenuData` antes de decidir qué limpiar.
- Se eliminaron `abrirRequiereSeccion` / `abrirNoPermiteSeccion` (los 2 modales viejos) y los
  2 botones que vivían en `.mc-plato-acts` detrás de "⋯", junto con los badges
  `badgeExige`/`badgeNoPermite` en el nombre del plato (redundantes ahora que el control está
  siempre visible).
- `public/css/owner.css` — clases nuevas `.mc-compat`, `.mc-compat-head`, `.mc-compat-label`,
  `.mc-info-btn` + `.mc-tip-toggle` + `.mc-tip-box` (tooltip por checkbox, sin JS), `.mc-seg3` +
  `.mc-seg3-opt` (segmented control). Reusa los tokens de color existentes del archivo.

**Simplificación aceptada:** requerir una sección **obligatoria** (redundante, ya se exige a
todos) ya no es una opción — antes el modal viejo lo permitía, aunque no tenía efecto real. Solo
se ofrecen secciones opcionales, igual que ya hacía "No permite sección" antes.

Sin cambios de backend. 34/34 test suites, 458/458 tests.

## Verificación pendiente

Sin probar todavía en piloto real. Confirmar con la dueña que el control se entiende sin
explicación y que el tooltip (ⓘ) resulta útil la primera vez.
