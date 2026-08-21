# ISS-056 — Cliente no sabía cómo volver a la app tras pagar por Yape/Plin

**Estado:** ✅ **Resuelto 2026-08-21.**
**Módulo:** `public/menu.html`.
**Prioridad:** 🟡 Media — fricción real, sin pérdida de datos (distinto de `ISS-049`).
**Origen:** piloto #1, Día 7 (2026-08-20), reportado por el usuario el 2026-08-21. Textual del
cliente: *"No entiendo, salgo de la web y voy a mi yape, ya pagué, ¿cómo regreso a la app?"* —
se quedaba en la pantalla de apps del celular.

---

## Diagnóstico

Distinto de `ISS-049` (que evita que el pedido se pierda si la pestaña se recarga al volver de
pagar): acá el pedido seguía intacto, el problema era puramente de navegación entre apps — la
pantalla de pago mostraba el número para Yapear/Plinear pero no decía qué hacer *después* de
pagar. Un usuario sin el hábito de cambiar de apps en el celular (el mismo perfil que llena
`vision_negocio.md`) se queda literalmente varado en la pantalla de inicio del teléfono.

## Solución implementada

Bloque de instrucción nuevo (`volverInstruccionHtml()`), agregado bajo el número de Yape/Plin
en `seleccionarMetodoPago()`:

> 📲 Para volver aquí después de pagar: No cierres tu app de pago con la ✕ — cambia de app
> (desliza desde abajo y mantén, o toca ⬜) y busca esta pantalla. Tu pedido te espera tal como
> lo dejaste.

Solo aparece en los métodos que implican salir de la app (Yape/Plin) — no en efectivo, donde no
hay ningún salto. Texto a 14px (cumple el mínimo de contenido de mobile-first), sin backend.

## Verificación

457/457 jest sin regresiones (cambio 100% frontend). Sin test E2E nuevo — es texto estático,
sin lógica nueva que testear; pendiente confirmar con el piloto si bajó la confusión real.
