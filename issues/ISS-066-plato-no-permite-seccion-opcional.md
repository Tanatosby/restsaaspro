# ISS-066 — Un plato "autocontenido" podía combinarse igual con una sección opcional que no necesita

**Estado:** ✅ **Resuelto 2026-08-24** — pendiente de deploy.
**Módulo:** `config/database.js`, `routes/menu.js`, `routes/public.js`,
`utils/validarSeccionesMenu.js` (reusado), `public/owner.html`, `public/menu.html`,
`public/pensionista.html`, `public/js/widgets/menu-modal.js`.
**Prioridad:** 🟡 Media — no llegó a producción como incidente real; lo planteó el usuario
razonando sobre el mismo caso de ISS-046 antes de que volviera a pasar.

---

## Síntoma / caso planteado

Inverso exacto de **ISS-046**. Con la misma estructura de menú (secciones "Arroces" y
"Proteínas", esta última opcional a propósito), ISS-046 ya resolvió que un plato como "arroz
con papas fritas" **exija** elegir Proteínas. Pero nada impedía el caso contrario: un plato
autocontenido como "ají de gallina" (que ya viene con su propia proteína) podía combinarse
igual con una selección de Proteínas — el comensal podía elegir "ají de gallina" + "pollo"
sin que nada lo frenara, ni en frontend ni en backend, porque cada sección se renderizaba como
un grupo de radios independiente sin ninguna relación entre sí.

**Regla acordada con el usuario:** el bloqueo solo tiene sentido si la sección referida es
**opcional** — si "Proteínas" fuera obligatoria en ese menú, se exige siempre para cualquier
plato de Arroces sin excepción, y el bloqueo por plato se ignora (evita una configuración
contradictoria: una sección obligatoria que a la vez esté prohibida dejaría el pedido
imposible de enviar).

## Diagnóstico

`requiere_seccion_id` (ISS-046) resuelve la dirección "el plato necesita más" pero no existía
ningún campo para la dirección opuesta, "el plato prohíbe otra sección". Alcance a nivel de
**sección completa** (no por opción individual dentro de la sección) — confirmado con el
usuario: "ají de gallina" no permite nada de Proteínas, no solo una proteína específica.

## Fix

**Modelo de datos** — `componentes_menu_dia.no_permite_seccion_id` (nullable, FK a
`secciones_menu`, migración idempotente, espejo exacto de `requiere_seccion_id`). Un plato no
puede exigir y bloquear la misma sección a la vez (validado en ambos PATCH).

**Backend:**
- `GET /api/menu/menus-dia` y `GET /api/public/menu` devuelven `no_permite_seccion_id` (+
  nombre en el primero) por plato.
- `POST` de alta de componente y nuevo `PATCH …/no-permite-seccion` en `routes/menu.js` (mismo
  patrón que `…/requiere-seccion`).
- `utils/validarSeccionesMenu.js` gana una tercera regla: si el pedido trae un plato con
  `no_permite_seccion_id` y también trae selección en esa sección, **y esa sección es opcional
  en el menú**, rechaza. Si es obligatoria, se ignora — la misma función ya compartida por los
  4 puntos de entrada (`orders.js`, `reservations.js`, `public.js` ×2) cubre esto sin tocar
  cada endpoint.

**Frontend:**
- `public/js/widgets/menu-modal.js` (compartido por `menu.html` y `pensionista.html`): al
  elegir un plato con `no_permite_seccion_id`, la sección referida se deshabilita/oculta con
  el mensaje "🚫 No disponible — '<plato>' ya viene completo", recalculado en cada
  `MenuModal.refresh()` (nuevo método del widget).
- `selectMenuPlato()` en ambos archivos: si el plato elegido bloquea una sección que ya tenía
  selección, la limpia y avisa con `showMsg()`. Cubre ambos órdenes (elegir el plato bloqueante
  antes o después de la sección bloqueada).
- `agregarMenu()` en ambos: validación defensiva final (red de seguridad, mismo criterio que
  la regla del backend) por si el estado llegara inconsistente.
- `owner.html`: badge `🚫 No permite <sección>` + acción "No permite sección" (modal con
  selector, mismo patrón que "🔗 Exige sección"; el selector solo ofrece secciones opcionales,
  ya que bloquear una obligatoria no tendría efecto).

## Verificación

- `tests/validar-secciones-menu.test.js` — 15/15 (4 casos nuevos: bloqueo aplica con selección
  presente, pasa sin selección, no interfiere con el caso ISS-046 normal, y se ignora cuando la
  sección referida es obligatoria).
- Suite completa: **34/34 test suites, 458/458 tests**.
- Migración verificada localmente contra `database.sqlite`: columna se crea sola.
