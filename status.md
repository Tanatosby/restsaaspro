# Estado del Proyecto — Menú Pro

---

## 🏁 RESUMEN EJECUTIVO — Estado al 2026-05-29

**Código:** ✅ Listo para deploy
- 197/197 tests verde
- 0 issues abiertos (`issues/ISSUES.md`)
- 0 refactors pendientes
- Todas las features de prioridad alta cerradas (gaps 1-8 + ARCH-001 a 004 + A1/A2/A3)
- Rediseño Opus 4.8: **7 fases completas** (owner, menú cliente, super admin, landing + manuales)
- **Fase 7 (landing + manuales)** ✅ completada 2026-05-29 — repaint terracota + hero premium + animaciones + FAQ semántico

**Infraestructura:** ✅ **EN PRODUCCIÓN desde 2026-05-29**
- VPS: DigitalOcean Droplet $6/mes — IP `147.182.135.252` — NYC1 — Ubuntu 22.04
- Dominio: `menupro.tech` (Porkbun) — DNS apuntando al VPS
- SSL: Let's Encrypt — HTTPS activo en `https://menupro.tech` — renovación automática
- Stack servidor: Node.js 22 + PM2 7 + Nginx 1.18 + UFW (22/80/443)
- BD: SQLite en `/var/www/menupro/database.sqlite`
- Backups: cron diario 3am → `/var/www/menupro/backups/`
- Admin: `pedro.gabriel.rotta@gmail.com` — creado en BD
- Restaurante demo: id=1 (Crisolito) — seeder ejecutado — 11 platos, 6 mesas, 6 reservas, 5 órdenes
- `NODE_ENV=production` activo — CSP `upgrade-insecure-requests` habilitado

**URLs de producción:**
- Landing: `https://menupro.tech`
- Admin: `https://menupro.tech/admin/login`
- Login owner: `https://menupro.tech/login`
- Demo menú: `https://menupro.tech/menu?restaurante=1&mesa=1`

**Deploy futuro (desde laptop):**
```bash
cd /var/www/menupro && git pull origin main && pm2 restart menupro
```

---

## 🎨 SESIÓN OPUS 4.8 — Rediseño premium (carpeta `RestSaasPro`) — 2026-05-28

> Esta carpeta `RestSaasPro` es un clon de `RestSaas` (la original queda intacta como respaldo)
> destinado a una versión "nivel Opus 4.8": mejores gráficos, mejor flujo, sin romper el backend.

**Decisiones de la sesión:**
- Stack idéntico (vanilla JS + ES Modules, sin build). Backend Express/SQLite sin cambios de lógica.
- Identidad visual: **elevar la actual (terracota/azul peruana) + dark mode**, ejecutada a nivel premium.
- Mobile-first sigue siendo no negociable (44px touch, 16px inputs, 360px sin overflow).

**Plan por fases:**
| Fase | Qué | Estado |
|------|-----|--------|
| 0 | Clonar RestSaas→RestSaasPro, `npm install`, baseline tests | ✅ 197/197 tests OK |
| 1 | Sistema de diseño Opus para `owner.css`: tokens + dark mode + skeletons + componentes repulidos | ✅ |
| 2 | Owner panel: toggle 🌙/☀️ + anti-flash + bottom-nav móvil (5 destinos + permisos espejo + badges via MutationObserver) | ✅ |
| 3 | Gráficos premium Chart.js (degradados) + analíticas A1 (ticket promedio) / A2 (hora pico Lima UTC-5) / A3 (tasa cancelación con código de color) | ✅ |
| 4 | Rediseño premium de `menu.html` (cara del comensal): CSS extraído a `menu.css`, dark mode auto sin toggle, hero ken-burns, header sticky shrink, skeletons, modal de foto, código de reserva pulse-glow | ✅ |
| 5 | Auditoría 360px + accesibilidad (modal con role/aria) + smoke E2E con curl + docs | ✅ |
| 6 | Rediseño "Pro Console" del super admin: nueva identidad **slate + índigo-violeta**, Inter + JetBrains Mono + Syne, bottom-nav, skeletons, charts theme nuevo (`charts-theme-admin.js`), modales premium, copy "Menú Pro" | ✅ |
| **7** | **Rediseño premium de `landing.html` + `manuales.html`** (cara pública del producto): repaint a terracota, hero con gradient mesh + phone flotante + glow, CTA secundario "Demo en vivo", animaciones on-scroll IntersectionObserver, nav glassmorphism, FAQ semántico con `<details>`, cards con hover lift, footer con socials, manuales repulido al mismo estilo | ✅ **Completada 2026-05-29** |

**Fixes paralelos durante las fases:**
- CSP `upgradeInsecureRequests: null` en `app.js` — Chrome rompía POSTs en LAN por HTTPS upgrade
- PWA installable desde `login.html` (manifest + SW)
- Bootstrap admin + restaurante para laptops nuevas
- `scripts/seed-demo-data.js` (idempotente, 6 reservas + 5 órdenes en todos los flags del kanban)
- Generación `.env` con VAPID + JWT_SECRET

**Registro de cambios (RestSaasPro):**
- 2026-06-02 — **Landing (feature D del backlog priorizado): copy + navegación por secciones:**
  - **Análisis y repriorización del backlog** de pendientes en `features.md`: fusionados duplicados, agrupados en A (selección visual de platos), B (config de menús como cards), C (vista del cliente con cards+modal) y D (landing). Orden recomendado **D → A → C → B** con costo/impacto/dependencias. A/B/C comparten un futuro widget `PlatoCard`. Decisión: B sin foto de menú ni cambios de BD.
  - **Copy de `landing.html`:** headline → **"La aplicación que tu restaurante necesita: controla todo desde tu celular"**; CTA hero → **"Solicita un mes gratis de prueba sin compromiso"**; ambos **"Ver demo en vivo"** (hero + CTA final) → **"Ver cómo lo vería tu cliente"** (mismo link demo).
  - **Navegación por secciones como chips sticky:** IDs `#problema`/`#tutorial`/`#features`/`#faq` + `scroll-margin-top: 7.5rem` para el header de 2 filas. Los 4 destinos (**¿Qué soluciona? · ¿Cómo se usa? · ¿Qué necesitas? · ¿Tienes más preguntas?**) van como **chips estilo pill en una 2ª fila dentro del nav `sticky`** → siempre visibles al scrollear (ahorra scrollear para navegar). Móvil: scroll horizontal (`overflow-x-auto` + `.no-scrollbar`, tab-bar); desktop: centrados. Iteración del usuario: descartado el menú hamburguesa → chips; luego chips sticky (en nav, no en hero, porque el hero tiene `overflow:hidden` que rompe sticky). **Badge "🎁 Primer mes gratis" eliminado del header** (redundante con "Probar gratis" + CTA).
  - **Verificado** con Playwright a 360px y 1280px: chips sticky siguen visibles tras scroll, scroll horizontal interno en móvil, sin overflow horizontal de página, anclas alinean bajo el header, chips de 44px, sin badge en el nav, 0 errores de consola. Sin backend → suite de tests sin cambios.
- 2026-05-30 — **Botón "Instalar app" (PWA) + 3er widget `PwaInstall`:**
  - **`PwaInstall`** (`public/js/widgets/pwa-install.js`) — 3er widget: captura `beforeinstallprompt` (Android/Chrome/Edge)
    y muestra un botón "📲 Instalar app" que dispara el diálogo nativo; en **iOS/Safari** abre un instructivo
    "Compartir → Añadir a pantalla de inicio". Se oculta si ya está instalada (`display-mode: standalone`) o tras instalar.
  - Botón en el **sidebar-footer de `owner.html`** (`#btn-instalar-app`) y bajo el formulario de **`login.html`** (`#btn-install`).
  - **Decisión de alcance:** solo la app de gestión (owner + login). La PWA **instalable del comensal** queda como feature
    futura porque el `manifest.json` es global (`start_url: /owner.html`) → requiere **manifest dinámico por restaurante**;
    documentada junto con **URLs por slug** (`menupro.tech/karinamenu`) en `features.md`.
  - **Tests:** `scripts/test-pwa-install.js` (E2E: camino Android con `beforeinstallprompt` simulado en login+owner,
    y camino iOS con user-agent iPhone que abre el instructivo). **207/207 jest verde** (sin cambios de backend).
- 2026-05-30 — **Editar platos + 2º widget `FormModal` + fix scroll Menús del día:**
  - **`FormModal`** (`public/js/widgets/form-modal.js`) — 2º widget reutilizable: modal de formulario genérico
    dirigido por esquema de campos (text/number/textarea/select), submit async con manejo de error, autocontenido,
    mobile-first (inputs 16px, botones ≥44px, Esc/backdrop/Enter). Cargado en `owner.html`.
  - **Editar platos:** botón ✏️ por fila en **Platos de menú** (nombre + descripción) y **Platos a la carta**
    (nombre + precio + descripción + categoría), abriendo `FormModal`. Backend nuevo: `PATCH /api/menu/platos-menu/:id`
    y `PATCH /api/menu/platos-carta/:id` (scope por restaurante, categoría validada contra el restaurante). Antes solo
    se podía crear/borrar; ya no hace falta borrar y recrear para corregir. `GET /platos-carta` ahora incluye `id_categoria`.
  - **Fix scroll Menús del día (bug de layout):** `.card-header` era flex sin `flex-wrap` + `.card` con `overflow:hidden`
    → en 360px el botón "Eliminar" del menú quedaba cortado e inaccesible. Fix: `flex-wrap: wrap` en `.card-header`
    (owner.css) y en las filas internas de `renderMenuCard`. No se agregó scroll horizontal (la regla es que todo entre en 360px).
  - **Tests:** `tests/editar-platos.test.js` (10 unit, lógica SQL en memoria) + `scripts/test-editar-platos.js`
    (E2E Playwright 390px: editar carta+menú, FormModal con 4/2 campos, botón Eliminar dentro de 390px). **207/207 verde.**
- 2026-05-30 — **Sistema de componentes reutilizables (widgets) + 1er widget `PhotoEditor`:**
  - **Nueva filosofía de desarrollo:** todo lo que se use en más de una pantalla se construye como
    **widget autocontenido** (crea su DOM, inyecta sus estilos, hereda tokens de tema, API por callbacks),
    en vez de copiar-pegar/portar markup entre páginas. Documentado en **`widgets.md`** (filosofía + reglas + catálogo).
  - **`public/js/widgets/photo-editor.js`** — primer widget. Visor de imagen en grande + **recorte 1:1** +
    **Cambiar** + **Eliminar**. Sin dependencias externas, no toca el CSP. Cargado en `owner.html` con un `<script src>`.
  - **owner.html — Platos de menú y Carta:** la miniatura de cada plato ahora es clicable. **Con** foto abre el
    visor (Recortar/Cambiar/Eliminar); **sin** foto (placeholder 🍽️/🍴) elige imagen y abre directo el recortador.
    El botón 📷 de la derecha se mantiene y también pasa por el recortador. Toda subida de foto nueva pasa por
    recorte 1:1 → resuelve los cortes automáticos feos de `object-fit:cover` en `menu.html`.
  - **Recortador propio en canvas:** marco cuadrado fijo, arrastrar (pointer events: touch+mouse) + zoom con barra
    (≥44px). Exporta JPEG 800×800 vía `<canvas>.drawImage` de la región visible. Mobile-first, `prefers-reduced-motion`.
  - **`scripts/test-photo-editor.js`** — prueba E2E Playwright (viewport 390×844): subir→recortar→guardar→miniatura,
    abrir visor con las 3 acciones, recortar desde el visor, eliminar (restaura placeholder). **8/8 asserts verde, 0 errores de consola.**
  - **Pendiente (siguiente entrega):** widget `PhotoViewer` (solo lectura) y migrar el modal inline de `menu.html` a él.
  - **197/197 tests backend verde** (cambios solo frontend).
- 2026-05-29 — **Fase 7 (rediseño premium de `landing.html` + `manuales.html` — cara pública):**
  - **Repaint terracota** (7.1): Tailwind config `brand {light:#fdf0e8, DEFAULT:#c8692a, dark:#a0521e}` + var CSS `--brand-glow`. Eliminadas todas las referencias a naranja `#f97316` / `orange-*` (verificado: 0 residuales en HTML servido). `bg-orange-50` → `bg-brand-light`.
  - **Hero premium** (7.3): `.gradient-mesh` con 3 radiales (terracota + violeta `#7c5cff` + azul `#2563eb`) en `mix-blend-mode:screen` + blur 90-100px; `.hero-phone` con `rotate(-3deg)` + `@keyframes float 6s` y glow del producto detrás (`::before` blur 80px del color brand). Screenshot real del bot intacto dentro del frame.
  - **CTA "Ver demo en vivo"** (7.4): botón secundario en hero y CTA final → `/menu?restaurante=1&mesa=1`. Documentado restaurante demo en `deploy.md §10.1`.
  - **Animaciones on-scroll** (7.5): `IntersectionObserver` añade `.in-view` a cada `<section class="reveal">`; stagger por card vía `--i` + `@keyframes rise`. Fallback a "todo visible" si no hay IO o `prefers-reduced-motion`.
  - **Nav glassmorphism** (7.6): `rgba(17,24,39,0.7)` + `backdrop-filter blur(14px)`, clase `.nav-shrunk` al pasar 80px de scroll (wiring `requestAnimationFrame`).
  - **FAQ semántico** (7.7): `<input type=checkbox>` → `<details>/<summary>`, chevron rotado en `[open]`, `@keyframes faqOpen`. `summary::-webkit-details-marker { display:none }`.
  - **Cards hover lift** (7.8): `.card-lift` con `translateY(-3px)` + sombra en `:hover` y `:active` (feedback táctil móvil) en Problema, Features y FAQ.
  - **Footer ampliado** (7.9): mini-logo, WhatsApp icon, Contacto (mailto), Manuales, Ingresar, año dinámico, "Hecho en Perú 🇵🇪".
  - **`manuales.html` repulido** (7.10): paleta terracota, nav glassmorphism, tabs pill estilo owner (`box-shadow` glow al activarse + scale en `:active`), header con badge dinámico del rol + título Playfair + glow radial, blockquote/links/imgs terracota, footer con "← Volver". `marked.js` y carga por `?rol=` intactos.
  - **Decisiones respetadas**: Tailwind se quedó (no se extrajo a CSS custom), copy idéntico, screenshots del bot sin regenerar.
  - **Verificado en vivo (PORT 3310)**: `/` 200, `/manuales` 200, `/menu?restaurante=1&mesa=1` 200, 6/6 screenshots 200, 4/4 manuales por rol 200. HTML confirma terracota/gradient-mesh/hero-phone/IntersectionObserver/nav-shrunk/`<details>`/"Ver demo en vivo"/reduced-motion/footer. **0 referencias a `#f97316`.**
  - **Fix ISS-013 (service worker rompía CDN/fuentes)**: el usuario reportó la landing "sin estilos". Diagnóstico con Playwright: el SW (`sw.js`, scope `/`, registrado por login/owner/menu) controlaba la landing e interceptaba peticiones cross-origin reenviándolas con `fetch(e.request)` → Tailwind CDN y Google Fonts fallaban con `ERR_FAILED`. Fix: `if (url.origin !== self.location.origin) return;` en el handler `fetch` (no tocar cross-origin) + bump cache `menupro-v1`→`v2`. Verificado: con SW activo la landing ahora carga Tailwind correctamente. Ver `issues/ISS-013-sw-bloquea-cdn.md`.
- 2026-05-28 — Fase 0: clon creado (`RestSaasPro`, 213 archivos sin node_modules), deps instaladas, baseline **197/197 tests verde**.
- 2026-05-28 — Fase 1: `public/css/owner.css` reescrito como sistema premium (tokens completos, dark mode con `data-theme` + `prefers-color-scheme`, sombras en capas, micro-interacciones, skeleton loaders, bottom-nav listo). Cero ruptura: todos los selectores originales preservados. Definidos `--surface`/`--accent-dim`/`--accent-glow` que el CSS original referenciaba sin declarar.
- 2026-05-28 — Fase 2 (parcial): toggle de tema 🌙/☀️ en topbar de `owner.html` + script anti-flash en `<head>` (lee `localStorage['mp-theme']`, respeta preferencia del sistema, actualiza `theme-color`).
- 2026-05-28 — Verificado en vivo (PORT 3210): `/health` 200; `owner.html` y `owner.css` sirven 200 con toggle + dark mode + skeletons presentes.
- 2026-05-29 — **Fase 6 (rediseño "Pro Console" del panel super admin):**
  - **Nueva identidad visual** distinta tanto del owner (terracota cálido) como del menu (terracota auto-dark): paleta **slate quasi-black + acento índigo-violeta** (`#8b5cf6` → `#a78bfa`), con accents secundarios cyan (`#60a5fa`) y verde lima (`#4ade80`).
  - **Tipografía actualizada** en `admin/dashboard.html` y `admin/login.html`: **Inter** (UI), **JetBrains Mono** (datos numéricos/labels) y **Syne** (display/títulos). Antes era DM Mono + Syne — ya no se usa DM Mono.
  - **Tokens completos** (igual sistema que owner/menu): `--bg / --bg-2 / --surface / --surface-2 / --border / --border-hi / --accent / --accent-2 / --accent-dim / --accent-glow / --shadow-sm/-/-lg/-xl / --r-xs/-sm/-r/-lg/-pill / --t-fast/-/-slow / --font/-mono/-display`.
  - **Sidebar premium**: `backdrop-filter: blur(20px)`, brand-title con dot animado `brand-pulse 2.4s` que destella el accent, nav-items con border-left animado que se escala al activarse, gradient sutil de izquierda a derecha en hover/active.
  - **Topbar premium**: blur(18px), `topbar-meta` ahora es pill con monospace, hamburger min-44px con hover state.
  - **Stat cards**: hover lift `translateY(-2px)` + glow del accent, gradient overlay aparece en hover, valor con **gradient text** (linear-gradient(accent → accent-2) clipped al texto). Anim de entrada escalonada `fadeUp` con delays.
  - **Tablas**: header con gradient sutil, rows con hover en accent-glow-soft, datos numéricos con clase `.mono`/`.num` (font-variant-numeric: tabular-nums), badges con border-radius pill y border `color-mix`.
  - **Bottom-nav móvil** con los 5 destinos del admin (Overview/Restos/Usuarios/Reservas/Órdenes) — el item activo muestra una barra superior con gradient + glow drop-shadow en el ícono. Sin botón "Más" (los 5 paneles caben sin colapsar).
  - **Skeletons premium** reemplazan "Cargando…" tanto en `stats-grid` (4 skel-cards con líneas variables) como en `tbody-restaurantes` (3 skel-rows con celdas individuales). Animación `@keyframes shimmer`.
  - **Modales premium**: backdrop con `blur(8px)`, animación de entrada `modalPop` con cubic-bezier elastic, sombra en capas + ring de accent-glow-soft, botón close circular con hover state.
  - **Drawer de stats por restaurante**: backdrop-blur(24px), tabs en pill con gradient activo + box-shadow del accent, mini-stats con border que reacciona al hover, panel switching con `fadeUp`.
  - **Charts theme nuevo** `public/js/modules/charts-theme-admin.js`: tema Chart.js con Inter + JetBrains Mono, tooltips con border, padding 12, border-radius 10, hoverRadius 6. Charts del drawer (demanda + ganancias) ahora usan paleta admin: Órdenes `#8b5cf6` (índigo), Reservas `#60a5fa` (cyan), Total `#4ade80` (verde dashed). Helper `mpGradientAdmin()` para rellenos en gradiente vertical de fondo del area chart.
  - **Login admin**: aplicada misma identidad. Ambient glow + grid sutil con mask radial. Badge "Superadmin access" con pill border-radius y box-shadow accent-glow. Card con backdrop-blur(20px), ring de accent-dim, gradient overlay esquina-a-esquina. Card-title "Menú Pro" con dot animado y span con gradient text. Inputs ahora 16px (no zoom iOS) y min-height 44px. Botón submit con gradient + glow elevation.
  - **Copy actualizado**: "Restaurant SaaS" → **"Menú Pro"** en login admin y en sidebar del dashboard (consistencia de marca).
  - **Animaciones extras**: `fadeIn`, `fadeUp`, `modalPop`, `shimmer`, `brand-pulse`. `prefers-reduced-motion` respetado.
  - **Verificado en vivo**: `/admin/login` 200, `/admin/dashboard` 200, `/js/modules/charts-theme-admin.js` 200. HTML dashboard contiene 27 referencias a nuevas clases y 12 al accent/font/helper. **197/197 tests verde.**
- 2026-05-29 — **Fase 5 (cierre del rediseño Opus 4.8):**
  - **Auditoría 360px** en `menu.html`, `owner.html`, `css/menu.css`, `css/owner.css`: 0 widths/min-widths fijos > 360px, 0 overflow horizontal, 0 inputs sin `type=`, 0 `<img>` sin `alt`. Inline `font-size: 11-13px` solo en labels/captions/meta (conforme con la regla: contenido ≥14px, inputs ≥16px).
  - **Accesibilidad**: modal de foto del plato con `role="dialog"` + `aria-modal="true"` + `aria-labelledby="photo-modal-name"`. Botón de cierre con `aria-label="Cerrar"`. Soporte `Esc` para cerrar.
  - **Smoke test E2E** con `curl` contra server real: login `owner@bot.com` 200 → `GET /api/public/restaurante/1` 200 → `GET /api/public/menu` 200 → `GET /api/public/carta` 200 → `POST /api/public/orders` con item (id_orden:6) 201 → `POST /api/public/reservations` (id_reserva:8, codigo `V5HBbm3`) 201 → `GET /api/public/reserva/V5HBbm3` 200 con todos los flags semánticos correctos. `/menu.html`, `/css/menu.css`, `/manifest.json` → 200.
  - **Documentación**: `features.md` actualizado con tabla nueva "Rediseño premium Opus 4.8" mostrando las 5 fases ✅, fix de `upgrade-insecure-requests`, y receta de setup desde laptop nueva. `status.md` con Fase 5 ✅ y resumen final.
  - **197/197 tests verde** (final).
- 2026-05-29 — **Fase 4 (rediseño premium de `menu.html` — cara del comensal):**
  - **Extraído CSS inline** (~280 líneas dentro de `<style>`) → nuevo `public/css/menu.css` (~736 líneas) con sistema de tokens completo compartido con `owner.css` (`--surface`, `--accent-glow`, `--shadow-xs/sm/lg/xl`, `--r/-sm/-lg/-pill`, `--t-fast/t/t-slow`, `--font/-display`).
  - **Dark mode automático** vía `@media (prefers-color-scheme: dark)` + variante override `:root[data-theme="dark"]`. Anti-flash en `<head>` setea `data-theme="auto"` antes del primer paint y actualiza `theme-color` a `#1a1410` si el sistema está en dark. Sin toggle visible (es vista del cliente, minimizar UI).
  - **Hero portada premium**: altura 220px, gradiente fallback color del restaurante, overlay `linear-gradient` superior→inferior para profundidad, `transform:scale(1.02)` con `transition 8s` que se reduce a `scale(1)` al cargar la imagen (efecto subtle ken-burns).
  - **Header sticky con shrink**: backdrop-filter blur(14px), al pasar 60px de scroll el header se compacta (`.shrunk` reduce padding + tipografía + cat-nav margin), wiring vía `requestAnimationFrame` en `setupHeaderShrink()`.
  - **Skeleton loaders** reemplazan el spinner inicial en pedido y reserva — 3 cards de 72px con líneas shimmer animadas vía `@keyframes shimmer`.
  - **Modal de foto**: tap en cualquier `.plato-thumb` o `.plato-carta-img` abre `.photo-modal` (overlay backdrop-blur, foto contain max 70vh, nombre Fraunces 1.3rem, descripción). Cierra con tap fuera, botón ✕ o `Esc`. `openPhotoModal()` / `closePhotoModal()` agregados al script.
  - **Tipografía**: Fraunces ital,wght cargado en serif display; DM Sans 300-800; títulos con `letter-spacing` ajustado, `-webkit-font-smoothing: antialiased`.
  - **Cards y botones repulidos**: sombras en capas (`--shadow-sm/-lg`), bordes redondeados (`--r-sm/-r/-r-lg`), `accent-glow` en estados hover, `transform: scale(0.98)` en `:active`. Touch targets 44px+ garantizados en `.btn-add-menu`, `.qty-btn`, `.mode-tab`, `.cat-pill`, `.btn-confirmar`, `.btn-reservar`.
  - **Drawer del carrito** con backdrop-filter blur, handle más visible (42×5 px), título Fraunces, `box-shadow: 0 -20px 60px`, animación de slide con cubic-bezier.
  - **Pantalla de éxito**: ícono 4.5rem con `drop-shadow(0 8px 18px accent-glow)`, animación `pop` con cubic-bezier elastic, código de reserva en `.codigo-box` (border 2px accent, padding 1.1×1.6rem) con animación `pulse-glow` infinita de 2.5s.
  - **Botón "Consultar mi reserva"** del header: clase nueva `.btn-consultar` con estado activo (`scale(0.96)` + fondo accent al tap).
  - **prefers-reduced-motion** respetado: deshabilita todas las animaciones para usuarios con esa preferencia.
  - **Verificado en vivo (PORT 3000)**: `/menu.html?restaurante=1` 200, `/css/menu.css` 200, HTML servido contiene 18 referencias a clases nuevas, APIs públicas (`/api/public/restaurante/1`, `/api/public/menu`) devuelven data del seeder. **197/197 tests verde.**
- 2026-05-29 — Setup en laptop nueva + seeder de datos demo:
  - Generado `.env` con VAPID keys de desarrollo + `JWT_SECRET` aleatorio (no se commitea).
  - Bootstrap manual: restaurante `id=1` (Crisolito) + admin `admin@local / Admin2026!` creados con script inline; `npm run bot:setup` después crea owner/cocina/mozo @bot.com.
  - Nuevo `scripts/seed-demo-data.js` — idempotente para el día actual. Crea 4 secciones, 11 platos de menú, 1 menú del día elegible (S/15), 3 categorías + 6 platos de carta, 6 mesas, 6 reservas distribuidas en todos los flags (`es_inicial`/`es_confirmada`/`es_en_cocina`/`es_listo×2`/`es_cliente_llego`) y 5 órdenes (`es_inicial`/`es_en_cocina×2`/`es_listo`/`es_entregado`). Usa `generarCodigoUnico()` para los códigos de reserva. Reentrante: borra reservas/órdenes del día antes de insertar.
- 2026-05-29 — **Fix CSP `upgrade-insecure-requests`** (`app.js`):
  - Síntoma: en celular (o en cualquier navegador entrando por IP de LAN `http://10.147.11.131:3000`), los `GET` cargaban bien pero **todo POST** (login incluido) fallaba con "Error de red" sin llegar al server. Localhost funcionaba.
  - Causa: Helmet añade `upgrade-insecure-requests` al CSP por defecto. Chrome trata localhost como secure context e ignora la directiva, pero la IP de LAN como insegura → intenta convertir el `fetch` a HTTPS, el server de dev no tiene TLS, conexión rechazada.
  - Fix: agregado `upgradeInsecureRequests: null` dentro de `helmet({ contentSecurityPolicy: { directives: { ... } } })`. Verificado con `curl -I http://10.147.11.131:3000/login.html | grep -i csp` — el header ya no incluye la directiva. **197/197 tests verde.**
  - Documentado en `deploy.md` §8.2 con nota para **reactivarla en producción HTTPS** + checklist item nuevo.
- 2026-05-29 — Fase 2 (bottom-nav móvil completa):
  - `public/owner.html`: nuevo `<nav class="bottom-nav">` con 5 destinos (Cola del día, Cocina, Reservas, Menú, Más). El botón "Más" abre el sidebar (hamburguesa) para acceso a Carta, Órdenes, Usuarios, Reportes, Configuración.
  - `showPanel()` extendido para sincronizar `.active` entre sidebar y bottom-nav vía `data-target`.
  - Espejo de permisos: los `bn-item` se ocultan automáticamente si su `nav-item` del sidebar está oculto (mismo criterio que ya filtra cocinero / usuarios delegados).
  - Badges duplicados con `MutationObserver` sobre `badge-pedidos|cocina|reservas` del sidebar → `bn-badge-*` del bottom-nav (sin tocar los módulos).
  - `public/css/owner.css`: bottom-nav activa con `display:flex` solo en `@media (max-width: 768px)`; `.content` gana `padding-bottom: calc(76px + env(safe-area-inset-bottom))` en móvil para no tapar contenido; estilos de badge con anillo del color de surface.
  - Generado `.env` con VAPID keys y JWT_SECRET de desarrollo (faltaba para arrancar el server).
  - **Verificado en vivo (PORT 3210)**: `/health` 200, `/owner.html` 200, `/css/owner.css` 200, HTML servido contiene 10 referencias a `bottom-nav/bn-*`, CSS contiene 12. **197/197 tests verde.**
- 2026-05-28 — Fase 3 (gráficos premium):
  - Nuevo `public/js/modules/charts-theme.js`: tema global de Chart.js (fuente Lato, tooltips redondeados, leyendas con punto, colores que se adaptan a claro/oscuro vía tokens CSS) + helper `mpGradient()`. Cargado en `owner.html` tras Chart.js.
  - `reportes.js`: rellenos con **degradado** en curva de demanda y ganancias; barras con esquinas redondeadas; `pointHoverRadius`.
  - **A1 Ticket promedio** + **A3 Tasa de cancelación**: nuevo endpoint `GET /api/reportes/kpis` (backend) + 2 stat-cards en Reportes.
  - **A2 Hora pico**: nuevo endpoint `GET /api/reportes/hora-pico` (demanda por hora, hora Lima UTC-5) + nuevo card con gráfico de barras apiladas (órdenes/reservas) en Reportes.
  - El toggle de tema re-aplica el tema de los charts y los recarga si estás en Reportes.
  - **Verificado en vivo con login real** (owner@bot.com): `/api/reportes/kpis` 200 → ticket S/15.27, cancelación 24.1% (7/29); `/api/reportes/hora-pico` 200 → pico a las 11h. **197/197 tests verde.**

---

## Stack
- **Backend:** Node.js + Express + better-sqlite3
- **Auth:** JWT (cookies httpOnly)
- **Frontend:** HTML/CSS/JS vanilla + ES Modules (sin framework)
- **CSS:** custom puro en todo el proyecto → extraído a `public/css/owner.css`. Tailwind adopción progresiva en producción (post-lanzamiento, módulo por módulo)
- **BD:** SQLite (PostgreSQL — migración futura)
- **Mobile:** PWA instalable (pendiente ARCH-002)

## Decisiones arquitectónicas — 2026-05-21

| Decisión | Descripción |
|----------|-------------|
| Mobile-first obligatorio | El sistema vive en celulares de gama media. No hay tablets ni laptops en el punto de venta. Todo el frontend debe cumplir requisitos mobile (touch targets, font-size, overflow, PWA). |
| ES Modules | `owner.html` se divide en módulos JS separados en `public/js/modules/`. Ver ARCH-001 en features.md. |
| CSS custom puro | Todo el proyecto en CSS custom (no Tailwind). Solo kitchen.html usaba Tailwind — eliminado. Migración a Tailwind: progresiva en producción, post-lanzamiento. |
| kitchen.html | **ELIMINADO** — reemplazado por panel "Cocina" en owner.html via `cocina.js` (ARCH-001 paso 1.6 ✅) |
| Vista unificada "Cola del día" | Nuevo panel en owner.html mostrando órdenes + reservas activas juntas, ordenadas por urgencia. |
| Columna `modalidad` en reservas | Agregar antes de implementar flujo completo de estados (ARCH-004). |
| PWA | manifest.json + service worker básico — instalable en home screen sin Play Store. |

---

## Estado actual: `ACTIVO — EN DESARROLLO`

Rama activa: `master`

---

## ✅ COMPLETADO — Bot de documentación (sesión 2026-05-27)

**Todos los pasos del TODO de `landing/BOT.md` están completos. Bot corre, genera 34 screenshots y 4 manuales `.md`.**

### Estado del TODO (ver `landing/BOT.md` para detalle completo)

| Paso | Tarea | Estado |
|------|-------|--------|
| 1 | Instalar Playwright + Chromium | ✅ Completo |
| 2 | Crear estructura `landing/bot/` | ✅ Completo |
| 3 | `bot.js` — orquestador principal | ✅ Completo |
| 4 | Flow: Login (owner/cocinero/mozo) | ✅ Completo (dentro de `flows/owner.js`) |
| 5 | Flows owner.html — 19 secciones | ✅ Completo |
| 6 | Flow cocinero | ✅ Completo (3 screenshots) |
| 7 | Flow mozo | ✅ Completo (4 screenshots) |
| 8 | Flow cliente consumidor (`menu.html`) | ✅ Completo (8 screenshots) |
| **9** | **Generar ~12 imágenes de platos peruanos para `landing/bot/assets/`** | **✅ Completo** |
| 10 | Generar 4 manuales `.md` con screenshots | ✅ Completo (en `landing/bot/output/`) |
| 11 | Generar `errors-report.md` con errores de consola | ✅ Completo (7 falsos positivos detectados) |

### Notas Paso 9 — imágenes de platos
- Wikipedia `upload.wikimedia.org` retornó HTTP 429 (rate limiting) en múltiples intentos
- Solución: `generate-placeholder-images.js` usa Playwright/Chromium para renderizar HTML estilizado con emoji + nombre + color único por plato y capturar como JPEG 640×480
- 12/12 imágenes disponibles en `landing/bot/assets/` (papa-huancaina.jpg descargada de Wikipedia, resto generadas)
- Script: `npm run bot:assets`

### Pendiente
- Reruns del bot (`npm run bot:run`) para que el flow de carta (`06-carta-platos`) use imágenes reales en screenshots

---

## ✅ COMPLETADO — Landing page + Manuales web (sesión 2026-05-28)

**`public/landing.html` construida con 7 secciones. `/manuales` renderiza los 4 manuales con marked.js.**

### Cambios realizados

| Archivo | Cambio |
|---------|--------|
| `public/landing.html` | Landing completa — Hero, Problema, Tutorial, Features, Quién lo hace, FAQ, CTA final |
| `public/manuales.html` | Página `/manuales` con 4 tabs (Dueño, Cocinero, Mozo, Cliente) — renderiza `.md` con marked.js |
| `public/landing/screenshots/` | 7 screenshots copiados del bot para la landing |
| `app.js` | Ruta `/` → `landing.html`; `/manuales` → `manuales.html`; `/bot-screenshots` estático; `/api/manuales/:rol`; Tailwind CDN en CSP |
| `landing/bot/output/manual-*.md` | Corrección de voseo → tuteo peruano (15 ocurrencias en 4 archivos) |

### Decisiones
- Screenshots de la landing: reutilizados del bot (no fue necesario tomar nuevas capturas)
- Precio: no mencionado — CTA de WhatsApp con mensaje predeterminado
- WhatsApp: `51921340185`
- Manuales: renderizado client-side con `marked.js` CDN; imágenes servidas en `/bot-screenshots/`

### Para correr el bot en laptop nueva
```bash
npm install
npx playwright install chromium
npm run bot:setup     # crea usuarios bot en BD local
npm run bot:assets    # genera imágenes de platos (sin internet externo)
npm run bot:run       # genera screenshots + manuales
```

### Archivos clave del bot
| Archivo | Propósito |
|---------|-----------|
| `landing/bot/bot.js` | Orquestador — punto de entrada |
| `landing/bot/flows/{owner,cocina,mozo,cliente}.js` | Flows por rol |
| `landing/bot/setup-bot-users.js` | Crea owner@bot.com / cocina@bot.com / mozo@bot.com (pass: `BotMenuPro2026!`) |
| `landing/bot/output/manual-*.md` | Manuales generados (commiteados, reproducibles con `bot:run`) |
| `landing/bot/generate-placeholder-images.js` | Genera 11 imágenes de platos con Playwright (sin internet) — `npm run bot:assets` |
| `landing/bot/assets/` | 12/12 imágenes disponibles (papa-huancaina real, resto placeholder Playwright) |
| `landing/bot/errors/errors-report.md` | Log de errores (en .gitignore, se regenera) |

---

## Decisiones de sesión 2026-05-21 (arquitectura frontend)

| Decisión | Detalle |
|----------|---------|
| kitchen.html → eliminado | Cocinero sin permisos redirige a owner.html. JS detecta rol y muestra solo panel Cocina |
| CSS custom puro | Todo el proyecto. Tailwind: adopción progresiva en producción post-lanzamiento |
| Zonas Kanban | Vista de pedidos activos en columnas/tabs por estado: Pendientes→Cocina→Listos→Cobrar |
| ARCH-004 ✅ | `modalidad TEXT DEFAULT 'en_local'` en tabla `reservas` — `config/database.js` |
| ARCH-001 paso 1.1 ✅ | CSS extraído de `owner.html` → `public/css/owner.css`. `<link rel="stylesheet">` en su lugar |
| ISS-004 ✅ | BOM UTF-8 por PowerShell corrompía caracteres. Re-guardado con `UTF8Encoding($false)`. Regla agregada a CLAUDE.md |
| "Cliente" del producto | Engloba todos los usuarios: owner, mozo, cocinero y comensales |
| Analytics de UX | Feature futura: medir comportamiento de todos los usuarios en producción |

---

## Módulos implementados

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth (login/logout) | ✅ Completo | JWT en cookie, roles: admin / owner / cocinero / mozo |
| Menú del día | ✅ Completo | Secciones, platos, menús del día con componentes |
| Carta | ✅ Completo | Categorías y platos a la carta con toggle activo/inactivo |
| Órdenes activas | ✅ Completo | Vista en tiempo real, flujo de estatus |
| Historial de órdenes | ✅ Completo | Filtros por fecha y estatus |
| Descarga Excel (formato_1) | ✅ Completo | Ver sección Formatos |
| Reservas | ✅ Completo | Flujo completo: Confirmar → Cocina → Listo → Cliente llegó → Completar. Historial + descarga Excel. (ISS-006 resuelto 2026-05-23) |
| Usuarios | ✅ Completo | Owner puede crear cocinero/mozo y asignar permisos granulares. Cambio de contraseña propio disponible para todos los roles desde sidebar. |
| Reportes | ✅ Completo | Métricas y gráficas de barras |
| Panel Admin | ✅ Completo | Gestión global de restaurantes y usuarios. Panel de estadísticas por restaurante (drawer lateral con tabs Resumen/Demanda/Ganancias, Chart.js). |
| Vista Cocina | ✅ Completo | Panel Cocina en `owner.html` via `cocina.js`. `kitchen.html` reemplazado con redirect. Muestra órdenes + reservas en preparación (ISS-008 resuelto 2026-05-23). |
| Polling automático + alerta de sonido | ✅ Completo | Auto-refresh 15s, 3 endpoints REST, detección de órdenes nuevas, audio via Web Audio API, toggle mute persistido en localStorage |
| Cola del día — Kanban (Gap 2) | ✅ Completo 2026-05-23 | `pedidos.js` — 4 tabs Kanban (Pendientes/En Cocina/Listos/Por cobrar), badges, botones de acción rápida, flag `es_entregado`, polling 15s. |
| Auto-preparación de reservas + Push (Gap 3) | ✅ Completo 2026-05-25 | Job en servidor cada 60s. Reservas `es_confirmada` con `hora_llegada` pasan a `es_en_cocina` automáticamente X min antes. Web Push al celular aunque la app esté cerrada. `minutos_preparacion` configurable por restaurante (default 20 min). 29 tests. |
| Modalidades de pedido (Gap 4) | ✅ Completo 2026-05-25 | `en_local`/`para_llevar` en órdenes; `en_local`/`para_llevar`/`delivery` en reservas. Flujo de estados diferenciado por modalidad. Badges visuales. Selectores en menu.html. Config owner. 22 tests. |
| Auto-merge cuenta por mesa (Gap 8) | ✅ Completo 2026-05-25 | Al marcar `es_cliente_llego`, copia ítems carta+menú de la reserva a la orden activa de la misma mesa. `auto_merge_activo` configurable por restaurante (default: activo). Toggle en panel Configuración del owner. 17 tests. |
| Precio por modalidad (Gap 5) | ✅ Completo 2026-05-25 | `costo_tapper`/`tarifa_delivery` en `restaurantes`; `cargo_modalidad` en `ordenes` y `reservas`; total incluye cargo; desglose visual en menu.html (+S/ X al seleccionar para llevar/delivery); config en owner. 21 tests. |
| Mobile-first (ARCH-003) | ✅ Completo 2026-05-23 | Touch targets 44px, font-size 14-16px, type en inputs, sin overflow 360px |
| PWA instalable (ARCH-002) | ✅ Completo 2026-05-22 | manifest.json + service worker + íconos |
| ES Modules (ARCH-001) | ✅ Completo 2026-05-23 | owner.html modularizado en 9 módulos JS separados |
| Menú cliente (QR) | ✅ Completo | `menu.html` — carta + menú del día |
| Plano de mesas visual | ✅ Completo | Tabla `mesas`, chips color-coded, polling 10s |
| Pagos Fase 1 | ✅ Completo | Yape/Plin/Efectivo, comprobante foto, confirmación manual |
| Flags semánticos en estatus (REFACTOR-001) | ✅ Completo 2026-05-21 | Elimina hardcodes de nombres; sistema funciona aunque admin renombre estatus |
| Código de reserva + estado para el cliente (Gap 6) | ✅ Completo 2026-05-21 | `codigo` único en `reservas`; pantalla de confirmación con código grande; consulta de estado pública; código visible en tarjetas de owner |

---

## Formatos descargables

| # | Nombre | Módulo > Submódulo | Filtros | Estado |
|---|--------|--------------------|---------|--------|
| 1 | `historial_ordenes_DESDE_HASTA.xlsx` | Órdenes > Historial | fecha_desde, fecha_hasta | ✅ Implementado |
| 2 | `historialReservas_DESDE_HASTA.xlsx` | Reservas > Historial | fecha_desde, fecha_hasta | ✅ Implementado |
| 3 | `demanda_clientes_{intervalo}.xlsx` | Reportes > Análisis de demanda | intervalo (dia/semana/mes) | ✅ Implementado |
| 4 | `pedidos_{tipo}_{filtro}.xlsx` | Reportes > Análisis de pedidos | tipo (menu/carta), filtro (sección/categoría) | ✅ Implementado |
| 5 | `ganancias_{intervalo}.xlsx` | Reportes > Ganancias | intervalo (dia/semana/mes) | ✅ Implementado |

### Diseño de formatos
- Fila 1: nombre del restaurante — fondo oscuro `#1a1612`, texto blanco
- Fila 2: título + rango de fechas — fondo accent `#c8692a`, texto blanco
- Fila 3: encabezados — fondo `#fdf0e8`, texto `#a0521e` en negrita
- Filas **N** (carta): fondo blanco
- Filas **Y** (menú): fondo azul claro `#edf4fb`
- Fila **T** (total): fondo `#fdf0e8`, negrita, precio en `#c8692a`

---

## Archivos de referencia clave

| Archivo | Propósito |
|---------|-----------|
| `vision_negocio.md` | Brújula del proyecto: target, flujos, roles, gaps. **Leer siempre al inicio de sesión.** |
| `features.md` | Backlog priorizado de features pendientes |
| `issues/ISSUES.md` | Bugs e issues abiertos |
| `issues/REFACTOR-001-estatus-dinamicos.md` | Refactor estatus dinámicos por flags — ✅ COMPLETO 2026-05-21 |
| `issues/ISSUES.md` | Bugs abiertos — ISS-002 (botón "Ya pagué con Plin" deshabilitado en menu.html) · ISS-003 resuelto (flag 500) |

---

## Historial de prompts

| Fecha | Prompt | Cambios |
|-------|--------|---------|
| 2026-05-09 | Configuración inicial del proyecto | Estructura base, auth, BD SQLite |
| 2026-05-09 | Cambios en models | Ajustes en modelos de datos |
| 2026-05-09 | Rango de fechas en historial de órdenes | Filtros `fecha_desde` / `fecha_hasta` en `GET /api/orders` y en el frontend |
| 2026-05-09 | Formato_1: descarga Excel historial de órdenes | Instalación de `exceljs`, endpoint `GET /api/orders/export`, botón en historial, función `descargarFormato1()` |
| 2026-05-09 | Precio de componentes en reservas | Query de `menuItems` en `GET /api/reservations` ahora incluye `precio_menu` y `total_componentes`; se calcula `precio_unitario` por componente y se suma al total. 27 pruebas en `scripts/test-menu-pricing.js`. **Oportunidad de mejora:** revisar la función de suma del precio de los componentes en la reserva — actualmente divide el precio del menú entre el total de componentes registrados en BD, pero podría no reflejar correctamente escenarios donde el cliente elige sólo algunas secciones. |
| 2026-05-09 | Fix divisor precio menú en reservas | Corregido subquery de `total_componentes`: se usa `menu_secciones` (una fila por sección por menú) en lugar de `componentes_menu_dia` (que tiene N filas por sección en menús elegibles). 35 pruebas actualizadas en `scripts/test-menu-pricing.js`. |
| 2026-05-09 | Formato_2: descarga Excel historial de reservas | Endpoint `GET /api/reservations/export` (`authorize owner`), botón "⬇ Descargar Excel" en Reservas > Historial, función `descargarFormatoReservas()`. Columnas: ID Reserva, Mesa, Fecha, Cliente, Teléfono, Menú, Sección/Categoría, Plato, Cantidad, Precio. Archivo: `historialReservas_DESDE_HASTA.xlsx`. |
| 2026-05-11 | Setup en laptop nueva | `npm install`, creación de `.env`, generación de `database.sqlite` y usuario admin inicial. Proyecto listo para desarrollo. |
| 2026-05-11 | Fix columna `activo` en platos_carta | Columna `activo INTEGER DEFAULT 1` faltaba en `CREATE TABLE` de `config/database.js`. Agregada a la definición y migración idempotente para bases existentes. Resuelve error 500 en `GET /api/menu/platos-carta`. |
| 2026-05-11 | Fix scroll horizontal en tablas móvil | Todas las tablas dinámicas de `owner.html` (secciones, platos-menu, categorías, platos-carta, usuarios) envueltas en `<div class="table-wrap">` para habilitar scroll horizontal en pantallas pequeñas. |
| 2026-05-11 | Submódulo análisis de demanda — Curva de clientes | Nuevo `routes/reportes.js` con `GET /api/reportes/clientes-timeline?intervalo=dia|semana|mes`. Agrega en SQL con `strftime`. Frontend: gráfica de línea con Chart.js (CDN), botones Día/Semana/Mes en panel-reportes de `owner.html`. Propuesta de columnas para Excel formato_3 escrita en `formatos.md`. |
| 2026-05-11 | Submódulo análisis de pedidos — card unificada + Excel | 3 cards separadas reemplazadas por 1 card con drill-down: tipo (Menú/Carta) → sección/categoría → bar chart platos más pedidos (órdenes + reservas). Endpoints: `GET /api/reportes/pedidos/filtros`, `/pedidos`, `/pedidos/export`. `loadReportes()` simplificada. Chart agrupado naranja/azul. |
| 2026-05-11 | Formato_3: Excel curva de clientes (Reportes > Análisis de demanda) | Endpoint `GET /api/reportes/clientes-timeline/export?intervalo=dia|semana|mes` en `routes/reportes.js`. Genera histórico completo agrupado por período: columnas Período, Órdenes, Reservas, Total clientes, fila de totales al final. Diseño con colores del sistema (fila restaurante `#1a1612`, título `#c8692a`, encabezados `#fdf0e8`/`#a0521e`, filas alternas blanco/`#edf4fb`). Frontend: botón "⬇ Excel" en la card de Curva de clientes, función `descargarFormatoDemanda()` que usa el `intervaloActual` activo. Archivo: `demanda_clientes_{intervalo}.xlsx`. |
| 2026-05-13 | Upgrade arquitectura: columna `total` en órdenes y reservas | Nuevo `utils/totales.js` con `calcularTotalOrden(db, id)` y `calcularTotalReserva(db, id)`. Migraciones idempotentes en `config/database.js` (columna `total REAL DEFAULT NULL` en `ordenes` y `reservas`). Backfill automático al inicio: calcula y guarda el total de todas las órdenes `completado` y reservas `completada` existentes sin total. `routes/orders.js`: al pasar a `completado`, calcula y persiste `total`. `routes/reservations.js`: al pasar a `completada` (es_full=1), ídem. Elimina el problema de N+1 queries en reportes de ganancias. |
| 2026-05-13 | Submódulo de ganancias (Reportes) | 4 cards (Ganancias totales, del mes, de la semana, de hoy) + gráfica de líneas con 3 series (Total, Órdenes, Reservas) + descarga Excel. Endpoints: `GET /api/reportes/ganancias/resumen`, `/ganancias/timeline?intervalo=dia\|semana\|mes`, `/ganancias/export`. Fuente de datos: `SUM(total)` directamente desde la BD (sin N+1). `formatos.md`: formato_5 documentado. |
| 2026-05-13 | Mejora reportes — serie Total en chart-demanda y chart-pedidos | `owner.html`: `loadDemanda()` agrega 3er dataset "Total" (verde `#2e7d52`) usando el campo `total` que ya devolvía el backend. `loadPedidos()` agrega 3er dataset "Total" (verde `#2e7d52`) ídem. Sin cambios en backend. |
| 2026-05-14 | Panel de Configuración — foto de portada + colores + brand sidebar | Migraciones `foto_portada`, `color_primario`, `color_secundario` en `restaurantes`. Multer configurado en `routes/menu.js` (4 endpoints: GET/PATCH config, POST/DELETE foto). `routes/public.js` extendido. `owner.html`: sidebar muestra nombre real y foto/emoji del restaurante; panel Configuración con preview, input file y color pickers. `menu.html`: hero banner y colores dinámicos vía CSS variables. |
| 2026-05-14 | Eliminar sección de un menú del día | `owner.html`: botón ✕ en cada sección dentro de `renderMenuCard()` + función `eliminarSeccionDeMenu()` que llama al endpoint `DELETE /api/menu/menus-dia/:id/secciones/:seccionId` ya existente. Sin cambios en backend. |
| 2026-05-14 | Fotos en platos de menú y carta | `routes/menu.js`: función factory `makeUploadPlato` + helper `subirFotoPlato`/`eliminarFotoPlato` → 4 endpoints POST/DELETE para `platos-menu` y `platos-carta`. Carpetas `public/uploads/platos-menu/` y `public/uploads/platos-carta/`. `owner.html`: tablas de platos con columna de miniatura (40×40) y botones 📷/🗑 por fila. `menu.html`: fotos en platos elegibles (`.plato-thumb` 52×52 a la derecha), platos fijos (ídem) y platos de carta (`.plato-carta-img` 64×64 a la izquierda). |
| 2026-05-14 | Sistema de permisos granulares | `config/database.js`: columna `permisos TEXT DEFAULT NULL` en `usuarios`. `middleware/authenticate.js`: `authorizePermiso()`. `routes/auth.js`: permisos en JWT y respuesta. `routes/usuarios.js`: GET devuelve permisos; nuevo PATCH /:id/permisos. Todos los `authorize('owner')` en 4 routes reemplazados por `authorizePermiso()`. `login.html`: guarda permisos en sessionStorage; redirige a owner.html si tiene permisos delegados. `owner.html`: guard acepta usuarios con permisos; filtra nav/paneles; oculta sub-tabs; matriz de 8 checkboxes por usuario en panel Usuarios. |
| 2026-05-18 | Polling automático + alerta de sonido en kitchen.html | `utils/orderStatus.js`: utilidad de mapeo inglés↔español para estatus de cocina. `routes/orders.js`: `GET /api/orders/queue` (cola de cocina con campos en inglés), `PUT /api/orders/:id` y `PUT /api/orders/combo/:id` (alias) para actualizar status desde cocina. `kitchen.html`: función `detectAndAlertNewOrders()` compara set de IDs pending prev vs actual; `playAlertSound()` vía Web Audio API (dos tonos, fade-out 450ms); botón 🔔/🔕 en header con preferencia persistida en localStorage. Tests: `tests/order-status.test.js` (15 casos) + `tests/kitchen-polling.test.js` (15 casos) = 30 tests, todos pasan. |
| 2026-05-18 | Inhabilitar menú del día | Migración idempotente `activo INTEGER DEFAULT 1` en `menus_dia`. Endpoint `PATCH /api/menu/menus-dia/:id/activo` en `routes/menu.js`. `GET /api/menu/menus-dia` incluye campo `activo` en SELECT. `GET /api/public/menu` filtra `AND activo = 1`. `owner.html`: botón "● Visible / ○ Oculto" en cada card de menú + función `toggleActivoMenu()`; cards inactivas con `opacity:0.55`. Tests: `tests/menu-activo.test.js` (11 casos), todos pasan. |
| 2026-05-18 | Platos agotados en menú del día | Migración idempotente `agotado INTEGER DEFAULT 0` en `componentes_menu_dia`. Endpoint `PATCH /api/menu/menus-dia/:id/secciones/:seccionId/platos/:componenteId/agotado`. `GET /api/menu/menus-dia` incluye `cmd.agotado` por plato. `GET /api/public/menu` filtra `AND cmd.agotado = 0`. `owner.html`: botón "Disponible / Agotado" por plato + función `toggleAgotadoPlato()`; platos agotados con texto tachado y opacidad 0.5. Tests: `tests/platos-agotados.test.js` (12 casos), todos pasan. |
| 2026-05-18 | Generador de QR del menú | CDN `qrcode@1.5.3` en `<head>`. Card nueva en panel Configuración: QR 180×180 con colores del sistema, input con link copiable, botón "Descargar PNG" via `canvas.toDataURL()`. Se regenera cada vez que se abre el panel (`loadConfiguracion` llama `generarQR()`). Sin cambios en backend. |
| 2026-05-18 | Plano de mesas visual | Tabla `mesas` con migración idempotente. `routes/mesas.js`: GET lista, GET /estado (libre/ocupada/reservada), POST, PATCH/:id, DELETE/:id. Registrado en app.js. `owner.html`: tab "Plano" como primera tab del panel Órdenes con chips color-coded (verde/rojo/amarillo), detalle inline de orden/reserva en mesa. Panel Configuración: sección mesas con form agregar + lista con botón eliminar. Polling 10s actualiza el plano si está activo. Tests: `tests/plano-mesas.test.js` (13 casos), todos pasan. |
| 2026-05-18 | Fix horas UTC → hora Lima | `owner.html`: helper `toUTC(d)` normaliza strings SQLite (`"2026-05-19 02:20:00"` → `"2026-05-19T02:20:00Z"`) evitando duplicar `Z` si ya está presente; `fDT` usa `timeZone:'America/Lima'`. `routes/orders.js`: mismo fix en Excel export (`horaExcel`). Tests: `tests/timezone.test.js` (11 casos), todos pasan. |
| 2026-05-21 | Sesión de análisis de visión del negocio | Creado `vision_negocio.md` con target, flujos completos (reserva dine-in/takeout/delivery, walk-in, cocina, pago), roles, principios de diseño, 15 gaps identificados. Sesión 0 de REFACTOR-001 completada: flags semánticos en BD + 8 endpoints admin. |
| 2026-05-21 | ISS-003 fix — PATCH estatus con flag retornaba 500 | `AND id_restaurante IS NULL` inválido eliminado de 3 queries en `routes/orders.js` (×2) y `routes/reservations.js` (×1). Las tablas `estatus_orden` y `estatus_reserva` no tienen esa columna. |
| 2026-05-21 | Gap 6 — Código de reserva aleatorio + estado para el cliente | **5 sesiones.** `utils/codigoReserva.js`: generador de 7 chars alfanumérico sin ambigüedad (sin 0/O/1/l/I), verifica unicidad. `config/database.js`: columna `codigo TEXT` + índice único parcial en `reservas`, backfill idempotente. `routes/public.js`: `POST /api/public/reservations` asigna código en la transacción y lo devuelve; nuevo `GET /api/public/reserva/:codigo` público devuelve estado + flags + items. `routes/reservations.js`: `GET /api/reservations` incluye `r.codigo`. `menu.html`: pantalla de confirmación muestra código en grande con instrucción de screenshot; botón "Ver estado" → pantalla fullscreen con búsqueda por código y polling 30s; pill "📋 Consultar mi reserva" en header. `owner.html`: código visible bajo el nombre del cliente en tarjetas de reserva (`🔑 kDVvemB`). |
| 2026-05-22 | ARCH-002 completo — PWA instalable. `manifest.json` (nombre "RestApp", colores sistema), íconos 192×192 y 512×512, `sw.js` con cache de assets estáticos + fallback a red. Registrado en `owner.html` y `menu.html`. |
| 2026-05-22 | ISS-004 incidente 2 — Doble codificación en owner.html | `owner.html` tenía caracteres doble-codificados (UTF-8 leído como Windows-1252 y re-guardado como UTF-8). Fix: script Python que revierte la transformación caracter a caracter. 51 `ú` y 40 `ó` corregidas. Sin BOM. Archivo: 130KB → 119KB. |
| 2026-05-22 | ARCH-001 trozado en 10 pasos + pasos 1.2–1.8 completos. Pasos completados hoy: 1.2 (utils.js), 1.3 (config.js), 1.4 (usuarios.js), 1.5 (mesas.js), 1.6 (cocina.js + panel Cocina en owner.html + kitchen.html reemplazado), 1.7 (reservas.js), 1.8 (ordenes.js + badgePago). Paso 1.9 (reportes.js): archivo creado y `<script src>` en head ✅, falta eliminar bloque inline en owner.html (2 edits pendientes: 1.9b y 1.9c). Paso 1.10 (pedidos.js): pendiente. |
| 2026-05-23 | ISS-006 + ISS-007 resueltos. ISS-007: login.html redirige cocinero a owner.html; kitchen.html reemplazado con redirect; permiso `cocina` agregado a PERMISOS_DEF; guard owner.html extendido para rol cocinero (ve solo Cocina + Cola del día). ISS-006: GET /api/reservations devuelve flags intermedios; loadReservasActivas fetcha 5 estados activos; tarjetas con flujo completo: Confirmar → A cocina → Listo → Cliente llegó → Completar. |
| 2026-05-23 | ARCH-001 completo. 1.9b: eliminado MÓDULO 5 inline (descargarFormatoDemanda, loadDemanda, loadReportes, loadGanancias y helpers). 1.9c: eliminado análisis de pedidos inline (loadPedidosFiltros, setPedidosTipo, loadPedidos, descargarFormatoPedidos, sc, renderBarChart). 1.10a+1.10b: creado pedidos.js con loadColaDia, initPedidosPoll/stopPedidosPoll, cards con ítems, badge nav, integración detectNuevasOrdenes/Reservas. Panel "Cola del día" en owner.html (nav + panel HTML + PANELS/TITLES). CSS cola-card en owner.css. ARCH-001 ✅ completo. |
| 2026-05-23 | Gap 2 (Kanban Cola del día) — paso B: nuevo flag `es_entregado` en `estatus_orden`. Migración en `database.js` (columna + fila 'entregado' + backfill). `routes/orders.js`: SELECT incluye `es_entregado`, agregado a `VALID_ORDER_FLAGS`. `pedidos.js`: Listos = `es_listo` (botón "🍽 Entregar" → `es_entregado`); Por cobrar = `es_entregado` (botón "💰 Cobrar") + reservas `es_cliente_llego`. |
| 2026-05-23 | Gap 2 (Kanban Cola del día) — **COMPLETO**. `reservas.js`: botón "👤 Cliente llegó" renombrado a "🍽 Entregado" (semántica: cliente llegó + sentó + plato entregado en un solo paso). G2.5 pruebas manuales: 15/15 OK. G2.6 documentación actualizada: `features.md`, `status.md`, `vision_negocio.md`. |
| 2026-05-23 | ISS-009 resuelto — `api()` en `utils.js` redirige a `/login.html` ante 401. Aplica a todos los módulos. ISS-010 resuelto — orden de render en `cocina.js` cambiado a: En preparación → Reservas en prep → Pendientes. ISS-011 registrado como abierto (CSP eval + 27 no-label). |
| 2026-05-23 | ISS-008 resuelto — Reserva no aparecía en cola de cocina. Fix en `cocina.js`: `Promise.all` fetcha órdenes y reservas en paralelo; nueva sección "Reservas en preparación" con `renderCocinaReserva()` y `marcarReservaListaCocina()`; badge cuenta ambos tipos. |
| 2026-05-25 | ISS-011 resuelto — 27 "No label" en owner.html y menu.html: añadido `for="id"` a todos los `<label>` sin asociación; `aria-label` en inputs sin label. eval() de QRCode.js CDN: documentado en deploy.md con solución CSP via Helmet. Creado `deploy.md` con guía completa de producción: VPS, dominio, SSL, Nginx, PM2, backups, seguridad (Helmet, rate limiting), monitoreo, costos (~$8 USD/mes), checklist de launch. |
| 2026-05-25 | ISS-012 resuelto — Usuarios con permisos delegados recibían 403 al cambiar estatus de reservas/órdenes. Causa: 7 endpoints en `routes/reservations.js` y `routes/orders.js` usaban `authorize('owner','mozo')` (chequeo por rol) en lugar de `authorizePermiso()` (chequeo por rol o permisos). Fix: reemplazados los 7 `authorize(...)` por `authorizePermiso()`. Afectaba: PATCH /:id/estatus, PATCH /:id/mesa, PATCH /:id/confirmar-pago (reservas); PATCH /:id/estatus, PATCH /:id/confirmar-pago, GET /queue, PUT /combo/:id y PUT /:id (órdenes). |
| 2026-05-25 | Panel Admin — Estadísticas por restaurante. Nuevos endpoints en `routes/admin.js`: `GET /restaurantes/:id/reportes/resumen`, `/clientes-timeline?intervalo=`, `/ganancias/resumen`, `/ganancias/timeline?intervalo=`. Helpers `sumarGanancias`, `gananciasTimeline`, `clientesTimeline` exportados desde `routes/reportes.js` y re-usados desde admin. `app.js` actualizado con import por destructuring. `public/admin/dashboard.html`: CSS del drawer lateral (`.stats-drawer`, `.stats-drawer-backdrop`, tabs), HTML del panel con 3 tabs (Resumen/Demanda/Ganancias), botón 📊 Stats en tabla de restaurantes, JS completo (`abrirStatsDrawer`, `cerrarStatsDrawer`, `switchDrawerTab`, `cargarResumen`, `cargarDemanda`, `cargarGanancias`) con Chart.js. Sin tests adicionales (lógica en helpers ya testeados). |
| 2026-05-26 | Admin: descargas Excel por restaurante. 3 endpoints en `routes/admin.js` (`/resumen/export`, `/clientes-timeline/export`, `/ganancias/export`). Helper `EXCEL_STYLE` + `excelHeader()` reutilizables. Botones "⬇ Excel" en cada tab del drawer (Resumen/Demanda/Ganancias). Funciones JS `descargarResumenAdmin/DemandaAdmin/GananciasAdmin()`. Archivo con nombre del restaurante en el filename. Roadmap de features A1-C5 documentado en `features.md`. |
| 2026-05-26 | Cambio de contraseña propio — `PATCH /api/auth/me/password` en `routes/auth.js` (verifica contraseña actual con bcrypt antes de cambiar). Botón "🔑 Cambiar contraseña" en sidebar footer de `owner.html` (encima de Cerrar sesión). Modal con 3 campos: contraseña actual, nueva, confirmar. Validaciones client-side (coincidencia, mínimo 8 chars) + server-side. Aplica a owners, mozos y cocineros — cualquier usuario autenticado. |
| 2026-05-26 | ISS-012-admin resuelto — Admin: revenue S/0.00 en tabla + gráficas Demanda/Ganancias vacías. 3 bugs: (1) Chart.js no estaba incluido en `dashboard.html` → gráficas no renderizaban; (2) revenue en tabla usaba solo `orden_carta_items` (omitía menú del día y reservas) → inconsistente con `sumarGanancias()`; (3) mismo error en stats globales del Overview. Fix: `<script>` de Chart.js 4.4.0 agregado; revenue en `GET /restaurantes` y `GET /stats` ahora usa `SUM(ordenes.total) + SUM(reservas.total)`. |
| 2026-05-27 | ISS-002 resuelto — Botón "Ya pagué" deshabilitado en segunda transacción de la misma sesión. Causa raíz: `showPagoStep()` reseteaba `display:none` pero dejaba `btn.disabled=true` del pago anterior. Fix en `menu.html`: `btnPague.disabled = false` en `showPagoStep()` al limpiar el estado + `btn.disabled = false` explícito en las 3 ramas de `seleccionarMetodoPago()` (Yape, Plin, Efectivo) como defensa adicional. Aplica a todos los métodos de pago, no solo Plin. |
| 2026-05-27 | Hardening 9/10 — health endpoint, graceful shutdown, npm audit fix, multer iOS. `GET /health` (sin auth, devuelve uptime). Graceful shutdown: `SIGTERM`/`SIGINT` cierran server + BD antes de salir; fuerza `exit(1)` a los 10s. `npm audit fix`: 5 vulnerabilidades cerradas (ip-address, qs, tmp, ws); queda 1 moderate uuid/exceljs (downgrade breaking — aceptado). Multer fileFilter en 3 lugares (`routes/public.js`, `routes/menu.js` ×2): cambiado de lista blanca de extensiones/mimetypes a `file.mimetype.startsWith('image/')` — acepta HEIC/HEIF de iOS y Android modernos. Puntuación: 8.5 → 9/10. |
| 2026-05-26 | Revisión de producción + hardening. Auditoría completa del proyecto: puntuación 7.2/10 → 8.5/10 tras cerrar los gaps. **Cambios:** (1) `helmet` instalado y configurado en `app.js` con CSP completa (incluye CDN Chart.js, QRCode, Fonts). (2) Rate limiting global: `/api/auth/*` 20 req/15min; `/api/*` 300 req/min. (3) 4 índices de BD en `database.js`: `idx_ordenes_restaurante`, `idx_ordenes_fecha`, `idx_reservas_restaurante`, `idx_reservas_fecha`. (4) Bug crítico resuelto: `login.html` redirigía al mozo a `/waiter.html` (inexistente) — corregido a `/owner.html`. (5) Ruta `/waiter → waiter.html` eliminada de `app.js`. 197/197 tests pasan. |
| 2026-05-25 | Gap 10 — Cerrado por diseño. Descartables = ítem de carta configurable por el owner. No requiere feature dedicada. |
| 2026-05-25 | Gap 8 — Auto-merge cuenta por mesa. `auto_merge_activo INTEGER DEFAULT 1` en `restaurantes`. `PATCH /api/reservations/:id/estatus` llama `autoMergeReservaEnOrden()` al detectar flag `es_cliente_llego`. Copia `reserva_carta_items` y `reserva_menu_items` a `orden_carta_items` y `orden_menu_items`. Suma `cargo_modalidad` de la reserva a la orden. Solo actúa si hay orden activa (no pagada ni cancelada) en la misma mesa. `PATCH /api/menu/config/auto-merge` para configurarlo. Toggle en owner.html. 17 tests. |
| 2026-05-25 | Gap 5 — Precio por modalidad. Columnas `costo_tapper` y `tarifa_delivery` en `restaurantes`. Columna `cargo_modalidad` en `ordenes` y `reservas`. `POST /orders` y `POST /reservations` calculan y persisten el cargo según modalidad. `utils/totales.js` suma `cargo_modalidad` al total final. `menu.html`: desglose visual del cargo en tiempo real al cambiar radio de modalidad (drawer orden + resumen reserva). Panel Configuración del owner: inputs para configurar tapper y tarifa. 21 tests en `tests/precio-modalidad.test.js`, todos pasan. |
| 2026-05-25 | Gap 4 — Modalidades de pedido. Columna `modalidad` en `ordenes` y `reservas`. Columnas `para_llevar_activo`/`delivery_activo` en `restaurantes`. Validación backend: órdenes solo `en_local`/`para_llevar`; reservas admiten `delivery` si el restaurante lo tiene activo. Flujo de estados diferenciado: `para_llevar`/`delivery` saltan `es_entregado` (órdenes) y `es_cliente_llego` (reservas). Badges en Kanban y tarjetas. Selectores de modalidad en `menu.html` (radio buttons según URL con/sin `mesa`). Config en panel Configuración. 22 tests en `tests/modalidades.test.js`, todos pasan. |
| 2026-05-25 | Gap 3 — Auto-preparación de reservas + Web Push. Job en Node.js (setInterval 60s) detecta reservas confirmadas cuya `hora_llegada` entra en la ventana configurable (`minutos_preparacion`) y las mueve a `es_en_cocina`. Web Push API envía notificación al celular aunque la app esté cerrada. Tabla `push_subscriptions` en BD. `routes/push.js` (vapid-key, subscribe, unsubscribe). `utils/autoPreparacion.js`. `sw.js` maneja evento `push` + `notificationclick`. `config.js` + UI en owner.html para configurar minutos. 29 tests (17 auto-preparacion + 12 push-routes). |
| 2026-05-23 | ARCH-003 completo — Mobile CSS audit en owner.html. 3.1: `.btn`, `.btn-sm`, `.btn-danger/success/warn`, `.btn-logout` → `min-height:44px`. 3.2: `.nav-item`, `.tab`, `.hamburger` → `min-height/width:44px`. 3.3: todos los inputs/selects/textareas a 16px (CSS global + 8 inline en HTML + 2 en templates JS + pago-yape/plin tel). 3.4: `.card-title`, `.tab`, `.nav-item`, `.btn-sm`, `.btn-danger/success/warn`, `.order-meta`, `.order-items`, `.empty-text`, `.loading-text` → 14px. 3.5: 5 botones pill inline en menú (`font-size:10px;padding:1px`) → `font-size:14px;min-height:44px;display:inline-flex;align-items:center`. 3.6: `type="text"` agregado a 8 inputs sin tipo. ARCH-003 ✅ completo. |
| 2026-05-21 | REFACTOR-001 completo — estatus dinámicos con flags semánticos | **10 sesiones.** Elimina todos los hardcodes de nombres de estatus del sistema. Ahora el admin puede renombrar cualquier estatus y todo sigue funcionando. **BD:** columnas `es_inicial, es_pagado, es_cancelado, es_en_cocina, es_listo` en `estatus_orden`; `es_inicial, es_confirmada, es_cancelado, es_en_cocina, es_listo, es_cliente_llego, es_full` en `estatus_reserva`. **Backend:** `routes/orders.js` — `/activas` retorna flags; `PATCH /:id/estatus` acepta `{ flag }` además de `{ estatus }`; `GET /queue` usa flags; `PUT /:id` (cocina) usa `KITCHEN_FLAG_MAP` por flags. `routes/reservations.js` — `GET /` retorna flags, acepta `?flag=`; `PATCH /:id/estatus` acepta `{ flag }`. `routes/admin.js` — revenue queries usan `es_pagado=1`. `routes/reportes.js` — filtros cancelados usan `es_cancelado=0`. `routes/mesas.js`, `routes/public.js` — todos los filtros por flag. **Frontend `owner.html`:** `renderOrdenCard` y `renderReservaCard` usan flags para botones de acción; nuevas funciones `cambiarEstatusOrdenFlag()` y `cambiarEstatusReservaFlag()`; `loadReservasActivas` usa `?flag=`; `detectNuevasOrdenes/Reservas` y revenue calc usan flags. Eliminadas `confirmarPago()` y `confirmarPagoReserva()` (dead code). **Eliminados:** `utils/orderStatus.js` y `tests/order-status.test.js` (ya obsoletos). |
| 2026-05-18 | hora_llegada en reservas + asignación de mesa | Migración `hora_llegada TEXT DEFAULT NULL` en `reservas`. `routes/reservations.js`: campo en GET/POST + nuevo endpoint `PATCH /:id/mesa` (owner/mozo). `routes/public.js`: `hora_llegada` en POST /reservations. `routes/mesas.js`: función `esInminente()` filtra reservas confirmadas de hoy por ventana [-30min, +120min]. `menu.html`: input `<input type="time">` opcional en formulario de reserva. `owner.html`: muestra hora en tarjetas de reserva; selector de mesa inline para asignar desde el plano. Tests: `tests/hora-llegada.test.js` (18 casos), todos pasan. Suite completa: 127/127. |
