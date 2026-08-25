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

// ── Anti-parpadeo en polling (ISS-072) ────────────────────
// La Cola del día ya tenía esto desde ISS-067 (implementado local a
// pedidos.js). Cocina, Órdenes activas y Reservas activas repintaban todo
// desde "Cargando…" en cada poll aunque nada hubiera cambiado — cada
// refresco se sentía mucho más seguido de lo que realmente era. Un solo
// tap toca el DOM solo si los datos son distintos a lo último pintado, y
// preserva el scroll de `.content` al repintar.
const _ultimaFirmaPorZona = {};
function pintarSiCambio(zonaId, elId, itemsParaFirma, html) {
  const el = document.getElementById(elId);
  if (!el) return;
  const firma = JSON.stringify(itemsParaFirma);
  if (_ultimaFirmaPorZona[zonaId] === firma) return;
  _ultimaFirmaPorZona[zonaId] = firma;

  const content = document.querySelector('.content');
  const scrollPrevio = content ? content.scrollTop : 0;
  el.innerHTML = html;
  if (content) content.scrollTop = scrollPrevio;
}

function emptyState(icon, text) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-text">${text}</div></div>`;
}

// ── Agrupamiento de platos por instancia de menú — ISS-041 ──────────────────
// Compartido por cocina.js, ordenes.js, reservas.js y pedidos.js: si un pedido
// trae 2 menús del día con entrada y segundo distintos, cada vista tiene que
// mostrar qué entrada va con qué segundo, y las 4 pintan la línea de plato con
// un formato propio. Por eso el agrupamiento vive acá una sola vez y cada vista
// pasa su `pintarLinea` y su `pintarEncabezado`.
//
// Reglas:
// - Ítems sin `grupo` (pedidos anteriores a la migración): se pintan planos,
//   igual que antes. No se inventa agrupamiento — ese dato se perdió de verdad.
// - Un solo menú en el pedido: tampoco se agrupa. El encabezado sobraría; el
//   problema aparece recién con 2 o más.
// - El nombre del menú se agrega al encabezado SOLO si el pedido mezcla menús
//   de tipos distintos. Cuando son todos del mismo tipo (el caso normal) el
//   nombre es redundante, y con la letra en escala máxima parte el encabezado
//   en dos líneas.
function renderMenuAgrupado(menuItems, pintarLinea, pintarEncabezado) {
  const items = menuItems || [];
  if (!items.length) return '';

  const planas = () => items.map(pintarLinea).join('');
  if (!pintarEncabezado) return planas();
  if (items.some(i => i.grupo == null)) return planas();

  const grupos = new Map();
  for (const i of items) {
    if (!grupos.has(i.grupo)) grupos.set(i.grupo, []);
    grupos.get(i.grupo).push(i);
  }
  if (grupos.size < 2) return planas();

  // El nombre solo aporta cuando hay más de un tipo de menú en el pedido
  const tipos = new Set(items.map(i => i.menu_nombre).filter(Boolean));
  const conNombre = tipos.size > 1;

  // Se numera por posición, no por el valor de `grupo`: si quedara un hueco
  // (ej. grupos 1 y 3), el cocinero igual lee "Menú 1" y "Menú 2".
  let n = 0;
  return [...grupos.keys()].sort((a, b) => a - b).map(clave => {
    n++;
    const delGrupo = grupos.get(clave);
    const nombre = conNombre && delGrupo[0].menu_nombre
      ? ` · ${esc(delGrupo[0].menu_nombre)}`
      : '';
    // El segundo argumento son las líneas del grupo: quien pinta el encabezado
    // decide si agrega algo derivado de ellas (hoy, el badge de modalidad del
    // menú — ISS-047). Los que no lo usan lo ignoran sin romperse.
    return pintarEncabezado(`🍽️ Menú ${n}${nombre}`, delGrupo) + delGrupo.map(pintarLinea).join('');
  }).join('');
}

// ── Modalidad de un pedido mixto — ISS-047 ──
// Un pedido puede tener un menú para llevar y otro para comer en el local. El
// resumen que guarda `ordenes.modalidad` puede ser 'mixto'; estas dos ayudan a
// pintarlo sin repetir la lógica en cocina.js y pedidos.js.

// Modalidad de una instancia de menú (todas sus líneas comparten valor; si
// alguna dijera 'para_llevar' gana esa, para no dejar de envasar algo).
function modalidadDeGrupo(lineas) {
  return (lineas || []).some(l => l.modalidad === 'para_llevar') ? 'para_llevar' : 'en_local';
}

// Cuenta cuántas instancias de menú van para llevar sobre el total, para el
// badge de resumen ("🥡 1 de 2 para llevar").
function contarMenusParaLlevar(menuItems) {
  const porGrupo = new Map();
  let sueltas = 0, sueltasLlevar = 0;
  for (const i of menuItems || []) {
    if (i.grupo == null) {
      sueltas++;
      if (i.modalidad === 'para_llevar') sueltasLlevar++;
      continue;
    }
    if (i.modalidad === 'para_llevar' || !porGrupo.has(i.grupo)) {
      porGrupo.set(i.grupo, i.modalidad === 'para_llevar' ? 'para_llevar' : (porGrupo.get(i.grupo) || 'en_local'));
    }
  }
  const grupos = [...porGrupo.values()];
  return {
    total:  grupos.length + sueltas,
    llevar: grupos.filter(m => m === 'para_llevar').length + sueltasLlevar,
  };
}

// ── Badge de modalidad — compartido por ordenes.js/reservas.js/pedidos.js/cocina.js ──
// Vive acá y no en ordenes.js para que cocina.js no dependa del orden de carga
// de los <script> de owner.html (cocina.js se carga antes que ordenes.js).
// `grande` agranda el badge para el ticket de cocina (ISS-042): el cocinero
// decide con este dato si emplata o envasa, y lo lee de reojo mientras cocina.
function badgeModalidad(modalidad, grande = false, conteo = null) {
  if (!modalidad || modalidad === 'en_local') return '';
  const base = grande
    ? 'font-size:0.9375rem;padding:5px 12px;'
    : 'font-size:0.785714rem;padding:2px 8px;';
  const estilo = colores => `${base}border-radius:20px;font-weight:600;${colores}`;
  if (modalidad === 'para_llevar')
    return `<span style="${estilo('background:#e0f2fe;color:#0369a1')}">🥡 Para llevar</span>`;
  if (modalidad === 'delivery')
    return `<span style="${estilo('background:#fef9c3;color:#854d0e')}">🛵 Delivery</span>`;
  // ISS-047: pedido con parte para llevar y parte para comer acá. El texto dice
  // CUÁNTOS; cuál es cuál lo responde el badge de cada menú, abajo en el ticket.
  if (modalidad === 'mixto') {
    const t = conteo && conteo.total ? ` ${conteo.llevar} de ${conteo.total}` : '';
    return `<span style="${estilo('background:#fef3c7;color:#92400e')}">🥡${t} para llevar</span>`;
  }
  return '';
}

// Badge chico que va dentro del encabezado de cada menú (ISS-047) para decir
// cuál de los menús del pedido se lleva. Solo aparece si el pedido es mixto:
// repetir "aquí/llevar" en todos los menús cuando todos son iguales es ruido.
function badgeModalidadMenu(lineas) {
  const esLlevar = modalidadDeGrupo(lineas) === 'para_llevar';
  const base = 'font-size:0.75rem;font-weight:800;padding:2px 8px;border-radius:20px;text-transform:none;letter-spacing:0.02em;margin-left:2px;';
  return esLlevar
    ? `<span style="${base}background:#e0f2fe;color:#0369a1">🥡 Llevar</span>`
    : `<span style="${base}background:#f0ece5;color:#6b6259">🪑 Aquí</span>`;
}

// ── Comprobante de pago (foto) — compartido por ordenes.js/reservas.js/pedidos.js ──
// No usar <a target="_blank">: dentro de la PWA instalada (standalone) rompe la
// app en iOS/Android al intentar abrir una pestaña nueva. Se abre en modal in-app.
// El aviso de "repetido" no bloquea nada — la dueña ya revisa cada
// comprobante antes de confirmar el pago; esto solo le ahorra notarlo ella
// misma. `comprobante_repetido_de`/`_tipo` los calcula el backend una sola
// vez al subir la foto (routes/public.js, utils/comprobanteDuplicado.js).
function comprobanteThumb(x) {
  if (!x.comprobante_url) return '';
  const repetido = x.comprobante_repetido_de
    ? `<div style="margin-top:4px;font-size:0.785714rem;background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:20px;font-weight:600;display:inline-block">⚠️ Ya usado en ${x.comprobante_repetido_tipo === 'reserva' ? 'la reserva' : 'el pedido'} #${x.comprobante_repetido_de}</div>`
    : '';
  return `<div style="margin-top:6px" onclick="verComprobante('${esc(x.comprobante_url)}')">
    <img src="${esc(x.comprobante_url)}" alt="Comprobante" title="Ver comprobante" style="height:56px;width:56px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer">
    ${repetido}
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
