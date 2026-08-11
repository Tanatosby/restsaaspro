# ISS-027 — Hay que iniciar sesión cada vez que se abre la app

**Estado:** ✅ Resuelto — 2026-08-10
**Módulo:** `routes/auth.js`, `utils/sesion.js`, `public/js/session.js`, `login.html`, `owner.html`
**Prioridad:** 🔴 Alta — es la barrera de adopción más cara del proyecto

---

## Síntoma reportado

Piloto #2 (señor de 70 + esposa de 65): **no lograban ni iniciar sesión**. Piloto #1 abandonó
tras dos días. El pedido del usuario fue directo:

> "Concentrarnos en un feature que ni bien el usuario haga clic ingrese a la app, sin iniciar
> sesión cada vez que ingrese, como WhatsApp."

---

## Diagnóstico

Dos causas independientes. La segunda era la que realmente mordía.

### 1. Sesión corta

`routes/auth.js` firmaba el JWT con `expiresIn: '8h'` y la cookie con el mismo `maxAge`.
Insuficiente para alguien que atiende todos los días. (El documento de contexto decía "~1
hora"; en el código eran 8 h — igualmente corto.)

### 2. La sesión vivía en `sessionStorage` ← causa real

`owner.html` y `login.html` guardaban la sesión en **`sessionStorage`**, que el navegador
**borra al cerrar la pestaña o la PWA**. Aunque la cookie JWT siguiera perfectamente viva, al
reabrir la app `owner.html` no encontraba `session` y redirigía a `/login.html`.

Es decir: **subir el `expiresIn` solo no habría arreglado nada.** El dueño tenía que reingresar
en cada apertura de la app, no cada 8 horas.

### 3. Bucle latente de redirecciones

`utils.js` redirigía al login ante un 401 **sin limpiar la sesión local**. Con la sesión en
`sessionStorage` esto ya podía producir un bucle login ↔ panel cuando la cookie expiraba antes
de cerrar la pestaña; al pasar a `localStorage` (que no se borra solo) el bucle habría sido
permanente. Se arregló como parte de este cambio.

---

## Solución

**Backend:**

- `utils/sesion.js` (nuevo) — reglas puras y testeables: `diasSesion()`, `cookieSesion()`,
  `necesitaRenovacion()`.
- Sesión de **30 días**, con **renovación deslizante**: si al token le queda menos de la mitad
  de vida, `GET /api/auth/me` emite uno nuevo. Quien usa la app a diario no vuelve a ver el
  login; quien la abandona un mes entero sí tiene que ingresar.
- **El admin del SaaS queda fuera: 1 día.** Su cuenta puede crear y desactivar cualquier
  restaurante; la comodidad de no reingresar es para quien atiende con el celular en la mano,
  no para la cuenta más privilegiada. (El panel admin usa el mismo `/api/auth/login`, así que
  sin esta distinción habría heredado los 30 días.)
- **`sameSite: 'lax'`** en vez de `'strict'`: con `strict` el navegador no manda la cookie en la
  navegación inicial hacia la app — justo el caso de abrir la PWA desde el ícono.
- **`GET /api/auth/me`** (nuevo): revalida la cookie y devuelve los datos de sesión. **Relee al
  usuario de la BD** en vez de confiar solo en el token: con sesiones de 30 días, un cambio de
  rol/permisos o un restaurante desactivado tardaría hasta un mes en tener efecto.

**Frontend:**

- `public/js/session.js` (nuevo) — `leerSesion()`, `guardarSesion()`, `limpiarSesion()`,
  `restaurarSesion()`. Key propia `mp-session` (convención `mp-` del proyecto) para no cruzarse
  con el panel admin, que sigue usando `sessionStorage['session']`.
- **Migración automática** desde `sessionStorage`: nadie queda deslogueado el día del deploy.
- `login.html`: splash "Entrando…" aplicado **antes del primer paint** (mismo patrón que el
  tema y el tamaño de letra) para que quien ya tiene sesión no vea un parpadeo del formulario.
  El guard revalida contra `/api/auth/me` en vez de rebotar a ciegas.
- **Sin red se entra igual** con la sesión local: la app está cacheada por el service worker y
  `owner.html` revalidará en su primera llamada al API. Mostrar el login a quien ya estaba
  dentro solo porque se cayó el wifi sería exactamente la fricción que este cambio elimina.
- `utils.js`: `limpiarSesion()` antes de redirigir en un 401 — mata el bucle del punto 3.
- `sw.js`: `CACHE` bumpeado a `menupro-v5` (obligatorio: `owner.html` está en `ASSETS` y cambió
  su guard — ver ISS-022).

---

## Verificación

**`tests/sesion-persistente.test.js` — 19 casos jest:** vida por rol, opciones de cookie
(`httpOnly`, `lax`, `secure` solo en producción, `maxAge`), renovación deslizante con bordes
exactos, y ciclo real de `jwt.sign`/`verify` (incluye el caso "sigue válido pasadas 8 horas",
que es exactamente el bug original).

**Contra el servidor real (`curl`):**

| Caso | Resultado |
|---|---|
| `/me` sin cookie | 401 ✅ |
| `/me` con token vencido | 401 ✅ |
| `/me` con token fresco | 200, **sin** `Set-Cookie` (no renueva de más) ✅ |
| `/me` con token por vencer | 200 + `Set-Cookie` con `Max-Age=2592000; HttpOnly; SameSite=Lax` ✅ |

**Playwright (`scripts/test-cola-carrera.js`, Test 6):** la sesión queda en `localStorage`;
tras limpiar `sessionStorage` (simulando cerrar la app) se entra directo al panel; `login.html`
rebota solo sin escribir nada; y al borrar la cookie vuelve al login limpiando la sesión local,
**sin bucle de redirecciones**.

**317/317 jest verde.**

---

## Nota de despliegue

Igual que con ISS-022: los usuarios con la PWA ya instalada necesitan **cerrar y reabrir la app
una vez** para que el navegador note el `sw.js` nuevo. Después de eso, no vuelven a ver el
login.
