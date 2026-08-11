# ISS-025 — Notificaciones push no llegan / no existe aviso de "pedido nuevo"

**Módulo:** `public/sw.js`, `public/owner.html`, `routes/push.js`, `utils/autoPreparacion.js`,
`utils/pushNotificaciones.js`
**Prioridad:** 🟡 Media-Alta — afectó directamente la primera experiencia piloto (ver `pilotos.md`)
**Estado:** ✅ Resuelto — 2026-08-11 (causa raíz + autorreparación de código)

---

## Actualización 2026-08-11 — causa raíz real encontrada

El trigger de "pedido/reserva nueva" (causa 1 del diagnóstico original) **ya se había implementado**
(commit `4373dce`, Gap 21) antes de esta sesión. El usuario probó de nuevo con permiso de notificaciones
confirmado y la PWA ya instalada — y seguía sin llegar nada. Diagnóstico paso a paso vía SSH (ver
`status.md` sesión 2026-08-11 parte 3):

1. `push_subscriptions` sí tenía la suscripción del usuario (`id_restaurante=1`, el mismo del "menú demo"
   que probó) — descartado "nunca se suscribió".
2. `pm2 logs` mostraba `[Push] Error (sub 10): Received unexpected response code` en cada intento.
3. Un envío manual de diagnóstico (`webpush.sendNotification` directo, capturando `err.body`) reveló el
   motivo real de FCM: **"the VAPID credentials in the authorization header do not correspond to the
   credentials used to create the subscriptions"**.

**Causa raíz:** las VAPID keys del servidor se regeneraron/cambiaron en algún momento después de que esa
suscripción (y otras 3: Karina ×2, Leo) se crearan en el navegador — riesgo que `deploy.md` ya advertía
explícitamente. La suscripción queda huérfana para siempre: FCM la rechaza con 403 en cada intento, y
`pushNotificaciones.js` **solo limpia suscripciones en 410**, no en este 403, así que el registro roto se
queda en la BD reintentando en vano.

**Por qué nunca se autorreparó:** en `owner.html`, si el navegador ya tiene una suscripción con una clave
distinta a la actual, `pushManager.subscribe()` tira un error — que el `catch (_) {}` silencioso se traga
sin reintentar ni avisar.

**Mitigación aplicada (manual, sin cambio de código):** el usuario borró el almacenamiento de la PWA en
su celular (`Ajustes → Apps → Menú Pro → Almacenamiento → Borrar`), forzando una resuscripción limpia con
la clave actual. **Confirmado funcionando.**

**Fix de código aplicado (mismo día, para que esto no dependa de que cada usuario lo detecte y borre a
mano la próxima vez que se regeneren las VAPID keys):**
1. `public/owner.html` (`suscribirPush`) — si `pushManager.subscribe()` falla (suscripción vieja con una
   VAPID key distinta a la vigente), da de baja la suscripción existente (`getSubscription()` +
   `unsubscribe()`) y reintenta una vez. Autorreparación en cada carga de la página, sin intervención del
   usuario.
2. `utils/pushNotificaciones.js` — el 403 de "VAPID credentials no corresponden" ahora limpia la
   suscripción de la BD, igual que el 410. Cualquier otro error (ej. 500 transitorio) sigue sin borrarse.
3. `tests/push-notificaciones.test.js` (nuevo, 8 casos): limpieza en 410 y en 403, no-limpieza en otros
   errores, aislamiento por restaurante, JSON corrupto no rompe el resto. 338/338 jest verde.

**Pendiente (fuera de esta sesión):** indicador visible en Configuración ("🔔 Notificaciones:
activas/denegadas/sin configurar") — sigue sin implementarse, ver checklist original abajo. No bloquea
nada — con el fix de autorreparación, el escenario que lo motivaba (VAPID keys rotadas) ya no requiere
intervención manual.

Ver también [ISS-031](ISS-031-badge-push-gris.md) — arreglado de paso el ícono de badge (aparecía como
cuadrado gris), encontrado en la misma conversación al confirmar que el push ya llegaba.

---

## Diagnóstico original (2026-08-XX)

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
