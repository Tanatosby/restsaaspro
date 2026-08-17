# ISS-046 — Un plato "no autocontenido" puede pedirse sin su sección obligatoria condicional

**Estado:** ✅ **Resuelto 2026-08-17** — pendiente de deploy (backup mínimo ya hecho, ver `status.md`).
**Módulo:** `config/database.js`, `routes/menu.js`, `routes/public.js`, `routes/orders.js`,
`routes/reservations.js`, `utils/validarSeccionesMenu.js` (nuevo), `public/owner.html`,
`public/menu.html`.
**Prioridad:** 🔴 Crítica — pedido incompleto llega a cocina sin nada que lo frene; fue el
momento de mayor tensión del piloto hasta ahora.

---

## Síntoma reportado

Día 4 del piloto (2026-08-17), contado por el usuario: la dueña separó los segundos en dos
tipos dentro del menú — platos **autocontenidos** (ej. "arroz con pollo", ya completo por sí
solo) y **bases combinables** (ej. "arroz con papas fritas", que necesita elegir una proteína
aparte: pollo, pescado o chuleta). Para modelar esto arman 3 secciones: "Entradas" y "Arroces"
obligatorias, "Proteínas" **opcional** — opcional a propósito, para que "arroz con pollo" pase
sin elegir nada ahí.

Ese mismo día, 2 comensales pidieron "arroz con papas fritas" (que **sí** necesita proteína) y
se olvidaron de elegirla. El pedido pasó igual y llegó incompleto a cocina — la dueña no sabía
cómo armar el plato. Estuvo a punto de abandonar la app y volver a su cuaderno en ese momento.

## Diagnóstico

`requerido` es una propiedad de la **sección completa**, no del plato. La única validación que
existía vivía en `agregarMenu()` (`menu.html`) y solo revisaba secciones `requerido=1`. Como
"Proteínas" está marcada opcional a propósito, la validación no tenía forma de exigirla solo
para "arroz con papas fritas" y no para "arroz con pollo".

Peor aún: **el backend no validaba nada de esto.** `POST /api/orders`, `POST /api/reservations`
y sus equivalentes públicos (`routes/public.js`, usados por el cliente que pide desde el QR sin
login) solo comprobaban que cada `id_componente` existiera — nunca que las secciones
obligatorias (ni ninguna condicional) estuvieran completas. La única barrera real era el
frontend, y ese frontend no tenía el dato que necesitaba.

## Fix

**Modelo de datos** — `componentes_menu_dia.requiere_seccion_id` (nullable, FK a
`secciones_menu`, migración idempotente): si un plato la tiene seteada, elegirlo exige que esa
otra sección también se complete en la misma instancia de menú, aunque esa sección sea opcional
en general. Genérico — no hardcodea "proteína", sirve para cualquier combinación futura similar.

**Backend:**
- `GET /api/menu/menus-dia` y `GET /api/public/menu` devuelven `requiere_seccion_id` (+ nombre)
  por plato.
- `POST/PATCH` en `routes/menu.js` para setear el campo al crear o editar un componente.
- Nuevo `utils/validarSeccionesMenu.js`, compartido por los **4 puntos de entrada** que crean
  pedidos/reservas (`routes/orders.js`, `routes/reservations.js`, `routes/public.js` ×2 —
  autenticado y público). Valida **por instancia de menú** (agrupando por `grupo`, ISS-041), no
  solo por `id_menu_dia`: si dos menús iguales van en el mismo pedido y uno queda incompleto,
  agrupar sin distinguir instancias dejaría "prestarle" la selección del otro — el mismo tipo de
  bug que apareció en el conteo de `reportes.js` esa misma sesión.

**Frontend:**
- `owner.html` (configuración del menú): badge `🔗 Exige <sección>` por plato + acción para
  marcarlo/desmarcarlo (modal con selector de sección).
- `menu.html` (`agregarMenu()`): bloquea "Agregar al pedido/reserva" si un plato elegido exige
  una sección que quedó vacía — cubre tanto pedir como reservar, mismo endpoint público.

## Verificación

- `tests/validar-secciones-menu.test.js` — 11/11, incluye el caso real (combinable sin
  proteína bloquea, autocontenido sin proteína pasa) y el de múltiples instancias del mismo
  menú en un pedido.
- Suite completa: **32/32 test suites, 423/423 tests** (número real — ver nota de infraestructura
  abajo).
- Migración verificada localmente: columna se crea sola, no rompe datos existentes.

## Nota de infraestructura (no es parte del bug, salió mientras se verificaba)

Un git worktree abandonado en `.claude/worktrees/foamy-moseying-nebula` (viejo, del
2026-08-11, sin cambios propios) hacía que `npx jest` sin flags contara sus tests duplicados
(31 suites reales → 58 contadas, 412 tests reales → 758 contados). Se agregó
`testPathIgnorePatterns` al jest de `package.json` para que esto no vuelva a pasar. El
worktree en sí quedó pendiente de borrar — el comando de `git worktree remove` fue bloqueado
por el clasificador de permisos; lo borra el usuario.
