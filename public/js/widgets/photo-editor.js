/**
 * PhotoEditor — visor de imagen en grande + recorte (crop 1:1) + acciones de edición.
 * Primer widget reutilizable del proyecto. Ver widgets.md.
 *
 * Autocontenido (drop-in): crea su propio DOM e inyecta sus estilos una sola vez.
 * Hereda el tema de la página vía tokens CSS (--accent, --r, --shadow-xl…) con
 * valores de respaldo para funcionar incluso sin esos tokens. Sin dependencias externas.
 *
 * Uso — visor/editor:
 *   PhotoEditor.open({
 *     url:      '/uploads/platos/arroz.jpg', // requerido
 *     title:    'Arroz con pollo',           // opcional
 *     desc:     'Con presa y ají',           // opcional
 *     onChange: (file) => { ... },           // opcional → muestra "Cambiar foto" + "Recortar"
 *     onDelete: () => { ... },               // opcional → muestra "Eliminar foto"
 *   });
 *   // "Cambiar foto" y "Recortar" pasan por el recortador y devuelven un File JPEG ya recortado.
 *
 * Uso — recorte directo de una imagen recién elegida (sin visor):
 *   PhotoEditor.crop({
 *     source: file,            // un File/Blob o una URL del mismo origen
 *     onSave: (file) => {...}, // recibe el recorte como File JPEG 1:1
 *   });
 *
 *   PhotoEditor.close();
 */
(function () {
  'use strict';
  if (window.PhotoEditor) return; // idempotente

  const OUT = 800; // tamaño del recorte exportado (px, cuadrado)

  let root = null;     // contenedor del modal
  let els = {};        // refs a sub-elementos
  let current = null;  // opciones de open() en curso
  let cropS = null;    // estado del recorte en curso

  // CSS scoped con prefijo .pe-, usando tokens del tema + fallbacks
  const STYLE = `
.pe-modal {
  display: none; position: fixed; inset: 0; z-index: 1200;
  background: rgba(0,0,0,0.88);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  align-items: center; justify-content: center; padding: 1rem;
  animation: pe-fade .2s ease;
}
.pe-modal.open { display: flex; }
@keyframes pe-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pe-pop  { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.pe-inner {
  max-width: 92vw; max-height: 86vh; display: flex; flex-direction: column;
  align-items: center; gap: 1rem; animation: pe-pop .3s cubic-bezier(.16,1.36,.5,1);
}
.pe-view, .pe-crop { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.pe-view[hidden], .pe-crop[hidden] { display: none; }
.pe-img {
  max-width: 100%; max-height: 62vh; object-fit: contain;
  border-radius: var(--r, 12px); box-shadow: var(--shadow-xl, 0 20px 50px rgba(0,0,0,.45));
}
.pe-name {
  font-family: var(--font-display, Georgia, serif); font-size: 1.3rem; font-weight: 700;
  color: #fff; text-align: center; letter-spacing: -0.01em;
}
.pe-name[hidden], .pe-desc[hidden], .pe-btn[hidden] { display: none; }
.pe-desc {
  font-size: 13.5px; color: rgba(255,255,255,0.85);
  text-align: center; max-width: 340px; line-height: 1.5;
}
.pe-actions { display: flex; gap: 0.6rem; margin-top: 0.25rem; flex-wrap: wrap; justify-content: center; }
.pe-btn {
  display: inline-flex; align-items: center; gap: 0.4rem; min-height: 44px;
  padding: 0 16px; border-radius: var(--r-sm, 7px); font-size: 14px; font-weight: 600;
  cursor: pointer; border: 1px solid transparent; transition: all .15s ease;
}
.pe-btn:active { transform: scale(0.96); }
.pe-btn:disabled { opacity: .6; cursor: default; }
.pe-btn-change, .pe-btn-crop { background: #fff; color: #1a1410; }
.pe-btn-change:hover, .pe-btn-crop:hover { background: rgba(255,255,255,0.88); }
.pe-btn-delete, .pe-btn-cancel { background: rgba(255,255,255,0.12); color: #fff; border-color: rgba(255,255,255,0.28); }
.pe-btn-cancel:hover { background: rgba(255,255,255,0.2); }
.pe-btn-delete:hover { background: rgba(220,53,69,0.9); border-color: transparent; }
.pe-btn-save { background: var(--accent, #c8692a); color: #fff; }
.pe-btn-save:hover { filter: brightness(1.06); }
/* Recortador */
.pe-crop-stage {
  position: relative; width: min(86vw, 360px); height: min(86vw, 360px);
  overflow: hidden; border-radius: var(--r, 12px); background: #000;
  touch-action: none; cursor: grab; box-shadow: var(--shadow-xl, 0 20px 50px rgba(0,0,0,.45));
}
.pe-crop-stage:active { cursor: grabbing; }
.pe-crop-img {
  position: absolute; top: 0; left: 0; transform-origin: 0 0; max-width: none;
  user-select: none; -webkit-user-drag: none; pointer-events: none;
}
.pe-crop-hint { font-size: 12.5px; color: rgba(255,255,255,0.8); text-align: center; max-width: 340px; }
.pe-crop-zoom { width: min(86vw, 360px); max-width: 100%; height: 44px; cursor: pointer; accent-color: var(--accent, #c8692a); }
.pe-close {
  position: absolute; top: calc(env(safe-area-inset-top, 0px) + 16px); right: 16px;
  background: rgba(255,255,255,0.16); border: none;
  width: 44px; height: 44px; border-radius: 50%; color: #fff; font-size: 22px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background .15s ease;
}
.pe-close:hover { background: rgba(255,255,255,0.28); }
.pe-close:active { transform: scale(0.92); }
@media (prefers-reduced-motion: reduce) {
  .pe-modal, .pe-inner { animation: none; }
  .pe-btn:active, .pe-close:active { transform: none; }
}`;

  function injectStyles() {
    if (document.getElementById('pe-styles')) return;
    const s = document.createElement('style');
    s.id = 'pe-styles';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  // Construye el modal una sola vez y cablea listeners
  function build() {
    if (root) return;
    injectStyles();

    root = document.createElement('div');
    root.className = 'pe-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Vista de imagen');
    root.innerHTML = `
      <button class="pe-close" type="button" aria-label="Cerrar">✕</button>
      <div class="pe-inner">
        <div class="pe-view">
          <img class="pe-img" alt="">
          <div class="pe-name"></div>
          <div class="pe-desc"></div>
          <div class="pe-actions">
            <label class="pe-btn pe-btn-change" hidden>📷 Cambiar foto
              <input type="file" accept="image/*" hidden>
            </label>
            <button class="pe-btn pe-btn-crop" type="button" hidden>✂️ Recortar</button>
            <button class="pe-btn pe-btn-delete" type="button" hidden>🗑 Eliminar foto</button>
          </div>
        </div>
        <div class="pe-crop" hidden>
          <div class="pe-crop-stage"><img class="pe-crop-img" alt=""></div>
          <div class="pe-crop-hint">Arrastra para mover · usa la barra para acercar</div>
          <input class="pe-crop-zoom" type="range" min="1" max="3" step="0.01" value="1" aria-label="Acercar">
          <div class="pe-actions">
            <button class="pe-btn pe-btn-cancel" type="button">Cancelar</button>
            <button class="pe-btn pe-btn-save" type="button">Guardar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(root);

    els = {
      view:        root.querySelector('.pe-view'),
      img:         root.querySelector('.pe-img'),
      name:        root.querySelector('.pe-name'),
      desc:        root.querySelector('.pe-desc'),
      change:      root.querySelector('.pe-btn-change'),
      changeInput: root.querySelector('.pe-btn-change input'),
      cropBtn:     root.querySelector('.pe-btn-crop'),
      del:         root.querySelector('.pe-btn-delete'),
      crop:        root.querySelector('.pe-crop'),
      cropStage:   root.querySelector('.pe-crop-stage'),
      cropImg:     root.querySelector('.pe-crop-img'),
      cropZoom:    root.querySelector('.pe-crop-zoom'),
      cropCancel:  root.querySelector('.pe-btn-cancel'),
      cropSave:    root.querySelector('.pe-btn-save'),
    };

    // Cerrar: ✕ siempre; fondo solo en modo visor (evita perder un recorte en curso)
    root.querySelector('.pe-close').addEventListener('click', close);
    root.addEventListener('click', (e) => { if (e.target === root && els.crop.hidden) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.classList.contains('open')) close();
    });

    // "Cambiar foto": elegir File → pasa por el recortador → onChange(recorte)
    els.changeInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) startCrop(file, current && current.onChange, true);
    });
    // "Recortar": recorta la foto que ya está → onChange(recorte)
    els.cropBtn.addEventListener('click', () => {
      if (current && current.url) startCrop(current.url, current.onChange, true);
    });
    els.del.addEventListener('click', () => {
      const cb = current && current.onDelete;
      if (typeof cb === 'function') { close(); cb(); }
    });

    // Recortador: zoom, arrastre, guardar, cancelar
    els.cropZoom.addEventListener('input', onZoom);
    els.cropSave.addEventListener('click', onSave);
    els.cropCancel.addEventListener('click', () => {
      const fromView = cropS && cropS.fromView;
      cropS = null;
      if (fromView) showView(); else close();
    });
    els.cropStage.addEventListener('pointerdown', onDragStart);
    els.cropStage.addEventListener('pointermove', onDragMove);
    els.cropStage.addEventListener('pointerup',   onDragEnd);
    els.cropStage.addEventListener('pointercancel', onDragEnd);
  }

  function showView() { els.view.hidden = false; els.crop.hidden = true; }
  function showCrop() { els.view.hidden = true;  els.crop.hidden = false; }

  // ── Recortador ───────────────────────────────────────────
  function startCrop(source, onSaveCb, fromView) {
    build();
    const img = els.cropImg;
    const ready = () => {
      showCrop(); // mostrar antes de medir el stage (si está oculto mide 0)
      const stage = els.cropStage.clientWidth || Math.min(window.innerWidth * 0.86, 360);
      const natW = img.naturalWidth, natH = img.naturalHeight;
      const baseScale = Math.max(stage / natW, stage / natH); // "cover"
      cropS = { onSave: onSaveCb, fromView, natW, natH, stage, baseScale, zoom: 1, scale: baseScale, tx: 0, ty: 0, drag: { active: false } };
      els.cropZoom.value = '1';
      els.cropSave.disabled = false;
      applyCrop(true);
    };
    img.onload = ready;
    img.onerror = () => { if (window.toast) toast('No se pudo cargar la imagen', 'err'); close(); };
    if (img._peUrl) { URL.revokeObjectURL(img._peUrl); img._peUrl = null; }
    if (source instanceof Blob) { img._peUrl = URL.createObjectURL(source); img.src = img._peUrl; }
    else { img.src = source; } // URL string del mismo origen
    if (img.complete && img.naturalWidth) { img.onload = null; ready(); }
  }

  function clampOffset(dispW, dispH) {
    const s = cropS;
    s.tx = Math.min(0, Math.max(s.stage - dispW, s.tx));
    s.ty = Math.min(0, Math.max(s.stage - dispH, s.ty));
  }

  function applyCrop(center) {
    const s = cropS; if (!s) return;
    s.scale = s.baseScale * s.zoom;
    const dispW = s.natW * s.scale, dispH = s.natH * s.scale;
    els.cropImg.style.width = dispW + 'px';
    els.cropImg.style.height = dispH + 'px';
    if (center) { s.tx = (s.stage - dispW) / 2; s.ty = (s.stage - dispH) / 2; }
    clampOffset(dispW, dispH);
    els.cropImg.style.transform = `translate(${s.tx}px, ${s.ty}px)`;
  }

  function onZoom() {
    const s = cropS; if (!s) return;
    const prevScale = s.scale;
    // mantener fijo el punto central del marco al hacer zoom
    const cx = (s.stage / 2 - s.tx) / prevScale;
    const cy = (s.stage / 2 - s.ty) / prevScale;
    s.zoom = parseFloat(els.cropZoom.value);
    s.scale = s.baseScale * s.zoom;
    const dispW = s.natW * s.scale, dispH = s.natH * s.scale;
    els.cropImg.style.width = dispW + 'px';
    els.cropImg.style.height = dispH + 'px';
    s.tx = s.stage / 2 - cx * s.scale;
    s.ty = s.stage / 2 - cy * s.scale;
    clampOffset(dispW, dispH);
    els.cropImg.style.transform = `translate(${s.tx}px, ${s.ty}px)`;
  }

  function onDragStart(e) {
    const s = cropS; if (!s) return;
    s.drag = { active: true, startX: e.clientX, startY: e.clientY, startTx: s.tx, startTy: s.ty };
    els.cropStage.setPointerCapture(e.pointerId);
  }
  function onDragMove(e) {
    const s = cropS; if (!s || !s.drag.active) return;
    s.tx = s.drag.startTx + (e.clientX - s.drag.startX);
    s.ty = s.drag.startTy + (e.clientY - s.drag.startY);
    clampOffset(s.natW * s.scale, s.natH * s.scale);
    els.cropImg.style.transform = `translate(${s.tx}px, ${s.ty}px)`;
  }
  function onDragEnd() { if (cropS) cropS.drag.active = false; }

  function onSave() {
    const s = cropS; if (!s) return;
    const srcX = -s.tx / s.scale, srcY = -s.ty / s.scale;
    const srcSize = s.stage / s.scale; // región cuadrada en coords de la imagen
    const canvas = document.createElement('canvas');
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(els.cropImg, srcX, srcY, srcSize, srcSize, 0, 0, OUT, OUT);
    const cb = s.onSave;
    els.cropSave.disabled = true;
    canvas.toBlob((blob) => {
      const file = new File([blob], 'recorte.jpg', { type: 'image/jpeg' });
      close();
      if (typeof cb === 'function') cb(file);
    }, 'image/jpeg', 0.9);
  }

  // ── API pública ──────────────────────────────────────────
  function open(opts) {
    opts = opts || {};
    if (!opts.url) { console.warn('PhotoEditor.open: falta "url"'); return; }
    build();
    current = opts;
    els.img.src = opts.url;
    els.img.alt = opts.title || '';
    els.name.textContent = opts.title || '';
    els.name.hidden = !opts.title;
    els.desc.textContent = opts.desc || '';
    els.desc.hidden = !opts.desc;
    const editable = typeof opts.onChange === 'function';
    els.change.hidden = !editable;
    els.cropBtn.hidden = !editable;
    els.del.hidden = typeof opts.onDelete !== 'function';
    showView();
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function crop(opts) {
    opts = opts || {};
    if (!opts.source) { console.warn('PhotoEditor.crop: falta "source"'); return; }
    build();
    current = null;
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
    startCrop(opts.source, opts.onSave, false);
  }

  function close() {
    if (!root) return;
    root.classList.remove('open');
    document.body.style.overflow = '';
    current = null;
    cropS = null;
    if (els.cropImg && els.cropImg._peUrl) { URL.revokeObjectURL(els.cropImg._peUrl); els.cropImg._peUrl = null; }
  }

  window.PhotoEditor = { open, crop, close };
})();
