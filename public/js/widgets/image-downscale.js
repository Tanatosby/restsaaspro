/**
 * downscaleImage — reduce una imagen (File/Blob) a un lado máximo ANTES de
 * recortarla o subirla. Sexto "widget" del proyecto, pero es una utilidad
 * (una función global), no un componente con DOM — sigue el estilo de utils.js
 * (`api`, `toast`, `esc`) más que el de PhotoEditor/FormModal.
 *
 * Motivo (ISS-083): una foto de la cámara de un celular actual son ~12 MP
 * (4000×3000). Al decodificarla, el navegador la expande en RAM a ~48 MB sin
 * comprimir. En celulares de gama baja/antiguos:
 *   - recortarla (PhotoEditor) o generar su preview (FileReader) congela la
 *     pestaña varios segundos, o se queda sin memoria y Chrome la mata;
 *   - subirla cruda por datos móviles se pasa del timeout y falla.
 * Lo que finalmente viaja/procesa debería ser una imagen chica (~1600px).
 *
 * Uso:
 *   const chico = await downscaleImage(file);                 // defaults
 *   const chico = await downscaleImage(file, { maxDim: 1600, quality: 0.85 });
 *   // Devuelve un File JPEG reducido, o el File original si:
 *   //   - no es una imagen (o es un GIF: aplanarlo perdería la animación)
 *   //   - ya mide <= maxDim en ambos lados (no hay nada que reducir)
 *   //   - el navegador no pudo decodificarla / procesarla (nunca bloquea la subida)
 *   //   - el "reducido" pesó igual o más que el original
 *
 * Estrategia, de más liviana a más universal:
 *   1. createImageBitmap(file, { resizeWidth/Height, resizeQuality })  → decodifica
 *      YA reducido, sin explotar la RAM. Camino ideal en Chrome/Android.
 *   2. createImageBitmap(file) a tamaño completo + <canvas> para reducir → si el
 *      navegador ignora las opciones de resize.
 *   3. <img> + <canvas> → fallback universal (iOS Safari viejo, WebView antiguo).
 *   4. Cualquier error en toda la cadena → se devuelve el File original.
 */
(function () {
  'use strict';
  if (window.downscaleImage) return; // idempotente

  const DEFAULTS = { maxDim: 1600, quality: 0.85, mime: 'image/jpeg' };

  function isImage(file) {
    return !!file && typeof file.type === 'string' && file.type.indexOf('image/') === 0;
  }

  function targetSize(w, h, maxDim) {
    const scale = Math.min(1, maxDim / Math.max(w, h));
    return {
      w: Math.max(1, Math.round(w * scale)),
      h: Math.max(1, Math.round(h * scale)),
      shrunk: scale < 1,
    };
  }

  // Dibuja una fuente (ImageBitmap | HTMLImageElement) en un canvas w×h y
  // devuelve un Blob del mime/quality pedidos.
  function drawToBlob(source, w, h, mime, quality) {
    return new Promise(function (resolve, reject) {
      let canvas;
      try {
        canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('sin contexto 2d'));
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source, 0, 0, w, h);
      } catch (e) {
        return reject(e);
      }
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error('toBlob devolvió null'));
        }, mime, quality);
      } else {
        // WebView muy viejo sin toBlob: dataURL → Blob a mano
        try {
          const dataUrl = canvas.toDataURL(mime, quality);
          const bin = atob(dataUrl.split(',')[1]);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          resolve(new Blob([bytes], { type: mime }));
        } catch (e) {
          reject(e);
        }
      }
    });
  }

  // Camino 1/2: createImageBitmap
  async function viaBitmap(file, maxDim, mime, quality) {
    if (typeof createImageBitmap !== 'function') return null;

    let probe;
    try {
      probe = await createImageBitmap(file);
    } catch (_) {
      return null; // formato que esta vía no soporta → probar el fallback
    }

    const t = targetSize(probe.width, probe.height, maxDim);
    if (!t.shrunk) { if (probe.close) probe.close(); return null; } // no hay nada que reducir

    let bmp = probe;
    try {
      const resized = await createImageBitmap(file, {
        resizeWidth: t.w,
        resizeHeight: t.h,
        resizeQuality: 'medium',
      });
      if (probe.close) probe.close();
      bmp = resized;
    } catch (_) {
      // El navegador ignoró las opciones de resize → seguimos con el bitmap
      // completo y que el canvas haga la reducción (igual descomprime full,
      // pero al menos no re-decodifica dos veces).
    }

    try {
      const blob = await drawToBlob(bmp, t.w, t.h, mime, quality);
      return blob;
    } finally {
      if (bmp.close) bmp.close();
    }
  }

  // Camino 3: <img> + canvas
  function viaImgCanvas(file, maxDim, mime, quality) {
    return new Promise(function (resolve) {
      let url;
      try {
        url = URL.createObjectURL(file);
      } catch (_) {
        return resolve(null);
      }
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        const t = targetSize(img.naturalWidth, img.naturalHeight, maxDim);
        if (!t.shrunk) return resolve(null);
        drawToBlob(img, t.w, t.h, mime, quality).then(resolve, function () { resolve(null); });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  function toJpgName(name) {
    return String(name || 'foto').replace(/\.[^.]+$/, '') + '.jpg';
  }

  function wrapAsFile(blob, name, mime) {
    try {
      return new File([blob], toJpgName(name), { type: mime, lastModified: Date.now() });
    } catch (_) {
      // WebView antiguo sin constructor File: un Blob con .name igual sirve
      // para FormData.append (multer lee el filename del part).
      try { blob.name = toJpgName(name); } catch (_) {}
      return blob;
    }
  }

  async function downscaleImage(file, opts) {
    opts = opts || {};
    const maxDim = opts.maxDim || DEFAULTS.maxDim;
    const quality = opts.quality || DEFAULTS.quality;
    const mime = opts.mime || DEFAULTS.mime;

    if (!isImage(file)) return file;
    if (file.type === 'image/gif') return file; // no aplanar animaciones

    let blob = null;
    try {
      blob = await viaBitmap(file, maxDim, mime, quality);
      if (!blob) blob = await viaImgCanvas(file, maxDim, mime, quality);
    } catch (_) {
      blob = null;
    }

    if (!blob) return file; // no se pudo procesar → subir el original
    if (typeof file.size === 'number' && blob.size >= file.size) return file; // no mejoró

    return wrapAsFile(blob, file.name, mime);
  }

  window.downscaleImage = downscaleImage;
})();
