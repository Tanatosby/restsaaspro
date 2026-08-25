# ISS-076 — "Qué hay de nuevo": modal + badge para comunicar cambios

**Estado:** Resuelto — 2026-08-25
**Reportado por:** el usuario, preocupación de fondo tras varias sesiones de fixes seguidos

## Problema

La única forma de que la dueña se enterara de un cambio era que se lo explicaran en persona o
por teléfono — no escala con el ritmo de deploys del piloto (varios por semana). El usuario
preguntó si se podía avisar dentro de la app, como el "qué hay de nuevo" de un juego.

## Decisión de alcance

Se descartó un tour interactivo tipo videojuego (spotlight, pasos "siguiente/anterior") por
costo de mantenimiento: con el ritmo de cambios del piloto, un tour necesitaría actualizarse
cada vez que cambia un layout, y el riesgo de que quede señalando algo que ya no existe es
alto. Se optó por dos piezas más baratas y sin motor genérico que mantener:

1. **Modal "🎉 Qué hay de nuevo"** — aparece una sola vez al abrir `owner.html`, con lo no visto
   desde la última vez (si pasó una semana sin abrir la app, ve todo junto).
2. **Badge "🆕"** — un puntito sobre el control específico que cambió, para quien no lee el
   modal pero navega directo a la pantalla.

## Fix

- `public/js/modules/novedades.js` (nuevo) — array `NOVEDADES` (fecha + bullets en lenguaje
  simple, no técnico) mantenido a mano en cada sesión con cambios visibles para la dueña, igual
  que ya se hace con `status.md` para uso técnico. `mostrarNovedadesSiHay()` compara contra
  `localStorage.novedadesVistaId` y arma el modal con todo lo no visto.
- `public/js/modules/utils.js` — `badgeNuevo(featureKey, fechaIntroduccion, diasVigencia=14)`:
  se apaga solo a los 14 días, o al tocarlo (guardado en `localStorage`, por feature).
- `public/css/owner.css` — estilos del modal (bottom-sheet, mismo lenguaje visual del resto de
  `owner.css`) y del badge.
- `public/owner.html` — carga `novedades.js`, dispara `mostrarNovedadesSiHay()` tras el login
  **solo para owner/admin** (las novedades de hoy son de Configuración, pantalla que el
  cocinero no usa). Primera entrada cargada con los cambios visibles de hoy (ISS-070 a
  ISS-075). Badge aplicado como prueba al control de Compatibilidad de platos (ISS-070).

Sin cambios de backend. 34/34 test suites, 458/458 tests.

## Cómo seguir usándolo

Al cerrar una sesión con cambios visibles para la dueña, agregar una entrada nueva al array
`NOVEDADES` en `novedades.js` (mismo hábito que actualizar `status.md`).

## Verificación pendiente

Sin probar en uso real — confirmar que el modal aparece la primera vez que la dueña abre la app
tras este deploy, y que no vuelve a aparecer en visitas siguientes.
