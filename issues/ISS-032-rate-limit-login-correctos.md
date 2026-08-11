# ISS-032 — El rate limiter de login contaba también los intentos correctos

**Estado:** ✅ Resuelto — 2026-08-11
**Módulo:** `routes/auth.js`
**Prioridad:** 🟡 Media-Alta — riesgo real de cara a la primera atención masiva (2026-08-12)

---

## Cómo apareció

No fue un reporte del usuario — apareció al correr una prueba de carga manual pedida por el usuario
("¿puedes correr pruebas de pedidos masivos y de cuánto se demora en ingresar a la app?"), de cara al
volumen real del piloto del día siguiente. La prueba se corrió contra un servidor **local**, con un
restaurante de prueba dedicado, para no mandar pedidos ni notificaciones push falsas a restaurantes reales
en producción.

Resultado relevante: 60 pedidos simultáneos se resolvieron en 82ms sin errores (el sistema aguanta de
sobra el volumen esperado), pero **10 logins simultáneos con la misma contraseña correcta produjeron un
`429 Too Many Requests`**.

---

## Diagnóstico

`loginLimiter` en `routes/auth.js` limita a 10 intentos por IP cada 15 minutos, pensado como protección
anti-fuerza-bruta — el mensaje de error dice explícitamente "Demasiados intentos **fallidos**...". El
problema: le faltaba `skipSuccessfulRequests: true`, así que por defecto `express-rate-limit` cuenta
**todas** las requests (código de respuesta < 400), correctas o no, contra el mismo cupo.

Con la primera atención masiva de mañana y todo el personal (owner, mozos, cocinero) entrando desde el
mismo WiFi/IP del restaurante al abrir el turno, era bastante probable que el 11° login — aunque la
contraseña fuera correcta — quedara bloqueado 15 minutos completos, justo en el peor momento.

---

## Solución

`routes/auth.js` — agregado `skipSuccessfulRequests: true` a `loginLimiter`. Ahora solo los intentos con
credenciales incorrectas (401) cuentan para el límite; los logins correctos (200) no consumen el cupo, sin
importar cuántos se hagan seguidos.

---

## Verificación

`tests/login-rate-limit.test.js` (nuevo, 4 casos, levanta un servidor Express real por test para que el
contador del rate limiter — en memoria — arranque limpio):
- 12 logins correctos seguidos: ninguno bloqueado.
- 11 intentos con contraseña incorrecta: los primeros 10 dan 401, el 11° da 429.
- Intentos fallidos que no llegan al máximo no bloquean un login correcto posterior.
- El mensaje del 429 sigue mencionando "intentos fallidos" y los minutos de espera.

342/342 jest verde.

---

## Relacionado

Encontrado en la misma sesión que la prueba de carga que confirmó que el sistema aguanta los 60 pedidos
simultáneos esperados para la primera atención masiva del 2026-08-12.
