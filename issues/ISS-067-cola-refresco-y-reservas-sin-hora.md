# ISS-067 — Cola del día: reservas sin hora enterradas + parpadeo en cada refresco

**Estado:** ✅ **Resuelto 2026-08-24** — pendiente de deploy.
**Módulo:** `public/js/modules/pedidos.js`.
**Prioridad:** 🔴 Alta — causó demora real en pasar un pedido a cocina con el cliente ya en el
local.

---

## Síntoma reportado

Visita en persona del usuario al restaurante piloto, Día 10 (2026-08-24, ver `pilotos.md` Día
10 — visita en persona). Tres problemas relacionados, todos en la Cola del día:

1. Una reserva sin hora de llegada, cuando el cliente ya había llegado, no aparecía visible en
   la zona "Pendientes" — la dueña no la encontraba para pasarla a cocina y perdió tiempo real
   mientras el comensal esperaba.
2. Cada refresco automático (cada 30 s) hacía que las cards de pedidos "desaparecieran y volvieran
   a aparecer" — imposible leer un pedido tranquilo en medio de la hora pico.
3. Si estaba viendo un pedido a mitad de la lista, el refresco la devolvía arriba, perdiendo su
   lugar.

## Diagnóstico

`urgenciaItem()` le daba **urgencia fija = 0** a cualquier reserva sin `hora_llegada` — mientras
las órdenes y las reservas con hora vencida suben de urgencia con el tiempo transcurrido, una
reserva sin hora se quedaba siempre al mismo nivel, terminando enterrada debajo de todo lo demás
activo.

Además, `renderZona()` reconstruía el `innerHTML` completo de cada zona en **cada** poll (cada
30 s), sin comparar si los datos habían cambiado — de ahí el parpadeo constante — y sin preservar
el `scrollTop` del contenedor real (`.content`, no cada zona individual), de ahí el salto hacia
arriba.

## Fix

- **Reservas sin hora ya no tienen urgencia fija:** se calculan igual que una orden — mientras
  más tiempo llevan esperando sin avanzar, más urgentes. La más vieja queda arriba.
- **Polling bajado de 30 s a 60 s** (pedido explícito del usuario, además de la causa de fondo).
- **Anti-parpadeo:** `renderZona()` guarda una "firma" (JSON de los datos) de lo último pintado
  por zona; si el nuevo poll trae los mismos datos, no toca el DOM. Solo repinta cuando algo
  cambió de verdad (nuevo ítem, cambio de estado).
- **Scroll preservado:** `renderColaDesdeCache()` guarda el `scrollTop` de `.content` antes de
  repintar las 4 zonas y lo restaura después.

## Verificación

- Sintaxis verificada (`node --check`), sin cobertura jest (es lógica de UI sin tests unitarios
  dedicados) — suite completa sigue en 34/34 · 458/458 (sin cambios de backend).
- Confirmado por el usuario en vivo: "ya no hay parpadeo con el refresco de los datos".
