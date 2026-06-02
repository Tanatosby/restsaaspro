# Features — Menú Pro

## Pendientes

## Features para un plan Black o Premium
1. Que al momento de elegir sus platos le aparezcan opciones

2. Que en la sección para elegir los platos del menu de hoy (sección configurar menú, al momento que haga clic en el modal de selección de platos) no le aparezca lista de nombre, sino widgets del plato es decir nombre + foto del plato para seleccionar. 

## Features para un plan Black o Premium
1. Que al momento de elegir sus platos le aparezcan opciones de imágenes, es decir actualmente cuando se eligen los platos, no les aparecen opciones, sino que lo manda al navegador de su celular, sería posible que se le de búsqueda directa de imágenes? 

2. Que en la sección para elegir los platos del menu de hoy (sección configurar menú, al momento que haga clic en el modal de selección de platos) no le aparezca lista de nombre, sino widgets del plato es decir nombre + foto del plato para seleccionar. 

3. Panel para configurar el menú : Que cada menú creado se configure en un widget con su propio card con su título, una foto representativa del menú (opcional) y las acciones de configurar, eliminar o editar datos (Nombre y foto)
y si se hace clic en configurar que sea otro widget de configuración (modal) que permita añadir sección y luego se añada un card que diga "entrada" o cualquier sección que añada con botones : +plato y las acciones de obligatoria/opcional y el x de eliminar, ahí agregar el botón de actualizar y al momento de elegir el plato, se aplica el widget del punto 1. 


#### ~~Botón para descarga de PWA~~ ✅ Completado 2026-05-30 (owner + login)
~~Debería haber un botón dentro de la APP reconocible facilmente para descargar APP para la versión de navegador (¿Se puede?)~~

Sí se puede. Botón **"📲 Instalar app"** en el sidebar-footer de `owner.html` y bajo el formulario de `login.html`, vía el widget reutilizable `PwaInstall` (`public/js/widgets/pwa-install.js`): captura `beforeinstallprompt` (Android/Chrome/Edge) → diálogo nativo; en iOS/Safari abre instructivo "Añadir a pantalla de inicio"; se oculta si ya está instalada. Tests: `scripts/test-pwa-install.js` (E2E, ambos caminos). **La versión instalable del comensal queda como feature futura ↓.**

#### Menú instalable por restaurante (comensal) — futura
Que el comensal pueda instalar como app **el menú de su restaurante** y se actualice solo a diario (los datos se piden en vivo en cada apertura, así que el menú del día siempre está fresco). **Bloqueante:** el `manifest.json` es único y global con `start_url: /owner.html`; instalar desde `menu.html` abriría el panel del owner. Requiere un **manifest dinámico por restaurante** (endpoint que genere `start_url` al menú del local, `name: "Menú de [Restaurante]"`, colores del local) + botón "Instalar" en `menu.html`. Idealmente combinado con las URLs por slug ↓.

#### URLs por slug del restaurante (`menupro.tech/karinamenu`) — futura
Reemplazar `?restaurante=1&mesa=1` por una ruta bonita por restaurante. Alcance: columna `slug TEXT UNIQUE` en `restaurantes` (autogenerada del nombre, editable); ruta Express `GET /:slug` (registrada al final + lista de palabras reservadas: `login`/`admin`/`owner`/`menu`/`api`/`manuales`/`health`/`icons`/`css`/`js`/`uploads`…) que sirve `menu.html`; mesa en el path (`/karinamenu/5`); `menu.html` resuelve el restaurante con `/api/public/by-slug/:slug`. **Mantener compatibilidad** con los QR viejos (`?restaurante=ID`). Actualizar el generador de QR del owner, el link "Ver demo en vivo" de la landing y el seeder. Habilita el manifest dinámico del comensal ↑.


#### ~~Editar platos~~ ✅ Completado 2026-05-30
~~en owner.html, en platos de menú (verficar platos a la carta) que los nombres de los platos se puedan editar~~

Botón ✏️ por fila en **Platos de menú** (edita nombre + descripción) y **Platos a la carta** (edita nombre + precio + descripción + categoría), usando el widget reutilizable `FormModal`. Backend: `PATCH /api/menu/platos-menu/:id` y `PATCH /api/menu/platos-carta/:id` (scope por restaurante, categoría validada). Tests: `tests/editar-platos.test.js` (10) + E2E `scripts/test-editar-platos.js`.

#### ~~Scrolling en Menús del día~~ ✅ Resuelto 2026-05-30 (bug de layout, no de scroll)
~~El scrolling en Menús configurados no funciona o no existe. No se puede hacer scroll a la derecha en Menús configurados y aparece vista parcial (no aparece el botón de eliminar completo, por ejemplo)~~

Causa: `.card-header` era `display:flex` sin `flex-wrap` y `.card` tiene `overflow:hidden` → en 360px el grupo "Configurar secciones / Eliminar" se cortaba fuera de la card e inaccesible. Fix mobile-first: `flex-wrap: wrap` en `.card-header` (owner.css) + en las filas internas de sección/plato de `renderMenuCard`. Ahora los botones bajan de línea y quedan dentro de 360px (no se agrega scroll horizontal: la regla del proyecto es que todo entre sin overflow). Verificado a 390px en el E2E.



### Prioridad Alta — Arquitectura base (hacer ANTES de nuevas features)

#### ARCH-001 — Modularizar owner.html en ES Modules

El monolito `owner.html` (~2400 líneas) debe dividirse en módulos JS separados antes de agregar más features. Sin esto, cada feature nueva incrementa la deuda técnica. Cada paso deja la app funcionando igual — refactor puro, sin cambios de lógica ni UI.

**CSS:** todo el proyecto usa CSS custom (no Tailwind). Migración a Tailwind: progresiva en producción, módulo por módulo, después del lanzamiento.

| Paso | Módulo | Descripción | Estado |
|------|--------|-------------|--------|
| 1.1 | `public/css/owner.css` | Extraer `<style>` de owner.html → archivo CSS separado. `owner.html` usa `<link rel="stylesheet">` | ✅ Completo |
| 1.2 | `public/js/modules/utils.js` | Extraer funciones compartidas: `api()`, `toast()`, `esc()`, `fDate()`, `fDT()`, `badgeEst()`. Base de la que dependen todos los demás módulos. ~80 líneas | ✅ Completo 2026-05-22 |
| 1.3 | `public/js/modules/config.js` | Panel Configuración: foto portada, colores, QR, mesas, métodos de pago. Panel aislado, buen primer módulo de dominio. ~200 líneas | ✅ Completo 2026-05-22 |
| 1.4 | `public/js/modules/usuarios.js` | Panel Usuarios y permisos granulares. Sin dependencias de otros paneles. ~150 líneas | ✅ Completo 2026-05-22 |
| 1.5 | `public/js/modules/mesas.js` | Plano de mesas visual + polling 10s. Va antes que órdenes/reservas porque ambos lo usan. ~150 líneas | ✅ Completo 2026-05-22 |
| 1.6 | `public/js/modules/cocina.js` | Cola de cocina. `kitchen.html` se elimina — toda la lógica vive en `owner.html` via `cocina.js`. ~150 líneas | ✅ Completo 2026-05-22 |
| 1.7 | `public/js/modules/reservas.js` | Reservas activas e historial. ~350 líneas | ✅ Completo 2026-05-22 |
| 1.8 | `public/js/modules/ordenes.js` | Órdenes activas, historial, tab plano. El módulo más grande. ~450 líneas | ✅ Completo 2026-05-22 |
| 1.9 | `public/js/modules/reportes.js` | Métricas, gráficas Chart.js, descargas Excel. ~250 líneas | ✅ Completo 2026-05-23 |
| 1.10 | `public/js/modules/pedidos.js` | Vista unificada Cola del día (órdenes + reservas juntas). Depende de 1.7 y 1.8. | ✅ Completo 2026-05-23 |

Al completar 1.6: `kitchen.html` ya puede eliminarse — toda la funcionalidad del cocinero vive en `owner.html` panel "Cocina".

**Sub-pasos pendientes de 1.9:**

| Sub-paso | Qué | Estado |
|----------|-----|--------|
| 1.9a | `reportes.js` creado + `<script src>` en head | ✅ Completo 2026-05-22 |
| 1.9b | Eliminar del inline: `descargarFormatoDemanda` + MÓDULO 5 (demanda, loadReportes, ganancias) | ✅ Completo 2026-05-23 |
| 1.9c | Eliminar del inline: análisis de pedidos + `sc()` + `renderBarChart()` | ✅ Completo 2026-05-23 |

#### ARCH-002 — PWA: sistema instalable en celular

Los usuarios (owner, mozo, cocinero, cliente) deben poder instalar el sistema desde el navegador del celular como si fuera una app, sin Play Store ni App Store. Scope: `owner.html` y `menu.html` (`kitchen.html` se elimina en ARCH-001 paso 1.6).

**Beneficio inmediato:** owner y mozo instalan la app en su celular, acceden sin recordar la URL, sin barra del navegador.

| Paso | Qué | Descripción | Estado |
|------|-----|-------------|--------|
| 2.1 | `public/manifest.json` + links | Crear manifest con nombre, colores, `display: standalone`. Agregar `<link rel="manifest">` en `owner.html` y `menu.html`. Con esto Chrome ya muestra el botón "Instalar". ~25 líneas | ✅ Completo 2026-05-22 |
| 2.2 | `public/icons/` | Íconos 192×192 y 512×512 PNG. Sin ellos el manifest funciona pero Chrome muestra advertencia. Placeholders con emoji si no hay logo. | ✅ Completo 2026-05-22 |
| 2.3 | `public/sw.js` + registro | Service Worker básico que cachea assets estáticos (HTML, CSS, JS). Registrar en `owner.html` y `menu.html`. Sin este paso la app instala pero no funciona offline — aceptable para MVP. ~50 líneas | ✅ Completo 2026-05-22 |

#### ARCH-003 — Mobile CSS audit en owner.html

El sistema vive en celulares de gama media. Auditoría realizada 2026-05-23 — hallazgos documentados abajo.

**Criterios de cumplimiento:**
- Touch targets mínimo 44×44px (botones, tabs, nav items, hamburger)
- Font-size mínimo 16px en inputs/selects/textareas (evita zoom automático en iOS)
- Font-size mínimo 14px en texto de contenido interactivo (botones, nav, tabs, cards)
- Sin overflow horizontal en 360px de ancho mínimo
- `type` explícito en todos los inputs de texto

| Paso | Archivo(s) | Qué | Estado |
|------|-----------|-----|--------|
| 3.1 | `owner.css` | Touch targets — botones de acción: `.btn`, `.btn-sm`, `.btn-danger`, `.btn-success`, `.btn-warn`, `.btn-logout` → `min-height: 44px`. Son los botones usados en campo (tarjetas de orden/reserva). | ✅ Completo 2026-05-23 |
| 3.2 | `owner.css` | Touch targets — navegación: `.nav-item` → `min-height: 44px`; `.tab` → `min-height: 44px`; `.hamburger` → `min-width/height: 44px` | ✅ Completo 2026-05-23 |
| 3.3 | `owner.css` + `owner.html` | Font-size inputs 16px: `.field input/select/textarea` → 16px globalmente. Inputs/selects inline en HTML (configuración, menú) → 16px. Evita zoom automático iOS al hacer focus. | ✅ Completo 2026-05-23 |
| 3.4 | `owner.css` | Font-size contenido 14px: `.btn`, `.btn-sm`, `.nav-item`, `.tab`, `.card-title`, `.order-meta`, `.order-items`, `.loading-text`, `.empty-text` → 14px mínimo | ✅ Completo 2026-05-23 |
| 3.5 | `owner.html` (templates JS) | Botones inline en gestión de menú (`font-size:10px; padding:1px`): toggle activo/agotado/elegible/requerido. Agregar `min-height:44px` y padding correcto. Son los más críticos en tamaño actual (~12px de alto). | ✅ Completo 2026-05-23 |
| 3.6 | `owner.html` | Inputs sin `type="text"` explícito: `sec-nombre`, `cat-nombre`, `pm-nombre`, `pm-desc`, `pc-nombre`, `pc-desc`, `md-nombre`, `u-nombre`. Agregar `type="text"` y `autocomplete` apropiado. | ✅ Completo 2026-05-23 |

**Hallazgos por criterio:**

*Touch targets (< 44px):*
- `.btn` base: ~35px → falla
- `.btn-sm`, `.btn-danger`, `.btn-success`, `.btn-warn`: ~27px → falla grave
- `.tab`: ~35px → falla
- `.nav-item`: ~35px → falla
- `.hamburger`: ~26px → falla
- Botones inline en templates JS del menú (`font-size:10px; padding:1px`): < 14px → falla muy grave

*Font-size inputs (< 16px, dispara zoom iOS):*
- `.field input/select/textarea`: 13px
- Inputs inline en configuración/menú: 12–13px

*Font-size contenido (< 14px):*
- `.nav-item`, `.tab`, `.btn`: 13px
- `.btn-sm`, `.btn-danger/success/warn`: 12px
- `.card-title`, `.order-meta`, `.order-items`: 12–13px

*Overflow horizontal:* bajo riesgo — tablas tienen `table-wrap`. Solo `.inline-form .field { min-width: 140px }` puede romper en 360px → se revisa en 3.3.

*Inputs sin type:* `sec-nombre`, `cat-nombre`, `pm-nombre`, `pm-desc`, `pc-nombre`, `pc-desc`, `md-nombre`, `u-nombre` — sin `type="text"` explícito.

#### ~~ARCH-004 — Columna `modalidad` en reservas~~ ✅ Completado 2026-05-21
~~Agregar `modalidad TEXT DEFAULT 'en_local'`~~ — aplicado en `config/database.js`. Las reservas existentes quedan con `modalidad = 'en_local'`. Afecta la máquina de estados: para_llevar no tiene `es_cliente_llego`, va directo a `es_full` tras `es_listo`.

---

### Prioridad Alta — Features funcionales

#### ~~Flujo completo de estados: órdenes y reservas (Gap 1 + Gap 2)~~ ✅ Completado 2026-05-23
~~Ver `vision_negocio.md` sección 13 — Gaps 1 y 2.~~

#### ~~Auto-preparación X min antes (Gap 3)~~ ✅ Completado 2026-05-25
~~Ver `vision_negocio.md` sección 13 — Gap 3.~~

Job en servidor (`utils/autoPreparacion.js`) corre cada 60s. Detecta reservas `es_confirmada=1` con `hora_llegada` dentro de `minutos_preparacion` del restaurante y las mueve a `es_en_cocina`. Web Push notifica al celular aunque la app esté cerrada. `minutos_preparacion` configurable por restaurante (default 20 min) desde panel Configuración. Tabla `push_subscriptions`. Service worker maneja `push` + `notificationclick`. 29 tests (17 lógica + 12 suscripciones).

#### ~~Modalidad de pedido en reservas y órdenes (Gap 4)~~ ✅ Completado 2026-05-25
~~Agregar para_llevar / delivery / en_local.~~

Columnas `modalidad TEXT DEFAULT 'en_local'` en `ordenes` y `reservas`. Columnas `para_llevar_activo` y `delivery_activo` en `restaurantes`. Órdenes solo admiten `en_local`/`para_llevar` (delivery no aplica — el cliente está físicamente presente). Reservas admiten las 3 modalidades según configuración del restaurante. Flujo de estados diferenciado: `para_llevar`/`delivery` saltan `es_entregado` (órdenes) y `es_cliente_llego` (reservas). Badges visuales en Kanban, tarjetas de órdenes y reservas. Selectores de modalidad en `menu.html` (radio buttons según URL). Configuración activar/desactivar modalidades desde panel Configuración del owner. 22 tests en `tests/modalidades.test.js`.

#### ~~Vista unificada "Cola del día" — órdenes + reservas juntas (Gap 2)~~ ✅ Completado 2026-05-23

Panel Kanban en `owner.html` con 4 tabs: **Pendientes / En Cocina / Listos / Por cobrar**.
- Órdenes y reservas clasificadas por flag semántico en cada zona
- Badge con conteo por tab + badge total en nav
- Botones de acción rápida por tarjeta y zona (sin cambiar de panel)
- Polling automático cada 15 s
- Flag `es_entregado` agregado a órdenes: Listos → "🍽 Entregar" → Por cobrar → "💰 Cobrar"
- Reservas: "🍽 Entregado" = cliente llegó + sentó + plato entregado (un solo paso, evita olvido en hora pico)
- 15/15 casos de prueba manual aprobados

#### ~~Agregar para delivery / recoger / comer ahí en reservas~~ ✅ Cubierto por Gap 4 (modalidades) — 2026-05-25

#### ~~Bug: reservas con roles de usuario~~ ✅ Resuelto 2026-05-25
7 endpoints usaban `authorize('owner','mozo')` en vez de `authorizePermiso()`. Un cocinero con permiso `reservas_activas` recibía 403 al intentar confirmar/cambiar estatus. Ver ISS-012.

---

### ~~Prioridad Alta~~

#### ~~Landing page pública — menupro.tech~~ ✅ Completado 2026-05-28

`public/landing.html` — 7 secciones (Hero, Problema, Tutorial, Features, Quién lo hace, FAQ, CTA final).
Tailwind CDN + mobile-first. Ruta `/` en Express. Screenshots reutilizados del bot (sin capturas manuales).
CTA de WhatsApp con número `51921340185` y mensaje predeterminado. Sin precio en la página.

#### ~~Pruebas de carga (k6)~~ ✅ Completado 2026-05-27

Scripts en `scripts/k6-load-test.js` (30 VUs, rampa gradual) y `scripts/k6-stress-test.js` (hasta 500 VUs, punto de quiebre).
Análisis documentado en `deploy.md` sección 13. Resultado: degradación comienza ~150 VUs en laptop de desarrollo, ~80 VUs en VPS $6.

#### ~~Panel Admin — Descargas Excel por restaurante~~ ✅ Completado 2026-05-26

3 endpoints export en `routes/admin.js` (reutilizan `sumarGanancias`, `gananciasTimeline`, `clientesTimeline`):
- `GET /api/admin/restaurantes/:id/reportes/resumen/export` → Excel con 8 métricas (órdenes, reservas, ganancias total/mes/semana/hoy)
- `GET /api/admin/restaurantes/:id/reportes/clientes-timeline/export?intervalo=` → Excel curva de demanda
- `GET /api/admin/restaurantes/:id/reportes/ganancias/export?intervalo=` → Excel ganancias por período

Botones "⬇ Excel" en cada tab del drawer de stats. Mismo sistema de diseño que reportes.js (fila restaurante oscura, título naranja, encabezados crema, filas alternas blanco/azul, totales en pie). Archivo con nombre del restaurante incluido (`resumen_kacina_menu_2026-05-26.xlsx`).

#### ~~Panel Admin — Estadísticas por restaurante~~ ✅ Completado 2026-05-25

Panel lateral deslizable en `admin/dashboard.html` con 3 tabs: **Resumen / Demanda / Ganancias**.
- Botón 📊 Stats en cada fila de la tabla de restaurantes
- **Resumen:** stat cards (órdenes totales/hoy, reservas totales/hoy, ganancias total/mes/semana/hoy)
- **Demanda:** gráfica de línea Chart.js (órdenes + reservas por período), selector Día/Semana/Mes
- **Ganancias:** gráfica de línea Chart.js (ganancias en el tiempo), selector Día/Semana/Mes
- Helpers `sumarGanancias`, `gananciasTimeline`, `clientesTimeline` exportados desde `routes/reportes.js` y reutilizados en `routes/admin.js`
- 4 nuevos endpoints: `/restaurantes/:id/reportes/resumen`, `/clientes-timeline`, `/ganancias/resumen`, `/ganancias/timeline`

---

#### ~~Rediseño premium Opus 4.8 (carpeta `RestSaasPro`)~~ ✅ Completado 2026-05-29

Clon de `RestSaas` elevado a nivel "Opus 4.8": mejores gráficos, dark mode, micro-interacciones, sin cambios en backend.

| Fase | Qué | Resultado |
|------|-----|-----------|
| 0 | Clonar repo + `npm install` + baseline tests | 197/197 verde |
| 1 | Sistema de diseño en `public/css/owner.css`: tokens completos, dark mode `data-theme` + `prefers-color-scheme`, sombras en capas, skeletons, bottom-nav CSS listo | ✅ Cero ruptura — todos los selectores originales preservados |
| 2 | Owner panel: toggle 🌙/☀️ + anti-flash + bottom-nav móvil con 5 destinos (Cola/Cocina/Reservas/Menú/Más), espejo de permisos sidebar→bottom-nav, badges via `MutationObserver` | ✅ |
| 3 | Gráficos premium: `charts-theme.js` (degradados, fuente Lato, tooltips redondeados); endpoints **A1** `GET /api/reportes/kpis` (ticket promedio + tasa cancelación), **A2** `GET /api/reportes/hora-pico`, **A3** ya cubierto por A1 | ✅ Verificado en vivo |
| 4 | `menu.html` (cara del comensal): CSS extraído a `public/css/menu.css` (~736 líneas con tokens compartidos), dark mode auto sin toggle, hero con efecto ken-burns, header sticky con shrink al scroll, skeleton loaders, modal de foto al tap (`role="dialog"` + `aria-modal`), drawer del carrito repulido, código de reserva con animación `pulse-glow`, touch targets ≥44px garantizados, `prefers-reduced-motion` respetado | ✅ |
| 5 | Auditoría 360px (cero overflow, cero font-sizes problemáticos, 0 inputs sin type, 0 imgs sin alt) + accesibilidad mínima (modal con role/aria) + smoke test E2E (login → menú público → orden → reserva con código → consulta) + docs (`status.md`, `features.md`, `deploy.md`) | ✅ |
| 6 | Rediseño **"Pro Console"** del super admin (`admin/dashboard.html` + `admin/login.html`): nueva identidad **slate + índigo-violeta** distinta de la del owner; Inter + JetBrains Mono + Syne; sidebar con backdrop-blur y brand-dot animado; stat cards con gradient text + hover lift; tablas con datos mono tabular-nums; bottom-nav móvil de 5 destinos sin "Más"; skeletons en grid y tablas; charts con paleta nueva (`charts-theme-admin.js`); modales con `modalPop` + glow del accent; copy "Menú Pro" en lugar de "Restaurant SaaS" | ✅ |
| 7 | Rediseño premium de `landing.html` + `manuales.html` (cara pública del producto) | ✅ Completado 2026-05-29 |

---

#### Fase 7 ✅ COMPLETADA 2026-05-29 — Rediseño premium de landing.html + manuales.html

**Resultado:** landing + manuales repintados a terracota `#c8692a` (coherencia total con owner/menu). Ejecutado todo el TODO sin tocar copy ni screenshots.
- **7.1** Repaint terracota: `brand {light:#fdf0e8, DEFAULT:#c8692a, dark:#a0521e}` + var `--brand-glow`. 0 referencias a `#f97316` / `orange-*` (verificado en HTML servido). `bg-orange-50` → `bg-brand-light`.
- **7.3** Hero premium: `.gradient-mesh` (3 radiales terracota/violeta/azul con `mix-blend-mode:screen` + blur), `.hero-phone` flotante `rotate(-3deg)` + `@keyframes float 6s` con glow del producto detrás (`::before` blur 80px). Screenshot real del bot intacto dentro del frame.
- **7.4** CTA secundario **"Ver demo en vivo"** → `/menu?restaurante=1&mesa=1` en hero y CTA final. Documentado en `deploy.md §10.1` (restaurante demo sembrado para prod).
- **7.5** Animaciones on-scroll: `IntersectionObserver` añade `.in-view` a cada `<section class="reveal">`; stagger en cards vía `--i` + `@keyframes rise`. Fallback: si no hay IO o `reduce`, todo visible.
- **7.6** Nav glassmorphism (`rgba(17,24,39,0.7)` + `backdrop-filter blur(14px)`) + `.nav-shrunk` al pasar 80px (wiring `requestAnimationFrame`).
- **7.7** FAQ semántico: `<input type=checkbox>` → `<details>/<summary>` con chevron rotado en `[open]` y `@keyframes faqOpen`.
- **7.8** Cards Problema/Features/FAQ con `.card-lift` (`translateY(-3px)` + sombra en `:hover` y `:active` para feedback táctil).
- **7.9** Footer ampliado: mini-logo, WhatsApp icon, Contacto (mailto), Manuales, Ingresar, año dinámico, "Hecho en Perú 🇵🇪".
- **7.10** `manuales.html` repintado: paleta terracota, nav glassmorphism, tabs pill estilo owner (`box-shadow` glow al activarse), header con badge dinámico del rol ("Manual del cocinero…") + título en Playfair, glow radial de fondo, blockquote/links/imgs en terracota, footer con "← Volver". marked.js intacto.
- **7.11** Verificación en vivo (PORT 3310): `/` 200, `/manuales` 200, `/menu?restaurante=1&mesa=1` 200, 6/6 screenshots 200, 4/4 manuales por rol 200. HTML servido confirma terracota, gradient-mesh, hero-phone, IntersectionObserver, nav-shrunk, `<details>`, "Ver demo en vivo", reduced-motion, footer Contacto. **0 referencias residuales a `#f97316`.**
- `prefers-reduced-motion` respetado en ambos archivos.

<details><summary>Plan original (archivado)</summary>

##### Fase 7 (plan) — Rediseño premium de landing.html + manuales.html

**Contexto del estado actual:**
- `public/landing.html` (570 líneas) — 7 secciones (Nav, Hero, Problema, Tutorial, Features, Quién, FAQ, CTA, Footer) con Tailwind CDN, color `brand: #f97316` (orange-500), fuente Inter, screenshots reales del bot. Funcional pero **rompe consistencia de marca** con el owner panel (terracota `#c8692a`).
- `public/manuales.html` (222 líneas) — renderiza los 4 manuales `.md` con marked.js, mismo estilo Tailwind básico.

**Limitaciones detectadas:**
1. Paleta naranja brillante (`#f97316`) ≠ terracota del owner (`#c8692a`) — la landing se siente "otro producto"
2. Sin animaciones de entrada (todo aparece simultáneo)
3. Hero estático, phone frame quieto sobre `bg-gray-900` plano
4. **No hay demo viva** — el visitante solo ve screenshots, no puede tocar el menú real
5. FAQ con checkbox hack (`<input type="checkbox">`) — funciona pero sin semántica
6. Sin dark mode ni glassmorphism en nav
7. CTA único hacia WhatsApp, sin variante secundaria

**Objetivo Fase 7:** llevar la landing al mismo nivel que owner+menu+admin sin tocar copy, estructura de secciones, ni screenshots actuales del bot.

**TODO list propuesto:**

| # | Tarea | Detalle | Riesgo |
|---|-------|---------|--------|
| 7.1 | **Repaint a paleta terracota del owner** | Reemplazar `brand: '#f97316'` (Tailwind config inline) por `brand: '#c8692a'` con scale completa (`light: #fdf0e8`, `DEFAULT: #c8692a`, `dark: #a0521e`, `glow: rgba(200,105,42,0.28)`). Auditar todos los `bg-orange-*`, `text-orange-*`, `border-orange-*` y reemplazarlos por la nueva escala. | Bajo |
| 7.2 | **Mantener Tailwind CDN** (decisión) | CLAUDE.md permite Tailwind en módulos nuevos. Más rápido y la landing es marketing aislado. Si en el futuro se quiere extraer a CSS custom, queda como deuda baja. **No mezclar Tailwind con `public/css/owner.css` en este archivo** — landing es independiente. | Bajo |
| 7.3 | **Hero premium** | Añadir gradient mesh (3-4 radial-gradients superpuestos en violeta/terracota/azul con `mix-blend-mode: screen`), phone frame con `transform: rotate(-3deg) translateY(0)` + animación `float 6s ease-in-out infinite` (ya-yó subtle), glow del producto detrás del phone (`box-shadow` con blur 80px del color brand). **Mantener screenshot real del bot dentro del frame**, no mockup. | Medio |
| 7.4 | **CTA secundario "Ver demo en vivo"** | Botón nuevo al lado de "Probar gratis" en hero y CTA final. Link a `/menu?restaurante=1&mesa=1`. Asumir que en producción habrá un restaurante demo (slug `demo` o id sembrado por seeder de prod). En dev usa el id=1 del seeder. **Importante**: documentar en `deploy.md §10` que hay que crear un restaurante "demo" con menú/carta pre-sembrado para que el botón funcione en prod. | Bajo |
| 7.5 | **Animaciones on-scroll** | Bloque `<script>` con `IntersectionObserver` que añade clase `.in-view` a cada sección al entrar en viewport. CSS: `section { opacity: 0; transform: translateY(20px); transition: .6s cubic-bezier(.16,1,.3,1) }` `section.in-view { opacity: 1; transform: translateY(0) }`. Stagger entre tarjetas usando `transition-delay: var(--i, 0) * .08s`. Respetar `prefers-reduced-motion`. | Bajo |
| 7.6 | **Nav glassmorphism + shrink** | `bg-gray-900/95` → `bg-gray-900/70 backdrop-blur-md`. Al pasar 80px de scroll, agregar clase `.nav-shrunk` que reduzca padding vertical y opacidad del border. Wiring con `requestAnimationFrame`. | Bajo |
| 7.7 | **FAQ con `<details>`** | Reemplazar el truco `<input type=checkbox>` + `~` selector por `<details><summary>…</summary>…</details>` semántico. Custom CSS: `summary::-webkit-details-marker { display: none }`, chevron con `details[open] summary .faq-chevron { transform: rotate(180deg) }`. Animación de altura via `interpolate-size: allow-keywords` (con fallback). | Bajo |
| 7.8 | **Tarjetas con hover lift** | Las cards de Features, Tutorial y Problema reciben `transition: transform .25s, box-shadow .25s; :hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.10) }`. Touch-friendly: el lift también se activa en `:active` para feedback en mobile. | Bajo |
| 7.9 | **Footer con socials + branding** | Agregar bloque con WhatsApp icon link, email de contacto, copyright, y mini-logo. Tono `bg-gray-950 text-gray-500`. | Bajo |
| 7.10 | **Repulir `manuales.html`** | Misma paleta terracota. Tabs de rol con la estética del owner (pills con `box-shadow accent-glow` al activarse). Hero compacto con nombre del manual seleccionado en Playfair. Botón "← Volver" link a `/`. Mantener marked.js render del .md. | Bajo |
| 7.11 | **Verificación en vivo** | Levantar server, abrir `/` en viewport 360px y 1280px, scroll completo, click en "Demo en vivo", abrir `/manuales`, click en cada tab de rol. Verificar que `prefers-reduced-motion` desactiva animaciones. | Bajo |
| 7.12 | **Docs Fase 7** | Anotar en `status.md` con detalle de cambios + marcar Fase 7 ✅ en tabla. Actualizar tabla en `features.md`. | Bajo |

**Decisiones clave para la próxima sesión:**
1. **Tailwind se queda** en la landing (decisión simple, no extraer a CSS custom).
2. **No tocar copy** — Hero, secciones, FAQ y CTA text quedan idénticos.
3. **No regenerar screenshots** — los del bot actuales son auténticos y suficientes.
4. **El restaurante "demo"** que necesita "Ver demo en vivo" en producción se documenta como tarea operativa en `deploy.md §10` (crear restaurante con slug `demo`, sembrar menú simple, dejar mesa 1 fija).
5. **Coherencia con admin** — el admin tiene su propia identidad (índigo-violeta) que es intencional. La landing usa terracota porque la audiencia es el owner del restaurante (no el operador).

**Tiempo estimado:** 1 sesión (~2 horas) si se sigue el TODO al pie de la letra.

**Bloqueante:** nada. Es polish puro de cara pública. No afecta deploy del backend.

**Fix paralelo durante Fase 5:** desactivado `upgrade-insecure-requests` en CSP de Helmet (`app.js`) — Chrome trataba IP de LAN como insegura y rompía POSTs en HTTP. Localhost no se veía afectado porque es secure context. Documentado en `deploy.md §8.2` con nota para reactivar en producción HTTPS.

**Setup desde laptop nueva (post-clone):**
1. `npm install` + `npx playwright install chromium` (si vas a correr el bot)
2. Generar `.env` con VAPID keys: `node -e "const w=require('web-push');console.log(w.generateVAPIDKeys())"` + `JWT_SECRET` aleatorio
3. Bootstrap inicial: script inline que crea `restaurantes id=1` (Crisolito) + admin `admin@local / Admin2026!`
4. `npm run bot:setup` → usuarios `owner@bot.com / cocina@bot.com / mozo@bot.com` (pass `BotMenuPro2026!`)
5. `node scripts/seed-demo-data.js` → menú del día + carta + mesas + 6 reservas y 5 órdenes en todos los flags del kanban (idempotente para el día actual)

</details>

---

### Prioridad Media

#### ~~Sección `/manuales` en la landing page~~ ✅ Completado 2026-05-28

~~Los 4 manuales `.md` generados por el bot deben renderizarse como páginas web en la landing.~~

- `public/manuales.html` — 4 tabs (Dueño, Cocinero, Mozo, Cliente), renderizado client-side con `marked.js` CDN
- Endpoint `GET /api/manuales/:rol` sirve el `.md` correspondiente
- Screenshots servidos en `/bot-screenshots/` desde `landing/bot/output/screenshots/`
- Mobile-first, mismo sistema de diseño de la landing
- Enlace en nav y footer de `landing.html`
- **Pendiente futura:** enlace desde botón `?` dentro de la app

#### Refactorización: JS inline → archivos externos
Actualmente todo el JavaScript de `owner.html`, `menu.html`, `kitchen.html` y `admin/dashboard.html` está inline dentro del HTML. Moverlo a archivos `.js` separados mejora mantenibilidad y rendimiento, pero **no es un tema de seguridad**.

##### Por qué NO es un problema de seguridad
El JS que corre en el navegador siempre es público — inline o en archivo separado, el usuario puede verlo igual en DevTools. Las rutas de la API que aparecen en el código tampoco son un secreto: la seguridad real viene del backend (JWT en cookie httpOnly + `authorizePermiso()` en cada endpoint). Lo que sí sería un problema es poner secrets en el frontend (como una `secret_key` de Culqi), y eso debe evitarse siempre independientemente de dónde esté el JS.

##### Por qué SÍ vale hacerlo (mantenibilidad y rendimiento)
- Los archivos `.js` externos los cachea el navegador → menos datos transferidos en recargas
- HTML más limpio y legible
- Posibilidad de usar un bundler (Vite, esbuild) en el futuro para minificación y tree-shaking
- Facilita testing unitario de funciones JS sin cargar el HTML completo
- Prepara el terreno para migrar a un framework (Vue, React) si el proyecto crece

##### Alcance
- Extraer el bloque `<script>` de cada HTML a su archivo par: `owner.js`, `menu.js`, `kitchen.js`, `admin-dashboard.js`
- Servir como estáticos desde `public/js/`
- Sin cambios en backend ni en lógica — es refactorización pura
- Complejidad: media (mecánica pero extensa — los scripts son grandes)
- **Hacer al final**, antes de producción, una vez que las features estén estables

#### Inventario / control de stock
Permitir al owner marcar un plato de carta como "sin stock" (activo=0 ya existe, pero no hay flujo claro ni alerta). Extender a un sistema básico de stock por plato: cantidad disponible, alerta cuando llega a cero, ocultado automático del menú QR.
- **Alcance:** columna `stock INTEGER DEFAULT NULL` en `platos_carta`, endpoint PATCH, indicador en `owner.html` y ocultado condicional en `menu.html`


---

### Prioridad Baja

#### Pagos integrados (Yape, Plin y tarjeta)
Permitir que los clientes paguen su orden o reserva directamente desde `menu.html`, y que el owner gestione y confirme los pagos desde `owner.html`. Convierte el sistema en un POS completo adaptado al mercado peruano.

##### Modelo de funcionamiento
Cada restaurante configura sus propios datos de cobro en el panel de Configuración. El cliente, al confirmar su pedido en `menu.html`, ve las opciones de pago habilitadas por ese restaurante y elige cómo pagar.

##### Métodos de pago

###### Yape
- **Cómo funciona:** El cliente ordena desde su propio celular, así que mostrarle un QR en pantalla no sirve (no puede escanearse a sí mismo). La solución correcta es un **botón "Pagar con Yape"** que genera un deep link del tipo `https://yape.com.pe/cobrar?phone=9XXXXXXXX` — al tocarlo, el celular abre la app de Yape directamente con el número del restaurante pre-cargado. El cliente solo ingresa el monto y confirma. El QR como imagen solo tiene sentido en desktop (donde el cliente sí puede escanearlo con su celular) o impreso físicamente en la mesa.
- **Configuración por restaurante:**
  - Número de teléfono Yape (campo `yape_telefono TEXT`) — con esto se genera el link automáticamente, sin subir nada
  - Toggle "Habilitar Yape" (`yape_activo INTEGER DEFAULT 0`)
  - Opcional: nombre a mostrar en el botón (ej. "Yapea a El Rincón")
- **Flujo simple (sin gateway):** `menu.html` muestra botón "Pagar con Yape" → abre app → cliente paga → toca "Ya pagué" en `menu.html` → estado pasa a `pago_enviado` → owner confirma manualmente en `owner.html`. Estado: `pendiente_pago → pago_enviado → pago_confirmado`.
- **Flujo avanzado (con gateway):** Culqi o Nuvei confirman el pago automáticamente via webhook. Requiere cuenta de negocio en el gateway.

###### Plin
- **Cómo funciona:** Igual que Yape — deep link que abre la app de Plin en el celular del cliente. Soportado por BBVA, Scotiabank e Interbank. El link es del tipo `plin://pay?phone=9XXXXXXXX` o similar (cada banco puede variar; el flujo más robusto es mostrar el número y un botón que intente abrir la app con fallback a mostrar el número copiable).
- **Configuración por restaurante:**
  - Número de teléfono Plin (campo `plin_telefono TEXT`)
  - Toggle "Habilitar Plin" (`plin_activo INTEGER DEFAULT 0`)
- **Flujo:** idéntico a Yape (manual o via gateway Culqi/Nuvei).

###### Tarjeta (débito/crédito)
- **Cómo funciona:** Integración con un gateway de pagos peruano que provee el checkout embebido.
- **Gateway recomendado:** [Culqi](https://culqi.com) — gateway peruano, soporta Visa/MC/Amex/Diners + Yape + Plin. Comisión: ~3.44% + IGV. Alternativas: Izipay, Mercado Pago Perú.
- **Configuración por restaurante:**
  - `culqi_public_key TEXT` — clave pública del restaurante en Culqi (el owner la obtiene de su cuenta Culqi)
  - `culqi_secret_key TEXT` — clave secreta (se almacena encriptada, nunca se expone al frontend)
  - Toggle "Habilitar tarjeta" (`tarjeta_activa INTEGER DEFAULT 0`)
- **Flujo:** Al pagar, `menu.html` carga el widget de Culqi con la `public_key` del restaurante. El token de pago se envía al backend, que llama a la API de Culqi con la `secret_key` para cobrar. Culqi confirma o rechaza. El backend actualiza el estado de la orden.

##### Cambios en base de datos
```sql
ALTER TABLE restaurantes ADD COLUMN yape_activo      INTEGER DEFAULT 0;
ALTER TABLE restaurantes ADD COLUMN yape_telefono    TEXT    DEFAULT NULL;  -- el link se genera en frontend: https://yape.com.pe/cobrar?phone=XXXX
ALTER TABLE restaurantes ADD COLUMN plin_activo      INTEGER DEFAULT 0;
ALTER TABLE restaurantes ADD COLUMN plin_telefono    TEXT    DEFAULT NULL;
ALTER TABLE restaurantes ADD COLUMN tarjeta_activa   INTEGER DEFAULT 0;
ALTER TABLE restaurantes ADD COLUMN culqi_public_key TEXT    DEFAULT NULL;
ALTER TABLE restaurantes ADD COLUMN culqi_secret_key TEXT    DEFAULT NULL;  -- encriptada, nunca al frontend

ALTER TABLE ordenes   ADD COLUMN metodo_pago TEXT DEFAULT NULL;  -- 'yape'|'plin'|'tarjeta'
ALTER TABLE ordenes   ADD COLUMN estado_pago  TEXT DEFAULT NULL;  -- 'pendiente'|'enviado'|'confirmado'|'rechazado'
ALTER TABLE reservas  ADD COLUMN metodo_pago TEXT DEFAULT NULL;
ALTER TABLE reservas  ADD COLUMN estado_pago  TEXT DEFAULT NULL;
```
 
##### Cambios en backend
- `routes/menu.js` (o nuevo `routes/pagos.js`):
  - `GET /api/config/pagos` — devuelve métodos activos + public_key de Culqi + teléfonos/QRs (sin secret_key)
  - `POST /api/pagos/culqi` — recibe token Culqi del frontend, llama a API de Culqi con secret_key, actualiza `estado_pago`
  - `PATCH /api/orders/:id/pago` — owner confirma pago Yape/Plin manualmente
- Encriptación de `culqi_secret_key`: usar `crypto.createCipheriv` con clave en variable de entorno `ENCRYPT_KEY`

##### Cambios en frontend
- **`owner.html` → Panel Configuración → sub-sección "Métodos de pago":**
  - Toggle + número de teléfono + botón subir foto QR para Yape
  - Toggle + número de teléfono + botón subir foto QR para Plin
  - Toggle + campo "Clave pública Culqi" + campo "Clave secreta Culqi" (tipo password) para tarjeta
  - Indicador visual de qué métodos están activos
- **`menu.html` → Paso de pago (nuevo paso tras confirmar orden):**
  - Si hay métodos configurados: mostrar opciones (tabs Yape / Plin / Tarjeta)
  - Yape/Plin: mostrar QR (imagen) + número de teléfono + botón "Ya pagué" (marca `estado_pago = 'enviado'`)
  - Tarjeta: cargar widget de Culqi con `public_key` del restaurante
- **`owner.html` → Tarjeta de orden/reserva:**
  - Badge de estado de pago (`pendiente_pago`, `pago_enviado`, `confirmado`, `rechazado`)
  - Botón "Confirmar pago" para Yape/Plin pendientes
  - Historial básico de pagos filtrable por fecha en panel Órdenes > Historial

##### Complejidad y riesgos
- **Alta complejidad total.** Dividir en 3 fases:
  1. **Fase 1 — Configuración y flujo manual Yape/Plin** (complejidad media): solo UI de config + mostrar QR/teléfono en menu.html + confirmación manual por el owner. Sin gateway. Funciona para el 80% de los restaurantes peruanos hoy.
  2. **Fase 2 — Tarjeta vía Culqi** (complejidad alta): integración real con API, encriptación de secret_key, webhooks de confirmación.
  3. **Fase 3 — Confirmación automática Yape/Plin vía Culqi/Nuvei** (complejidad muy alta): requiere cuenta de negocio en el gateway por restaurante, lo cual puede ser un bloqueador comercial.
- **Riesgo de seguridad:** las `secret_key` de Culqi nunca deben exponerse. Encriptarlas en BD y solo usarlas server-side.
- **Recomendación:** empezar por Fase 1 — es lo que el 80% de los restaurantes peruanos necesita hoy y no requiere integraciones externas.

---

##### Estado actual — Fase 1 parcialmente implementada (2026-05-20)

La Fase 1 está en desarrollo. Lo que ya existe en el código:

**Base de datos (ya migrado):**
- `restaurantes`: columnas `yape_activo`, `yape_telefono`, `plin_activo`, `plin_telefono`, `efectivo_activo`
- `ordenes`: columnas `metodo_pago`, `estado_pago`, `comprobante_url`
- `reservas`: columnas `metodo_pago`, `estado_pago`, `comprobante_url`

**Backend (ya implementado):**
- `GET /api/public/restaurante/:id` → devuelve `pagos: { yape, plin, efectivo }` al cliente
- `PATCH /api/public/pago/orden/:id` → cliente registra pago con foto comprobante (multer)
- `PATCH /api/public/pago/reserva/:id` → ídem para reservas
- `PATCH /api/orders/:id/confirmar-pago` → owner confirma pago de orden
- `PATCH /api/reservations/:id/confirmar-pago` → owner confirma pago de reserva
- Panel Configuración en `owner.html`: toggles Yape/Plin/Efectivo + teléfonos

**Frontend `menu.html` (ya implementado):**
- Paso de pago tras confirmar orden/reserva: botones Yape / Plin / Efectivo
- Deep link a Yape: `https://yape.com.pe/cobrar?phone=XXXX`
- Upload de foto comprobante (opcional) + preview
- Botón "Ya pagué" → `PATCH /api/public/pago/...`

**Frontend `owner.html` (ya implementado):**
- Badge visual de método de pago + miniatura de comprobante en tarjetas de orden y reserva
- ~~Botón "✓ Confirmar pago" en tarjetas de orden~~ — eliminado en REFACTOR-001; `estado_pago='pagado'` se setea automáticamente al marcar `es_pagado`
- ~~Botón "✓ Confirmar pago" en tarjetas de reserva~~ — eliminado en REFACTOR-001; `estado_pago='pagado'` se setea automáticamente al marcar `es_full`

---

##### Bugs encontrados en Fase 1 (pendientes de fix)

**Bug 1 — `fileFilter` de multer demasiado restrictivo (`routes/public.js:25-28`)**
- Solo acepta `image/jpeg`, `image/png`, `image/webp`
- Dispositivos iOS/Android pueden enviar `image/heic`, `image/heif`, `image/jpg` u otros
- Resultado: multer rechaza la foto → error 400 → el cliente no puede enviar el comprobante
- Solo efectivo funciona porque no sube archivo y multer nunca aplica el fileFilter
- **Fix:** cambiar a `file.mimetype.startsWith('image/')` para aceptar cualquier imagen

**Bug 2 — "Confirmar pago" en reservas es redundante con el estatus full** ✅ RESUELTO 2026-05-21
- ~~El botón aparece cuando `estado_pago = 'enviado'`, pero el owner ya cierra la reserva moviéndola al estatus `es_full`~~
- **Fix aplicado:** botón eliminado de tarjetas de reserva y de tarjetas de orden en `owner.html`. Al pasar a `es_full` (reservas) o `es_pagado` (órdenes), el backend setea `estado_pago = 'pagado'` automáticamente.

---

##### Prerrequisito crítico — Refactor de estatus dinámicos ✅ COMPLETADO 2026-05-21

> ~~Este refactor es BLOQUEANTE para que los pagos funcionen correctamente con estatus personalizados. Sin él, renombrar cualquier estatus desde el super admin rompe el sistema de pagos, historial y reportes.~~
>
> **Resuelto.** El sistema ahora usa flags semánticos en todas partes. Ver [REFACTOR-001](issues/REFACTOR-001-estatus-dinamicos.md).

**Concepto central:**
- `es_full` (reservas) / `es_pagado` (órdenes) = el owner confirmó el cobro → el registro pasa a **historial**
- Mientras no esté en ese estatus, la orden/reserva sigue en la **vista activa** (el dueño aún tiene que cobrarla)
- Los nombres de los estatus son libres; el backend usa **flags**, no nombres de texto

**Flags a agregar a `estatus_orden` (5 columnas nuevas):**
```sql
es_inicial   INTEGER DEFAULT 0  -- el "pendiente"   → al crear una orden/reserva
es_pagado    INTEGER DEFAULT 0  -- el "completado"  → owner cobra, cierra, va a historial
es_cancelado INTEGER DEFAULT 0  -- el "cancelado"   → va a historial sin cobro
es_en_cocina INTEGER DEFAULT 0  -- el "preparando"  → cocina lo está trabajando
es_listo     INTEGER DEFAULT 0  -- el "entregado"   → en mesa, pendiente de cobro
```

**Flags a agregar a `estatus_reserva` (3 columnas nuevas, `es_full` ya existe):**
```sql
es_inicial   INTEGER DEFAULT 0  -- el "pendiente"   → al crear una reserva
es_cancelado INTEGER DEFAULT 0  -- el "cancelada"   → va a historial sin cobro
es_confirmada INTEGER DEFAULT 0 -- el "confirmada"  → aparece en el plano de mesas
```

**Mapa completo de hardcodes a reemplazar:**

| Archivo | Línea | Hardcode actual | Reemplazar por |
|---------|-------|-----------------|----------------|
| `routes/public.js` | 221 | `nombre = 'pendiente'` (órdenes) | `es_inicial = 1` |
| `routes/public.js` | 318 | `nombre = 'pendiente'` (reservas) | `es_inicial = 1` |
| `routes/orders.js` | 44 | `IN ('pendiente','preparando','entregando')` | `es_pagado=0 AND es_cancelado=0` |
| `routes/orders.js` | 98 | `IN ('pendiente','preparando')` | `es_pagado=0 AND es_cancelado=0` |
| `routes/orders.js` | 266 | `nombre = 'pendiente'` (nueva orden desde owner) | `es_inicial = 1` |
| `routes/orders.js` | 332 | `ESTATUS_VALIDOS` array hardcodeado | validar contra BD dinámica |
| `routes/orders.js` | 346 | `completado \|\| cancelado` (inmutabilidad) | `es_pagado=1 OR es_cancelado=1` |
| `routes/orders.js` | 353 | `estatus === 'completado'` (calcular total) | `nuevoEstatus.es_pagado = 1` |
| `routes/orders.js` | 607 | `completado \|\| cancelado` (kitchen check) | `es_pagado=1 OR es_cancelado=1` |
| `routes/reservations.js` | 165 | `nombre = 'pendiente'` | `es_inicial = 1` |
| `routes/reservations.js` | 226 | `completada \|\| cancelada` | `es_full=1 OR es_cancelado=1` |
| `routes/mesas.js` | 62 | `IN ('pendiente','preparando','entregando')` | `es_pagado=0 AND es_cancelado=0` |
| `routes/mesas.js` | 73 | `er.nombre = 'confirmada'` | `er.es_confirmada = 1` |
| `routes/admin.js` | 28, 43, 83 | `eo.nombre = 'completado'` (revenue) | `eo.es_pagado = 1` |
| `routes/reportes.js` | 21, 65, 294, 317 | `e.nombre != 'cancelado'` | `e.es_cancelado = 0` |
| `config/database.js` | 349 | `e.nombre = 'completado'` (backfill) | `e.es_pagado = 1` |
| `utils/orderStatus.js` | — | mapeo `cooking→preparando`, `done→entregando` | usar flags `es_en_cocina`, `es_listo` |

**Admin — endpoints nuevos necesarios para `estatus_orden`:**
- `PATCH /api/admin/estatus-orden/:id/set-pagado` — marca este estatus como el pagado (único)
- `PATCH /api/admin/estatus-orden/:id/set-cancelado` — marca como cancelado (único)
- `PATCH /api/admin/estatus-orden/:id/set-inicial` — marca como inicial (único)
- `PATCH /api/admin/estatus-orden/:id/set-en-cocina` — marca como "en cocina" (único)
- `PATCH /api/admin/estatus-orden/:id/set-listo` — marca como "listo/entregado" (único)
- Para `estatus_reserva`: agregar `set-inicial`, `set-cancelado`, `set-confirmada` (equivalentes al ya existente `set-full`)

**Archivos a tocar:** `config/database.js`, `routes/orders.js`, `routes/reservations.js`, `routes/public.js`, `routes/mesas.js`, `routes/admin.js`, `routes/reportes.js`, `utils/orderStatus.js` — total ~20 cambios en 8 archivos.

#### Notificaciones WhatsApp (owner, staff y cliente)
Enviar mensajes automáticos de WhatsApp al dueño, al staff seleccionado y/o al cliente según el evento. El owner activa/desactiva cada tipo de notificación desde el panel de Configuración.

##### Casos de uso
| Evento | Destinatario | Mensaje sugerido |
|--------|-------------|-----------------|
| Nueva orden creada | Owner / cocinero asignado | "🍽 Nueva orden #123 — Mesa 4 — Juan Pérez" |
| Nueva reserva creada | Owner | "📅 Nueva reserva #45 — 3 personas — Viernes 23/05 20:00 — María López" |
| Reserva confirmada | Cliente | "✅ Tu reserva fue confirmada. Te esperamos el viernes 23/05 a las 20:00 hs." |
| Reserva cancelada | Cliente | "❌ Lamentamos informarte que tu reserva fue cancelada. Contáctanos para reprogramar." |
| Orden completada (pago) | Owner | "💰 Orden #123 completada — Total: S/ 85.00" |

##### Infraestructura requerida
- **Proveedor:** Twilio WhatsApp API (necesita número de WhatsApp Business aprobado por Meta) o WhatsApp Business Cloud API directa (Meta for Developers). La Cloud API directa es gratuita hasta cierto volumen mensual; Twilio cobra por mensaje pero simplifica la integración.
- **Cuenta y aprobación:** El dueño del restaurante necesita un número de WhatsApp dedicado verificado. Meta puede tardar días en aprobar el número y las plantillas de mensajes.
- **Plantillas (templates):** WhatsApp Business solo permite enviar mensajes iniciados por la empresa si usan plantillas pre-aprobadas por Meta. Hay que crear y registrar cada plantilla de mensaje en el Business Manager.

##### Cambios en base de datos
- Nueva tabla `notificaciones_config` (o columna JSON `notif_config` en `restaurantes`):
  ```
  id_restaurante, evento, activo, destinatarios (owner|staff|cliente), telefono_owner
  ```
- Columna `telefono` en `usuarios` para los staffs que reciben notificaciones.

##### Cambios en backend
- Nuevo `utils/whatsapp.js` con función `enviarWpp(telefono, template, params)` que llama a la API de Twilio/Meta.
- Variables de entorno: `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_WPP_FROM` (o `META_WPP_TOKEN`, `META_PHONE_ID`).
- Trigger en `POST /api/orders` → notificar al owner/cocinero si `activo = 1`.
- Trigger en `POST /api/reservations` → notificar al owner.
- Trigger en `PATCH /api/reservations/:id` cuando cambia a `confirmada` → notificar al cliente.
- Trigger en `PATCH /api/reservations/:id` cuando cambia a `cancelada` → notificar al cliente.
- Manejo de errores silencioso: si el envío falla, la orden/reserva igual se crea; el error solo se loguea.

##### Cambios en frontend (`owner.html`)
- Sub-panel "Notificaciones" dentro del panel Configuración.
- Toggle por evento (nueva orden, nueva reserva, reserva confirmada, etc.).
- Input para ingresar el número de WhatsApp del owner (con prefijo de país).
- Selección de qué usuarios del staff reciben notificaciones de órdenes.
- Indicador de estado de la integración (configurada / sin configurar).

##### Complejidad y riesgos
- Alta complejidad total: cuenta externa, aprobación de Meta, plantillas por evento, manejo de errores de red, costos por mensaje, número de teléfono dedicado.
- Riesgo de latencia: las llamadas a la API de Twilio/Meta deben hacerse de forma asíncrona para no bloquear la respuesta al cliente.
- Recomendación de implementación: empezar con notificación de "nueva orden al owner" únicamente, probar el flujo completo, y luego extender a los demás eventos.

#### Descuentos y promociones
Permite aplicar descuentos porcentuales o fijos a una orden antes de cerrarla (happy hour, cupones, etc.).
- **Alcance:** campo `descuento` en `ordenes`/`reservas`, lógica de recalculo en `utils/totales.js`, UI en vista del mozo/owner

---

## Roadmap — Features propuestas 2026

### Tier A — Alto impacto, bajo esfuerzo

#### ~~A1 — Ticket promedio por restaurante~~ ✅ Completado 2026-05-29 (Fase 3 Opus 4.8)
Implementado en `GET /api/reportes/kpis` (panel owner). Stat-card "Ticket promedio" en Reportes muestra `SUM(total) / COUNT(*)` combinado de órdenes + reservas pagadas/completas del mes corriente. Pendiente: replicar también en el drawer admin por restaurante (queda como mejora menor).

#### ~~A2 — Hora pico de demanda~~ ✅ Completado 2026-05-29 (Fase 3 Opus 4.8)
Implementado en `GET /api/reportes/hora-pico` (panel owner). Gráfico de barras apiladas por hora del día (zona Lima UTC-5), órdenes + reservas, agrupado con `strftime('%H', created_at, '-5 hours')`. Card "Hora pico" en panel Reportes. Pendiente: replicar también en el drawer admin (mejora menor).

#### ~~A3 — Tasa de cancelación~~ ✅ Completado 2026-05-29 (Fase 3 Opus 4.8)
Implementado en el mismo endpoint `GET /api/reportes/kpis`: devuelve `tasa_cancelacion` y `total_pedidos_mes`. Stat-card "Tasa de cancelación" en Reportes con código de color (rojo > 15%, amarillo 8-15%, verde < 8%). Pendiente: alerta visual en drawer admin si supera el 15% (mejora menor).

#### A4 — Platos más vendidos en admin
El owner ya tiene el análisis de pedidos por plato. El admin debería poder verlo por restaurante desde el drawer, para entender qué producto mueve a cada negocio.
- **Backend:** reutilizar `contarPedidosPorPlato` de `reportes.js` con ID explícito, nuevo endpoint admin
- **Frontend:** tab adicional "Platos" en el drawer de stats del admin
- **Complejidad:** baja (reutiliza lógica existente)

---

### Tier B — Impacto medio, esfuerzo medio

#### B1 — CRM básico por teléfono
Historial de un cliente (número de teléfono) en el sistema: cuántas veces ha venido, cuánto ha gastado, qué platos pide. Accesible desde la tarjeta de reserva/orden con un botón "Ver cliente" cuando hay teléfono registrado.
- **Backend:** nuevo endpoint `GET /api/clientes/:telefono` que agrega reservas + órdenes por teléfono
- **Frontend:** modal/drawer en `owner.html` con historial del cliente
- **Complejidad:** media (query multi-tabla, UI nueva)

#### B2 — Programación de menús por semana
El owner prepara los menús de los próximos días desde hoy (lunes configura lunes-viernes). Hoy solo existe el menú del día activo; no hay forma de preparar el del mañana sin cambiar la fecha.
- **Backend:** el campo `dia` en `menus_dia` ya existe — agregar vista de calendario semanal en owner.html y permitir crear menús para fechas futuras
- **Frontend:** tab "Semana" en panel Menú del día; mini-calendario de 7 días
- **Complejidad:** media (cambio de UX, sin cambios de schema)

#### B3 — Comparativa entre restaurantes (admin)
Tabla de ranking en el admin mostrando todos los restaurantes ordenados por revenue, órdenes, ticket promedio o tasa de cancelación. Útil para ver quién crece y quién está estancado o necesita atención.
- **Backend:** extender `GET /api/admin/restaurantes` con columnas de ticket promedio y tasa cancelación
- **Frontend:** cabeceras de tabla clickeables para ordenar; indicadores visuales de tendencia
- **Complejidad:** media (sorting en frontend, queries adicionales en backend)

#### B4 — Cambio de contraseña propio ✅ Completado 2026-05-26
`PATCH /api/auth/me/password` — verifica contraseña actual con bcrypt. Modal en sidebar footer de `owner.html` con 3 campos (actual, nueva, confirmar). Aplica a todos los roles.

#### B4b — Recuperación de contraseña (olvidé mi contraseña)

**Estado actual — sin self-service:**

| Caso | Solución disponible hoy |
|------|------------------------|
| Mozo/cocinero olvidó su contraseña | El **owner** la resetea desde panel Usuarios → botón "Cambiar contraseña" |
| Owner olvidó su contraseña | El **admin de Menú Pro** la resetea desde el panel Admin → tabla de usuarios del restaurante → `PATCH /api/usuarios/:id/password` |
| Admin olvidó su contraseña | Acceso directo a la base de datos SQLite: `UPDATE usuarios SET password_hash = ? WHERE rol = 'admin'` con un hash generado por bcrypt |

No existe flujo automático "olvidé mi contraseña" con email. El owner debe contactar a soporte de Menú Pro.

**Cuándo implementarlo:** cuando el volumen de restaurantes haga que el reset manual sea un cuello de botella para soporte. Requiere configurar SMTP (SendGrid, Resend, etc.) y tabla `password_reset_tokens` con TTL.

**Para implementar:**
- Tabla `password_reset_tokens (id, id_usuario, token_hash, expires_at, usado)`
- `POST /api/auth/forgot-password` — genera token + envía email (link con token)
- `POST /api/auth/reset-password` — valida token, cambia hash, invalida token
- Pantalla `forgot.html` con formulario de email
- Variables de entorno: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `APP_URL`

#### B4c — Protección avanzada contra fuerza bruta

**Estado actual — protección básica por IP:**
- ✅ `loginLimiter` en `routes/auth.js`: **10 intentos en 15 min** por IP → HTTP 429 con mensaje en español
- ✅ Rate limit global en `/api/auth/*`: **20 req/15 min** por IP (app.js)
- ❌ No hay bloqueo por cuenta (si el atacante rota IPs, puede seguir intentando)
- ❌ No hay alerta al owner/admin cuando se detectan intentos fallidos
- ❌ Los valores están hardcodeados — no son configurables desde variables de entorno

**Configuración desde el servidor de deploy:** los límites actuales están en el código. Para hacerlos configurables sin tocar el código, agregar al `.env`:
```
LOGIN_MAX_ATTEMPTS=10
LOGIN_WINDOW_MINUTES=15
```
Y en `routes/auth.js`:
```js
max:       parseInt(process.env.LOGIN_MAX_ATTEMPTS  || '10'),
windowMs:  parseInt(process.env.LOGIN_WINDOW_MINUTES || '15') * 60 * 1000,
```

**Para implementar protección completa (bloqueo por cuenta + alerta):**
- Tabla `login_attempts (id, email, ip, created_at, exitoso)` — registra cada intento
- Bloquear cuenta N minutos tras X fallos consecutivos por email (independiente de IP)
- `POST /api/auth/login`: si cuenta bloqueada → HTTP 423 "Cuenta bloqueada hasta HH:MM"
- Alerta: Web Push o email al owner cuando su restaurante tiene más de Y intentos fallidos en Z minutos
- Complejidad: media. Bloqueo por cuenta es el paso prioritario; alerta es opcional.

#### B5 — Historial del cliente por código de reserva
Desde `menu.html`, el cliente puede ver sus reservas anteriores buscando por número de teléfono (no solo el código actual). Muestra las últimas N reservas, su estado y el total gastado.
- **Backend:** nuevo endpoint público `GET /api/public/cliente/:telefono` con historial limitado
- **Frontend:** nueva sección en la pantalla de "Consultar mi reserva" en `menu.html`
- **Complejidad:** media (endpoint nuevo, UI existente extendida)

---

### Tier C — Estratégico, mayor esfuerzo

#### C1 — Planes / tiers SaaS
Definir niveles de servicio: básico (1 usuario, sin reportes Excel), pro (5 usuarios, reportes), premium (usuarios ilimitados, API, soporte). Control desde el admin para asignar plan a cada restaurante y limitar features según el plan activo.
- **Schema:** columna `plan TEXT DEFAULT 'basico'` en `restaurantes`; tabla `planes` con límites
- **Backend:** middleware `checkPlan()` que bloquea endpoints según plan activo
- **Frontend:** badge de plan en tabla de restaurantes admin; modal de upgrade desde `owner.html`
- **Complejidad:** alta (transversal a todo el sistema)

#### C2 — Inventario básico / alertas de stock
Más allá del toggle "agotado" actual: cantidad disponible por plato de carta, alerta automática cuando llega a cero, descuento automático del stock al crear una orden. Diferencia entre "lo marco agotado manualmente" y "el sistema lo sabe".
- **Schema:** columna `stock INTEGER DEFAULT NULL` en `platos_carta` (NULL = sin control de stock)
- **Backend:** al crear orden con ítem de carta, `UPDATE platos_carta SET stock = stock - cantidad`; alerta si `stock = 0` → marcar `activo = 0`
- **Complejidad:** media-alta (trigger en creación de orden, UI de gestión de stock)

#### C3 — WhatsApp / SMS de confirmación
Ver sección completa más abajo (ya documentada). Mensaje automático al confirmar reserva, cancelación, nueva orden. Proveedor: Meta WhatsApp Business Cloud API o Twilio.
- **Complejidad:** alta (cuenta externa, aprobación de Meta, plantillas, costos por mensaje)

#### C4 — Pre-pago online (reduce no-shows)
El cliente paga con Yape/Plin antes de llegar al restaurante al crear una reserva. Reduce no-shows drásticamente. Requiere verificación automática del pago (webhook o polling).
- **Complejidad:** muy alta (integración gateway, confianza del cliente, disputas)

#### C5 — API pública para integraciones
Exponer endpoints REST documentados (OpenAPI/Swagger) para que los restaurantes integren el sistema con sus propias herramientas (POS físico, delivery propio, contabilidad). Requiere API keys por restaurante.
- **Schema:** tabla `api_keys` con `id_restaurante`, `key_hash`, `permisos`, `activo`
- **Complejidad:** alta (auth adicional, rate limiting por key, documentación)

---

## Implementados

| Feature | Fecha | Descripción |
|---------|-------|-------------|
| Botón Instalar PWA + widget `PwaInstall` | 2026-05-30 | Botón "📲 Instalar app" en `owner.html` (sidebar) y `login.html`. Widget `pwa-install.js`: captura `beforeinstallprompt`, instructivo iOS, se oculta si ya instalada. E2E `scripts/test-pwa-install.js`. Comensal-installable + URLs por slug quedan como features futuras. |
| Editar platos + widget `FormModal` + fix scroll Menús del día | 2026-05-30 | Botón ✏️ por fila para editar platos de menú (nombre+desc) y carta (nombre+precio+desc+categoría) vía widget `FormModal` (modal de formulario genérico por esquema). Backend `PATCH /platos-menu/:id` y `/platos-carta/:id`. Fix de layout: `.card-header` con `flex-wrap` para que el botón "Eliminar" de los menús del día no se corte en 360px. Tests `editar-platos.test.js` (10) + E2E. 207/207 verde. |
| Sistema de widgets + `PhotoEditor` | 2026-05-30 | Filosofía de **componentes de UI reutilizables autocontenidos** (ver `widgets.md`). Primer widget `public/js/widgets/photo-editor.js`: en `owner.html` (Platos de menú y Carta) la miniatura de cada plato es clicable → visor de imagen en grande con **recorte 1:1** + Cambiar + Eliminar; placeholder vacío → recortador directo. Recortador propio en canvas (arrastrar + zoom táctil, exporta JPEG 800×800), sin dependencias, no toca CSP. Prueba E2E `scripts/test-photo-editor.js` (8/8 verde). Siguiente: widget `PhotoViewer` solo-lectura para migrar el modal de `menu.html`. |
| Auth + roles | 2026-05-09 | Login/logout con JWT en cookie httpOnly. Roles: admin, owner, cocinero, mozo |
| Menú del día | 2026-05-09 | Secciones, platos, menús con componentes. Modos fijo y elegible por sección |
| Carta | 2026-05-09 | Categorías y platos a la carta con toggle activo/inactivo |
| Órdenes activas | 2026-05-09 | Vista en tiempo real con flujo de estatus (pendiente → preparando → entregando → completado) |
| Historial de órdenes | 2026-05-09 | Filtros por fecha y estatus + descarga Excel (`historial_ordenes_DESDE_HASTA.xlsx`) |
| Reservas activas + historial | 2026-05-09 | Gestión completa de reservas + descarga Excel (`historialReservas_DESDE_HASTA.xlsx`) |
| Vista cocina | 2026-05-09 | `kitchen.html` para cocineros — vista de órdenes activas |
| Menú QR para clientes | 2026-05-09 | `menu.html` con carta y menú del día, fotos, hero banner y colores dinámicos |
| Panel admin | 2026-05-09 | Gestión global de restaurantes y usuarios desde cuenta admin |
| Usuarios + permisos granulares | 2026-05-14 | Owner crea cocinero/mozo y asigna 8 permisos individuales por módulo |
| Toggle elegible/fijo en menú | 2026-05-09 | El owner puede cambiar entre "Cliente elige" y "Fijo" en cada menú del día |
| Toggle requerido/opcional en secciones | 2026-05-09 | Cada sección del menú del día puede marcarse como obligatoria u opcional |
| Eliminar sección de menú del día | 2026-05-14 | Botón ✕ por sección sin afectar historial de órdenes ni reservas |
| Fotos en platos (menú y carta) | 2026-05-14 | Upload/delete de foto por plato. Miniaturas en owner.html y menu.html |
| Configuración visual del restaurante | 2026-05-14 | Foto de portada, color primario y secundario. Sidebar muestra nombre y foto real |
| Reportes — Curva de clientes | 2026-05-11 | Gráfica de línea órdenes/reservas por día/semana/mes + Excel (`demanda_clientes_{intervalo}.xlsx`) |
| Reportes — Análisis de pedidos | 2026-05-11 | Drill-down por tipo (Menú/Carta) → sección/categoría → bar chart + Excel |
| Reportes — Ganancias | 2026-05-13 | 4 stat cards + gráfica de línea con 3 series (Total/Órdenes/Reservas) + Excel |
| Cálculo y persistencia de totales | 2026-05-13 | Columna `total` en órdenes y reservas. Backfill automático al arranque. Calculado al completar |
| Precio correcto en menús elegibles | 2026-05-09 | Precio se divide solo entre secciones obligatorias; opcionales no pedidas = S/0 |
| Polling automático en kitchen + alerta de sonido | 2026-05-18 | Auto-refresh cada 15 s. 3 endpoints REST (`GET /queue`, `PUT /:id`, `PUT /combo/:id`). Detección de órdenes nuevas por comparación de sets. Alerta sonora via Web Audio API, botón 🔔/🔕 con preferencia en localStorage |
| Generador de QR del menú | 2026-05-18 | Card en panel Configuración con QR autogenerado (CDN `qrcode@1.5.3`), link copiable y botón "Descargar PNG". Se genera al abrir el panel. Sin cambios en backend. |
| Inhabilitar menú del día | 2026-05-18 | Toggle "Visible / Oculto" por menú en owner.html. Columna `activo` en `menus_dia`. `GET /api/public/menu` filtra `activo = 1`. Órdenes y reservas previas no se afectan |
| Plano de mesas visual | 2026-05-18 | Tabla `mesas` (numero, capacidad, activo). `routes/mesas.js` con CRUD + `GET /estado` que deriva libre/ocupada/reservada cruzando órdenes activas y reservas confirmadas de hoy. Tab "Plano" en panel Órdenes con chips color-coded. Config de mesas en panel Configuración. Polling 10s integrado. Tests: 13 casos. |
| Platos agotados en menú del día | 2026-05-18 | Toggle "Disponible / Agotado" por plato en cada sección. Columna `agotado` en `componentes_menu_dia`. `GET /api/public/menu` filtra `agotado = 0`. El componente permanece en BD para preservar historial de órdenes |
| hora_llegada en reservas + asignación de mesa | 2026-05-18 | Campo `hora_llegada TEXT` en `reservas`. El plano solo marca una mesa "reservada" cuando la hora de llegada cae en la ventana [-30min, +120min] respecto a la hora actual Lima (`esInminente()`). Desde `menu.html` el cliente puede indicar hora de llegada (opcional). En `owner.html` las tarjetas de reserva muestran la hora y permiten asignar mesa inline (`PATCH /api/reservations/:id/mesa`). Tests: 18 casos en `tests/hora-llegada.test.js`, todos pasan. |
| REFACTOR-001 — Estatus dinámicos por flags semánticos | 2026-05-21 | Eliminados todos los hardcodes de nombres de estatus. `estatus_orden` tiene 5 flags (`es_inicial, es_en_cocina, es_listo, es_pagado, es_cancelado`); `estatus_reserva` tiene 7 (`es_inicial, es_confirmada, es_en_cocina, es_listo, es_cliente_llego, es_full, es_cancelado`). Backend: `PATCH /:id/estatus` en órdenes y reservas acepta `{ flag }` además de `{ estatus }`. Frontend: `owner.html` usa flags para botones de acción y detección de nuevas órdenes/reservas. Eliminado `utils/orderStatus.js`. 10 sesiones, ~40 cambios en 9 archivos. |
| Gap 6 — Código de reserva aleatorio + estado para el cliente | 2026-05-21 | `utils/codigoReserva.js` genera código único de 7 chars. Columna `codigo` en `reservas` con índice único. `POST /api/public/reservations` asigna y devuelve el código. `GET /api/public/reserva/:codigo` (público) devuelve estado + items en tiempo real. `menu.html`: pantalla de confirmación con código grande + instrucción de screenshot + pantalla de consulta con polling 30s + pill "Consultar mi reserva" en header. `owner.html`: código visible en tarjetas de reserva activas. |
| Gap 2 — Kanban "Cola del día" | 2026-05-23 | `pedidos.js` reescrito: 4 tabs (Pendientes/En Cocina/Listos/Por cobrar), badges por zona + badge total en nav, botones de acción rápida por tarjeta/zona, polling 15s. Nuevo flag `es_entregado` en `estatus_orden` (migración en `database.js`, agregado a `VALID_ORDER_FLAGS` y SELECT en `routes/orders.js`). Botón "🍽 Entregar" en Listos → `es_entregado` → Por cobrar. Reservas: "🍽 Entregado" reemplaza a "👤 Cliente llegó" en `reservas.js` y `pedidos.js`. 15/15 pruebas manuales OK. |
| Bot de documentación Playwright | 2026-05-27 | `landing/bot/` — orquestador `bot.js` + 4 flows por rol (owner/cocina/mozo/cliente). 34 screenshots en viewport mobile 390×844. 4 manuales `.md` en `landing/bot/output/`. Captura errores de consola en `errors-report.md`. Imágenes de platos en `landing/bot/assets/` generadas con `generate-placeholder-images.js` (Playwright, sin internet externo). Scripts: `npm run bot:setup / bot:assets / bot:run / bot:all`. Usuarios bot: owner@bot.com / cocina@bot.com / mozo@bot.com (pass: BotMenuPro2026!). |
| Hardening producción 9/10 — health endpoint, graceful shutdown, npm audit, multer iOS | 2026-05-27 | `GET /health` sin auth (devuelve `{ status, uptime }`) para monitoreo externo. Graceful shutdown: handlers `SIGTERM`/`SIGINT` cierran server HTTP + BD SQLite antes de salir (timeout forzado 10s). `npm audit fix`: cerradas 5 vulnerabilidades (ip-address XSS, qs DoS, tmp path traversal HIGH, ws memory disclosure). Multer fileFilter en `routes/public.js` y `routes/menu.js` (×2): reemplazado lista blanca de extensiones por `file.mimetype.startsWith('image/')` — acepta HEIC/HEIF de iOS y Android. Puntuación: 8.5 → 9/10. |
| Hardening producción — Helmet + rate limiting + índices BD | 2026-05-26 | `helmet` instalado con CSP completa (CDNs Chart.js, QRCode, Google Fonts permitidos; `unsafe-eval` solo para qrcodejs). Rate limiting: `/api/auth` 20 req/15min, `/api/` 300 req/min. 4 índices en `database.js`: `idx_ordenes_restaurante`, `idx_ordenes_fecha`, `idx_reservas_restaurante`, `idx_reservas_fecha`. Bug crítico resuelto: `login.html` redirigía mozo a `/waiter.html` (inexistente) → corregido a `/owner.html`; ruta `/waiter` eliminada de `app.js`. Puntuación producción: 7.2 → 8.5 / 10. |
