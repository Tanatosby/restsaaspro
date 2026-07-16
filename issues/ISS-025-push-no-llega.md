# ISS-025 — Notificaciones push no llegan / no existe aviso de "pedido nuevo"

**Módulo:** `public/sw.js`, `public/owner.html`, `routes/push.js`, `utils/autoPreparacion.js`
**Prioridad:** 🟡 Media-Alta — afectó directamente la primera experiencia piloto (ver `pilotos.md`)
**Estado:** 🔍 Diagnosticado — decisión de producto pendiente, sin implementar

## Reporte original

Restaurante piloto #1 reportó (vía Pedro): "las notificaciones cuando llegan reservas no funcionan, cuando
el celular se apaga no le aparece ninguna notificación por más que se ha descargado la app, no hay sonido
de alerta ni mensaje en el celular". Lo comparó explícitamente con WhatsApp o Temu, que suenan y muestran
mensaje en pantalla aunque el celular esté sin usar.

## Diagnóstico

Dos causas distintas, no excluyentes:

**1. El trigger que ella espera no existe.** Revisando el código, el push hoy **solo** se dispara desde
`utils/autoPreparacion.js` → `enviarPushRestaurante()`, en el momento "hora de preparar" (X minutos antes
de la `hora_llegada` de una reserva ya **confirmada**), vía un job que corre cada 60s. **No hay ningún push
al crearse un pedido/reserva nueva** — que es lo que su comparación con WhatsApp/Temu sugiere que espera.
Si el restaurante no tuvo reservas con `hora_llegada` próxima durante sus 2 días de prueba, jamás iba a
sonar nada, incluso si todo el resto funcionara perfecto.

**2. La suscripción push es 100% silenciosa y sin diagnóstico.** En `public/owner.html` (script final antes
de `</body>`), `suscribirPush()` se ejecuta sola al cargar la página, sin botón ni mensaje de
"notificaciones activas". El `catch` queda vacío (`/* permiso denegado o VAPID no configurado */`) — si
falla por cualquier motivo, nadie se entera:
- Si el navegador mostró el pop-up nativo de permiso la primera vez y se cerró/negó sin querer, queda en
  `Notification.permission === 'denied'` para siempre y el código corta silenciosamente (línea `if
  (Notification.permission === 'denied') return;`).
- Si las VAPID keys reales de producción no están cargadas en el `.env` del servidor (`deploy.md` advierte
  explícitamente que las de desarrollo no sirven ahí), `/api/push/vapid-key` devuelve 500 y el frontend lo
  traga sin avisar.
- Sin confirmar si el celular es Android o iPhone: en iOS el push web solo funciona si la PWA está
  instalada a la pantalla de inicio, no basta con "usarla" desde Safari.

Ninguna de estas causas se puede descartar sin los datos de diagnóstico pedidos en la conversación (tipo de
celular, si vio el pop-up de permiso, si las VAPID keys de producción están cargadas).

## Decisión pendiente

¿Se construye un push también para "pedido/reserva nueva creada" (no solo "hora de preparar")? Parece ser
lo que el restaurante piloto esperaba realmente. Si se aprueba, es un gap de producto nuevo — anotar en
`vision_negocio.md` antes de implementar.

## Pendiente

- Confirmar con el usuario piloto: tipo de celular/OS, si vio el pop-up de permiso, si la PWA quedó
  instalada en pantalla de inicio.
- Confirmar VAPID keys reales cargadas en el `.env` de producción.
- Agregar feedback visible en Configuración ("🔔 Notificaciones: activas / denegadas / sin configurar") para
  que este estado deje de ser invisible.
- Decidir e implementar (si corresponde) el trigger de "pedido/reserva nueva".
