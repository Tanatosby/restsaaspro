/**
 * PwaInstall — botón/lógica para instalar la PWA. Tercer widget reutilizable. Ver widgets.md.
 *
 * Autocontenido: captura `beforeinstallprompt` apenas carga, expone una API simple y
 * inyecta (solo cuando hace falta) un instructivo para iOS/Safari, que no soporta el evento.
 * Sin dependencias. Hereda tokens de tema con fallbacks (sirve en owner.html y login.html).
 *
 * Uso:
 *   <script src="/js/widgets/pwa-install.js"></script>
 *   <button id="btn-instalar" hidden>📲 Instalar app</button>
 *   PwaInstall.attach(document.getElementById('btn-instalar'));
 *
 * El botón se muestra solo si la app es instalable y se oculta si ya está instalada
 * (display-mode: standalone) o tras instalarse. En iOS abre el instructivo manual.
 */
(function () {
  'use strict';
  if (window.PwaInstall) return;

  let deferred = null;          // evento beforeinstallprompt guardado (Android/Chrome/Edge)
  const buttons = new Set();    // botones cableados con attach()

  // Capturar el evento lo antes posible (el script va en <head>)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    refresh();
  });
  window.addEventListener('appinstalled', () => { deferred = null; refresh(); });

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function isMobileHTTPS() {
    return location.protocol === 'https:' && /android|mobile|phone/i.test(navigator.userAgent);
  }
  function installable() {
    if (isStandalone()) return false; // ya instalada
    if (deferred) return true;        // Android/Chrome/Edge: tenemos el prompt nativo
    if (isIOS()) return true;         // iOS/Safari: instalable vía instructivo manual
    if (isMobileHTTPS()) return true; // Android sin prompt (suprimido): mostrar igual con instrucción manual
    return false;
  }

  function refresh() {
    buttons.forEach((btn) => { btn.hidden = !installable(); });
  }

  async function prompt() {
    if (isStandalone()) return;
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch (_) {}
      deferred = null;
      refresh();
      return;
    }
    if (isIOS()) { showIosHelp(); return; }
    showAndroidHelp();
  }

  function attach(el) {
    if (!el) return;
    buttons.add(el);
    el.addEventListener('click', (e) => { e.preventDefault(); prompt(); });
    el.hidden = !installable();
  }

  // ── Instructivo iOS (se inyecta solo si se necesita) ─────────────
  let iosModal = null;
  const IOS_STYLE = `
.pwa-ios { display:none; position:fixed; inset:0; z-index:1400; background:rgba(0,0,0,.55);
  -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); align-items:flex-end; justify-content:center; }
.pwa-ios.open { display:flex; }
.pwa-ios-card { background:var(--surface,#fff); color:var(--text,#1a1612); width:100%; max-width:480px;
  border-radius:18px 18px 0 0; padding:1.4rem 1.25rem calc(1.6rem + env(safe-area-inset-bottom,0px));
  position:relative; box-shadow:0 -10px 40px rgba(0,0,0,.3); animation:pwa-up .3s cubic-bezier(.16,1,.3,1); }
@keyframes pwa-up { from { transform:translateY(100%); } to { transform:none; } }
.pwa-ios-title { font-family:var(--font-display,Georgia,serif); font-weight:700; font-size:1.2rem; margin-bottom:.9rem; }
.pwa-ios-step { font-size:14px; line-height:1.6; margin-bottom:.55rem; }
.pwa-ios-step b { color:var(--accent,#c8692a); }
.pwa-ios-close { position:absolute; top:12px; right:12px; background:var(--bg,rgba(0,0,0,.06)); border:none;
  width:38px; height:38px; border-radius:50%; font-size:18px; cursor:pointer; color:var(--muted,#888);
  display:flex; align-items:center; justify-content:center; }
@media (prefers-reduced-motion: reduce) { .pwa-ios-card { animation:none; } }`;

  function injectHelpStyles() {
    if (document.getElementById('pwa-ios-styles')) return;
    const s = document.createElement('style');
    s.id = 'pwa-ios-styles';
    s.textContent = IOS_STYLE;
    document.head.appendChild(s);
  }

  function showIosHelp() {
    if (!iosModal) {
      injectHelpStyles();
      iosModal = document.createElement('div');
      iosModal.className = 'pwa-ios';
      iosModal.innerHTML = `
        <div class="pwa-ios-card" role="dialog" aria-modal="true" aria-label="Cómo instalar la app">
          <button class="pwa-ios-close" type="button" aria-label="Cerrar">✕</button>
          <div class="pwa-ios-title">📲 Instalar Menú Pro</div>
          <p class="pwa-ios-step">1. Toca el botón <b>Compartir</b> (el cuadrito con la flecha ⬆) en la barra de Safari.</p>
          <p class="pwa-ios-step">2. Desliza y elige <b>“Añadir a pantalla de inicio”</b>.</p>
          <p class="pwa-ios-step">3. Confirma con <b>Añadir</b>. La app quedará en tu pantalla de inicio.</p>
        </div>`;
      document.body.appendChild(iosModal);
      iosModal.addEventListener('click', (e) => { if (e.target === iosModal) closeIos(); });
      iosModal.querySelector('.pwa-ios-close').addEventListener('click', closeIos);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeIos(); });
    }
    iosModal.classList.add('open');
  }
  function closeIos() { if (iosModal) iosModal.classList.remove('open'); }

  // ── Instructivo Android manual (cuando Chrome suprimió beforeinstallprompt) ──
  let androidModal = null;
  function showAndroidHelp() {
    if (!androidModal) {
      injectHelpStyles();
      androidModal = document.createElement('div');
      androidModal.className = 'pwa-ios'; // reutiliza los mismos estilos
      androidModal.innerHTML = `
        <div class="pwa-ios-card" role="dialog" aria-modal="true" aria-label="Cómo instalar la app">
          <button class="pwa-ios-close" type="button" aria-label="Cerrar">✕</button>
          <div class="pwa-ios-title">📲 Instalar Menú Pro</div>
          <p class="pwa-ios-step">1. Toca el menú <b>⋮</b> (tres puntos) en la esquina superior derecha de Chrome.</p>
          <p class="pwa-ios-step">2. Elige <b>"Instalar app"</b> o <b>"Añadir a pantalla de inicio"</b>.</p>
          <p class="pwa-ios-step">3. Confirma con <b>Instalar</b>. La app quedará en tu pantalla de inicio.</p>
        </div>`;
      document.body.appendChild(androidModal);
      androidModal.addEventListener('click', (e) => { if (e.target === androidModal) closeAndroid(); });
      androidModal.querySelector('.pwa-ios-close').addEventListener('click', closeAndroid);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAndroid(); });
    }
    androidModal.classList.add('open');
  }
  function closeAndroid() { if (androidModal) androidModal.classList.remove('open'); }

  window.PwaInstall = { attach, prompt, installable };
})();
