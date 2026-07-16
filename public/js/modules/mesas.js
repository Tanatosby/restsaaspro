// ════════════════════════════════════════════════════════
// MÓDULO: PLANO DE MESAS
// ════════════════════════════════════════════════════════

const MESA_COLORES = {
  libre:     { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
  ocupada:   { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
  reservada: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
};

async function loadPlanoMesas() {
  const grid = document.getElementById('plano-mesas-grid');
  if (!grid) return;
  try {
    const mesas = await api('GET', '/api/mesas/estado');
    if (!mesas.length) {
      grid.innerHTML = `<div style="color:var(--muted);font-size:0.928571rem">No hay mesas configuradas. Ve a <strong>Configuración → Mesas</strong> para agregar.</div>`;
      return;
    }
    grid.innerHTML = mesas.map(m => renderMesaChip(m)).join('');
  } catch(e) {
    grid.innerHTML = `<div style="color:var(--danger);font-size:0.928571rem">${e.message}</div>`;
  }
}

function renderMesaChip(m) {
  const c = MESA_COLORES[m.estado];
  const detalle = m.estado === 'ocupada' && m.orden
    ? `<div style="font-size:0.714286rem;margin-top:4px;color:${c.text}">
         ${m.orden.nombre_cliente ? esc(m.orden.nombre_cliente) + '<br>' : ''}
         <span style="font-weight:700">${m.orden.estatus}</span>
       </div>`
    : m.estado === 'reservada' && m.reserva
    ? `<div style="font-size:0.714286rem;margin-top:4px;color:${c.text}">
         ${esc(m.reserva.nombre_cliente)}<br>
         <span style="font-weight:700">reservada</span>
       </div>`
    : `<div style="font-size:0.714286rem;margin-top:4px;color:${c.text}">libre</div>`;

  return `
    <div style="
      background:${c.bg};border:2px solid ${c.border};border-radius:12px;
      padding:12px 16px;min-width:90px;text-align:center;cursor:default;
      transition:transform .15s;
    " title="Mesa ${m.numero} · ${m.capacidad} personas">
      <div style="font-size:1.571429rem;font-weight:800;color:${c.text}">M${m.numero}</div>
      <div style="font-size:0.714286rem;color:${c.text};opacity:0.75">${m.capacidad} personas</div>
      ${detalle}
    </div>`;
}
