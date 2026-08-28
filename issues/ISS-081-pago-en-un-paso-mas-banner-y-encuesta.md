# ISS-081 — Pago en un solo paso + aviso temporal + encuesta de producto

**Estado:** ✅ Resuelto — 2026-08-28
**Módulo:** `public/menu.html`, `routes/public.js`, `routes/admin.js`, `public/admin/dashboard.html`, `config/database.js`
**Prioridad:** 🟡 Media — mejora de fricción sobre ISS-080, ya en producción y funcionando.

---

## Contexto

A un día de tener ISS-080 (rediseño de "Pedir") en producción, el usuario probó el flujo real y
trajo 3 pedidos, validados primero con un prototipo interactivo (mismo artifact "Pedido Directo"):

1. La letra del aviso "Estás eligiendo tu Menú X i/n" quedaba chica frente al botón.
2. La pantalla "¿Cómo vas a pagar?" solo mostraba el total — pidió que también se viera el
   resumen del pedido, y de paso preguntó si la pantalla "Revisa tu pedido" (Gap 17) podía
   sacarse, ahorrando un paso ahora que el flujo nuevo ya lleva directo a pagar.
3. Un aviso temporal (3 días) explicando el cambio a los comensales, y una encuesta corta al
   terminar el pedido — 2 preguntas con botones + comentario opcional — visible **solo en el
   panel admin de la plataforma** (menupro.tech/admin), nunca en el panel de la dueña.

## Solución

### 1. Letra del picker más grande
`menu-modal.js` — `.mm-progreso` pasa de 13px a 15.5px (el número, a 17px), más cerca del
tamaño del botón "Guardar y seguir".

### 2. Pago en un solo paso — se elimina "Revisa tu pedido"
Investigado antes de tocar nada: la garantía real de **Gap 17** (`vision_negocio.md`) nunca fue
"2 pantallas", fue *"no crear la orden/reserva hasta tener método + comprobante ya resueltos"*.
El propio `vision_negocio.md` ya dejaba anotado esto como replanteable sin urgencia.

- `#repaso-screen` se eliminó del HTML.
- `#pago-screen` ahora también muestra el **resumen de ítems** (antes solo vivía en el repaso) y
  sube el tamaño de "📎 Foto del comprobante" de 13px a 14.5px (estaba por debajo del mínimo de
  14px que exige la propia regla mobile-first del proyecto).
- `enviarPago()` absorbió toda la lógica de `confirmarEnvioFinal()` — sigue validando método (y
  foto si aplica) **antes** de crear nada, y sigue el mismo patrón de 2 requests con feedback de
  progreso (ISS-039) y protección contra duplicar el pedido en un reintento (ISS-049,
  `pagoPendiente.creado`). `showRepasoStep()`, `volverAPago()` y `confirmarEnvioFinal()` se
  eliminaron — todo vive ahora en `enviarPago()`.
- Reservar y Pedir comparten el mismo cambio (ambos usaban las mismas 2 pantallas).

### 3. Aviso temporal + encuesta de producto
- **Banner** (`#aviso-flujo-banner`, hermano del banner de horario cerrado ISS-18): mensaje fijo
  en el código, visible desde el deploy hasta el **2026-08-31** (3 días), una sola vez por
  celular (`localStorage`, mismo mecanismo que "Qué hay de nuevo" de `owner.html`).
- **Encuesta** (`#encuesta-flujo-wrap`, dentro de `#confirm-screen`): 2 preguntas con botones —
  "¿Qué tal te pareció esta forma nueva de pedir?" (😞😐🙂🤩) y "¿Preferís esta forma nueva o la
  de antes?" (✅/↩️) — más un comentario de texto libre **opcional**. Nunca bloquea el pedido ya
  enviado: si el POST falla, se ignora en silencio. Misma fecha límite que el banner.
- **Backend nuevo:** tabla `feedback_producto` (con `tipo` para poder reusar la misma tabla en
  futuras rondas de encuestas sin migrar de nuevo), `POST /api/public/feedback` (sin sesión,
  valida `tipo` + enum de `valoracion`/`preferencia` + que haya al menos una respuesta) y
  `GET /api/admin/feedback` (rol admin, filtra por `?tipo=`).
- **Panel nuevo en `public/admin/dashboard.html`** ("Feedback de producto", nav lateral +
  bottom-nav): tabla de solo lectura con fecha, restaurante, valoración, preferencia y
  comentario. **La dueña nunca ve esto** — es feedback de producto para decidir si el cambio de
  ISS-080 funcionó, no información operativa del restaurante. El comentario (único campo de
  texto libre que llega de un comensal sin sesión) se escapa antes de pintarlo — se verificó a
  mano que un intento de `<script>` en el comentario se muestra como texto plano, no se ejecuta.

## Verificación

- `scripts/test-gate-pago.js` reescrito para el flujo de una sola pantalla (21/21) — conserva
  exactamente las mismas garantías que probaba antes (orden/reserva no existe hasta el gate,
  metodo_pago y comprobante quedan adjuntos desde el primer instante, cambiar de método antes de
  enviar no pierde nombre/ítems).
- `scripts/test-feedback-flujo.js` nuevo (16/16) — banner (aparece, se cierra, sobrevive a un
  reload), encuesta (aparece, envía, guarda en `feedback_producto`, se refleja en
  `GET /api/admin/feedback`), y validación del backend (tipo requerido, enum inválido, sin
  ninguna respuesta).
- Ajustados sin cambiar el fondo: `test-iss049-recuperar-pago.js` (12/12),
  `test-comprobante-duplicado.js` (7/7), `test-numero-dia-pedido.js` (10/10),
  `test-monto-pago-visible.js` (9/9, un check que comparaba contra el repaso se reemplazó por
  comparar contra `pagoPendiente.total`, lo que de verdad se cobra).
- Sin cambios necesarios: `test-iss048-volver-pago.js` (15/15), `test-pago-mixto.js` (5/5),
  `test-pedir-cantidad-primero.js` (24/24), `test-repetir-menu.js` (11/11),
  `test-cobrar-homologado.js` (14/14), `test-carta-export.js` (16/16),
  `test-version-assets.js` (25/25). 469/469 jest.
- Panel admin verificado a mano: fila real con comentario con intento de `<script>` se pinta
  escapada (no se ejecuta), restaurante correcto, estado vacío ("Sin respuestas todavía") cuando
  no hay datos.

**Sin cambios:** `test-fixes-pago-comprobante.js` sigue roto por una causa previa a esta sesión
(nunca llena `#nombre-cliente`), sin relación con este cambio — visto y documentado en ISS-080.

## Relacionado

Gap 17 (`vision_negocio.md`, pago obligatorio antes de crear) — la garantía se mantiene, solo se
acortó a una pantalla. ISS-080 (rediseño de Pedir que motivó el aviso y la encuesta). ISS-076
("Qué hay de nuevo", mismo mecanismo de `localStorage` reusado para el banner).
