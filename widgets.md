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
