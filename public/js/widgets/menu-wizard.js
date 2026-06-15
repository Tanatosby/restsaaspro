/**
 * MenuWizard — galería de menús del día + asistente de creación (owner.html).
 * Widget autocontenido y montable inline (no es modal). Hereda tokens del tema.
 * Mobile-first: touch ≥44px, inputs 16px, sin overflow de página.
 *
 * Dos vistas:
 *   GALERÍA (por defecto) — selector de fecha (◀ fecha ▶) + botón fijo "＋ Crear menú"
 *     + galería horizontal de menús de ESE día como cards retrato (más altas que anchas).
 *     Cada card: nombre, precio, secciones, toggles Fijo/Visible, ⚙ Configurar, Eliminar.
 *   WIZARD (se abre al tocar "＋ Crear menú") — 3 pasos que heredan la fecha de la galería:
 *     1) Título  ·  2) Precio  ·  3) ¿Fijo o el cliente elige?  → crea y vuelve a la galería.
 *
 * Uso:
 *   MenuWizard.mount(document.getElementById('menu-wizard-mount'), {
 *     onConfigure: (menuId) => abrirConfigMenu(menuId),
 *   });
 *   MenuWizard.reload();   // re-fetch + re-render de la galería para la fecha actual
 *
 * Depende de los globales ya presentes en owner.html: api(), toast(), esc(), fDate(),
 * y de los handlers globales toggleElegibleMenu/toggleActivoMenu/eliminarMenuDia.
 */
(function () {
  'use strict';
  if (window.MenuWizard) return;

  let host = null;        // contenedor donde se monta
  let opts = {};          // { onConfigure }
  let state = { view: 'gallery', step: 0, dia: '', nombre: '', precio: '', elegible: 0, menus: [] };

  const STYLE = `
.mw {
  width: 100%;
  /* Desktop: una card full-width, más alta para mostrar todos los controles */
  --mw-card-w: 100%;
  --mw-card-maxw: 100%;
  --mw-card-h: 480px;
}
/* Mobile: cards compactas del mismo ancho que la card del cliente (200px),
   con peek de la siguiente — igual a la experiencia del comensal */
@media (max-width: 639px) {
  .mw {
    --mw-card-w: 200px;
    --mw-card-maxw: 200px;
    --mw-card-h: 300px;
  }
}
.mw[hidden], .mw [hidden] { display: none !important; }

/* ── Galería (vista principal) ─────────────────────────────── */
.mw-gallery { display: flex; flex-direction: column; gap: 0.85rem; }
.mw-gal-head {
  display: flex; align-items: center; gap: 0.5rem;
}
.mw-nav-day {
  flex: 0 0 auto; width: 44px; height: 44px; border-radius: 10px;
  border: 1px solid var(--border, rgba(0,0,0,.15)); background: var(--surface, #fff);
  color: var(--text, #1a1410); font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.mw-nav-day:active { transform: scale(.96); }
.mw-date {
  flex: 1; min-width: 0; box-sizing: border-box;
  border: 1px solid var(--border, rgba(0,0,0,.15)); border-radius: 10px;
  padding: 0 0.75rem; height: 44px; font-size: 16px;
  background: var(--bg, #f5f1ed); color: var(--text, #1a1410); outline: none;
}
.mw-date:focus { border-color: var(--primary, #c8692a); }
.mw-create-btn {
  width: 100%; min-height: 48px; border-radius: 10px;
  border: 1px solid var(--primary, #c8692a);
  background: var(--primary, #c8692a); color: #fff;
  font-size: 15px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: transform .1s, opacity .15s;
}
.mw-create-btn:active { transform: scale(.99); }
.mw-gal-caption { font-size: 13px; color: var(--text-2, #555); font-weight: 600; }

/* Galería horizontal de cards retrato */
.mw-menus {
  display: flex; gap: 0.85rem; overflow-x: auto; overflow-y: hidden;
  scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;
  padding: 2px 0 0.6rem; scroll-padding: 0 2px;
  scrollbar-width: none;
}
.mw-menus::-webkit-scrollbar { display: none; }
.mw-menu-card {
  flex: 0 0 var(--mw-card-w, 100%); max-width: var(--mw-card-maxw, 100%); min-height: var(--mw-card-h, 480px);
  scroll-snap-align: start; box-sizing: border-box;
  display: flex; flex-direction: column; gap: 0.6rem;
  border: 1px solid var(--border, rgba(0,0,0,.12));
  border-radius: var(--r, 14px); padding: 1.1rem;
  background: var(--surface, #fff); color: var(--text, #1a1410);
  box-shadow: var(--shadow-sm, 0 2px 12px rgba(0,0,0,.06));
  position: relative; isolation: isolate; overflow: hidden;
}
.mw-menu-card.oculto { opacity: .6; }
/* Contenido siempre por encima de la foto/scrim/watermark */
.mw-menu-card > .mw-menu-top,
.mw-menu-card > .mw-pills,
.mw-menu-card > .mw-toggles,
.mw-menu-card > .mw-menu-actions { position: relative; z-index: 2; }
/* Watermark (emoji) cuando NO hay foto — llena el aire */
.mw-menu-watermark {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 7rem; opacity: .06; z-index: 0; pointer-events: none; user-select: none;
}
/* Foto de portada de fondo + scrim para legibilidad */
.mw-menu-card.has-photo { color: #fff; border-color: transparent; }
.mw-menu-card.has-photo::before {
  content: ''; position: absolute; inset: 0; z-index: 0;
  background-image: var(--mw-bg); background-size: cover; background-position: center;
}
.mw-menu-card.has-photo::after {
  content: ''; position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(to bottom, rgba(0,0,0,.22) 0%, rgba(0,0,0,.55) 55%, rgba(0,0,0,.84) 100%);
}
.mw-menu-card.has-photo .mw-menu-meta { color: rgba(255,255,255,.88); }
.mw-menu-card.has-photo .mw-pill { background: rgba(255,255,255,.18); border-color: rgba(255,255,255,.3); color: #fff; }
.mw-menu-card.has-photo .mw-pill.muted { background: transparent; color: rgba(255,255,255,.7); }
.mw-menu-card.has-photo .mw-toggle { background: rgba(0,0,0,.3); }
.mw-menu-card.has-photo .mw-toggle-hint { color: rgba(255,255,255,.88); }
.mw-menu-top { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.mw-menu-name { font-weight: 700; font-size: 1.15rem; font-family: var(--font-display, Georgia, serif); }
.mw-menu-meta { font-size: 13px; color: var(--muted, #888); }
.mw-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.mw-pill {
  font-size: 11px; padding: 2px 8px; border-radius: 6px;
  background: var(--bg, #f5f1ed); border: 1px solid var(--border, rgba(0,0,0,.1));
  color: var(--text-2, #555);
}
.mw-pill.muted { color: var(--muted, #888); border: none; padding-left: 0; }
.mw-toggles { display: flex; flex-direction: column; gap: 8px; }
.mw-toggle-group { display: flex; align-items: center; gap: 8px; }
.mw-toggle {
  flex: 0 0 auto;
  font-size: 13px; padding: 0 10px; min-height: 38px; border-radius: 8px;
  cursor: pointer; border: 1px solid; background: transparent;
}
.mw-toggle-hint { font-size: 12px; color: var(--muted, #888); line-height: 1.25; }
.mw-menu-actions { display: flex; flex-direction: column; gap: 6px; margin-top: auto; }
.mw-menu-actions .mw-btn { min-height: 44px; font-size: 14px; }
.mw-empty-card {
  flex: 0 0 var(--mw-card-w, 100%); max-width: var(--mw-card-maxw, 100%); min-height: var(--mw-card-h, 480px);
  scroll-snap-align: start; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.5rem; text-align: center; color: var(--muted, #888); font-size: 14px;
  border: 1px dashed var(--border, rgba(0,0,0,.2)); border-radius: var(--r, 14px);
  padding: 1.1rem; background: var(--bg, #f5f1ed);
}
.mw-empty-emoji { font-size: 2.5rem; }
.mw-hint { font-size: 12px; color: var(--muted, #888); text-align: center; }

/* ── Wizard de creación (3 pasos) ──────────────────────────── */
.mw-wiz-head { font-size: 13px; font-weight: 700; color: var(--text-2, #555); margin-bottom: 0.6rem; }
.mw-progress { display: flex; align-items: center; gap: 6px; margin: 0 0 0.75rem; padding: 0 2px; }
.mw-dot { flex: 1; height: 4px; border-radius: 4px; background: var(--border, rgba(0,0,0,.12)); transition: background .25s; }
.mw-dot.done { background: var(--primary, #c8692a); }
.mw-viewport { overflow: hidden; border-radius: var(--r, 12px); }
.mw-track { display: flex; transition: transform .35s cubic-bezier(.16,1,.3,1); will-change: transform; }
.mw-slide { flex: 0 0 100%; min-width: 100%; box-sizing: border-box; padding: 2px; }
.mw-card {
  background: var(--surface, #fff); color: var(--text, #1a1410);
  border: 1px solid var(--border, rgba(0,0,0,.1)); border-radius: var(--r, 12px);
  box-shadow: var(--shadow-sm, 0 2px 12px rgba(0,0,0,.06));
  padding: 1.25rem; min-height: 340px; display: flex; flex-direction: column;
}
.mw-step-label {
  font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  color: var(--primary, #c8692a); margin-bottom: 0.35rem;
}
.mw-title { font-family: var(--font-display, Georgia, serif); font-size: 1.25rem; font-weight: 700; line-height: 1.25; margin: 0 0 1rem; }
.mw-body { flex: 1; display: flex; flex-direction: column; gap: 0.85rem; }
.mw-field { display: flex; flex-direction: column; gap: 0.35rem; }
.mw-field label { font-size: 13px; font-weight: 600; color: var(--text-2, #555); }
.mw-input {
  width: 100%; box-sizing: border-box; border: 1px solid var(--border, rgba(0,0,0,.15));
  border-radius: 10px; padding: 0 0.85rem; height: 48px; font-size: 16px;
  background: var(--bg, #f5f1ed); color: var(--text, #1a1410); outline: none; transition: border-color .15s;
}
.mw-input:focus { border-color: var(--primary, #c8692a); }
.mw-err { color: var(--danger, #c0392b); font-size: 13px; min-height: 1em; }
/* Figura decorativa de los pasos Título y Precio */
.mw-hero { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; margin: 0.25rem 0 0.4rem; text-align: center; }
.mw-hero-emoji {
  font-size: 3rem; line-height: 1; width: 84px; height: 84px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-glow-soft, rgba(200,105,42,.10));
}
.mw-hero-sub { font-size: 13px; color: var(--muted, #888); }
.mw-choices { display: flex; flex-direction: column; gap: 0.75rem; }
.mw-choice {
  display: flex; align-items: flex-start; gap: 0.75rem; text-align: left;
  width: 100%; box-sizing: border-box; cursor: pointer;
  border: 2px solid var(--border, rgba(0,0,0,.15)); border-radius: var(--r, 12px); padding: 1rem;
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
.mw-actions { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
.mw-btn {
  flex: 1; min-width: 0; min-height: 48px; border-radius: 10px;
  border: 1px solid var(--border, rgba(0,0,0,.15)); font-size: 15px; font-weight: 600; cursor: pointer;
  background: var(--bg, #f5f1ed); color: var(--text, #1a1410);
  display: flex; align-items: center; justify-content: center; gap: 6px; transition: transform .1s, opacity .15s;
}
.mw-btn:active { transform: scale(.98); }
.mw-btn-primary { background: var(--primary, #c8692a); color: #fff; border-color: var(--primary, #c8692a); }
.mw-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.mw-btn-ghost { background: transparent; }

/* ── Vista de configuración (inline, reemplaza al modal) ───── */
.mw-config { display: flex; flex-direction: column; gap: 0.6rem; }
.mw-cfg-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.mw-cfg-head .mw-btn { flex: 0 0 auto; min-width: 0; padding: 0 0.9rem; }
.mw-cfg-titlebar { padding: 0 2px; }
.mw-cfg-title { font-family: var(--font-display, Georgia, serif); font-weight: 700; font-size: 1.2rem; line-height: 1.2; }
.mw-cfg-meta { font-size: 12px; color: var(--muted, #888); margin-top: 2px; }
.mw-cfg-body { display: flex; flex-direction: column; }

@media (prefers-reduced-motion: reduce) { .mw-track { transition: none; } }

/* ── Desktop: contenedor y cards a ancho fijo ── */
@media (min-width: 768px) {
  .mw {
    --mw-card-w:    320px;
    --mw-card-maxw: 320px;
    max-width: 680px; /* header + galería contenidos; muestra peek de la siguiente card */
  }
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

  // Desplaza una fecha ISO (YYYY-MM-DD) por ±N días sin problemas de zona horaria.
  function shiftDay(iso, delta) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + delta);
    return dt.toISOString().slice(0, 10);
  }

  function buildDOM() {
    injectStyle();
    host.innerHTML = `
      <div class="mw">
        <!-- GALERÍA -->
        <div class="mw-gallery" id="mw-gallery">
          <div class="mw-gal-head">
            <button class="mw-nav-day" data-act="day-prev" aria-label="Día anterior">◀</button>
            <input class="mw-date" id="mw-fecha" type="date" aria-label="Fecha del menú del día">
            <button class="mw-nav-day" data-act="day-next" aria-label="Día siguiente">▶</button>
          </div>
          <button class="mw-create-btn" data-act="open-wizard">＋ Crear menú</button>
          <div class="mw-gal-caption" id="mw-gal-caption"></div>
          <div class="mw-menus" id="mw-menus-list"></div>
          <div class="mw-hint" id="mw-menus-hint"></div>
        </div>

        <!-- WIZARD -->
        <div class="mw-wizard" id="mw-wizard" hidden>
          <div class="mw-wiz-head" id="mw-wiz-head">Nuevo menú</div>
          <div class="mw-progress">
            <div class="mw-dot" data-d="0"></div>
            <div class="mw-dot" data-d="1"></div>
            <div class="mw-dot" data-d="2"></div>
          </div>
          <div class="mw-viewport">
            <div class="mw-track">
              ${slideTitulo()}
              ${slidePrecio()}
              ${slidePregunta()}
            </div>
          </div>
        </div>

        <!-- CONFIGURACIÓN (vista inline; reemplaza al modal #menu-config-overlay) -->
        <div class="mw-config" id="mw-config" hidden>
          <div class="mw-cfg-head">
            <button class="mw-btn mw-btn-ghost" data-act="cfg-back">← Volver</button>
            <button class="mw-btn mw-btn-ghost" data-act="cfg-edit">✏ Editar</button>
          </div>
          <div class="mw-cfg-titlebar">
            <div class="mw-cfg-title" id="mc-title"></div>
            <div class="mw-cfg-meta" id="mc-meta"></div>
          </div>
          <div class="mw-cfg-body" id="mc-body"></div>
        </div>
      </div>`;
    wire();
  }

  // ── Wizard · Paso 1: Título ────────────────────────────────
  function slideTitulo() {
    return `
    <div class="mw-slide" data-step="0">
      <div class="mw-card">
        <div class="mw-step-label">Paso 1 de 3</div>
        <h3 class="mw-title">Ponle un título al menú</h3>
        <div class="mw-body">
          <div class="mw-hero">
            <span class="mw-hero-emoji">📝</span>
            <span class="mw-hero-sub">Así lo verá tu cliente en la carta.</span>
          </div>
          <div class="mw-field">
            <label for="mw-nombre">Título</label>
            <input class="mw-input" id="mw-nombre" type="text" placeholder="Menú del día">
          </div>
        </div>
        <div class="mw-actions">
          <button class="mw-btn mw-btn-ghost" data-act="cancel">✕ Cancelar</button>
          <button class="mw-btn mw-btn-primary" data-act="to-precio">Siguiente →</button>
        </div>
      </div>
    </div>`;
  }

  // ── Wizard · Paso 2: Precio ────────────────────────────────
  function slidePrecio() {
    return `
    <div class="mw-slide" data-step="1">
      <div class="mw-card">
        <div class="mw-step-label">Paso 2 de 3</div>
        <h3 class="mw-title">¿Cuánto cuesta este menú?</h3>
        <div class="mw-body">
          <div class="mw-hero">
            <span class="mw-hero-emoji">💲</span>
            <span class="mw-hero-sub">Precio por persona, en soles.</span>
          </div>
          <div class="mw-field">
            <label for="mw-precio">Precio S/ *</label>
            <input class="mw-input" id="mw-precio" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00">
          </div>
          <div class="mw-err" id="mw-err-precio"></div>
        </div>
        <div class="mw-actions">
          <button class="mw-btn mw-btn-ghost" data-act="to-titulo-back">← Atrás</button>
          <button class="mw-btn mw-btn-primary" data-act="to-pregunta">Siguiente →</button>
        </div>
      </div>
    </div>`;
  }

  // ── Wizard · Paso 3: ¿Fijo o el cliente elige? ─────────────
  function slidePregunta() {
    return `
    <div class="mw-slide" data-step="2">
      <div class="mw-card">
        <div class="mw-step-label">Paso 3 de 3</div>
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
          <button class="mw-btn mw-btn-ghost" data-act="to-precio-back">← Atrás</button>
          <button class="mw-btn mw-btn-primary" data-act="crear" disabled>Crear menú ✓</button>
        </div>
      </div>
    </div>`;
  }

  // ── Wiring ─────────────────────────────────────────────────
  function wire() {
    const fecha = host.querySelector('#mw-fecha');
    fecha.value = state.dia || todayLima();
    fecha.addEventListener('change', async () => {
      state.dia = fecha.value || todayLima();
      await fetchMenus();
      renderMenus();
    });

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
      if (act === 'day-prev')        return changeDay(-1);
      if (act === 'day-next')        return changeDay(1);
      if (act === 'open-wizard')     return openWizard();
      if (act === 'cancel')          return closeWizard();
      if (act === 'to-precio')       return goto(1);
      if (act === 'to-titulo-back')  return goto(0);
      if (act === 'to-pregunta')     return stepPrecioNext();
      if (act === 'to-precio-back')  return goto(1);
      if (act === 'crear')           return crear();
      if (act === 'cfg-back')        return (window.configBack || window.cerrarConfigMenu)?.();
      if (act === 'cfg-edit')        return window.editarNombreMenu?.();
    });
  }

  // ── Galería ────────────────────────────────────────────────
  async function changeDay(delta) {
    const fecha = host.querySelector('#mw-fecha');
    state.dia = shiftDay(fecha.value || todayLima(), delta);
    fecha.value = state.dia;
    await fetchMenus();
    renderMenus();
  }

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
    const cap   = host.querySelector('#mw-gal-caption');
    const list  = host.querySelector('#mw-menus-list');
    const hint  = host.querySelector('#mw-menus-hint');
    if (!list) return;
    if (cap) cap.textContent = `Menús del ${fDate(state.dia)}`;

    if (!state.menus.length) {
      list.innerHTML = `<div class="mw-empty-card">
        <div class="mw-empty-emoji">📋</div>
        <div>Aún no hay menús para esta fecha.</div>
        <div class="mw-hint">Toca «＋ Crear menú» para agregar uno.</div>
      </div>`;
      if (hint) hint.textContent = '';
      return;
    }
    list.innerHTML = state.menus.map(menuCard).join('');
    if (hint) hint.textContent = state.menus.length > 1 ? `Desliza para ver los ${state.menus.length} menús →` : '';
  }

  // Elige la URL de portada: el plato marcado como portada (si tiene foto),
  // si no, el primer plato con foto; si ninguno tiene foto → null (watermark).
  function portadaUrl(m) {
    const platos = [];
    (m.secciones || []).forEach(s => (s.platos || []).forEach(p => platos.push(p)));
    if (m.id_plato_portada) {
      const elegido = platos.find(p => p.id_plato === m.id_plato_portada && p.url_foto);
      if (elegido) return elegido.url_foto;
    }
    const primero = platos.find(p => p.url_foto);
    return primero ? primero.url_foto : null;
  }

  function menuCard(m) {
    const activo = m.activo !== 0;
    const foto   = portadaUrl(m);
    const secs = (m.secciones && m.secciones.length)
      ? m.secciones.map(s => `<span class="mw-pill">${esc(s.nombre_seccion)}</span>`).join('')
      : `<span class="mw-pill muted">Sin secciones</span>`;
    // Los toggles "Cliente elige"/"Visible" se movieron a Configurar → "Configuración para el cliente".
    return `
    <div class="mw-menu-card ${activo ? '' : 'oculto'} ${foto ? 'has-photo' : ''}"${foto ? ` style="--mw-bg:url('${foto}')"` : ''}>
      ${foto ? '' : '<div class="mw-menu-watermark">🍽️</div>'}
      <div class="mw-menu-top">
        <span class="mw-menu-name">${esc(m.nombre)}</span>
        <span class="mw-menu-meta">S/ ${Number(m.precio).toFixed(2)}</span>
      </div>
      <div class="mw-pills">${secs}</div>
      <div class="mw-menu-actions">
        <button class="mw-btn mw-btn-primary" data-cfg="${m.id}">⚙ Configurar</button>
        <div class="mw-copy-row" id="mw-copy-row-${m.id}" style="display:none">
          <input class="mw-date mw-copy-input" type="date" id="mw-copy-date-${m.id}" aria-label="Fecha destino">
          <div style="display:flex;gap:6px">
            <button class="mw-btn mw-btn-primary" style="flex:1" data-copy-ok="${m.id}">Copiar ✓</button>
            <button class="mw-btn" style="flex:0 0 44px" data-copy-cancel="${m.id}">✕</button>
          </div>
        </div>
        <button class="mw-btn" data-copy-open="${m.id}">📋 Copiar a otro día</button>
        <button class="mw-btn" data-del="${m.id}" style="color:var(--danger,#c0392b)">Eliminar</button>
      </div>
    </div>`;
  }

  // Delegación de acciones de la galería → handlers globales de owner.html
  function wireMenuActions() {
    host.querySelector('#mw-menus-list').addEventListener('click', async (e) => {
      const cfg = e.target.closest('[data-cfg]');
      if (cfg) { if (opts.onConfigure) opts.onConfigure(Number(cfg.dataset.cfg)); return; }
      const del = e.target.closest('[data-del]');
      if (del) { window.eliminarMenuDia?.(Number(del.dataset.del)); return; }
      const tg = e.target.closest('[data-toggle]');
      if (tg) {
        const id = Number(tg.dataset.id), cur = Number(tg.dataset.cur);
        if (tg.dataset.toggle === 'elegible') window.toggleElegibleMenu?.(id, cur);
        else window.toggleActivoMenu?.(id, cur);
        return;
      }
      // Abrir picker de fecha para copiar
      const copyOpen = e.target.closest('[data-copy-open]');
      if (copyOpen) {
        const id  = copyOpen.dataset.copyOpen;
        const row = host.querySelector(`#mw-copy-row-${id}`);
        const inp = host.querySelector(`#mw-copy-date-${id}`);
        if (!row) return;
        const mañana = shiftDay(state.dia || todayLima(), 1);
        inp.value = mañana;
        inp.min   = todayLima();
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '6px';
        copyOpen.style.display = 'none';
        inp.focus();
        return;
      }
      // Cancelar picker
      const copyCancel = e.target.closest('[data-copy-cancel]');
      if (copyCancel) {
        const id  = copyCancel.dataset.copyCancel;
        host.querySelector(`#mw-copy-row-${id}`).style.display = 'none';
        host.querySelector(`[data-copy-open="${id}"]`).style.display = '';
        return;
      }
      // Confirmar copia
      const copyOk = e.target.closest('[data-copy-ok]');
      if (copyOk) {
        const id  = Number(copyOk.dataset.copyOk);
        const inp = host.querySelector(`#mw-copy-date-${id}`);
        const dia = inp?.value;
        if (!dia) { toast('Elige una fecha destino', 'err'); return; }
        copyOk.disabled = true;
        try {
          const res = await api('POST', `/api/menu/menus-dia/${id}/copiar`, { dia });
          toast(`Menú copiado al ${fDate(dia)} ✓`);
          // Navegar a la fecha destino y recargar
          state.dia = dia;
          const fechaInput = host.querySelector('#mw-fecha');
          if (fechaInput) fechaInput.value = dia;
          await fetchMenus();
          renderMenus();
        } catch (err) {
          toast(err.message, 'err');
          copyOk.disabled = false;
        }
        return;
      }
    });
  }

  // ── Wizard ─────────────────────────────────────────────────
  function showView(view) {
    state.view = view;
    host.querySelector('#mw-gallery').hidden = (view !== 'gallery');
    host.querySelector('#mw-wizard').hidden  = (view !== 'wizard');
    host.querySelector('#mw-config').hidden  = (view !== 'config');
  }

  function openWizard() {
    // Reset de campos, conservando la fecha de la galería
    state.nombre = ''; state.precio = ''; state.elegible = 0;
    host.querySelector('#mw-nombre').value = '';
    host.querySelector('#mw-precio').value = '';
    host.querySelectorAll('.mw-choice').forEach(b => b.classList.remove('sel'));
    host.querySelector('[data-act="crear"]').disabled = true;
    setErr('mw-err-precio', ''); setErr('mw-err-crear', '');
    const head = host.querySelector('#mw-wiz-head');
    if (head) head.textContent = `Nuevo menú · ${fDate(state.dia)}`;
    showView('wizard');
    goto(0);
  }

  function closeWizard() {
    showView('gallery');
    renderMenus();
  }

  function goto(step) {
    state.step = step;
    const track = host.querySelector('.mw-track');
    track.style.transform = `translateX(-${step * 100}%)`;
    host.querySelectorAll('.mw-dot').forEach(d => {
      d.classList.toggle('done', Number(d.dataset.d) <= step);
    });
  }

  function setErr(id, msg) { const el = host.querySelector('#' + id); if (el) el.textContent = msg || ''; }

  function stepPrecioNext() {
    if (!state.precio || Number(state.precio) <= 0) return setErr('mw-err-precio', 'Ingresa un precio válido.');
    setErr('mw-err-precio', '');
    goto(2);
  }

  async function crear() {
    if (!state.precio || Number(state.precio) <= 0) { goto(1); return setErr('mw-err-precio', 'Ingresa un precio válido.'); }
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
      await fetchMenus();
      closeWizard();     // vuelve a la galería con el menú nuevo listado
    } catch (e) {
      setErr('mw-err-crear', e.message);
      btn.disabled = false;
    }
  }

  // ── API pública ────────────────────────────────────────────
  function mount(el, options) {
    if (!el) return;
    host = el;
    opts = options || {};
    state = { view: 'gallery', step: 0, dia: todayLima(), nombre: '', precio: '', elegible: 0, menus: [] };
    buildDOM();
    wireMenuActions();
    showView('gallery');
    reload();
  }

  // Re-fetch + re-render de la galería. Lo llaman los handlers globales vía loadMenusDia().
  async function reload() {
    if (!host) return;
    await fetchMenus();
    renderMenus();
  }

  function isMounted() { return !!host; }

  // Cambian a la vista de configuración / vuelven a la galería.
  // owner.html las usa desde abrirConfigMenu()/cerrarConfigMenu() — la config
  // se renderiza en #mc-body (que ahora vive en esta vista, no en el modal).
  function showConfig()  { if (host) showView('config'); }
  function showGallery() { if (host) showView('gallery'); }

  window.MenuWizard = { mount, reload, isMounted, showConfig, showGallery };
})();
