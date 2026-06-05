# Widgets — Componentes de UI reutilizables (Menú Pro)

## Filosofía

> **Todo lo que se vaya a usar en más de una pantalla se construye como widget reutilizable.**
> No copiar-pegar markup ni estilos entre páginas: se crea un componente autocontenido
> y cada página lo invoca con un `<script src>`.

El proyecto ya separa la **lógica por pantalla** en `public/js/modules/` (ordenes, reservas,
cocina…). Los **widgets** son el siguiente nivel: **componentes de UI autocontenidos** que
cualquier página puede usar sin duplicar HTML/CSS/JS.

Antes existía el antipatrón de tener el mismo modal de foto inline en `menu.html` y querer
"copiarlo" a `owner.html`. La distinción correcta:

- **Reusar** = existe un componente compartido y las páginas lo invocan. ✅ (lo que buscamos)
- **Portar** = transcribir el código de una página a otra y adaptarlo. ⚠️ (deuda, no reuso)

Los widgets eliminan el portado: se escribe una vez, se usa en todas partes.

---

## Reglas de un widget

1. **Autocontenido (drop-in).** Una página lo usa con un solo `<script src="/js/widgets/<nombre>.js">`.
   El widget **crea su propio DOM al vuelo** (no depende de que cada HTML pegue un `<div>`)
   e **inyecta sus estilos una sola vez** (un `<style>` con id único, idempotente).
2. **Hereda el tema de la página.** Sus estilos usan los **tokens CSS** existentes
   (`--accent`, `--r`, `--shadow-xl`, `--font-display`, etc.) con **valores de respaldo**
   (`var(--r, 12px)`) para funcionar incluso en una página sin esos tokens.
3. **API por opciones y callbacks**, nunca lógica hardcodeada. La página le pasa qué mostrar
   y qué hacer; el widget no sabe de órdenes, platos ni endpoints.
   - Si una capacidad **no** se pasa (ej. `onDelete`), el widget **no** muestra ese control.
     Así el **mismo** componente sirve a casos con y sin permisos de edición.
4. **CSS scoped por prefijo** (`.pe-*` para PhotoEditor) para no colisionar con la página.
5. **Idempotente.** Cargarlo dos veces no rompe nada (`if (window.X) return;`).
6. **Global namespaced.** Expone un único objeto en `window` (`window.PhotoEditor`), compatible
   con el estilo de scripts clásicos del proyecto (los `onclick` inline usan globals).
7. **Accesible y mobile-first** (regla no negociable del proyecto): `role="dialog"`,
   `aria-modal`, cierre con `Esc` y tap fuera, touch targets ≥ 44px, respeta el tema oscuro.

## Convenciones de archivos

| Qué | Dónde |
|-----|-------|
| Código del widget | `public/js/widgets/<nombre>.js` |
| Inclusión | `<script src="/js/widgets/<nombre>.js"></script>` en el `<head>` de la página |
| Estilos | Inyectados por el propio JS (no archivo CSS aparte) usando tokens de tema |
| Documentación | Este archivo (`widgets.md`) — un registro por widget en el catálogo |

> **Por qué los estilos van inyectados y no en un `.css`:** que el widget sea un único archivo
> lo hace verdaderamente drop-in (un solo `<script>`, cero links extra). Como usa los tokens
> de tema de la página, se ve nativo en owner (terracota), menu (dark-auto) o donde se monte.

---

## Catálogo de widgets

| Widget | Archivo | Estado | Usado en | Propósito |
|--------|---------|--------|----------|-----------|
| **PhotoEditor** | `public/js/widgets/photo-editor.js` | ✅ Activo (2026-05-30) | `owner.html` | Ver imagen en grande + **Recortar (1:1)** + **Cambiar** + **Eliminar**. Para quien tiene permiso de edición. |
| **FormModal** | `public/js/widgets/form-modal.js` | ✅ Activo (2026-05-30) | `owner.html` (editar platos) | Modal de **formulario genérico** por esquema de campos (text/number/textarea/select) con submit async. |
| **PwaInstall** | `public/js/widgets/pwa-install.js` | ✅ Activo (2026-05-30) | `owner.html`, `login.html` | Botón **"Instalar app"** (captura `beforeinstallprompt`) + instructivo para iOS. Se oculta si ya está instalada. |
| **MenuWizard** | `public/js/widgets/menu-wizard.js` | ✅ Activo (2026-06-04) | `owner.html` (Menús del día) | 3 vistas inline: **galería** (cards retrato + fecha ◀▶), **wizard de 3 pasos** (título → precio → ¿fijo o cliente elige?) y **configuración** (secciones/platos, reemplaza al modal). |
| **PhotoViewer** | `public/js/widgets/photo-viewer.js` | 🔜 Planeado | `menu.html` (migración) | Ver imagen en grande, **solo lectura**. Para el comensal. |

---

### PhotoEditor ✅

Visor de imagen en grande con recorte 1:1 y acciones de edición. Primer widget del proyecto.

**API — visor/editor**

```js
PhotoEditor.open({
  url:      '/uploads/platos/arroz.jpg', // requerido — la imagen a mostrar
  title:    'Arroz con pollo',           // opcional — título bajo la foto
  desc:     'Con presa y ají',           // opcional — descripción
  onChange: (file) => { /* subir File */ }, // opcional — muestra "📷 Cambiar foto" y "✂️ Recortar"
  onDelete: () => { /* eliminar */ },       // opcional — muestra "🗑 Eliminar foto"
});
PhotoEditor.close(); // cierre programático
```

- `onChange` recibe un **`File`** (no un `<input>`). Tanto **Cambiar foto** (elegir otra) como
  **Recortar** (ajustar la actual) pasan por el recortador y devuelven un **File JPEG ya recortado a 1:1**.
- `onDelete` se invoca tras cerrar el modal.
- Sin `onChange`/`onDelete`, el componente queda como visor puro (base del futuro PhotoViewer).

**API — recorte directo** (para una imagen recién elegida, sin pasar por el visor)

```js
PhotoEditor.crop({
  source: file,            // un File/Blob, o una URL del mismo origen
  onSave: (file) => { ... }, // recibe el recorte como File JPEG 1:1 (800×800)
});
```

**Recortador (1:1)**

- Marco cuadrado fijo. La imagen se **arrastra** (pointer events: touch + mouse) y se **acerca**
  con una barra de zoom (≥44px, mobile-first). Arranca en modo "cover" centrado.
- Exporta **JPEG 800×800** vía `<canvas>` (`drawImage` de la región visible). Sin dependencias externas.
- Implementación propia en canvas (no Cropper.js): mantiene el widget autocontenido y **no toca el CSP**.
- 1:1 elegido porque `menu.html` ya muestra las fotos en contenedores cuadrados (`object-fit: cover`):
  el owner decide qué se ve y todas las fotos quedan parejas.

**Comportamiento en `owner.html` (Platos de menú y Carta)**

- Miniatura **con** foto → clic abre `PhotoEditor` (Recortar / Cambiar / Eliminar).
- Placeholder **sin** foto → clic elige imagen y abre directo el **recortador** (`PhotoEditor.crop`).
- El botón **📷** de la derecha de cada fila también pasa por el recortador (vía alterna de subida).

---

### FormModal ✅

Modal de formulario genérico y reutilizable, dirigido por un **esquema de campos**. Segundo widget.

**API**

```js
FormModal.open({
  title: 'Editar plato',
  fields: [
    { name:'nombre', label:'Nombre', type:'text', value:'Lomo', required:true, placeholder:'…' },
    { name:'precio', label:'Precio S/', type:'number', value:25, step:'0.01', min:'0', required:true },
    { name:'descripcion', label:'Descripción', type:'textarea', value:'' },
    { name:'id_categoria', label:'Categoría', type:'select', value:3, required:true,
      options:[{ value:3, label:'Carnes' }, { value:5, label:'Postres' }] },
  ],
  submitLabel: 'Guardar',     // opcional
  onSubmit: async (values) => { await api('PATCH', '/…', values); }, // throw Error → muestra el mensaje en el modal
});
FormModal.close();
```

- `type` soportados: `text` (default), `number`, `textarea`, `select`. `select` requiere `options:[{value,label}]`.
- `onSubmit(values)` recibe `{ name: valorTrim }`. Es **async**: el botón se bloquea con "Guardando…"; si lanza, muestra el error y no cierra; si resuelve, cierra.
- Valida `required` en cliente. Cierra con ✕, Cancelar, backdrop o `Esc`. `Enter` envía (salvo en textarea). Inputs 16px (sin zoom iOS), botones ≥44px.

**Usos actuales**: `editarPlatoMenu(id)` (nombre + descripción) y `editarPlatoCarta(id)` (nombre + precio + descripción + categoría) en `owner.html`. Reutilizable para cualquier formulario corto futuro (crear/editar entidades).

---

### PwaInstall ✅

Botón "Instalar app" + lógica de instalación de la PWA. Tercer widget.

**API**

```js
PwaInstall.attach(buttonEl);  // muestra el botón solo si es instalable; click → instalar
PwaInstall.prompt();          // dispara la instalación (o el instructivo iOS) manualmente
PwaInstall.installable();     // boolean
```

- Captura `beforeinstallprompt` apenas carga el `<script>` (en `<head>`); al hacer click llama al
  diálogo nativo de Android/Chrome/Edge. En **iOS/Safari** (sin soporte del evento) abre un
  instructivo "Compartir → Añadir a pantalla de inicio".
- El botón se **oculta** si la app ya está instalada (`display-mode: standalone`) o tras `appinstalled`.
- El instructivo iOS se inyecta solo cuando se necesita; usa tokens de tema con fallbacks (sirve en
  `owner.html` con tema y en `login.html` que tiene su propio CSS).

**Uso actual**: botón en el sidebar-footer de `owner.html` (`#btn-instalar-app`) y bajo el formulario de
`login.html` (`#btn-install`). Cada página agrega el `<script>`, un `<button hidden>` y `PwaInstall.attach(btn)`.

> **Pendiente futura**: instalar el **menú del comensal** como PWA requiere un **manifest dinámico por
> restaurante** (`start_url` al menú del local, nombre del restaurante). Es una feature aparte — ver
> `features.md`. Idealmente combinada con las **URLs por slug** (`menupro.tech/karinamenu`).

---

### MenuWizard ✅

**Galería** de menús del día + **wizard de creación** + **configuración** para `owner.html`. Cuarto widget.
A diferencia de los anteriores (modales/overlays), **se monta inline** dentro de un contenedor
de la página. Tiene **tres vistas** que se alternan con `hidden` (galería ⇄ wizard ⇄ config).

**API**

```js
MenuWizard.mount(document.getElementById('menu-wizard-mount'), {
  onConfigure: (menuId) => abrirConfigMenu(menuId), // qué hacer al tocar "⚙ Configurar"
});
MenuWizard.reload();      // re-fetch + re-render de la galería para la fecha actual
MenuWizard.showConfig();  // muestra la vista de configuración (la llama owner.abrirConfigMenu)
MenuWizard.showGallery(); // vuelve a la galería (la llama owner.cerrarConfigMenu)
MenuWizard.isMounted();   // boolean
```

**Vista 1 — Galería (principal):**
- Cabecera con **selector de fecha** (`◀` / input `date` / `▶`): las flechas mueven el día ±1 sin recargar
  la página; el input cambia el día directamente. Precargado a hoy (zona Lima).
- Botón fijo **"＋ Crear menú"** (fuera del scroll) → abre el wizard.
- **Galería horizontal** de los menús de ESE día como **cards retrato** (`.mw-menu-card`, más altas que
  anchas, `flex:0 0 82%` con peek + `scroll-snap-x`): nombre, precio, pills de secciones, toggles
  Fijo/Visible, **⚙ Configurar** (destacado) y Eliminar. No hay "card contenedora" — las cards son los menús.
- Estado vacío (`.mw-empty-card`) con CTA a crear cuando el día no tiene menús.
- **Tamaño de card parametrizado** (variables sobre `.mw`, heredadas también por las cards de sección):
  `--mw-card-w` (ancho/flex-basis), `--mw-card-maxw` (tope) y `--mw-card-h` (alto mínimo). Valor actual
  **100% / 100% / 480px** → se ve **una sola card** sin peek. Para volver al peek de la siguiente:
  `82% / 320px / 360px` (documentado en un comentario en el CSS del widget).
- **Foto de portada + scrim:** la card usa la foto de un plato como fondo (`--mw-bg`, `::before` imagen +
  `::after` degradado oscuro para legibilidad; texto en blanco). Sin foto → **watermark 🍽️** que llena el aire.
  La portada la elige el owner (botón **"📷 Portada"** por plato en la vista de config) y se guarda en
  `menus_dia.id_plato_portada` (backend); si no eligió, `portadaUrl()` usa el primer plato con foto.
- **Toggles con explicación:** cada toggle (Fijo/Cliente elige, Visible/Oculto) lleva una `.mw-toggle-hint`
  que describe su efecto y cambia según el estado.

**Vista 2 — Wizard de creación (3 pasos, carrusel `translateX`):** hereda la fecha de la galería
(cabecera "Nuevo menú · [fecha]").
1. **Título** — con **figura/emoji** decorativa (`.mw-hero`); título opcional (default "Menú del día").
   "✕ Cancelar" vuelve a la galería sin crear.
2. **Precio** — con su propia **figura/emoji**; valida precio > 0.
3. **¿Fijo o cliente elige?** — una sola pregunta con dos cards grandes (`elegible` 0/1); "Crear menú ✓"
   se habilita al elegir → `POST /api/menu/menus-dia` y **vuelve a la galería** con el menú nuevo listado.

**Vista 3 — Configuración = galería de secciones (inline, reemplaza al modal):** ⚙ Configurar ya no abre
`#menu-config-overlay` (eliminado) — muestra esta vista del mismo estilo, con "← Volver" y "✏ Editar".
El cuerpo es una **galería horizontal de secciones**: cada sección es una **card retrato** (~270×360, igual
que las cards de menús; clases `.mc-sec-gallery`/`.mc-sec-card` en `owner.css`) con toggle Obligatoria/Opcional,
sus platos (toggle Agotado/Disponible + ✕), "＋ Agregar plato" y "Quitar sección". Arriba, **solo** el botón
**"＋ Agregar sección"**.

- **Alta de sección por mini-wizard:** "＋ Agregar sección" abre un **carrusel de 2 pasos** dentro de la misma
  vista, reutilizando las clases `.mw-*` del widget (track, choices, dots): **Paso 1** elegir sección del catálogo,
  **Paso 2** ¿obligatoria? con dos cards de emoji (✅ / ⏭️). Lo renderiza/gobierna `owner.html`
  (`abrirAddSeccion`/`renderAddSeccionWizard`/`confirmarAddSeccion`) dentro de `#mc-body`.

Contiene los IDs `#mc-title` / `#mc-meta` / `#mc-body` que `owner.html` ya usaba en el modal, así que **toda la
lógica se reutiliza sin cambios** (`renderConfigBody` —ahora emite el markup de galería—, `PlatoPicker`, toggles,
`recargarModalConfig`). El widget solo aloja el contenedor; los botones de la cabecera delegan en los globales
`cerrarConfigMenu()` / `editarNombreMenu()`. Motivo (usuario): el modal confundía el flujo, "cada sección debe ser
una card de igual tamaño que los menús", y "al agregar debería abrirse un wizard de pasos".

**Integración con owner.html (clave):** todos los refrescos del listado pasan por la función global
`loadMenusDia()`, que **delega** en `MenuWizard.reload()` cuando el widget está montado. Así los
handlers globales existentes (`toggleElegibleMenu`, `toggleActivoMenu`, `eliminarMenuDia`) refrescan la
**galería** **sin tocar su código**. `abrirConfigMenu`/`cerrarConfigMenu` alternan a la vista de config
vía `MenuWizard.showConfig()` / `showGallery()`. El widget no duplica la lógica de configuración.

**Reversible:** el form clásico no se borró — quedó envuelto en `#md-legacy` con `display:none`.
Para revertir basta quitar el `<script>` del widget + el `#menu-wizard-mount`, mostrar `#md-legacy`
y borrar la línea de delegación en `loadMenusDia()`.

**Nota de la regla 4 (autocontenido):** este widget sí referencia globales de la página (`api`, `toast`,
`esc`, `fDate` y los handlers de menú). Es aceptable porque su dominio (menús del día) **vive solo en
`owner.html`**; se construyó como widget —y no inline— para poder probarlo y revertirlo de forma aislada,
no por reuso multipantalla.

---

### PhotoViewer 🔜 (siguiente entrega)

Mismo visor que PhotoEditor pero **sin** barra de acciones — pensado para el comensal en
`menu.html`. La migración reemplazará el modal `photo-modal` inline de `menu.html` (HTML + CSS
en `menu.css` + funciones `openPhotoModal/closePhotoModal`) por `<script src="/js/widgets/photo-viewer.js">`
y llamadas `PhotoViewer.open({url, title, desc})`. Es deuda de migración de bajo riesgo, pero
toca la cara del cliente, así que va en su propia entrega con verificación dedicada.

---

## Cómo crear el próximo widget (checklist)

1. `public/js/widgets/<nombre>.js` siguiendo las 7 reglas de arriba.
2. Estilos inyectados, prefijados, con tokens + fallbacks.
3. API por opciones/callbacks; capacidades opcionales se ocultan si no se pasan.
4. `<script src>` en las páginas que lo usen.
5. Registrar en el **catálogo** de este archivo.
6. Verificar en vivo (Playwright o curl) y dejar nota en `status.md`.
