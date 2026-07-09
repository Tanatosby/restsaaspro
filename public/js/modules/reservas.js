// ════════════════════════════════════════════════════════
// MÓDULO: RESERVAS
// ════════════════════════════════════════════════════════

async function loadReservasActivas() {
  const el = document.getElementById('list-reservas-activas');
  el.innerHTML = '<div class="loading-text">Cargando reservas…</div>';
  try {
    const [pendientes, confirmadas, enCocina, listas, llegaron] = await Promise.all([
      api('GET', '/api/reservations?flag=es_inicial'),
      api('GET', '/api/reservations?flag=es_confirmada'),
      api('GET', '/api/reservations?flag=es_en_cocina'),
      api('GET', '/api/reservations?flag=es_listo'),
      api('GET', '/api/reservations?flag=es_cliente_llego'),
    ]);
    const reservas = [...pendientes, ...confirmadas, ...enCocina, ...listas, ...llegaron]
      .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    detectNuevasReservas(reservas);

    const badge = document.getElementById('badge-reservas');
    badge.textContent = reservas.length;
    badge.classList.toggle('show', reservas.length > 0);

    if (!reservas.length) { el.innerHTML = emptyState('📅','Sin reservas pendientes ni confirmadas'); return; }
    el.innerHTML = reservas.map(r => renderReservaCard(r, true)).join('');
  } catch(e) { el.innerHTML = emptyState('⚠️', e.message); }
}

async function loadHistorialReservas() {
  const el         = document.getElementById('list-reservas-historial');
  const fechaDesde = document.getElementById('hist-res-fecha-desde').value;
  const fechaHasta = document.getElementById('hist-res-fecha-hasta').value;
  const estatus    = document.getElementById('hist-res-estatus').value;
  const btnDesc    = document.getElementById('btn-descargar-formato-reservas');
  el.innerHTML = '<div class="loading-text">Buscando…</div>';
  btnDesc.style.display = 'none';
  try {
    let url = '/api/reservations?';
    if (fechaDesde) url += `fecha_desde=${fechaDesde}&`;
    if (fechaHasta) url += `fecha_hasta=${fechaHasta}&`;
    if (estatus)    url += `estatus=${estatus}&`;
    const reservas = await api('GET', url);
    if (!reservas.length) { el.innerHTML = emptyState('📅','Sin resultados para esos filtros'); return; }
    el.innerHTML = reservas.map(r => renderReservaCard(r, false)).join('');
    if (fechaDesde && fechaHasta) btnDesc.style.display = 'inline-flex';
  } catch(e) { el.innerHTML = emptyState('⚠️', e.message); }
}

function renderReservaCard(r, withActions) {
  const cartaLines = (r.carta_items || []).map(i =>
    `<div class="order-item-line">🍽️ ${esc(i.nombre)} x${i.cantidad} — S/ ${Number(i.precio_unitario).toFixed(2)}</div>`
  ).join('');
  const menuLines = (r.menu_items || []).map(i =>
    `<div class="order-item-line">📋 [${esc(i.seccion)}] ${esc(i.plato)} x${i.cantidad}</div>`
  ).join('');
  const tieneItems = cartaLines || menuLines;

  const mesaSelector = (withActions && !r.es_full && !r.es_cancelado) ? `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:0.5rem">
      <span style="font-size:12px;color:var(--muted)">Mesa:</span>
      <input type="number" id="mesa-res-${r.id}" value="${r.mesa || ''}" min="1" placeholder="N° mesa"
        style="width:80px;border:1px solid var(--border);border-radius:5px;padding:3px 6px;font-size:12px;background:var(--bg)" />
      <button class="btn btn-ghost btn-sm" onclick="asignarMesaReserva(${r.id})">Asignar</button>
    </div>` : '';

  const comprobanteResHtml = r.comprobante_url
    ? `<div style="margin-top:6px"><a href="${r.comprobante_url}" target="_blank" title="Ver comprobante"><img src="${r.comprobante_url}" alt="Comprobante" style="height:56px;width:56px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer"></a></div>`
    : '';

  const sinMesa = r.modalidad === 'para_llevar' || r.modalidad === 'delivery';
  // Pago digital (yape/plin) sin confirmar: el owner debe revisar el comprobante
  // antes de poder completar la reserva (el backend también lo bloquea).
  const requiereConfirmar = ['yape', 'plin'].includes(r.metodo_pago) && r.estado_pago !== 'confirmado';
  const btnCompletar = requiereConfirmar
    ? `<button class="btn btn-success btn-sm" onclick="confirmarPagoReserva(${r.id})">✓ Confirmar pago</button>`
    : `<button class="btn btn-success btn-sm" onclick="cambiarEstatusReservaFlag(${r.id},'es_full')">💰 Completar</button>`;
  const actions = withActions ? `
    <div class="order-actions">
      ${r.es_inicial      ? `<button class="btn btn-success btn-sm"  onclick="cambiarEstatusReservaFlag(${r.id},'es_confirmada')">✓ Confirmar</button>` : ''}
      ${r.es_confirmada   ? `<button class="btn btn-primary btn-sm"  onclick="cambiarEstatusReservaFlag(${r.id},'es_en_cocina')">🍳 A cocina</button>` : ''}
      ${r.es_en_cocina    ? `<button class="btn btn-primary btn-sm"  onclick="cambiarEstatusReservaFlag(${r.id},'es_listo')">✅ Listo</button>` : ''}
      ${r.es_listo && !sinMesa ? `<button class="btn btn-primary btn-sm"  onclick="cambiarEstatusReservaFlag(${r.id},'es_cliente_llego')">🍽 Entregado</button>` : ''}
      ${r.es_listo && sinMesa  ? btnCompletar : ''}
      ${r.es_cliente_llego ? btnCompletar : ''}
      ${!r.es_cliente_llego && !r.es_full ? `<button class="btn btn-danger btn-sm" onclick="cambiarEstatusReservaFlag(${r.id},'es_cancelado')">Cancelar</button>` : ''}
    </div>` : '';

  return `
    <div class="order-card" id="reserva-${r.id}">
      <div class="order-card-header">
        <div>
          <strong>${esc(r.nombre_cliente)}</strong>
          ${r.mesa ? `<span style="font-size:12px;color:var(--muted)"> · Mesa ${r.mesa}</span>` : ''}
          ${r.telefono_cliente ? `<span style="font-size:12px;color:var(--muted)"> · ${esc(r.telefono_cliente)}</span>` : ''}
          ${badgeModalidad(r.modalidad)}
          ${r.codigo ? `<div style="font-family:monospace;font-size:13px;font-weight:700;color:var(--accent);letter-spacing:.1em;margin-top:3px">🔑 ${r.codigo}</div>` : ''}
        </div>
        ${badgeEst(r.estatus)}
      </div>
      <div class="order-meta">
        <span>📅 ${fDate(r.fecha)}</span>
        ${r.hora_llegada ? `<span style="color:var(--primary);font-size:11px;font-weight:600">🕐 ${r.hora_llegada}</span>` : ''}
        <span style="color:var(--muted);font-size:11px">Creada ${fDT(r.created_at)}</span>
        ${r.es_full && r.total > 0
          ? `<span style="color:var(--accent);font-weight:700">S/ ${Number(r.total).toFixed(2)}</span>`
          : `<span style="color:var(--muted)">S/ 0.00</span>`}
      </div>
      ${r.metodo_pago ? `<div style="margin-top:4px">${badgePago(r)}${comprobanteResHtml}</div>` : ''}
      ${tieneItems
        ? `<div class="order-items">${cartaLines}${menuLines}</div>`
        : `<div style="font-size:11px;color:var(--muted);margin-bottom:0.5rem">Sin ítems registrados</div>`}
      ${mesaSelector}
      ${actions}
    </div>`;
}

async function cambiarEstatusReserva(id, estatus) {
  try {
    await api('PATCH', `/api/reservations/${id}/estatus`, { estatus });
    toast(`Reserva #${id} → ${estatus}`);
    loadReservasActivas();
  } catch(e) { toast(e.message, 'err'); }
}

async function confirmarPagoReserva(id) {
  try {
    await api('PATCH', `/api/reservations/${id}/confirmar-pago`);
    toast(`Pago de la reserva #${id} confirmado ✓`);
    loadReservasActivas();
  } catch(e) { toast(e.message, 'err'); }
}

async function cambiarEstatusReservaFlag(id, flag) {
  try {
    await api('PATCH', `/api/reservations/${id}/estatus`, { flag });
    toast(`Reserva #${id} actualizada`);
    loadReservasActivas();
  } catch(e) { toast(e.message, 'err'); }
}

async function asignarMesaReserva(id) {
  const mesa = document.getElementById(`mesa-res-${id}`)?.value;
  try {
    await api('PATCH', `/api/reservations/${id}/mesa`, { mesa: mesa ? parseInt(mesa) : null });
    toast(mesa ? `Mesa ${mesa} asignada` : 'Mesa removida');
    loadReservasActivas();
  } catch(e) { toast(e.message, 'err'); }
}

async function descargarFormatoReservas() {
  const fechaDesde = document.getElementById('hist-res-fecha-desde').value;
  const fechaHasta = document.getElementById('hist-res-fecha-hasta').value;
  if (!fechaDesde || !fechaHasta) {
    toast('Selecciona un rango de fechas para descargar', 'err');
    return;
  }
  try {
    const url = `/api/reservations/export?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al generar el archivo');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `historialReservas_${fechaDesde}_${fechaHasta}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Archivo descargado correctamente');
  } catch(e) { toast(e.message, 'err'); }
}
