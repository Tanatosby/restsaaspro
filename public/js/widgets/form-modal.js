/**
 * FormModal — modal de formulario genérico y reutilizable. Ver widgets.md.
 *
 * Autocontenido (drop-in): crea su DOM, inyecta sus estilos una vez, hereda los
 * tokens de tema (--accent, --surface, --r…) con fallbacks. Mobile-first: inputs
 * 16px (sin zoom iOS), touch targets ≥44px. Sin dependencias externas.
 *
 * Uso:
 *   FormModal.open({
 *     title: 'Editar plato',
 *     fields: [
 *       { name:'nombre', label:'Nombre', type:'text', value:'Lomo', required:true },
 *       { name:'precio', label:'Precio S/', type:'number', value:25, step:'0.01', min:'0', required:true },
 *       { name:'descripcion', label:'Descripción', type:'textarea', value:'' },
 *       { name:'id_categoria', label:'Categoría', type:'select', value:3, required:true,
 *         options:[{ value:3, label:'Carnes' }, { value:5, label:'Postres' }] },
 *     ],
 *     submitLabel: 'Guardar',
 *     onSubmit: async (values) => { await api('PATCH', '/...', values); }, // throw Error → muestra el mensaje
 *   });
 *   FormModal.close();
 */
(function () {
  'use strict';
  if (window.FormModal) return; // idempotente

  let overlay = null, titleEl, body, errEl, btnSubmit, btnCancel;
  let inputs = {};       // { name: { el, def } }
  let current = null;    // opciones de open() en curso

  const STYLE = `
.fm-overlay {
  display: none; position: fixed; inset: 0; z-index: 1300;
  background: rgba(0,0,0,0.55);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  align-items: center; justify-content: center; padding: 1rem; animation: fm-fade .2s ease;
}
.fm-overlay.open { display: flex; }
@keyframes fm-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes fm-pop  { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: none; opacity: 1; } }
.fm-card {
  background: var(--surface, #fff); color: var(--text, #1a1410);
  width: 100%; max-width: 420px; max-height: 90vh; overflow-y: auto;
  border-radius: var(--r-lg, 16px); border: 1px solid var(--border, rgba(0,0,0,.1));
  box-shadow: var(--shadow-xl, 0 20px 50px rgba(0,0,0,.3)); animation: fm-pop .25s cubic-bezier(.16,1,.3,1);
}
.fm-header {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--border, rgba(0,0,0,.1));
}
.fm-title { font-family: var(--font-display, Georgia, serif); font-weight: 700; font-size: 1.15rem; }
.fm-close {
  background: none; border: none; font-size:1.428571rem; cursor: pointer; color: var(--muted, #888);
  width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
}
.fm-close:hover { background: var(--bg, rgba(0,0,0,.05)); }
.fm-body { padding: 1.1rem 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; }
.fm-field { display: flex; flex-direction: column; gap: 0.3rem; }
.fm-field label { font-size:0.857143rem; font-weight: 700; color: var(--muted, #777); text-transform: uppercase; letter-spacing: .02em; }
.fm-field input, .fm-field select, .fm-field textarea {
  font-size:1.142857rem; font-family: inherit; color: var(--text, #1a1410);
  background: var(--bg, #fff); border: 1px solid var(--border, rgba(0,0,0,.15));
  border-radius: var(--r-sm, 7px); padding: 10px 12px; min-height: 44px; width: 100%;
  outline: none; transition: border-color .15s ease;
}
.fm-field textarea { min-height: 72px; resize: vertical; }
.fm-field input:focus, .fm-field select:focus, .fm-field textarea:focus { border-color: var(--accent, #c8692a); }
.fm-error { color: var(--danger, #dc3545); font-size:0.928571rem; }
.fm-error:empty { display: none; }
.fm-footer { display: flex; gap: 0.6rem; justify-content: flex-end; padding: 0.9rem 1.25rem 1.1rem; flex-wrap: wrap; }
.fm-btn {
  min-height: 44px; padding: 0 18px; border-radius: var(--r-sm, 7px); font-size:1rem; font-weight: 600;
  cursor: pointer; border: 1px solid transparent; transition: all .15s ease;
}
.fm-btn:active { transform: scale(.97); }
.fm-btn:disabled { opacity: .6; cursor: default; }
.fm-btn-cancel { background: transparent; color: var(--text, #1a1410); border-color: var(--border, rgba(0,0,0,.2)); }
.fm-btn-cancel:hover { background: var(--bg, rgba(0,0,0,.04)); }
.fm-btn-submit { background: var(--accent, #c8692a); color: #fff; }
.fm-btn-submit:hover { filter: brightness(1.06); }
@media (prefers-reduced-motion: reduce) { .fm-overlay, .fm-card { animation: none; } .fm-btn:active { transform: none; } }`;

  function injectStyles() {
    if (document.getElementById('fm-styles')) return;
    const s = document.createElement('style');
    s.id = 'fm-styles';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function build() {
    if (overlay) return;
    injectStyles();
    overlay = document.createElement('div');
    overlay.className = 'fm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="fm-card" role="document">
        <div class="fm-header">
          <span class="fm-title"></span>
          <button class="fm-close" type="button" aria-label="Cerrar">✕</button>
        </div>
        <div class="fm-body"></div>
        <div class="fm-error" aria-live="polite"></div>
        <div class="fm-footer">
          <button class="fm-btn fm-btn-cancel" type="button">Cancelar</button>
          <button class="fm-btn fm-btn-submit" type="button">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    titleEl   = overlay.querySelector('.fm-title');
    body      = overlay.querySelector('.fm-body');
    errEl     = overlay.querySelector('.fm-error');
    btnCancel = overlay.querySelector('.fm-btn-cancel');
    btnSubmit = overlay.querySelector('.fm-btn-submit');

    overlay.querySelector('.fm-close').addEventListener('click', close);
    btnCancel.addEventListener('click', close);
    btnSubmit.addEventListener('click', submit);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); submit(); }
    });
  }

  function renderFields(fields) {
    body.innerHTML = '';
    inputs = {};
    (fields || []).forEach((f) => {
      const wrap = document.createElement('div');
      wrap.className = 'fm-field';
      const id = 'fm-f-' + f.name;
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = f.label || f.name;
      wrap.appendChild(label);

      let input;
      if (f.type === 'select') {
        input = document.createElement('select');
        (f.options || []).forEach((o) => {
          const opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          if (String(o.value) === String(f.value)) opt.selected = true;
          input.appendChild(opt);
        });
      } else if (f.type === 'textarea') {
        input = document.createElement('textarea');
        if (f.placeholder) input.placeholder = f.placeholder;
        input.value = f.value != null ? f.value : '';
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
        if (f.placeholder) input.placeholder = f.placeholder;
        if (f.step != null) input.step = f.step;
        if (f.min != null) input.min = f.min;
        if ((f.type || 'text') === 'text') input.autocomplete = 'off';
        input.value = f.value != null ? f.value : '';
      }
      input.id = id;
      if (f.required) input.required = true;
      inputs[f.name] = { el: input, def: f };
      wrap.appendChild(input);
      body.appendChild(wrap);
    });
  }

  function showError(msg) { errEl.textContent = msg || ''; }

  function validate() {
    for (const name in inputs) {
      const { el, def } = inputs[name];
      if (def.required && !String(el.value).trim()) return def.label || name;
    }
    return null;
  }

  function collect() {
    const values = {};
    for (const name in inputs) {
      let v = inputs[name].el.value;
      if (typeof v === 'string') v = v.trim();
      values[name] = v;
    }
    return values;
  }

  async function submit() {
    const missing = validate();
    if (missing) { showError(`Completa el campo: ${missing}`); return; }
    showError('');
    const values = collect();
    const label = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando…';
    try {
      if (current && typeof current.onSubmit === 'function') await current.onSubmit(values);
      close();
    } catch (e) {
      showError(e && e.message ? e.message : 'No se pudo guardar');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = label;
    }
  }

  function open(opts) {
    opts = opts || {};
    build();
    current = opts;
    titleEl.textContent = opts.title || '';
    renderFields(opts.fields);
    showError('');
    btnSubmit.textContent = opts.submitLabel || 'Guardar';
    btnCancel.textContent = opts.cancelLabel || 'Cancelar';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    const first = body.querySelector('input, select, textarea');
    if (first) setTimeout(() => { first.focus(); }, 50);
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    current = null;
  }

  window.FormModal = { open, close };
})();
