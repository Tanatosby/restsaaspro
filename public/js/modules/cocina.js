// ════════════════════════════════════════════════════════
// MÓDULO: COLA DE COCINA
// Vista del cocinero — órdenes pendientes/en preparación + reservas en preparación.
// Hace polling cada 15 s mientras el panel está activo.
// Usa playAlertSound() y detectNuevasOrdenes() de owner.html (globals).
// ════════════════════════════════════════════════════════

let _cocinaPollTimer = null;

async function loadColaCocina() {
  const el = document.getElementById('cocina-cola');
  if (!el) return;
  el.innerHTML = '<div class="loading-text">Cargando…</div>';
  try {
    const [ordenes, reservasEnCocina] = await Promise.all([
      api('GET', '/api/orders/activas'),
      api('GET', '/api/reservations?flag=es_en_cocina'),
    ]);
    detectNuevasOrdenes(ordenes);

    const ordenesActivas = ordenes.filter(o => o.es_inicial || o.es_en_cocina);
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
  const cartaLines = o.carta_items.map(i =>
    `<div class="order-item-line">🍽️ <strong>${esc(i.nombre)}</strong> ×${i.cantidad}</div>`
  ).join('');
  const menuLines = o.menu_items.map(i =>
    `<div class="order-item-line">📋 <strong>${esc(i.plato)}</strong> ×${i.cantidad}
      <span style="font-size:11px;color:var(--muted)">[${esc(i.seccion)}]</span>
    </div>`
  ).join('');

  const btnAccion = o.es_inicial
    ? `<button class="btn btn-primary btn-sm" onclick="avanzarCocina(${o.id},'es_en_cocina')">🍳 Preparando</button>`
    : o.es_en_cocina
    ? `<button class="btn btn-success btn-sm" onclick="avanzarCocina(${o.id},'es_listo')">✅ Listo</button>`
    : '';

  return `
    <div class="order-card" id="cocina-ord-${o.id}" style="border-left:4px solid ${o.es_inicial ? '#fbbf24' : '#3b82f6'}">
      <div class="order-card-header">
        <div>
          <strong>#${o.numero_dia ?? o.id}</strong>
          ${o.mesa ? `<span style="font-size:12px;color:var(--muted)"> · Mesa ${o.mesa}</span>` : ''}
          ${o.nombre_cliente ? `<span style="font-size:12px;color:var(--muted)"> · ${esc(o.nombre_cliente)}</span>` : ''}
        </div>
        ${badgeEst(o.estatus)}
      </div>
      <div class="order-items">${cartaLines}${menuLines}</div>
      <div class="order-actions">${btnAccion}</div>
    </div>`;
}

function renderCocinaReserva(r) {
  const menuLines = (r.menu_items || []).map(i =>
    `<div class="order-item-line">📋 <strong>${esc(i.plato)}</strong> ×${i.cantidad}
      <span style="font-size:11px;color:var(--muted)">[${esc(i.seccion)}]</span>
    </div>`
  ).join('');
  const cartaLines = (r.carta_items || []).map(i =>
    `<div class="order-item-line">🍽️ <strong>${esc(i.nombre)}</strong> ×${i.cantidad}</div>`
  ).join('');

  const horaTag = r.hora_llegada
    ? `<span style="font-size:12px;color:var(--muted)"> · 🕐 ${r.hora_llegada}</span>`
    : '';
  const mesaTag = r.mesa
    ? `<span style="font-size:12px;color:var(--muted)"> · Mesa ${r.mesa}</span>`
    : '';

  return `
    <div class="order-card" id="cocina-res-${r.id}" style="border-left:4px solid #818cf8">
      <div class="order-card-header">
        <div>
          <strong>📅 ${esc(r.nombre_cliente)}</strong>${mesaTag}${horaTag}
          ${r.codigo ? `<span style="font-size:11px;color:var(--muted)"> · 🔑 ${r.codigo}</span>` : ''}
        </div>
        <span class="badge" style="background:#eef2ff;color:#4338ca;font-size:11px">Reserva</span>
      </div>
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
  _cocinaPollTimer = setInterval(loadColaCocina, 15000);
}

function stopCocinaPoll() {
  if (_cocinaPollTimer) {
    clearInterval(_cocinaPollTimer);
    _cocinaPollTimer = null;
  }
}
