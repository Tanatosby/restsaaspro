# ISS-082 — Aceptación de Términos de uso (consentimiento de datos de venta + aviso de IA)

**Estado:** ✅ Resuelto — 2026-08-28 · pendiente de deploy
**Módulo:** `routes/auth.js` · `public/owner.html` · `public/terminos.html` · `config/database.js` · `admin/dashboard.html`
**Origen:** pedido del usuario (Pedro), 2026-08-28. Cierra el **Gap 22** de `vision_negocio.md`.

---

## Contexto

El usuario planteó que cada dueño debería **marcar explícitamente en unos términos de uso** que:

1. Nos da permiso para usar sus **datos de venta**.
2. Esos datos se usan para **métricas de uso** y **estrictamente para eso**.
3. Son **confidenciales**.

Es el consentimiento que faltaba como base legal para lo de `vision_negocio.md` §15 (métricas
agregadas / publicidad a futuro) y el Gap 15. Se decidió aprovechar y cerrar el Gap 22 completo,
sumando el **aviso de que la app fue desarrollada con IA supervisada por una persona**.

## Decisiones (con el usuario, 2026-08-28)

| Tema | Decisión |
|------|----------|
| ¿Quién acepta? | **Solo el owner.** mozo/cocinero/admin no ven nada. El consentimiento es sobre los datos del negocio, lo da el owner como representante. |
| ¿Dónde? | **Pantalla bloqueante en el primer ingreso a `owner.html`**, no en el registro (no existe registro self-service: los restaurantes los crea el admin). |
| ¿Contenido? | Un solo texto: consentimiento de datos de venta **+** aviso de IA. |
| ¿Re-aceptación si cambia el texto? | **Sí**, por versión (`utils/terminos.js::TERMINOS_VERSION`). |

## Implementación

**BD (`config/database.js`)** — migración idempotente, columnas en `restaurantes`:
`terminos_aceptados_at TEXT`, `terminos_version TEXT`, `terminos_aceptado_por INTEGER`.

**`utils/terminos.js`** (nuevo) — `TERMINOS_VERSION = '2026-08-28'`. Subir esta fecha cuando
cambie el texto fuerza re-aceptación a todos los owners.

**Backend (`routes/auth.js`)** — 2 endpoints nuevos:
- `GET /api/auth/terminos` → `{ version, pendiente, aceptados_at }`. `pendiente` es `true` solo
  si `req.user.role === 'owner'` y la versión guardada del restaurante ≠ `TERMINOS_VERSION`.
- `POST /api/auth/terminos/aceptar` (`authorize('owner')`) → guarda timestamp ISO + versión +
  `req.user.id`.

**Frontend (`public/owner.html`)** — overlay `#modal-terminos` (mobile-first: checkbox 22px con
área táctil, botón 48px, sin ✕ ni cierre por fondo). En el arranque, si `session.role === 'owner'`,
llama a `GET /api/auth/terminos`; si `pendiente`, muestra el overlay. Botón "Acepto y continúo"
deshabilitado hasta tildar el checkbox → `POST /api/auth/terminos/aceptar` → oculta el overlay.
Si no hay red o el endpoint falla, **no se bloquea** (se reintenta en el próximo ingreso, mismo
criterio que la sesión offline de ISS-027).

**`public/terminos.html`** (nuevo) — página estática con el texto completo (8 secciones:
qué datos guarda, consentimiento de venta, para qué se usan, confidencialidad, Ley N.° 29733
para datos de clientes, cómo está hecha la app, cambios de términos, contacto). Linkeada desde
el overlay. La sirve `express.static`; el service worker la cachea con su patrón normal de HTML.

**Panel admin (`admin/dashboard.html` + `routes/admin.js`)** — columna nueva "T&C" en la tabla
de restaurantes: badge verde con la fecha de aceptación (tooltip con la versión) o "pendiente".

**Tests** — `tests/terminos-aceptacion.test.js`, 9 casos (regla de `pendiente` por rol y versión,
efecto de aceptar, re-aceptación, usuario sin restaurante). **478/478 jest verde.**

## Verificación

- Migración aplicada y columnas presentes (verificado contra la BD real de dev).
- `app.js` arranca sin errores con los endpoints montados.
- Suite completa de jest en verde (36 suites / 478 tests).

## Pendiente

- Deploy (lo hace el usuario).
- Confirmar en uso real que el overlay aparece en el primer ingreso de la dueña del piloto y no
  reaparece después.
