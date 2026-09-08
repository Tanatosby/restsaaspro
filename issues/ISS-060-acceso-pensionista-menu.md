# ISS-060 — Pensionistas sin un camino claro para llegar a `pensionista.html`

**Estado:** ✅ **Resuelto 2026-09-07** (opción C). **Desplegado 2026-09-08** (`fdc9877`). Falta
verlo usado por un pensionista real.
**Módulo:** `public/menu.html`, `public/pensionista.html`.
**Prioridad:** 🟡 Media — el módulo funciona una vez adentro; el problema es llegar ahí.
**Origen:** piloto #1, Día 8 (2026-08-21). La dueña preguntó cómo bajan la app sus pensionistas
y si convenía subirla a Play Store.

---

## Diagnóstico

`pensionista.html` no es anónimo por slug como `menu.html` — es una cuenta con rol (como
owner/mozo/cocinero), creada por el owner (Pensionistas Fase 1). El camino real hoy:

1. El owner da de alta al pensionista con un email inventado (`nombre@menupro.tech`, no es un
   correo real) + una contraseña que él mismo asigna.
2. El pensionista tiene que ir a **`menupro.tech/login`** — la misma pantalla genérica que usan
   owner/mozo/cocinero, sin ninguna mención a "pensionista".
3. `login.html` ya redirige el rol `pensionista` a `/pensionista.html` (`ROLE_REDIRECT`,
   `login.html:427`) — esa parte no necesita cambios.
4. La sesión dura 30 días con renovación deslizante (mismo mecanismo que owner, ISS-027) — no
   tiene que reingresar cada día.

**No hay QR. No hay link desde `menu.html`. No hay una URL con el nombre del restaurante** — a
diferencia de `menupro.tech/<slug>` para clientes. El único camino es que el dueño le dicte de
palabra la URL genérica.

**Play Store — descartado.** Exige cuenta de desarrollador, empaquetado TWA, Digital Asset
Links y revisión de Google — trabajo de infraestructura que no aporta nada a un pensionista que
ya conoce el restaurante puntual (no necesita "buscarlo" en una tienda). El sistema ya tiene un
mecanismo de instalación PWA (`public/js/widgets/pwa-install.js`, botón nativo en Android +
instructivo manual en iOS) que cubre la necesidad real ("cómo la bajo a mi celular") sin esa
fricción.

## Opciones planteadas y decisión

Se plantearon 3 opciones al usuario:

- **A.** QR al `/login` genérico — cero código, reusa el mecanismo de QR que ya existe para
  `menu.html`.
- **B.** Ruta propia `menupro.tech/pensionista` (o `/<slug>/pensionista`) — cambio chico de
  backend, link corto y QR-eable con mejor contexto.
- **C.** Enlace "¿Eres pensionista?" visible en `menu.html` — así quien ya usa el link diario
  del restaurante encuentra el camino solo, sin que el dueño explique una segunda URL.

**Elegida: C.**

## Solución implementada (2026-09-07)

1. **`menu.html`** — pill `<a class="btn-consultar" href="/login.html">🧾 ¿Eres pensionista?</a>`
   en la misma fila que "📋 Consultar mi reserva" y "🔤 Aumentar letra" (header, siempre
   visible). Reusa la clase `.btn-consultar` — mismo patrón visual. No carga `pwa-install.js`:
   `login.html` ya redirige el rol `pensionista` a `/pensionista.html` (`ROLE_REDIRECT`) y ya
   trae su propio botón de instalar.
2. **`pensionista.html`** — `<script src="/js/widgets/pwa-install.js?v=__BUILD__">` en `<head>`
   (captura `beforeinstallprompt` temprano) + botón `#btn-instalar-app` ("📲 Instalar app en mi
   celular") en su propia fila bajo `.pen-brand-row`, oculto salvo que la PWA sea instalable
   (lo maneja el widget; en iOS abre el instructivo manual). `PwaInstall.attach()` al final del
   script inline.
3. **CSS** — `.btn-consultar` subió de `min-height:34px` a `44px` (touch target obligatorio) +
   `text-decoration:none` (por el `<a>`). Nueva clase `.pen-install-btn` en `pensionista.css`
   (pill accent full-width, 44px).

**Infra:** `pwa-install.js` y `pensionista.html` ya estaban en el precache del SW y en el hash
de `BUILD` (cubre `js/` y los HTML) → sin bump manual. **Sin cambios de backend.**

## Verificación

- `scripts/test-iss060-acceso-pensionista.js` (nuevo) — 13/13: el link existe/es táctil/navega
  a login; el botón de instalar está oculto hasta `beforeinstallprompt`, luego aparece (≥44px)
  y al click dispara el prompt.
- Sin regresión: `test-pwa-install.js` 9/9, `test-pensionista-cliente.js` 29/29, jest 478/478.
- **Desplegado 2026-09-08** (`fdc9877`). **Pendiente:** verlo usado por un pensionista real del piloto (dar de alta + pasar
  credenciales + confirmar que instala la PWA en un celular de gama media).

Sin impacto en `pensionista.md` (las decisiones de negocio del módulo siguen cerradas, esto es
puramente de descubribilidad).
