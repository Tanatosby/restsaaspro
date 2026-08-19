# ISS-053 — "Agregar manual" con fotos + soporte de carta

**Estado:** ✅ **Resuelto 2026-08-19.**
**Módulo:** `public/js/modules/pedidos.js`, `public/owner.html`.
**Prioridad:** 🟡 Media — mejora de usabilidad, no un bug de producción.
**Origen:** pedido del usuario ("¿no puede ser más visual, como en menu.html?").

---

## Diagnóstico

"Agregar manual" (botón en la Cola del día para el cliente que pide de palabra) elegía cada
plato de cada sección con un `<select>` de texto plano — nada que ver con las cards con foto de
`menu.html`. Además **solo tenía menú del día**: si alguien pedía algo suelto de la carta sin
menú, no había forma de cargarlo desde ahí.

Revisando el código apareció que **ya existía el widget que hacía falta**: `PlatoPicker`
(`public/js/widgets/plato-picker.js`) — grid de fotos, ya cargado en `owner.html`, ya usado en
producción para armar las secciones del menú del día en Configuración. Nadie lo había conectado
a "Agregar manual". Se armó un mockup reusando ese widget + los tokens reales de `owner.css`
antes de tocar código: <https://claude.ai/code/artifact/0dfcfb2a-7fdc-494f-ab31-156ce87850a8>.

## Solución implementada

- **Chip nuevo** reemplaza al `<select>`: vacío, borde punteado "+ Elegir [sección]"; con
  selección, foto real (o un placeholder con degradé si el plato no tiene foto) + nombre +
  "cambiar". Tocarlo abre `PlatoPicker.open()` — el mismo sheet que ya usa Configuración.
- **Foto de portada** en la card de cada menú del día (misma prioridad que `menu.html`: el
  plato que el owner eligió como portada y, si no hay, el primero con foto).
- **Carta sumada**: sección nueva "Carta" en el modal con el mismo patrón card+stepper que ya
  tenía el menú (foto/placeholder + nombre + precio + −/cantidad/+), sin picker (no hay
  secciones que elegir, solo cantidad). El backend de `POST /api/orders` **ya aceptaba
  `carta_items`** — cero cambios de backend, solo faltaba mandarlos desde el modal.

## Verificación

`scripts/test-agregar-manual.js` (ya existía, actualizado) — **28/28**: el chip abre
`PlatoPicker` y muestra el plato correcto, queda "lleno" tras elegir, la carta aparece en el
modal, un pedido con menú + carta juntos guarda ambos en la BD con cantidad y precio correctos,
las dos ramas de `metodo_pago` (con/sin efectivo activo) y la validación de secciones
obligatorias (ISS-046) siguen funcionando igual que antes. 457/457 jest + `test-modalidad-mixta`
19/19 sin regresiones.
