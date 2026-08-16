// ── API helper ───────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(path, opts);
  if (res.status === 401) {
    // Limpiar la sesión local es obligatorio: vive en localStorage y ya no se
    // borra sola al cerrar la app. Sin esto, login.html vería una sesión que el
    // backend rechaza y rebotaría de vuelta al panel — bucle infinito.
    limpiarSesion();
    window.location.replace('/login.html');
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

// ── Toast ────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = '', 3000);
}

// ── Helpers ──────────────────────────────────────────────
const esc      = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fDate    = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-PE', { weekday:'short', day:'numeric', month:'short' }) : '—';
const toUTC    = d => d.endsWith('Z') || d.includes('+') ? d : d.replace(' ', 'T') + 'Z';
const fDT      = d => d ? new Date(toUTC(d)).toLocaleString('es-PE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'America/Lima' }) : '—';
const badgeEst = e => `<span class="badge badge-${e}">${e}</span>`;
const setErr   = (id, msg) => { const el = document.getElementById(id); el.textContent = msg; el.classList.toggle('show', !!msg); };

function emptyState(icon, text) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-text">${text}</div></div>`;
}

// ── Badge de modalidad — compartido por ordenes.js/reservas.js/pedidos.js/cocina.js ──
// Vive acá y no en ordenes.js para que cocina.js no dependa del orden de carga
// de los <script> de owner.html (cocina.js se carga antes que ordenes.js).
// `grande` agranda el badge para el ticket de cocina (ISS-042): el cocinero
// decide con este dato si emplata o envasa, y lo lee de reojo mientras cocina.
function badgeModalidad(modalidad, grande = false) {
  if (!modalidad || modalidad === 'en_local') return '';
  const base = grande
    ? 'font-size:0.9375rem;padding:5px 12px;'
    : 'font-size:0.785714rem;padding:2px 8px;';
  const estilo = colores => `${base}border-radius:20px;font-weight:600;${colores}`;
  if (modalidad === 'para_llevar')
    return `<span style="${estilo('background:#e0f2fe;color:#0369a1')}">🥡 Para llevar</span>`;
  if (modalidad === 'delivery')
    return `<span style="${estilo('background:#fef9c3;color:#854d0e')}">🛵 Delivery</span>`;
  return '';
}

// ── Comprobante de pago (foto) — compartido por ordenes.js/reservas.js/pedidos.js ──
// No usar <a target="_blank">: dentro de la PWA instalada (standalone) rompe la
// app en iOS/Android al intentar abrir una pestaña nueva. Se abre en modal in-app.
function comprobanteThumb(x) {
  if (!x.comprobante_url) return '';
  return `<div style="margin-top:6px" onclick="verComprobante('${esc(x.comprobante_url)}')">
    <img src="${esc(x.comprobante_url)}" alt="Comprobante" title="Ver comprobante" style="height:56px;width:56px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer">
  </div>`;
}
function verComprobante(url) {
  document.getElementById('comprobante-modal-img').src = url;
  document.getElementById('comprobante-modal').classList.add('show');
}
function cerrarComprobante(event) {
  if (event && event.currentTarget && event.target !== event.currentTarget) return;
  document.getElementById('comprobante-modal').classList.remove('show');
  document.getElementById('comprobante-modal-img').src = '';
}
