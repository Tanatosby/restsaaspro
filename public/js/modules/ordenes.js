// ════════════════════════════════════════════════════════
// MÓDULO: ÓRDENES
// badgePago() es compartida — usada también por reservas.js.
// ordenes.js debe cargarse ANTES que reservas.js.
// ════════════════════════════════════════════════════════

function badgeModalidad(modalidad) {
  if (!modalidad || modalidad === 'en_local') return '';
  if (modalidad === 'para_llevar')
    return `<span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:20px;font-weight:600">🥡 Para llevar</span>`;
  if (modalidad === 'delivery')
    return `<span style="font-size:11px;background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:20px;font-weight:600">🛵 Delivery</span>`;
  return '';
}

function badgePago(o) {
  if (!o.metodo_pago) return '';
  const metodoLabel = { yape: '💚 Yape', plin: '🔵 Plin', efectivo: '💵 Efectivo' }[o.metodo_pago] || o.metodo_pago;
  if (o.estado_pago === 'confirmado') return `<span style="font-size:11px;background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:20px;font-weight:600">${metodoLabel} · ✓ Confirmado</span>`;
  if (o.estado_pago === 'enviado')    return `<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-weight:600">${metodoLabel} · Pendiente confirmación</span>`;
  return '';
}

async function loadOrdenesActivas() {
  const el = document.getElementById('list-ordenes-activas');
  el.innerHTML = '<div class="loading-text">Cargando órdenes activas…</div>';
  try {
    const ordenes = await api('GET', '/api/orders/activas');
    detectNuevasOrdenes(ordenes);
    const badge = document.getElementById('badge-ordenes');
    badge.textContent = ordenes.length;
    badge.classList.toggle('show', ordenes.length > 0);

    if (!ordenes.length) { el.innerHTML = emptyState('✅','¡Todo al día! No hay órdenes activas'); return; }
    el.innerHTML = ordenes.map(o => renderOrdenCard(o, true)).join('');
  } catch(e) { el.innerHTML = emptyState('⚠️', e.message); }
}

async function loadHistorialOrdenes() {
  const el         = document.getElementById('list-ordenes-historial');
  const fechaDesde = document.getElementById('hist-fecha-desde').value;
  const fechaHasta = document.getElementById('hist-fecha-hasta').value;
  const estatus    = document.getElementById('hist-estatus').value;
  const btnDesc    = document.getElementById('btn-descargar-formato1');
  el.innerHTML = '<div class="loading-text">Buscando…</div>';
  btnDesc.style.display = 'none';
  try {
    let url = '/api/orders?';
    if (fechaDesde) url += `fecha_desde=${fechaDesde}&`;
    if (fechaHasta) url += `fecha_hasta=${fechaHasta}&`;
    if (estatus)    url += `estatus=${estatus}&`;
    const ordenes = await api('GET', url);
    if (!ordenes.length) { el.innerHTML = emptyState('🧾','Sin resultados para esos filtros'); return; }
    el.innerHTML = ordenes.map(o => renderOrdenCard(o, false)).join('');
    if (fechaDesde && fechaHasta) btnDesc.style.display = 'inline-flex';
  } catch(e) { el.innerHTML = emptyState('⚠️', e.message); }
}

async function descargarFormato1() {
  const fechaDesde = document.getElementById('hist-fecha-desde').value;
  const fechaHasta = document.getElementById('hist-fecha-hasta').value;
  if (!fechaDesde || !fechaHasta) {
    toast('Selecciona un rango de fechas para descargar', 'err');
    return;
  }
  try {
    const url = `/api/orders/export?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al generar el archivo');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `historial_ordenes_${fechaDesde}_${fechaHasta}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Archivo descargado correctamente');
  } catch(e) { toast(e.message, 'err'); }
}

function renderOrdenCard(o, withActions) {
  const cartaLines = o.carta_items.map(i =>
    `<div class="order-item-line">🍽️ ${esc(i.nombre)} x${i.cantidad} — S/ ${Number(i.precio_unitario).toFixed(2)}</div>`
  ).join('');
  const menuLines = o.menu_items.map(i =>
    `<div class="order-item-line">📋 [${esc(i.seccion)}] ${esc(i.plato)} x${i.cantidad}</div>`
  ).join('');

  const comprobanteHtml = o.comprobante_url
    ? `<div style="margin-top:6px"><a href="${o.comprobante_url}" target="_blank" title="Ver comprobante"><img src="${o.comprobante_url}" alt="Comprobante" style="height:56px;width:56px;object-fit:cover;border-radius:6px;border:1px solid var(--border);cursor:pointer"></a></div>`
    : '';

  const paraLlevar = o.modalidad === 'para_llevar';
  const actions = withActions ? `
    <div class="order-actions">
      ${o.es_inicial   ? `<button class="btn btn-primary btn-sm" onclick="cambiarEstatusOrdenFlag(${o.id},'es_en_cocina')">→ Preparando</button>` : ''}
      ${o.es_en_cocina ? `<button class="btn btn-primary btn-sm" onclick="cambiarEstatusOrdenFlag(${o.id},'es_listo')">→ Listo</button>` : ''}
      ${o.es_listo && !paraLlevar ? `<button class="btn btn-primary btn-sm" onclick="cambiarEstatusOrdenFlag(${o.id},'es_entregado')">🍽 Entregar</button>` : ''}
      ${o.es_listo && paraLlevar  ? `<button class="btn btn-success btn-sm" onclick="cambiarEstatusOrdenFlag(${o.id},'es_pagado')">💰 Cobrar</button>` : ''}
      ${o.es_entregado ? `<button class="btn btn-success btn-sm" onclick="cambiarEstatusOrdenFlag(${o.id},'es_pagado')">✓ Completado</button>` : ''}
      <button class="btn btn-danger" onclick="cambiarEstatusOrdenFlag(${o.id},'es_cancelado')">Cancelar</button>
    </div>` : '';

  return `
    <div class="order-card" id="orden-${o.id}">
      <div class="order-card-header">
        <div>
          <strong>#${o.numero_dia ?? o.id}</strong>
          ${o.mesa ? `<span style="font-size:12px;color:var(--muted)"> · Mesa ${o.mesa}</span>` : ''}
          ${o.nombre_cliente ? `<span style="font-size:12px;color:var(--muted)"> · ${esc(o.nombre_cliente)}</span>` : ''}
          ${badgeModalidad(o.modalidad)}
        </div>
        ${badgeEst(o.estatus)}
      </div>
      <div class="order-meta">
        <span>📅 ${fDT(o.created_at)}</span>
        ${o.total ? `<span style="color:var(--accent);font-weight:700">S/ ${Number(o.total).toFixed(2)}</span>` : ''}
      </div>
      ${o.metodo_pago ? `<div style="margin-top:4px">${badgePago(o)}${comprobanteHtml}</div>` : ''}
      <div class="order-items">${cartaLines}${menuLines}</div>
      ${actions}
    </div>`;
}

async function cambiarEstatusOrden(id, estatus) {
  try {
    await api('PATCH', `/api/orders/${id}/estatus`, { estatus });
    toast(`Orden #${id} → ${estatus}`);
    loadOrdenesActivas();
  } catch(e) { toast(e.message, 'err'); }
}

async function cambiarEstatusOrdenFlag(id, flag) {
  try {
    await api('PATCH', `/api/orders/${id}/estatus`, { flag });
    toast(`Orden #${id} actualizada`);
    loadOrdenesActivas();
  } catch(e) { toast(e.message, 'err'); }
}
