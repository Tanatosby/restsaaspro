# ISS-052 — El pensionista no podía cambiar su propia contraseña

**Estado:** ✅ **Resuelto 2026-08-19.**
**Módulo:** `public/pensionista.html`.
**Prioridad:** 🟡 Media — el owner puede resetear la contraseña de un pensionista desde su panel,
pero el pensionista mismo no tenía forma de cambiarla.
**Origen:** notado por el usuario revisando el flujo antes de dar de alta al primer pensionista
real (todavía no hay ninguno usando la app) — no es un reporte de la dueña del piloto.

---

## Diagnóstico

`owner.html` (owner/mozo/cocinero) ya tiene "🔑 Cambiar contraseña" — un modal que llama a
`PATCH /api/auth/me/password`. `pensionista.html` no tenía nada equivalente.

**El backend no necesitó ningún cambio.** `PATCH /api/auth/me/password`
(`routes/auth.js:211`) solo exige `authenticate` — no filtra por rol — y opera sobre
`req.user.id` contra la tabla `usuarios`, donde el pensionista ya vive (extiende `usuarios`
1-a-1, `pensionistas.md` §2-3). Era puramente un hueco de UI en `pensionista.html`.

## Solución implementada

Botón "🔑 Contraseña" junto a "Salir" en el header, modal idéntico en estructura al de
`owner.html` (contraseña actual + nueva + confirmar, mismas validaciones), llamando al mismo
endpoint compartido.

## Verificación

`scripts/test-pensionista-password.js` nuevo, **12/12** — abre el modal, valida los 4 casos de
error (campos vacíos, contraseña corta, confirmación distinta, contraseña actual incorrecta),
cambia la contraseña de verdad y confirma que el login **deja de funcionar con la vieja y
empieza a funcionar con la nueva** (no solo que el modal se cierra sin error). Touch target
≥44px, sin overflow a 360px. 457/457 jest + `test-pensionista-cliente` 29/29 sin regresiones.
