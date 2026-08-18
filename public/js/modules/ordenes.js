// ════════════════════════════════════════════════════════
// MÓDULO: ÓRDENES
// badgePago() es compartida — usada también por reservas.js.
// ordenes.js debe cargarse ANTES que reservas.js.
// badgeModalidad() vivía acá; se movió a utils.js cuando cocina.js también
// pasó a usarla (ISS-042) — utils.js se carga primero y no depende del orden.
// ════════════════════════════════════════════════════════

function badgePago(o) {
  if (!o.metodo_pago) return '';
  const metodoLabel = { yape: '💚 Yape', plin: '🔵 Plin', efectivo: '💵 Efectivo' }[o.metodo_pago] || o.metodo_pago;
  if (o.estado_pago === 'confirmado') return `<span style="font-size:0.785714rem;background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:20px;font-weight:600">${metodoLabel} · ✓ Confirmado</span>`;
  if (o.estado_pago === 'enviado')    return `<span style="font-size:0.785714rem;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-weight:600">${metodoLabel} · Pendiente confirmación</span>`;
  return '';
}

// Pedido tomado a mano por la dueña/mozo (botón "Agregar manual" en la cola —
// clientes que no pueden usar la app). No reemplaza a badgePago(): el cobro se
// hace en un solo paso ("💰 Cobrar"), igual que efectivo, pero el aviso deja
// claro que ese paso de cobro/confirmación todavía está pendiente.
function badgeManual(x) {
  if (!x.es_manual) return '';
  return `<span style="font-size:0.785714rem;background:#ede9fe;color:#5b21b6;padding:2px 8px;border-radius:20px;font-weight:600">🧾 Pedido manual · Confirmar pago al cobrar</span>`;
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
  // Agrupado por instancia de menú cuando el pedido trae 2 o más — ISS-041
  const menuLines = renderMenuAgrupado(
    o.menu_items,
    i => `<div class="order-item-line">📋 [${esc(i.seccion)}] ${esc(i.plato)} x${i.cantidad}</div>`,
    texto => `<div class="menu-grupo-head">${texto}</div>`
  );

  const comprobanteHtml = comprobanteThumb(o);

  const paraLlevar = o.modalidad === 'para_llevar';
  // Pago digital (yape/plin) sin confirmar: el owner debe revisar el comprobante
  // antes de poder cobrar/completar (el backend también lo bloquea).
  const requiereConfirmar = ['yape', 'plin'].includes(o.metodo_pago) && o.estado_pago !== 'confirmado';
  const btnCobrar = (label, flag) => requiereConfirmar
    ? `<button class="btn btn-success btn-sm" onclick="confirmarPagoOrden(${o.id})">✓ Confirmar pago</button>`
    : `<button class="btn btn-success btn-sm" onclick="cambiarEstatusOrdenFlag(${o.id},'${flag}')">${label}</button>`;
  const actions = withActions ? `
    <div class="order-actions">
      ${o.es_inicial   ? `<button class="btn btn-primary btn-sm" onclick="cambiarEstatusOrdenFlag(${o.id},'es_en_cocina')">→ Preparando</button>` : ''}
      ${o.es_en_cocina ? `<button class="btn btn-primary btn-sm" onclick="cambiarEstatusOrdenFlag(${o.id},'es_listo')">→ Listo</button>` : ''}
      ${o.es_listo && !paraLlevar ? `<button class="btn btn-primary btn-sm" onclick="cambiarEstatusOrdenFlag(${o.id},'es_entregado')">🍽 Entregar</button>` : ''}
      ${o.es_listo && paraLlevar  ? btnCobrar('💰 Cobrar', 'es_pagado') : ''}
      ${o.es_entregado ? btnCobrar('✓ Completado', 'es_pagado') : ''}
      <button class="btn btn-danger" onclick="cambiarEstatusOrdenFlag(${o.id},'es_cancelado')">Cancelar</button>
    </div>` : '';

  return `
    <div class="order-card" id="orden-${o.id}">
      <div class="order-card-header">
        <div>
          <strong>#${o.numero_dia ?? o.id}</strong>
          ${o.mesa ? `<span style="font-size:0.857143rem;color:var(--muted)"> · Mesa ${o.mesa}</span>` : ''}
          ${o.nombre_cliente ? `<span style="font-size:0.857143rem;color:var(--muted)"> · ${esc(o.nombre_cliente)}</span>` : ''}
          ${badgeModalidad(o.modalidad)}
        </div>
        ${badgeEst(o.estatus)}
      </div>
      <div class="order-meta">
        <span>📅 ${fDT(o.created_at)}</span>
        ${o.total ? `<span style="color:var(--accent);font-weight:700">S/ ${Number(o.total).toFixed(2)}</span>` : ''}
      </div>
      ${(o.metodo_pago || o.es_manual) ? `<div style="margin-top:4px">${badgeManual(o)}${badgePago(o)}${comprobanteHtml}</div>` : ''}
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

async function confirmarPagoOrden(id) {
  try {
    await api('PATCH', `/api/orders/${id}/confirmar-pago`);
    toast(`Pago de la orden #${id} confirmado ✓`);
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
