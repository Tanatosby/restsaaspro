# ISS-031 — Ícono de notificación push aparece como cuadrado gris

**Estado:** ✅ Resuelto — 2026-08-11
**Módulo:** `public/sw.js`, `public/icons/`, `routes/public.js`, `utils/autoPreparacion.js`, `utils/recordatorioMenu.js`
**Prioridad:** 🟢 Baja — cosmético, no bloqueaba la entrega del push

---

## Reporte del usuario

> "más bien, no se puede personalizar? aparece un cuadrito de color gris, no aparece el logo, como con wpp,
> eso se puede hacer?"

Contexto: reportado justo después de confirmar que el push ya llegaba (ver ISS-025 — causa raíz: VAPID keys
regeneradas después de crearse las suscripciones viejas).

---

## Diagnóstico

Android usa 2 íconos distintos en una notificación push, con reglas distintas:

- **`icon`** (grande, se ve al expandir) — se muestra a color tal cual la imagen.
- **`badge`** (chico, barra de estado / pantalla de bloqueo) — Android lo **fuerza a una silueta
  monocromática**, sin importar qué imagen se le pase. Necesita fondo transparente y solo la forma en un
  color sólido; si la imagen es opaca (como `icon-192.png`: un cuadrado naranja sólido con "MP"), Android no
  tiene de dónde recortar la silueta y termina pintando el cuadrado entero gris/plano — el "cuadrito gris"
  reportado. El ícono de barra de estado de WhatsApp tampoco es su logo completo — es una siluetita simple,
  mismo mecanismo.

Los 4 puntos que disparan push (`routes/public.js` ×2, `utils/autoPreparacion.js`,
`utils/recordatorioMenu.js`) mandaban `badge: '/icons/icon-192.png'` — la misma imagen opaca del ícono
grande, nunca pensada para usarse como badge.

---

## Solución

- `public/icons/badge-96.png` (nuevo): monograma "MP" en blanco sobre **fondo 100% transparente**, generado
  con Pillow (96×96, tamaño recomendado para badges de Android/Chrome).
- `public/sw.js` — `CACHE` bumpeado a `v7` (ISS-022: hay que subir versión al cambiar assets), nuevo asset
  agregado a `ASSETS` para precacheo, y el fallback de `badge` en el listener `push` apunta al nuevo ícono.
- `routes/public.js`, `utils/autoPreparacion.js`, `utils/recordatorioMenu.js` — los 4 payloads de push
  actualizados a `badge: '/icons/badge-96.png'`.
- El ícono grande (`icon`) se deja igual — ya se mostraba a color correctamente.

**Fuera de alcance a pedido del usuario:** logo de marca real en vez del monograma "MP" — se explorará más
adelante, cuando haya una identidad de marca definida. Este fix es puramente técnico (arregla cómo Android
renderiza el badge, no cambia qué dice el ícono).

---

## Verificación

330/330 jest verde (sin tests dedicados — es un asset estático + 5 strings de configuración, verificado
visualmente componiendo el PNG contra un fondo oscuro para confirmar que la silueta blanca se ve limpia).

---

## Relacionado

Encontrado en la misma conversación que [ISS-025](ISS-025-push-no-llega.md), inmediatamente después de
resolver la causa raíz de que el push no llegaba (VAPID keys desincronizadas).
