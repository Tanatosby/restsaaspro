# ISS-060 — Pensionistas sin un camino claro para llegar a `pensionista.html`

**Estado:** 🔍 **Diagnosticado y decidido 2026-08-21, sin implementar.**
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

## Solución propuesta (sin implementar)

1. Botón "🧾 ¿Eres pensionista? Inicia sesión" en el header de `menu.html`, junto a "📋
   Consultar mi reserva" (misma fila, mismo patrón visual) → enlaza a `/login`.
2. Agregar el widget `PwaInstall` a `pensionista.html` — hoy solo tiene el `<link
   rel="manifest">`, sin botón de instalar. Con la sesión de 30 días, instalar una vez alcanza
   para no repetir el login seguido.
3. Verificar mobile-first (touch target 44px, sin overflow a 360px) en el botón nuevo.

## Verificación pendiente

Sin implementar todavía — queda para una próxima sesión. Sin impacto en `pensionista.md` (las
decisiones de negocio del módulo siguen cerradas, esto es puramente de descubribilidad).
