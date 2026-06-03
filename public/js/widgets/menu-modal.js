/**
 * MenuModal — bottom-sheet de selección de menú del día para menu.html.
 * Reutiliza las clases CSS de menu.css (.seccion-block, .plato-option, etc.)
 * y llama a las funciones globales de menu.html (selectMenuPlato, agregarMenu).
 *
 * Uso (desde menu.html):
 *   MenuModal.open({ menu, mode })  // menu: objeto completo con secciones; mode: 'pedir'|'reservar'
 *   MenuModal.close()
 */
(function () {
  'use strict';
  if (window.MenuModal) return;

  let overlay = null;
  let current = null;

  const STYLE = `
.mm-overlay {
  display: none; position: fixed; inset: 0; z-index: 1500;
  background: rgba(0,0,0,0.6);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  align-items: flex-end; justify-content: center;
  animation: mm-fade .2s ease;
}
.mm-overlay.open { display: flex; }
@keyframes mm-fade  { from { opacity: 0 } to { opacity: 1 } }
@keyframes mm-slide { from { transform: translateY(28px); opacity: 0 } to { transform: none; opacity: 1 } }
.mm-sheet {
  background: var(--surface, #fff); color: var(--text, #1a1410);
  width: 100%; max-width: 520px;
  max-height: 88vh;
  border-radius: 20px 20px 0 0;
  border: 1px solid var(--border, rgba(0,0,0,.1)); border-bottom: none;
  box-shadow: 0 -8px 40px rgba(0,0,0,.28);
  animation: mm-slide .28s cubic-bezier(.16,1,.3,1);
  display: flex; flex-direction: column; overflow: hidden;
}
.mm-handle {
  width: 40px; height: 4px; border-radius: 2px;
  background: var(--border, #d0c8be);
  margin: 10px auto 0; flex-shrink: 0;
}
.mm-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 0.75rem; padding: 0.85rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--border, rgba(0,0,0,.08)); flex-shrink: 0;
}
.mm-header-info { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.mm-nombre {
  font-family: var(--font-display, Georgia, serif);
  font-weight: 700; font-size: 1.1rem;
  color: var(--text, #1a1410);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mm-meta { display: flex; align-items: center; gap: 8px; }
.mm-tipo {
  font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--accent, #c8692a);
}
.mm-precio {
  font-size: 14px; font-weight: 700; color: var(--text, #1a1410);
}
.mm-close {
  background: none; border: none; font-size: 20px; cursor: pointer;
  color: var(--muted, #888); min-width: 44px; min-height: 44px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.mm-close:hover { background: var(--bg, rgba(0,0,0,.05)); }
.mm-body {
  overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding: 1rem 1.25rem; flex: 1;
}
.mm-footer {
  padding: 0.85rem 1.25rem; flex-shrink: 0;
  border-top: 1px solid var(--border, rgba(0,0,0,.08));
  background: var(--surface, #fff);
}
.mm-btn-agregar {
  width: 100%; padding: 0 1rem;
  min-height: 52px; border-radius: 12px; border: none; cursor: pointer;
  font-size: 16px; font-weight: 700;
  background: var(--accent, #c8692a); color: #fff;
  transition: opacity .15s, transform .1s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.mm-btn-agregar:active { opacity: .88; transform: scale(.98); }
`;

  function injectStyle() {
    if (document.getElementById('mm-style')) return;
    const s = document.createElement('style');
    s.id = 'mm-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function buildDOM() {
    if (overlay) return;
    injectStyle();

    overlay = document.createElement('div');
    overlay.className = 'mm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="mm-sheet">
        <div class="mm-handle"></div>
        <div class="mm-header">
          <div class="mm-header-info">
            <div class="mm-nombre"></div>
            <div class="mm-meta">
              <span class="mm-tipo"></span>
              <span style="color:var(--muted,#aaa);font-size:11px">·</span>
              <span class="mm-precio"></span>
            </div>
          </div>
          <button class="mm-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="mm-body"></div>
        <div class="mm-footer">
          <button class="mm-btn-agregar"></button>
        </div>
      </div>
    `;

    overlay.querySelector('.mm-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current) close(); });

    document.body.appendChild(overlay);
  }

  function render() {
    const { menu, mode } = current;
    const prefix = mode === 'pedir' ? 'p' : 'r';

    overlay.querySelector('.mm-nombre').textContent = menu.nombre;
    overlay.querySelector('.mm-tipo').textContent   = menu.elegible ? 'Elige tus platos' : 'Menú fijo';
    overlay.querySelector('.mm-precio').textContent = `S/ ${Number(menu.precio).toFixed(2)}`;

    const seccionesHtml = menu.secciones.map(s => {
      const disponibles = s.platos.filter(p => !p.agotado);
      const agotadosHtml = s.platos.filter(p => p.agotado).map(p =>
        `<div class="plato-fijo" style="opacity:.45">
          <span class="plato-fijo-dot" style="background:var(--muted,#aaa);box-shadow:none"></span>
          <span style="flex:1;text-decoration:line-through;color:var(--muted,#aaa)">${esc(p.nombre)}</span>
          <span style="font-size:11px;color:var(--muted,#aaa)">Agotado</span>
        </div>`
      ).join('');

      const platosHtml = disponibles.map(p => {
        if (menu.elegible) {
          const fotoAttr = p.url_foto
            ? `<img src="${esc(p.url_foto)}" class="plato-thumb" alt="${esc(p.nombre)}" onclick="event.preventDefault();event.stopPropagation();openPhotoModal('${esc(p.url_foto)}','${esc(p.nombre)}','${esc(p.descripcion || '')}')">`
            : '';
          return `<label class="plato-option">
            <input type="radio" name="${prefix}-sec-${menu.id}-${s.id_seccion}" value="${p.id_componente}"
              onchange="selectMenuPlato('${mode}',${menu.id},${s.id_seccion},${p.id_componente},'${esc(p.nombre)}','${esc(s.nombre_seccion)}',${menu.precio},${menu.id})">
            <div style="flex:1;min-width:0">
              <div class="plato-option-name">${esc(p.nombre)}</div>
              ${p.descripcion ? `<div class="plato-option-desc">${esc(p.descripcion)}</div>` : ''}
            </div>
            ${fotoAttr}
          </label>`;
        } else {
          const fotoAttr = p.url_foto
            ? `<img src="${esc(p.url_foto)}" class="plato-thumb" alt="${esc(p.nombre)}" onclick="openPhotoModal('${esc(p.url_foto)}','${esc(p.nombre)}','${esc(p.descripcion || '')}')">`
            : '';
          return `<div class="plato-fijo">
            <span class="plato-fijo-dot"></span>
            <span style="flex:1">${esc(p.nombre)}</span>
            ${fotoAttr}
          </div>`;
        }
      }).join('');

      return `<div class="seccion-block">
        <div class="seccion-label">${esc(s.nombre_seccion)}${s.requerido ? '<span class="seccion-req">obligatorio</span>' : ''}</div>
        ${platosHtml}
        ${agotadosHtml}
      </div>`;
    }).join('');

    overlay.querySelector('.mm-body').innerHTML = seccionesHtml || '<div style="text-align:center;padding:2rem;color:var(--muted,#aaa);font-size:13px">Sin secciones configuradas</div>';

    const btnLabel = menu.elegible
      ? `🛒 Agregar al pedido — S/ ${Number(menu.precio).toFixed(2)}`
      : `🛒 Agregar menú — S/ ${Number(menu.precio).toFixed(2)}`;
    const btn = overlay.querySelector('.mm-btn-agregar');
    btn.textContent = btnLabel;
    btn.onclick = () => {
      const ok = agregarMenu(mode, menu.id, menu.elegible ? 1 : 0, menu.precio, menu.nombre);
      if (ok) close();
    };
  }

  function open(opts) {
    buildDOM();
    current = opts;
    render();
    overlay.classList.add('open');
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    current = null;
  }

  window.MenuModal = { open, close };
})();
