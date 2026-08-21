# ISS-057 — Tamaño de letra ajustable en la carta del cliente (`menu.html`)

**Estado:** ✅ **Resuelto 2026-08-21.**
**Módulo:** `public/menu.html`, `public/css/menu.css`.
**Prioridad:** 🟡 Media — accesibilidad, no bloquea el pedido.
**Origen:** piloto #1, Día 7 (2026-08-20), reportado por el usuario el 2026-08-21: un cliente
no alcanzaba a ver bien las letras de la carta.

---

## Diagnóstico

El tamaño de letra ajustable (`ISS-028`, 2026-08-10) se construyó **solo para `owner.html`**.
Quedó anotado en su momento en `backlog.md`: *"`menu.html` (la carta del cliente) no se tocó —
decisión del usuario, queda para más adelante."* `menu.css` tenía **65 declaraciones** de
`font-size` en `px` fijo (sin relación con el `<html>` raíz) y `body` también fijaba su propio
`font-size: 15px` — nada ahí escalaba con nada.

## Solución implementada

Mismo mecanismo que `owner.html`, adaptado:

- `html { font-size: calc(16px * var(--font-scale, 1)); }` en `menu.css` — con `--font-scale`
  por defecto **1** (a diferencia de `owner.html`, acá "Normal" es el tamaño actual, sin cambio
  visual para quien no toca nada; el comensal medio ya lee bien hoy).
- Las 63 declaraciones de `font-size` en `px` de `menu.css` (nombres/descripciones/precios de
  platos, secciones, botones, carrito, reserva, pantallas de confirmación) se convirtieron a
  `rem` sobre base 16px — quedan 2 sin tocar (`.menu-dia-photo-ph`/`.plato-carta-photo-ph`,
  40px: el ícono decorativo del placeholder sin foto, no es texto de lectura).
- Botón nuevo **🔤** en el header (junto a "Consultar mi reserva"), 44×44px táctil, cicla 3
  niveles (`[1, 1.2, 1.45]` → Normal/Grande/Muy grande) al tocar. Preferencia en
  `localStorage['mp-font-scale-menu']` — clave propia, separada de la del panel del owner,
  porque el comensal no tiene sesión.
- Aplicado antes del paint (script en `<head>`, mismo patrón que el dark mode y que
  `owner.html`) para evitar flash de tamaño incorrecto.

**Alcance:** cubre `menu.css` completo (la carta, el carrito, reservas, pantallas de
confirmación/pago). Los textos inline de `menu.html` fuera de esas pantallas (hints puntuales
del flujo de pago) no se tocaron — quedan para una pasada futura si hace falta, mismo criterio
de scoping que usó `ISS-028` en su momento.

## Verificación

457/457 jest sin regresiones (cambio 100% frontend, sin tests unitarios de por sí). Sin test
E2E nuevo — pendiente verificar a mano en un celular real (360px, los 3 niveles) antes del
próximo servicio del piloto.
