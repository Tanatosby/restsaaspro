// ════════════════════════════════════════════════════════
// MÓDULO: COLA DE COCINA
// Vista del cocinero — órdenes pendientes/en preparación + reservas en preparación.
// Solo muestra lo de HOY (antes se acumulaban pedidos viejos sin cerrar —
// ver ISS-030). Hace polling cada 30 s mientras el panel está activo.
// Usa playAlertSound() y detectNuevasOrdenes() de owner.html (globals),
// y badgeEst()/badgeModalidad() de utils.js.
// ════════════════════════════════════════════════════════

let _cocinaPollTimer = null;

// Formato de línea y de encabezado de grupo del ticket de cocina (ISS-041).
// El agrupamiento en sí lo hace renderMenuAgrupado() en utils.js, compartida
// con Órdenes, Reservas y Cola del día.
const lineaPlatoCocina = i =>
  `<div class="order-item-line">📋 <strong>${esc(i.plato)}</strong> ×${i.cantidad}
    <span style="font-size:0.785714rem;color:var(--muted)">[${esc(i.seccion)}]</span>
  </div>`;

// El badge por menú solo se pinta cuando el pedido es mixto (ISS-047): si todo
// va igual, el badge grande de arriba ya lo dijo y repetirlo en cada menú es ruido.
let _cocinaMixto = false;
const encabezadoMenuCocina = (texto, lineas) =>
  `<div class="menu-grupo-head">${texto}${_cocinaMixto ? badgeModalidadMenu(lineas) : ''}</div>`;

async function loadColaCocina() {
  const el = document.getElementById('cocina-cola');
  if (!el) return;
  el.innerHTML = '<div class="loading-text">Cargando…</div>';
  try {
    const { ordenes, reservas: reservasEnCocina } = await api('GET', '/api/orders/cola-cocina');
    detectNuevasOrdenes(ordenes);

    const ordenesActivas = ordenes; // ya vienen filtradas por es_inicial/es_en_cocina + hoy
    const totalBadge = ordenesActivas.length + reservasEnCocina.length;

    const badgeCocina = document.getElementById('badge-cocina');
    if (badgeCocina) {
      badgeCocina.textContent = totalBadge;
      badgeCocina.classList.toggle('show', totalBadge > 0);
    }

    if (!ordenesActivas.length && !reservasEnCocina.length) {
      el.innerHTML = emptyState('✅', '¡Todo al día! Sin órdenes pendientes');
      return;
    }

    const pendientes = ordenesActivas.filter(o => o.es_inicial);
    const enPrep     = ordenesActivas.filter(o => o.es_en_cocina);

    let html = '';

    // En preparación primero — el cocinero necesita ver qué marcar como listo
    if (enPrep.length) {
      html += `<div class="section-label" style="color:#1a6090;margin-bottom:0.5rem">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#60a5fa;margin-right:6px;animation:pulse-dot 1.5s infinite"></span>
        En preparación <span class="badge" style="background:#edf4fb;color:#1a6090">${enPrep.length}</span>
      </div>`;
      html += enPrep.map(o => renderCocinaTicket(o)).join('');
    }

    if (reservasEnCocina.length) {
      html += `<div class="section-label" style="color:#4338ca;margin-top:${enPrep.length ? '1rem' : '0'};margin-bottom:0.5rem">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#818cf8;margin-right:6px;animation:pulse-dot 1.5s infinite"></span>
        Reservas en preparación <span class="badge" style="background:#eef2ff;color:#4338ca">${reservasEnCocina.length}</span>
      </div>`;
      html += reservasEnCocina.map(r => renderCocinaReserva(r)).join('');
    }

    if (pendientes.length) {
      html += `<div class="section-label" style="color:#92400e;margin-top:${(enPrep.length || reservasEnCocina.length) ? '1rem' : '0'};margin-bottom:0.5rem">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#fbbf24;margin-right:6px"></span>
        Pendientes <span class="badge" style="background:#fef3c7;color:#92400e">${pendientes.length}</span>
      </div>`;
      html += pendientes.map(o => renderCocinaTicket(o)).join('');
    }

    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = emptyState('⚠️', e.message);
  }
}

function renderCocinaTicket(o) {
  // ISS-047: un pedido puede tener un menú para llevar y otro no.
  const conteoMod = contarMenusParaLlevar(o.menu_items);
  _cocinaMixto = o.modalidad === 'mixto';

  const cartaLines = o.carta_items.map(i =>
    `<div class="order-item-line">🍽️ <strong>${esc(i.nombre)}</strong> ×${i.cantidad}</div>`
  ).join('');
  const menuLines = renderMenuAgrupado(o.menu_items, lineaPlatoCocina, encabezadoMenuCocina);

  const btnAccion = o.es_inicial
    ? `<button class="btn btn-primary btn-sm" onclick="avanzarCocina(${o.id},'es_en_cocina')">🍳 Preparando</button>`
    : o.es_en_cocina
    ? `<button class="btn btn-success btn-sm" onclick="avanzarCocina(${o.id},'es_listo')">✅ Listo</button>`
    : '';

  // Para llevar / delivery cambia cómo se emplata y envasa — ISS-042.
  // En línea propia, no dentro del header: en 360px compite con el estatus.
  const modBadge = badgeModalidad(o.modalidad, true, conteoMod);

  return `
    <div class="order-card" id="cocina-ord-${o.id}" style="border-left:4px solid ${o.es_inicial ? '#fbbf24' : '#3b82f6'}">
      <div class="order-card-header">
        <div>
          <strong>#${o.numero_dia ?? o.id}</strong>
          ${o.mesa ? `<span style="font-size:0.857143rem;color:var(--muted)"> · Mesa ${o.mesa}</span>` : ''}
          ${o.nombre_cliente ? `<span style="font-size:0.857143rem;color:var(--muted)"> · ${esc(o.nombre_cliente)}</span>` : ''}
        </div>
        ${badgeEst(o.estatus)}
      </div>
      ${modBadge ? `<div style="margin:0.4rem 0 0.1rem">${modBadge}</div>` : ''}
      <div class="order-items">${cartaLines}${menuLines}</div>
      <div class="order-actions">${btnAccion}</div>
    </div>`;
}

function renderCocinaReserva(r) {
  // ISS-047: una reserva también puede traer un menú para llevar y otro no.
  const conteoMod = contarMenusParaLlevar(r.menu_items);
  _cocinaMixto = r.modalidad === 'mixto';

  const menuLines = renderMenuAgrupado(r.menu_items, lineaPlatoCocina, encabezadoMenuCocina);
  const cartaLines = (r.carta_items || []).map(i =>
    `<div class="order-item-line">🍽️ <strong>${esc(i.nombre)}</strong> ×${i.cantidad}</div>`
  ).join('');

  const horaTag = r.hora_llegada
    ? `<span style="font-size:0.857143rem;color:var(--muted)"> · 🕐 ${r.hora_llegada}</span>`
    : '';
  const mesaTag = r.mesa
    ? `<span style="font-size:0.857143rem;color:var(--muted)"> · Mesa ${r.mesa}</span>`
    : '';

  // Igual que en las órdenes (ISS-042). En reservas además explica la falta de
  // mesa: para llevar y delivery nunca la tienen.
  const modBadge = badgeModalidad(r.modalidad, true, conteoMod);

  return `
    <div class="order-card" id="cocina-res-${r.id}" style="border-left:4px solid #818cf8">
      <div class="order-card-header">
        <div>
          <strong>📅 ${esc(r.nombre_cliente)}</strong>${mesaTag}${horaTag}
          ${r.codigo ? `<span style="font-size:0.785714rem;color:var(--muted)"> · 🔑 ${r.codigo}</span>` : ''}
        </div>
        <span class="badge" style="background:#eef2ff;color:#4338ca;font-size:0.785714rem">Reserva</span>
      </div>
      ${modBadge ? `<div style="margin:0.4rem 0 0.1rem">${modBadge}</div>` : ''}
      <div class="order-items">${menuLines}${cartaLines}</div>
      <div class="order-actions">
        <button class="btn btn-success btn-sm" onclick="marcarReservaListaCocina(${r.id})">✅ Listo</button>
      </div>
    </div>`;
}

async function avanzarCocina(id, flag) {
  const card = document.getElementById(`cocina-ord-${id}`);
  if (card) card.querySelectorAll('button').forEach(b => b.disabled = true);
  try {
    await api('PATCH', `/api/orders/${id}/estatus`, { flag });
    toast(`Orden #${id} actualizada`);
    loadColaCocina();
  } catch(e) {
    toast(e.message, 'err');
    if (card) card.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

async function marcarReservaListaCocina(id) {
  const card = document.getElementById(`cocina-res-${id}`);
  if (card) card.querySelectorAll('button').forEach(b => b.disabled = true);
  try {
    await api('PATCH', `/api/reservations/${id}/estatus`, { flag: 'es_listo' });
    toast('Reserva lista');
    loadColaCocina();
  } catch(e) {
    toast(e.message, 'err');
    if (card) card.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

function initCocinaPoll() {
  stopCocinaPoll();
  loadColaCocina();
  _cocinaPollTimer = setInterval(loadColaCocina, 30000);
}

function stopCocinaPoll() {
  if (_cocinaPollTimer) {
    clearInterval(_cocinaPollTimer);
    _cocinaPollTimer = null;
  }
}
