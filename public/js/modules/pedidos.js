// ════════════════════════════════════════════════════════
// MÓDULO: COLA DEL DÍA — KANBAN
// Órdenes + reservas activas agrupadas por zona/etapa.
// Hace polling cada 15 s mientras el panel está activo.
// Globals requeridos (owner.html): detectNuevasOrdenes(),
//   detectNuevasReservas(), cambiarEstatusOrdenFlag(),
//   cambiarEstatusReservaFlag(), badgeEst(), toUTC()
// ════════════════════════════════════════════════════════

let _pedidosPollTimer = null;
let _zonaActiva = 'pendientes';

// ── Polling ──────────────────────────────────────────────

function initPedidosPoll() {
  stopPedidosPoll();
  loadColaDia();
  _pedidosPollTimer = setInterval(loadColaDia, 15000);
}

function stopPedidosPoll() {
  if (_pedidosPollTimer) {
    clearInterval(_pedidosPollTimer);
    _pedidosPollTimer = null;
  }
}

// ── Cambio de tab ────────────────────────────────────────

function switchZona(zona) {
  _zonaActiva = zona;
  document.querySelectorAll('#kanban-tabs .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.zona === zona);
  });
  ['pendientes', 'cocina', 'listos', 'cobrar'].forEach(z => {
    const el = document.getElementById(`zona-${z}`);
    if (el) el.style.display = z === zona ? '' : 'none';
  });
}

// ── Carga principal ──────────────────────────────────────

async function loadColaDia() {
  try {
    const [ordenes, reservas] = await Promise.all([
      api('GET', '/api/orders/activas'),
      api('GET', '/api/reservations'),
    ]);

    detectNuevasOrdenes(ordenes);
    const reservasActivas = reservas.filter(r => !r.es_full && !r.es_cancelado);
    detectNuevasReservas(reservasActivas);

    // Clasificar por zona
    const zonas = clasificarZonas(ordenes, reservasActivas);

    // Badge del nav (total activos)
    const total = ordenes.length + reservasActivas.length;
    const badgeNav = document.getElementById('badge-pedidos');
    if (badgeNav) {
      badgeNav.textContent = total;
      badgeNav.classList.toggle('show', total > 0);
    }

    // Actualizar badges de tabs y contenido
    const ZONAS = ['pendientes', 'cocina', 'listos', 'cobrar'];
    ZONAS.forEach(z => {
      const badge = document.getElementById(`kb-${z}`);
      if (badge) {
        badge.textContent = zonas[z].length;
        badge.classList.toggle('kb-badge-active', zonas[z].length > 0);
      }
      renderZona(z, zonas[z]);
    });

  } catch(e) {
    ['pendientes','cocina','listos','cobrar'].forEach(z => {
      const el = document.getElementById(`zona-${z}`);
      if (el) el.innerHTML = emptyState('⚠️', e.message);
    });
  }
}

// ── Clasificación por zona ───────────────────────────────

function clasificarZonas(ordenes, reservas) {
  return {
    pendientes: [
      ...ordenes.filter(o => o.es_inicial)
                .map(o => ({ tipo: 'orden', datos: o })),
      ...reservas.filter(r => r.es_inicial || r.es_confirmada)
                 .map(r => ({ tipo: 'reserva', datos: r })),
    ],
    cocina: [
      ...ordenes.filter(o => o.es_en_cocina)
                .map(o => ({ tipo: 'orden', datos: o })),
      ...reservas.filter(r => r.es_en_cocina)
                 .map(r => ({ tipo: 'reserva', datos: r })),
    ],
    // Listos = órdenes listas en cocina (pendientes de entregar) + reservas listas (cliente aún no llegó)
    listos: [
      ...ordenes.filter(o => o.es_listo)
                .map(o => ({ tipo: 'orden', datos: o })),
      ...reservas.filter(r => r.es_listo)
                 .map(r => ({ tipo: 'reserva', datos: r })),
    ],
    // Por cobrar = órdenes entregadas a la mesa + reservas con cliente llegado
    cobrar: [
      ...ordenes.filter(o => o.es_entregado)
                .map(o => ({ tipo: 'orden', datos: o })),
      ...reservas.filter(r => r.es_cliente_llego)
                 .map(r => ({ tipo: 'reserva', datos: r })),
    ],
  };
}

// ── Render por zona ──────────────────────────────────────

function renderZona(zona, items) {
  const el = document.getElementById(`zona-${zona}`);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = emptyState('✅', 'Sin pedidos en esta etapa');
    return;
  }
  el.innerHTML = items
    .sort((a, b) => urgenciaItem(b) - urgenciaItem(a))
    .map(item => renderKanbanCard(item, zona))
    .join('');
}

function urgenciaItem(item) {
  if (item.tipo === 'orden') {
    return Date.now() - new Date(toUTC(item.datos.created_at)).getTime();
  }
  if (!item.datos.hora_llegada) return 0;
  const hoy    = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const llegada = new Date(`${hoy}T${item.datos.hora_llegada}:00-05:00`).getTime();
  return -(llegada - Date.now());
}

// ── Cards con botón de acción rápida ─────────────────────

function renderKanbanCard(item, zona) {
  return item.tipo === 'orden'
    ? renderKanbanOrden(item.datos, zona)
    : renderKanbanReserva(item.datos, zona);
}

function renderKanbanOrden(o, zona) {
  const minutos   = Math.floor((Date.now() - new Date(toUTC(o.created_at)).getTime()) / 60000);
  const mesaTag   = o.mesa ? `· Mesa ${o.mesa} ` : '';
  const items     = renderItemLines(o.carta_items, o.menu_items);
  const btnAccion = btnOrden(o, zona);
  const modBadge  = badgeModalidad(o.modalidad);

  return `
    <div class="cola-card cola-orden">
      <div class="cola-card-header">
        <div class="cola-card-title">
          🧾 <strong>#${o.numero_dia ?? o.id}</strong>
          <span class="cola-meta">${mesaTag}${o.nombre_cliente ? esc(o.nombre_cliente) : ''}</span>
          ${modBadge}
        </div>
        <span class="cola-tiempo">${minutos} min</span>
      </div>
      ${items ? `<div class="cola-items">${items}</div>` : ''}
      ${btnAccion ? `<div class="order-actions" style="margin-top:0.5rem">${btnAccion}</div>` : ''}
    </div>`;
}

function renderKanbanReserva(r, zona) {
  const horaTag   = r.hora_llegada ? `🕐 ${r.hora_llegada} ` : '';
  const mesaTag   = r.mesa ? `Mesa ${r.mesa} ` : '';
  const codigo    = r.codigo ? `<span class="cola-codigo">🔑 ${r.codigo}</span>` : '';
  const items     = renderItemLines(r.carta_items, r.menu_items);
  const btnAccion = btnReserva(r, zona);
  const modBadge  = badgeModalidad(r.modalidad);

  return `
    <div class="cola-card cola-reserva">
      <div class="cola-card-header">
        <div class="cola-card-title">
          📅 <strong>${esc(r.nombre_cliente || '—')}</strong>
          ${codigo}
          ${modBadge}
        </div>
        <span class="cola-tiempo">${horaTag}${mesaTag}</span>
      </div>
      ${items ? `<div class="cola-items">${items}</div>` : ''}
      ${btnAccion ? `<div class="order-actions" style="margin-top:0.5rem">${btnAccion}</div>` : ''}
    </div>`;
}

// ── Botones de acción rápida ──────────────────────────────

// Pago digital (yape/plin) sin confirmar: el owner debe revisar el comprobante
// antes de poder cobrar/completar (el backend también lo bloquea).
function requiereConfirmarPago(x) {
  return ['yape', 'plin'].includes(x.metodo_pago) && x.estado_pago !== 'confirmado';
}

function btnOrden(o, zona) {
  const paraLlevar = o.modalidad === 'para_llevar';
  const btnCobrar = requiereConfirmarPago(o)
    ? `<button class="btn btn-success btn-sm" onclick="confirmarPagoOrden(${o.id})">✓ Confirmar pago</button>`
    : `<button class="btn btn-success btn-sm" onclick="accionRapidaOrden(${o.id},'es_pagado')">💰 Cobrar</button>`;
  if (zona === 'pendientes' && o.es_inicial)
    return `<button class="btn btn-primary btn-sm" onclick="accionRapidaOrden(${o.id},'es_en_cocina')">🍳 A cocina</button>`;
  if (zona === 'listos' && o.es_listo && !paraLlevar)
    return `<button class="btn btn-primary btn-sm" onclick="accionRapidaOrden(${o.id},'es_entregado')">🍽 Entregar</button>`;
  if (zona === 'listos' && o.es_listo && paraLlevar)
    return btnCobrar;
  if (zona === 'cobrar' && o.es_entregado)
    return btnCobrar;
  return '';
}

function btnReserva(r, zona) {
  const sinMesa = r.modalidad === 'para_llevar' || r.modalidad === 'delivery';
  const btnCompletar = requiereConfirmarPago(r)
    ? `<button class="btn btn-success btn-sm" onclick="confirmarPagoReserva(${r.id})">✓ Confirmar pago</button>`
    : `<button class="btn btn-success btn-sm" onclick="accionRapidaReserva(${r.id},'es_full')">💰 Completar</button>`;
  if (zona === 'pendientes' && r.es_confirmada)
    return `<button class="btn btn-primary btn-sm" onclick="accionRapidaReserva(${r.id},'es_en_cocina')">🍳 A cocina</button>`;
  if (zona === 'pendientes' && r.es_inicial)
    return `<button class="btn btn-success btn-sm" onclick="accionRapidaReserva(${r.id},'es_confirmada')">✓ Confirmar</button>`;
  if (zona === 'listos' && r.es_listo && !sinMesa)
    return `<button class="btn btn-primary btn-sm" onclick="accionRapidaReserva(${r.id},'es_cliente_llego')">🍽 Entregado</button>`;
  if (zona === 'listos' && r.es_listo && sinMesa)
    return btnCompletar;
  if (zona === 'cobrar' && r.es_cliente_llego)
    return btnCompletar;
  return '';
}

// ── Acciones rápidas ─────────────────────────────────────

async function accionRapidaOrden(id, flag) {
  try {
    await api('PATCH', `/api/orders/${id}/estatus`, { flag });
    toast('Orden actualizada');
    loadColaDia();
  } catch(e) { toast(e.message, 'err'); }
}

async function accionRapidaReserva(id, flag) {
  try {
    await api('PATCH', `/api/reservations/${id}/estatus`, { flag });
    toast('Reserva actualizada');
    loadColaDia();
  } catch(e) { toast(e.message, 'err'); }
}

// ── Helpers ───────────────────────────────────────────────

function renderItemLines(cartaItems = [], menuItems = []) {
  const lineas = [
    ...cartaItems.map(i => `<span class="cola-item-line">🍽 ${esc(i.nombre)} ×${i.cantidad}</span>`),
    ...menuItems.map(i  => `<span class="cola-item-line">📋 ${esc(i.plato)} ×${i.cantidad} <em>${esc(i.seccion)}</em></span>`),
  ];
  return lineas.join('');
}
