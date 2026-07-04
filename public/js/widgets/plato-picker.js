/**
 * PlatoPicker — selector visual de platos (grid de cards foto + nombre).
 * Widget reutilizable autocontenido. Hereda tokens del tema con fallbacks.
 * Mobile-first: touch targets ≥44px, scroll vertical en grilla, Esc cierra.
 *
 * Uso (modo simple — un plato y cierra):
 *   PlatoPicker.open({
 *     platos:   [...],              // array de { id, nombre, url_foto, descripcion? }
 *     onSelect: (plato) => { ... } // callback con el objeto plato elegido
 *   });
 *
 * Uso (modo multi — flujo v2: marcar/desmarcar varios y confirmar una vez):
 *   PlatoPicker.open({
 *     platos:      [...],
 *     multi:       true,
 *     selectedIds: [1, 5],           // pre-marcados (los ya asignados a la sección)
 *     title:       'Platos para «Segundo»',
 *     onConfirm:   (ids) => { ... }  // array final de ids seleccionados
 *   });
 *   PlatoPicker.close();
 */
(function () {
  'use strict';
  if (window.PlatoPicker) return;

  let overlay = null;
  let current = null;
  let sel = new Set();      // selección viva (modo multi)
  let inicial = new Set();  // selección al abrir (para el label "N nuevos · quitar M")

  const STYLE = `
.pp-overlay {
  display: none; position: fixed; inset: 0; z-index: 1400;
  background: rgba(0,0,0,0.6);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  align-items: flex-end; justify-content: center;
  animation: pp-fade .2s ease;
}
.pp-overlay.open { display: flex; }
@keyframes pp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pp-slide { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }
.pp-sheet {
  background: var(--surface, #fff); color: var(--text, #1a1410);
  width: 100%; max-width: 520px;
  max-height: 80vh;
  border-radius: var(--r-lg, 16px) var(--r-lg, 16px) 0 0;
  border: 1px solid var(--border, rgba(0,0,0,.1));
  border-bottom: none;
  box-shadow: var(--shadow-xl, 0 -8px 40px rgba(0,0,0,.25));
  animation: pp-slide .25s cubic-bezier(.16,1,.3,1);
  display: flex; flex-direction: column; overflow: hidden;
}
.pp-header {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border, rgba(0,0,0,.1));
  flex-shrink: 0;
}
.pp-title {
  font-family: var(--font-display, Georgia, serif);
  font-weight: 700; font-size: 1.1rem;
}
.pp-close {
  background: none; border: none; font-size: 20px; cursor: pointer;
  color: var(--muted, #888);
  min-width: 44px; min-height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.pp-close:hover { background: var(--bg, rgba(0,0,0,.05)); }
.pp-search-wrap {
  padding: 0.75rem 1.25rem 0;
  flex-shrink: 0;
}
.pp-search {
  width: 100%; box-sizing: border-box;
  border: 1px solid var(--border, rgba(0,0,0,.15));
  border-radius: 8px;
  padding: 0 0.75rem;
  font-size: 16px;
  height: 44px;
  background: var(--bg, #f5f1ed);
  color: var(--text, #1a1410);
  outline: none;
}
.pp-search:focus { border-color: var(--accent, #c8692a); }
.pp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  grid-auto-rows: min-content;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem 1.25rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.pp-card {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.45rem;
  padding: 0.65rem 0.5rem;
  border-radius: var(--r, 10px);
  border: 2px solid transparent;
  background: var(--bg, #f5f1ed);
  cursor: pointer;
  transition: border-color .15s, transform .1s, box-shadow .15s;
  min-height: 44px;
  text-align: center;
  -webkit-tap-highlight-color: transparent;
}
.pp-card:hover { border-color: var(--accent, #c8692a); box-shadow: 0 2px 10px rgba(200,105,42,.15); }
.pp-card:active { transform: scale(.97); }
.pp-img {
  width: 100px; height: 100px;
  border-radius: var(--r, 10px);
  object-fit: cover;
  display: block;
}
.pp-placeholder {
  width: 100px; height: 100px;
  border-radius: var(--r, 10px);
  background: var(--surface, #eee);
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; color: var(--muted, #aaa);
  border: 1px solid var(--border, rgba(0,0,0,.1));
}
.pp-name {
  font-size: 12px; font-weight: 600;
  color: var(--text, #1a1410);
  line-height: 1.3;
  max-width: 130px;
  word-break: break-word;
}
.pp-empty {
  grid-column: 1 / -1;
  text-align: center; padding: 2rem;
  color: var(--muted, #888); font-size: 13px;
}
/* ── Modo multi-selección ── */
.pp-card { position: relative; }
.pp-card.sel {
  border-color: var(--accent, #c8692a);
  background: var(--accent-glow-soft, rgba(200,105,42,.08));
}
.pp-check {
  position: absolute; top: 6px; right: 6px; width: 22px; height: 22px;
  border-radius: 50%; background: var(--accent, #c8692a); color: #fff;
  font-size: 13px; line-height: 22px; text-align: center; display: none;
}
.pp-card.sel .pp-check { display: block; }
.pp-ya {
  position: absolute; top: 6px; left: 6px; font-size: 9.5px; font-weight: 700;
  color: var(--muted, #888); background: var(--surface, #fff);
  border: 1px solid var(--border, rgba(0,0,0,.1));
  border-radius: 6px; padding: 2px 5px;
}
.pp-count { font-size: 13px; font-weight: 700; color: var(--accent, #c8692a); white-space: nowrap; }
.pp-foot {
  display: none; flex-shrink: 0;
  padding: 10px 1.25rem calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border, rgba(0,0,0,.1));
  background: var(--surface, #fff);
}
.pp-foot.show { display: block; }
.pp-confirm {
  width: 100%; min-height: 48px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--accent, #c8692a);
  background: var(--accent, #c8692a); color: #fff;
  font-size: 15px; font-weight: 700;
}
.pp-confirm:active { transform: scale(.99); }
`;

  function injectStyle() {
    if (document.getElementById('pp-style')) return;
    const s = document.createElement('style');
    s.id = 'pp-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function buildDOM() {
    if (overlay) return;
    injectStyle();

    overlay = document.createElement('div');
    overlay.className = 'pp-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="pp-sheet">
        <div class="pp-header">
          <span class="pp-title">Elegir plato</span>
          <span class="pp-count"></span>
          <button class="pp-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="pp-search-wrap">
          <input class="pp-search" type="search" placeholder="Buscar plato…" autocomplete="off" aria-label="Buscar plato">
        </div>
        <div class="pp-grid"></div>
        <div class="pp-foot">
          <button class="pp-confirm">Listo ✓</button>
        </div>
      </div>
    `;

    overlay.querySelector('.pp-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    overlay.querySelector('.pp-search').addEventListener('input', (e) => renderCards(e.target.value.trim()));
    overlay.querySelector('.pp-confirm').addEventListener('click', () => {
      const cb = current && current.onConfirm;
      const ids = [...sel];
      close();
      if (cb) cb(ids);
    });

    document.body.appendChild(overlay);
  }

  function renderCards(query) {
    const grid = overlay.querySelector('.pp-grid');
    const platos = current.platos || [];
    const q = query.toLowerCase();
    const filtered = q ? platos.filter(p => p.nombre.toLowerCase().includes(q)) : platos;

    if (!filtered.length) {
      grid.innerHTML = `<div class="pp-empty">Sin resultados</div>`;
      return;
    }

    const multi = !!current.multi;
    grid.innerHTML = filtered.map(p => `
      <button class="pp-card ${multi && sel.has(p.id) ? 'sel' : ''}" data-id="${p.id}" aria-label="${esc(p.nombre)}">
        ${multi && inicial.has(p.id) ? '<span class="pp-ya">ya asignado</span>' : ''}
        ${multi ? '<span class="pp-check">✓</span>' : ''}
        ${p.url_foto
          ? `<img class="pp-img" src="${p.url_foto}" alt="${esc(p.nombre)}" loading="lazy">`
          : `<div class="pp-placeholder">🍽️</div>`}
        <span class="pp-name">${esc(p.nombre)}</span>
      </button>
    `).join('');

    grid.querySelectorAll('.pp-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        if (multi) {
          // Marcar/desmarcar sin cerrar — se confirma todo junto en el footer
          sel.has(id) ? sel.delete(id) : sel.add(id);
          btn.classList.toggle('sel', sel.has(id));
          updateFooter();
          return;
        }
        const plato = platos.find(p => p.id === id);
        if (plato && current.onSelect) current.onSelect(plato);
        close();
      });
    });
  }

  // Contador del header + label dinámico del botón de confirmación (modo multi)
  function updateFooter() {
    if (!overlay || !current || !current.multi) return;
    overlay.querySelector('.pp-count').textContent = sel.size ? `${sel.size} ✓` : '';
    const nuevos   = [...sel].filter(id => !inicial.has(id)).length;
    const quitados = [...inicial].filter(id => !sel.has(id)).length;
    const partes = [];
    if (nuevos)   partes.push(`${nuevos} nuevo${nuevos > 1 ? 's' : ''}`);
    if (quitados) partes.push(`quitar ${quitados}`);
    overlay.querySelector('.pp-confirm').textContent = partes.length ? `Guardar (${partes.join(' · ')}) ✓` : 'Listo ✓';
  }

  function esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function open(opts) {
    buildDOM();
    current = opts;
    sel     = new Set(opts.multi ? (opts.selectedIds || []) : []);
    inicial = new Set(sel);
    overlay.querySelector('.pp-title').textContent = opts.title || (opts.multi ? 'Elegir platos' : 'Elegir plato');
    overlay.querySelector('.pp-foot').classList.toggle('show', !!opts.multi);
    overlay.querySelector('.pp-search').value = '';
    renderCards('');
    updateFooter();
    overlay.classList.add('open');
    overlay.querySelector('.pp-search').focus();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    current = null;
    sel = new Set(); inicial = new Set();
  }

  window.PlatoPicker = { open, close };
})();
