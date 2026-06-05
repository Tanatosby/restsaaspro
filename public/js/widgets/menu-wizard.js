/**
 * MenuWizard — asistente tipo carrusel para crear menús del día (owner.html).
 * Widget autocontenido y montable inline (no es modal). Hereda tokens del tema.
 * Mobile-first: cards del mismo tamaño, touch ≥44px, inputs 16px, sin overflow de página.
 *
 * Flujo (4 pasos, deslizamiento horizontal — no scroll vertical):
 *   1) Elige la fecha del menú
 *   2) Nombre + precio
 *   3) ¿Este menú es fijo o el cliente elige sus platos?  → crea el menú
 *   4) Menús de esa fecha (carrusel horizontal, 1 por vista, ⚙ Configurar)
 *
 * Uso:
 *   MenuWizard.mount(document.getElementById('menu-wizard-mount'), {
 *     onConfigure: (menuId) => abrirConfigMenu(menuId),
 *   });
 *   MenuWizard.reload();   // re-fetch + re-render del paso 4 para la fecha actual
 *
 * Depende de los globales ya presentes en owner.html: api(), toast(), esc(), fDate(),
 * y de los handlers globales toggleElegibleMenu/toggleActivoMenu/eliminarMenuDia.
 */
(function () {
  'use strict';
  if (window.MenuWizard) return;

  let host = null;        // contenedor donde se monta
  let opts = {};          // { onConfigure }
  let state = { step: 0, dia: '', nombre: '', precio: '', elegible: 0, menus: [] };

  const STYLE = `
.mw { width: 100%; }
.mw-progress {
  display: flex; align-items: center; gap: 6px;
  margin: 0 0 0.75rem; padding: 0 2px;
}
.mw-dot {
  flex: 1; height: 4px; border-radius: 4px;
  background: var(--border, rgba(0,0,0,.12));
  transition: background .25s;
}
.mw-dot.done { background: var(--primary, #c8692a); }
.mw-viewport { overflow: hidden; border-radius: var(--r, 12px); }
.mw-track {
  display: flex;
  transition: transform .35s cubic-bezier(.16,1,.3,1);
  will-change: transform;
}
.mw-slide { flex: 0 0 100%; min-width: 100%; box-sizing: border-box; padding: 2px; }
.mw-card {
  background: var(--surface, #fff); color: var(--text, #1a1410);
  border: 1px solid var(--border, rgba(0,0,0,.1));
  border-radius: var(--r, 12px);
  box-shadow: var(--shadow-sm, 0 2px 12px rgba(0,0,0,.06));
  padding: 1.25rem;
  min-height: 340px;
  display: flex; flex-direction: column;
}
.mw-step-label {
  font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  color: var(--primary, #c8692a); margin-bottom: 0.35rem;
}
.mw-title {
  font-family: var(--font-display, Georgia, serif);
  font-size: 1.25rem; font-weight: 700; line-height: 1.25;
  margin: 0 0 1rem;
}
.mw-body { flex: 1; display: flex; flex-direction: column; gap: 0.85rem; }
.mw-field { display: flex; flex-direction: column; gap: 0.35rem; }
.mw-field label { font-size: 13px; font-weight: 600; color: var(--text-2, #555); }
.mw-input {
  width: 100%; box-sizing: border-box;
  border: 1px solid var(--border, rgba(0,0,0,.15));
  border-radius: 10px; padding: 0 0.85rem; height: 48px;
  font-size: 16px; background: var(--bg, #f5f1ed); color: var(--text, #1a1410);
  outline: none; transition: border-color .15s;
}
.mw-input:focus { border-color: var(--primary, #c8692a); }
.mw-err { color: var(--danger, #c0392b); font-size: 13px; min-height: 1em; }
.mw-choices { display: flex; flex-direction: column; gap: 0.75rem; }
.mw-choice {
  display: flex; align-items: flex-start; gap: 0.75rem; text-align: left;
  width: 100%; box-sizing: border-box; cursor: pointer;
  border: 2px solid var(--border, rgba(0,0,0,.15));
  border-radius: var(--r, 12px); padding: 1rem;
  background: var(--bg, #f5f1ed); color: var(--text, #1a1410);
  transition: border-color .15s, background .15s, transform .1s;
  min-height: 44px; -webkit-tap-highlight-color: transparent;
}
.mw-choice:active { transform: scale(.99); }
.mw-choice.sel { border-color: var(--primary, #c8692a); background: var(--accent-glow-soft, rgba(200,105,42,.08)); }
.mw-choice-emoji { font-size: 26px; line-height: 1; }
.mw-choice-txt { display: flex; flex-direction: column; gap: 2px; }
.mw-choice-name { font-weight: 700; font-size: 15px; }
.mw-choice-desc { font-size: 13px; color: var(--muted, #888); }
.mw-actions {
  display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;
}
.mw-btn {
  flex: 1; min-width: 0; min-height: 48px;
  border-radius: 10px; border: 1px solid var(--border, rgba(0,0,0,.15));
  font-size: 15px; font-weight: 600; cursor: pointer;
  background: var(--bg, #f5f1ed); color: var(--text, #1a1410);
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: transform .1s, opacity .15s;
}
.mw-btn:active { transform: scale(.98); }
.mw-btn-primary {
  background: var(--primary, #c8692a); color: #fff; border-color: var(--primary, #c8692a);
}
.mw-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.mw-btn-ghost { background: transparent; }

/* Paso 4 — carrusel horizontal de menús */
.mw-menus {
  display: flex; gap: 0.85rem; overflow-x: auto; overflow-y: hidden;
  scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
  margin: 0 -1.25rem; padding: 0 1.25rem 0.5rem; flex: 1;
  scrollbar-width: none;
}
.mw-menus::-webkit-scrollbar { display: none; }
.mw-menu-card {
  flex: 0 0 100%; scroll-snap-align: center; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 0.6rem;
  border: 1px solid var(--border, rgba(0,0,0,.1));
  border-radius: var(--r, 12px); padding: 1rem;
  background: var(--bg, #f5f1ed);
}
.mw-menu-card.oculto { opacity: .6; }
.mw-menu-top { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.mw-menu-name { font-weight: 700; font-size: 1.05rem; }
.mw-menu-meta { font-size: 12px; color: var(--muted, #888); }
.mw-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.mw-pill {
  font-size: 11px; padding: 2px 8px; border-radius: 6px;
  background: var(--surface, #fff); border: 1px solid var(--border, rgba(0,0,0,.1));
  color: var(--text-2, #555);
}
.mw-pill.muted { color: var(--muted, #888); border: none; padding-left: 0; }
.mw-toggles { display: flex; flex-wrap: wrap; gap: 6px; }
.mw-toggle {
  font-size: 13px; padding: 0 10px; min-height: 38px; border-radius: 8px;
  cursor: pointer; border: 1px solid; background: transparent;
}
.mw-menu-actions { display: flex; gap: 6px; margin-top: auto; }
.mw-menu-actions .mw-btn { min-height: 44px; font-size: 14px; }
.mw-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.5rem; color: var(--muted, #888); font-size: 14px; text-align: center;
}
.mw-empty-emoji { font-size: 2.5rem; }
.mw-hint { font-size: 12px; color: var(--muted, #888); text-align: center; margin-top: 4px; }
@media (prefers-reduced-motion: reduce) {
  .mw-track { transition: none; }
}
`;

  function injectStyle() {
    if (document.getElementById('mw-style')) return;
    const s = document.createElement('style');
    s.id = 'mw-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function todayLima() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  }

  function buildDOM() {
    injectStyle();
    host.innerHTML = `
      <div class="mw">
        <div class="mw-progress">
          <div class="mw-dot" data-d="0"></div>
          <div class="mw-dot" data-d="1"></div>
          <div class="mw-dot" data-d="2"></div>
          <div class="mw-dot" data-d="3"></div>
        </div>
        <div class="mw-viewport">
          <div class="mw-track">
            ${slideFecha()}
            ${slideNombrePrecio()}
            ${slidePregunta()}
            ${slideMenus()}
          </div>
        </div>
      </div>`;
    wire();
    goto(0);
  }

  // ── Paso 1: Fecha ──────────────────────────────────────────
  function slideFecha() {
    return `
    <div class="mw-slide" data-step="0">
      <div class="mw-card">
        <div class="mw-step-label">Paso 1 de 4</div>
        <h3 class="mw-title">Elige la fecha del menú</h3>
        <div class="mw-body">
          <div class="mw-field">
            <label for="mw-fecha">Fecha del menú del día</label>
            <input class="mw-input" id="mw-fecha" type="date">
          </div>
          <div class="mw-err" id="mw-err-fecha"></div>
        </div>
        <div class="mw-actions">
          <button class="mw-btn mw-btn-primary" data-act="to-2">Siguiente →</button>
        </div>
      </div>
    </div>`;
  }

  // ── Paso 2: Nombre + Precio ────────────────────────────────
  function slideNombrePrecio() {
    return `
    <div class="mw-slide" data-step="1">
      <div class="mw-card">
        <div class="mw-step-label">Paso 2 de 4</div>
        <h3 class="mw-title">Nombre y precio</h3>
        <div class="mw-body">
          <div class="mw-field">
            <label for="mw-nombre">Nombre</label>
            <input class="mw-input" id="mw-nombre" type="text" placeholder="Menú del día">
          </div>
          <div class="mw-field">
            <label for="mw-precio">Precio S/ *</label>
            <input class="mw-input" id="mw-precio" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00">
          </div>
          <div class="mw-err" id="mw-err-precio"></div>
        </div>
        <div class="mw-actions">
          <button class="mw-btn mw-btn-ghost" data-act="to-1">← Atrás</button>
          <button class="mw-btn mw-btn-primary" data-act="to-3">Siguiente →</button>
        </div>
      </div>
    </div>`;
  }

  // ── Paso 3: ¿Fijo o el cliente elige? ──────────────────────
  function slidePregunta() {
    return `
    <div class="mw-slide" data-step="2">
      <div class="mw-card">
        <div class="mw-step-label">Paso 3 de 4</div>
        <h3 class="mw-title">¿Este menú es fijo o el cliente elige sus platos?</h3>
        <div class="mw-body">
          <div class="mw-choices">
            <button class="mw-choice" data-elegible="0">
              <span class="mw-choice-emoji">🍽️</span>
              <span class="mw-choice-txt">
                <span class="mw-choice-name">Menú fijo</span>
                <span class="mw-choice-desc">Todos reciben los mismos platos.</span>
              </span>
            </button>
            <button class="mw-choice" data-elegible="1">
              <span class="mw-choice-emoji">✅</span>
              <span class="mw-choice-txt">
                <span class="mw-choice-name">El cliente elige</span>
                <span class="mw-choice-desc">Escoge un plato por cada sección (entrada, fondo…).</span>
              </span>
            </button>
          </div>
          <div class="mw-err" id="mw-err-crear"></div>
        </div>
        <div class="mw-actions">
          <button class="mw-btn mw-btn-ghost" data-act="to-2b">← Atrás</button>
          <button class="mw-btn mw-btn-primary" data-act="crear" disabled>Crear menú ✓</button>
        </div>
      </div>
    </div>`;
  }

  // ── Paso 4: Menús de la fecha ──────────────────────────────
  function slideMenus() {
    return `
    <div class="mw-slide" data-step="3">
      <div class="mw-card">
        <div class="mw-step-label">Paso 4 de 4</div>
        <h3 class="mw-title" id="mw-menus-title">Menús configurados</h3>
        <div class="mw-menus" id="mw-menus-list"></div>
        <div class="mw-hint" id="mw-menus-hint"></div>
        <div class="mw-actions">
          <button class="mw-btn mw-btn-ghost" data-act="cambiar-fecha">← Cambiar fecha</button>
          <button class="mw-btn mw-btn-primary" data-act="crear-otro">＋ Crear otro</button>
        </div>
      </div>
    </div>`;
  }

  // ── Wiring ─────────────────────────────────────────────────
  function wire() {
    const fecha = host.querySelector('#mw-fecha');
    fecha.value = state.dia || todayLima();
    fecha.addEventListener('change', () => { state.dia = fecha.value; });

    host.querySelector('#mw-nombre').addEventListener('input', (e) => { state.nombre = e.target.value; });
    host.querySelector('#mw-precio').addEventListener('input', (e) => { state.precio = e.target.value; });

    host.querySelectorAll('.mw-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        state.elegible = Number(btn.dataset.elegible);
        host.querySelectorAll('.mw-choice').forEach(b => b.classList.toggle('sel', b === btn));
        host.querySelector('[data-act="crear"]').disabled = false;
      });
    });

    host.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      if (act === 'to-2')           return stepFechaNext();
      if (act === 'to-1')           return goto(0);
      if (act === 'to-3')           return stepPrecioNext();
      if (act === 'to-2b')          return goto(1);
      if (act === 'crear')          return crear();
      if (act === 'cambiar-fecha')  return goto(0);
      if (act === 'crear-otro')     return crearOtro();
    });
  }

  // ── Navegación ─────────────────────────────────────────────
  function goto(step) {
    state.step = step;
    const track = host.querySelector('.mw-track');
    track.style.transform = `translateX(-${step * 100}%)`;
    host.querySelectorAll('.mw-dot').forEach(d => {
      d.classList.toggle('done', Number(d.dataset.d) <= step);
    });
    if (step === 3) renderMenus();
  }

  function setErr(id, msg) { const el = host.querySelector('#' + id); if (el) el.textContent = msg || ''; }

  function stepFechaNext() {
    const fecha = host.querySelector('#mw-fecha').value;
    if (!fecha) return setErr('mw-err-fecha', 'Elige una fecha.');
    setErr('mw-err-fecha', '');
    state.dia = fecha;
    goto(1);
  }

  function stepPrecioNext() {
    if (!state.precio || Number(state.precio) <= 0) return setErr('mw-err-precio', 'Ingresa un precio válido.');
    setErr('mw-err-precio', '');
    goto(2);
  }

  async function crear() {
    if (!state.precio) { goto(1); return setErr('mw-err-precio', 'Ingresa un precio válido.'); }
    setErr('mw-err-crear', '');
    const btn = host.querySelector('[data-act="crear"]');
    btn.disabled = true;
    try {
      await api('POST', '/api/menu/menus-dia', {
        nombre: (state.nombre || '').trim() || 'Menú del día',
        precio: state.precio,
        dia: state.dia,
        elegible: state.elegible,
      });
      toast('Menú creado');
      // Reset para el siguiente, conservando la fecha
      state.nombre = ''; state.precio = ''; state.elegible = 0;
      host.querySelector('#mw-nombre').value = '';
      host.querySelector('#mw-precio').value = '';
      host.querySelectorAll('.mw-choice').forEach(b => b.classList.remove('sel'));
      await fetchMenus();
      goto(3);
    } catch (e) {
      setErr('mw-err-crear', e.message);
      btn.disabled = false;
    }
  }

  function crearOtro() {
    host.querySelector('[data-act="crear"]').disabled = true;
    goto(1);
  }

  // ── Datos + render del paso 4 ──────────────────────────────
  async function fetchMenus() {
    if (!state.dia) { state.menus = []; return; }
    try {
      state.menus = await api('GET', `/api/menu/menus-dia?dia=${state.dia}`);
    } catch (e) {
      state.menus = [];
      toast(e.message, 'err');
    }
  }

  function renderMenus() {
    const title = host.querySelector('#mw-menus-title');
    const list  = host.querySelector('#mw-menus-list');
    const hint  = host.querySelector('#mw-menus-hint');
    if (title) title.textContent = `Menús del ${fDate(state.dia)}`;

    if (!state.menus.length) {
      list.innerHTML = `<div class="mw-empty"><div class="mw-empty-emoji">📋</div><div>Aún no hay menús para esta fecha.</div></div>`;
      hint.textContent = '';
      return;
    }
    list.innerHTML = state.menus.map(menuCard).join('');
    hint.textContent = state.menus.length > 1 ? `Desliza para ver los ${state.menus.length} menús →` : '';
  }

  function menuCard(m) {
    const activo = m.activo !== 0;
    const secs = (m.secciones && m.secciones.length)
      ? m.secciones.map(s => `<span class="mw-pill">${esc(s.nombre_seccion)}</span>`).join('')
      : `<span class="mw-pill muted">Sin secciones</span>`;
    return `
    <div class="mw-menu-card ${activo ? '' : 'oculto'}">
      <div class="mw-menu-top">
        <span class="mw-menu-name">${esc(m.nombre)}</span>
        <span class="mw-menu-meta">S/ ${Number(m.precio).toFixed(2)}</span>
      </div>
      <div class="mw-pills">${secs}</div>
      <div class="mw-toggles">
        <button class="mw-toggle" data-toggle="elegible" data-id="${m.id}" data-cur="${m.elegible ? 1 : 0}"
          style="${m.elegible ? 'color:var(--primary,#c8692a);border-color:var(--primary,#c8692a)' : 'color:var(--muted,#888);border-color:var(--border,#ccc)'}"
        >${m.elegible ? 'Cliente elige' : 'Fijo'}</button>
        <button class="mw-toggle" data-toggle="activo" data-id="${m.id}" data-cur="${activo ? 1 : 0}"
          style="${activo ? 'color:var(--success,#1e8e3e);border-color:var(--success,#1e8e3e)' : 'color:var(--danger,#c0392b);border-color:var(--danger,#c0392b)'}"
        >${activo ? '● Visible' : '○ Oculto'}</button>
      </div>
      <div class="mw-menu-actions">
        <button class="mw-btn mw-btn-primary" data-cfg="${m.id}">⚙ Configurar</button>
        <button class="mw-btn" data-del="${m.id}" style="color:var(--danger,#c0392b)">Eliminar</button>
      </div>
    </div>`;
  }

  // Delegación de acciones del paso 4 → handlers globales de owner.html
  function wireMenuActions() {
    host.querySelector('#mw-menus-list').addEventListener('click', (e) => {
      const cfg = e.target.closest('[data-cfg]');
      if (cfg) { if (opts.onConfigure) opts.onConfigure(Number(cfg.dataset.cfg)); return; }
      const del = e.target.closest('[data-del]');
      if (del) { window.eliminarMenuDia?.(Number(del.dataset.del)); return; }
      const tg = e.target.closest('[data-toggle]');
      if (tg) {
        const id = Number(tg.dataset.id), cur = Number(tg.dataset.cur);
        if (tg.dataset.toggle === 'elegible') window.toggleElegibleMenu?.(id, cur);
        else window.toggleActivoMenu?.(id, cur);
      }
    });
  }

  // ── API pública ────────────────────────────────────────────
  function mount(el, options) {
    if (!el) return;
    host = el;
    opts = options || {};
    state = { step: 0, dia: todayLima(), nombre: '', precio: '', elegible: 0, menus: [] };
    buildDOM();
    wireMenuActions();
  }

  // Re-fetch + re-render del paso 4. Lo llaman los handlers globales vía loadMenusDia().
  async function reload() {
    if (!host) return;
    await fetchMenus();
    if (state.step === 3) renderMenus();
  }

  function isMounted() { return !!host; }

  window.MenuWizard = { mount, reload, isMounted };
})();
