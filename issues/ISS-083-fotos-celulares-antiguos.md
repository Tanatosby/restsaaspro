# ISS-083 — Subir fotos cuelga / falla en celulares de gama baja

**Estado:** ✅ Resuelto 2026-08-31 · pendiente deploy
**Módulo:** `public/js/widgets/photo-editor.js`, `public/menu.html`, `public/js/modules/config.js`, `routes/menu.js`, `routes/public.js`
**Reportado por:** el usuario, a partir del uso real del piloto ("celulares antiguos no aceptan subir foto… el sistema se vuelve muy lento").

---

## Síntoma

Al subir una foto desde un celular de gama baja / antiguo:
- el sistema se congela varios segundos y a veces la pestaña se recarga sola (Chrome mata el tab);
- en algunos casos directamente "no deja" subir la foto (error).

Se reportó primero para las fotos de plato y luego, en la misma conversación, para la **foto
del comprobante Yape/Plin** en `menu.html`.

## Causa raíz — una sola, en 4 puntos de subida

Ningún camino de subida reducía la imagen en el cliente antes de procesarla:

| Punto | Antes | Problema en gama baja |
|---|---|---|
| Foto de plato (menú/carta) — `PhotoEditor.crop()` | Metía la foto **a resolución nativa** en un `<img>` y de ahí al `<canvas>` del recortador | Una foto de cámara de ~12 MP (4000×3000) ocupa **~48 MB** al descomprimir en RAM. Decodificarla + rasterizarla tarda segundos o se queda sin memoria → la pestaña se cuelga o Chrome la mata. |
| Foto de portada del restaurante — `subirFotoRestaurante()` | Subía `input.files[0]` **crudo**, sin recortar ni comprimir | Límite del servidor 2 MB → una foto de cámara de 3–8 MB la **rechaza** multer ("File too large"), se ve como error. |
| Comprobante Yape/Plin — listener de `#pago-foto` | `FileReader.readAsDataURL(file)` sobre el archivo **completo** solo para una miniatura de 80 px | base64 de un archivo de 5–8 MB = string de ~10 MB en memoria → congela la pestaña. |
| Comprobante Yape/Plin — `enviarPago()` | Subía `#pago-foto.files[0]` **crudo** por `FormData` | En redes móviles flojas se pasa del timeout de 30 s → falla. |

El coste de decodificar una imagen depende de sus **píxeles**, no de su peso en disco: una foto de
12 MP que en disco pesa 380 KB igual cuelga un celular viejo al abrirla.

## Solución

### 1. Utilidad compartida `downscaleImage()` — `public/js/widgets/image-downscale.js` (nuevo)

Función global (`window.downscaleImage(file, { maxDim, quality })`) que devuelve un `File` JPEG
reducido, o el original si no vale la pena / no se puede:

- **Camino 1 (ideal):** `createImageBitmap(file, { resizeWidth, resizeHeight, resizeQuality })`
  — decodifica **ya reducido**, sin explotar la RAM.
- **Camino 2:** `createImageBitmap(file)` + `<canvas>` si el navegador ignora las opciones de resize.
- **Camino 3 (universal):** `<img>` + `<canvas>` para iOS Safari viejo / WebView antiguo.
- **Cualquier error → se devuelve el `File` original.** Nunca bloquea la subida.
- Se salta imágenes que ya miden ≤ `maxDim` en ambos lados, los GIF (no aplanar animaciones) y
  lo que no sea imagen. Si el "reducido" pesa igual o más, se queda el original.
- `maxDim` por defecto 1600 px, calidad 0.85.

### 2. Integración

- **`photo-editor.js`** — `startCrop()` reduce la fuente (si es `Blob`) antes de decodificarla,
  mostrando un estado **"Procesando foto…"** (`.pe-busy` + spinner) mientras trabaja.
- **`menu.html`** — el listener de `#pago-foto` reduce la foto, la previsualiza con
  `URL.createObjectURL` (no `readAsDataURL`) y guarda el `File` reducido en `comprobanteFile`;
  `enviarPago()` sube **ese**, no `#pago-foto.files[0]` crudo.
- **`config.js`** — `subirFotoRestaurante()` reduce la portada antes del `FormData`
  (toast "Procesando foto…").

### 3. Red de seguridad en el servidor

Límite de `multer` subido a **8 MB** en los 3 endpoints de subida (`routes/menu.js` portada +
platos, `routes/public.js` comprobante). Solo aplica cuando la reducción en cliente falló en un
navegador viejo y llega el archivo original.

## Verificación

- `scripts/test-fotos-downscale.js` (nuevo, Playwright): foto 3200×2400 → JPEG 1600×1200 más
  liviana; imagen chica / no-imagen se devuelven sin tocar; `PhotoEditor.crop` abre el recortador
  con el estado "Procesando…" y guarda un JPEG; el comprobante en `menu.html` se previsualiza y
  queda reducido antes de enviar. **14/14 verde.**
- `npx jest` — **478/478** (36 suites), sin regresiones por el cambio de límite de multer.

## Pendiente

- Deploy (lo hace el usuario).
- Verificar en uso real con un celular de gama baja de la dueña / un comensal.
