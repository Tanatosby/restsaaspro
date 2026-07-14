// ════════════════════════════════════════════════════════
// MÓDULO: REPORTES
// Depende de Chart.js (cargado antes en owner.html head).
// ════════════════════════════════════════════════════════

// ── Helpers de UI ────────────────────────────────────────
function sc(label, value, cls) {
  return `<div class="stat-card">
    <div class="stat-label">${label}</div>
    <div class="stat-value ${cls}">${value}</div>
  </div>`;
}

function renderBarChart(containerId, countObj, emptyMsg, color = '') {
  const el = document.getElementById(containerId);
  const entries = Object.entries(countObj).sort((a,b) => b[1]-a[1]).slice(0, 8);
  if (!entries.length) { el.innerHTML = `<div style="font-size:0.857143rem;color:var(--muted);text-align:center;padding:1rem">${emptyMsg}</div>`; return; }
  const max = entries[0][1];
  el.innerHTML = entries.map(([name, count]) => `
    <div class="bar-row">
      <div class="bar-labels">
        <span class="bar-name">${esc(name)}</span>
        <span class="bar-count">${count}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill ${color}" style="width:${Math.round(count/max*100)}%"></div>
      </div>
    </div>`).join('');
}

// ── Curva de demanda (clientes) ──────────────────────────
let demandaChart    = null;
let intervaloActual = 'dia';

async function loadDemanda(intervalo = intervaloActual) {
  intervaloActual = intervalo;

  ['dia','semana','mes'].forEach(i => {
    const btn = document.getElementById(`btn-intervalo-${i}`);
    if (!btn) return;
    btn.className = `btn btn-sm ${i === intervalo ? 'btn-primary' : 'btn-ghost'}`;
  });

  const wrap = document.getElementById('chart-demanda-wrap');
  try {
    const data = await api('GET', `/api/reportes/clientes-timeline?intervalo=${intervalo}`);

    if (!data.length) {
      if (demandaChart) { demandaChart.destroy(); demandaChart = null; }
      wrap.innerHTML = emptyState('📊','Sin datos aún');
      return;
    }

    if (!document.getElementById('chart-demanda')) {
      wrap.innerHTML = '<canvas id="chart-demanda"></canvas>';
    }

    const labels   = data.map(d => d.periodo);
    const ordenes  = data.map(d => d.ordenes);
    const reservas = data.map(d => d.reservas);
    const totales  = data.map(d => d.total);

    if (demandaChart) demandaChart.destroy();

    demandaChart = new Chart(
      document.getElementById('chart-demanda').getContext('2d'),
      {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Total',
              data: totales,
              borderColor: '#2a7a4a',
              backgroundColor: ctx => window.mpGradient ? mpGradient(ctx, '#2a7a4a') : 'rgba(42,122,74,0.12)',
              tension: 0.4,
              fill: true,
              borderWidth: 2.5,
              pointRadius: 0,
              pointHoverRadius: 5
            },
            {
              label: 'Órdenes',
              data: ordenes,
              borderColor: '#c8692a',
              backgroundColor: 'rgba(200,105,42,0.08)',
              tension: 0.35,
              fill: true,
              pointRadius: 3
            },
            {
              label: 'Reservas',
              data: reservas,
              borderColor: '#1a6090',
              backgroundColor: 'rgba(26,96,144,0.08)',
              tension: 0.35,
              fill: true,
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { family: 'Lato' } } } },
          scales: {
            x: { ticks: { font: { family: 'Lato', size: 11 } } },
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Lato', size: 11 } } }
          }
        }
      }
    );
  } catch(e) {
    wrap.innerHTML = emptyState('⚠️', e.message);
  }
}

function setIntervalo(intervalo) { loadDemanda(intervalo); }

async function descargarFormatoDemanda() {
  try {
    const url = `/api/reportes/clientes-timeline/export?intervalo=${intervaloActual}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al generar el archivo');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `demanda_clientes_${intervaloActual}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Archivo descargado correctamente');
  } catch(e) { toast(e.message, 'err'); }
}

// ── Métricas generales ───────────────────────────────────
async function loadReportes() {
  document.getElementById('stats-reportes').innerHTML = '<div class="loading-text" style="grid-column:1/-1">Cargando métricas…</div>';

  try {
    const [ordenes, reservas, menusDia, kpis, resumen] = await Promise.all([
      api('GET', '/api/orders'),
      api('GET', '/api/reservations'),
      api('GET', '/api/menu/menus-dia'),
      api('GET', '/api/reportes/kpis'),
      api('GET', '/api/reportes/ganancias/resumen')
    ]);

    const seccionesPorMenu = new Map(menusDia.map(m => [m.id, m.secciones.length]));

    const totalMenusOrd = ordenes.reduce((total, orden) => {
      const porMenu = new Map();
      for (const item of orden.menu_items) porMenu.set(item.id_menu_dia, (porMenu.get(item.id_menu_dia) || 0) + 1);
      for (const [id_menu, filas] of porMenu) total += filas / (seccionesPorMenu.get(id_menu) || 1);
      return total;
    }, 0);

    const totalMenusRes = reservas.reduce((total, reserva) => {
      const porMenu = new Map();
      for (const item of reserva.menu_items) porMenu.set(item.id_menu_dia, (porMenu.get(item.id_menu_dia) || 0) + 1);
      for (const [id_menu, filas] of porMenu) total += filas / (seccionesPorMenu.get(id_menu) || 1);
      return total;
    }, 0);

    const totalCartaOrd = ordenes.reduce((s, o) => s + o.carta_items.reduce((a, i) => a + i.cantidad, 0), 0);

    const tasaCls = (kpis.tasa_cancelacion || 0) > 15 ? '' : 'success';
    document.getElementById('stats-reportes').innerHTML = `
      ${sc('Menús pedidos',        Math.round(totalMenusOrd), '')}
      ${sc('Menús reservados',     Math.round(totalMenusRes), '')}
      ${sc('Platos carta pedidos', totalCartaOrd, '')}
      ${sc('Ticket promedio',  'S/ ' + (kpis.ticket_promedio || 0).toFixed(2), 'accent')}
      ${sc('Tasa cancelación', (kpis.tasa_cancelacion || 0).toFixed(1) + '%', tasaCls)}
      ${sc('Revenue total', 'S/ ' + (resumen.total || 0).toFixed(2), 'accent')}
    `;
  } catch(e) {
    document.getElementById('stats-reportes').innerHTML = emptyState('⚠️', e.message);
  }
}

// ── Ganancias ────────────────────────────────────────────
let gananciasChart     = null;
let intervaloGanancias = 'dia';

async function loadGanancias(intervalo) {
  if (intervalo) intervaloGanancias = intervalo;

  ['dia', 'semana', 'mes'].forEach(iv => {
    const btn = document.getElementById(`btn-gan-${iv}`);
    if (btn) btn.className = `btn btn-sm ${iv === intervaloGanancias ? 'btn-primary' : 'btn-ghost'}`;
  });

  document.getElementById('stats-ganancias').innerHTML =
    '<div class="loading-text" style="grid-column:1/-1">Cargando…</div>';
  const wrap = document.getElementById('chart-ganancias-wrap');

  try {
    const [resumen, timeline] = await Promise.all([
      api('GET', '/api/reportes/ganancias/resumen'),
      api('GET', `/api/reportes/ganancias/timeline?intervalo=${intervaloGanancias}`),
    ]);

    document.getElementById('stats-ganancias').innerHTML = `
      ${sc('Ganancias totales', 'S/ ' + resumen.total.toFixed(2),  'accent')}
      ${sc('Ganancias del mes', 'S/ ' + resumen.mes.toFixed(2),    '')}
      ${sc('Ganancia semana',   'S/ ' + resumen.semana.toFixed(2), '')}
      ${sc('Ganancia de hoy',   'S/ ' + resumen.dia.toFixed(2),    '')}
    `;

    if (!timeline.length) {
      if (gananciasChart) { gananciasChart.destroy(); gananciasChart = null; }
      wrap.innerHTML = emptyState('💰', 'Sin ganancias registradas aún');
      return;
    }

    if (!document.getElementById('chart-ganancias')) {
      wrap.innerHTML = '<canvas id="chart-ganancias"></canvas>';
    }

    const labels   = timeline.map(d => d.periodo);
    const totales  = timeline.map(d => d.total);
    const ordenes  = timeline.map(d => d.ordenes);
    const reservas = timeline.map(d => d.reservas);

    if (gananciasChart) gananciasChart.destroy();

    gananciasChart = new Chart(document.getElementById('chart-ganancias').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total',
            data: totales,
            borderColor: '#c8692a',
            backgroundColor: ctx => window.mpGradient ? mpGradient(ctx, '#c8692a') : 'rgba(200,105,42,0.12)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            borderWidth: 2.5,
          },
          {
            label: 'Órdenes',
            data: ordenes,
            borderColor: '#e8925e',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            borderWidth: 1.5,
            borderDash: [5, 3],
          },
          {
            label: 'Reservas',
            data: reservas,
            borderColor: '#4a90d9',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            borderWidth: 1.5,
            borderDash: [5, 3],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 20 } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: S/ ${ctx.parsed.y.toFixed(2)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 10 }, callback: v => 'S/ ' + v.toLocaleString('es-PE') },
          },
        },
      },
    });

  } catch(e) {
    document.getElementById('stats-ganancias').innerHTML = emptyState('⚠️', e.message);
  }
}

function setIntervaloGanancias(intervalo) { loadGanancias(intervalo); }

async function descargarFormatoGanancias() {
  try {
    const url = `/api/reportes/ganancias/export?intervalo=${intervaloGanancias}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al generar el archivo');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ganancias_${intervaloGanancias}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Archivo descargado correctamente');
  } catch(e) { toast(e.message, 'err'); }
}

// ── Análisis de pedidos ───────────────────────────────────
let pedidosTipoActual   = 'menu';
let pedidosFiltroActual = '';
let pedidosChart        = null;

async function loadPedidosFiltros() {
  const wrap = document.getElementById('pedidos-filtros');
  try {
    const data = await api('GET', '/api/reportes/pedidos/filtros');
    const lista = pedidosTipoActual === 'menu' ? data.secciones : data.categorias;

    if (!lista.length) {
      wrap.innerHTML = `<span style="font-size:0.857143rem;color:var(--muted)">Sin ${pedidosTipoActual === 'menu' ? 'secciones' : 'categorías'} configuradas</span>`;
      return;
    }

    wrap.innerHTML = lista.map((nombre, i) =>
      `<button class="btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-ghost'}" id="btn-filtro-${i}"
        onclick="setPedidosFiltro('${nombre}', this)">${nombre}</button>`
    ).join('');

    pedidosFiltroActual = lista[0];
    await loadPedidos();
  } catch(e) {
    wrap.innerHTML = `<span style="font-size:0.857143rem;color:var(--muted)">${e.message}</span>`;
  }
}

async function setPedidosTipo(tipo) {
  pedidosTipoActual = tipo;
  document.getElementById('btn-pedidos-menu').className  = `btn btn-sm ${tipo === 'menu'  ? 'btn-primary' : 'btn-ghost'}`;
  document.getElementById('btn-pedidos-carta').className = `btn btn-sm ${tipo === 'carta' ? 'btn-primary' : 'btn-ghost'}`;
  await loadPedidosFiltros();
}

async function setPedidosFiltro(nombre, btnEl) {
  document.querySelectorAll('#pedidos-filtros .btn').forEach(b => b.className = 'btn btn-sm btn-ghost');
  btnEl.className = 'btn btn-sm btn-primary';
  pedidosFiltroActual = nombre;
  await loadPedidos();
}

async function loadPedidos() {
  const wrap = document.getElementById('chart-pedidos-wrap');
  wrap.innerHTML = '<div class="loading-text">Cargando…</div>';
  try {
    const datos = await api('GET', `/api/reportes/pedidos?tipo=${pedidosTipoActual}&filtro=${encodeURIComponent(pedidosFiltroActual)}`);
    if (!datos.length) {
      if (pedidosChart) { pedidosChart.destroy(); pedidosChart = null; }
      wrap.innerHTML = emptyState('📊', 'Sin pedidos para este filtro');
      return;
    }
    wrap.innerHTML = '<canvas id="chart-pedidos"></canvas>';
    if (pedidosChart) pedidosChart.destroy();
    pedidosChart = new Chart(document.getElementById('chart-pedidos').getContext('2d'), {
      type: 'bar',
      data: {
        labels:   datos.map(d => d.plato),
        datasets: [
          { label: 'Total',    data: datos.map(d => d.total),    backgroundColor: '#2a7a4a', borderRadius: 6, maxBarThickness: 30 },
          { label: 'Órdenes',  data: datos.map(d => d.ordenes),  backgroundColor: '#c8692a', borderRadius: 6, maxBarThickness: 30 },
          { label: 'Reservas', data: datos.map(d => d.reservas), backgroundColor: '#1a6090', borderRadius: 6, maxBarThickness: 30 },
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { stacked: false }, y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  } catch(e) {
    wrap.innerHTML = emptyState('⚠️', e.message);
  }
}

async function descargarFormatoPedidos() {
  if (!pedidosFiltroActual) return;
  try {
    const url = `/api/reportes/pedidos/export?tipo=${pedidosTipoActual}&filtro=${encodeURIComponent(pedidosFiltroActual)}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error al generar el archivo'); }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pedidos_${pedidosTipoActual}_${pedidosFiltroActual.replace(/\s+/g,'_').toLowerCase()}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Archivo descargado correctamente');
  } catch(e) { toast(e.message, 'err'); }
}

// ── Hora pico de demanda (A2) ─────────────────────────────
let horaPicoChart = null;

async function loadHoraPico() {
  const wrap = document.getElementById('chart-hora-pico-wrap');
  if (!wrap) return;
  try {
    const data = await api('GET', '/api/reportes/hora-pico');
    const totalGlobal = data.reduce((s, d) => s + d.total, 0);

    if (!totalGlobal) {
      if (horaPicoChart) { horaPicoChart.destroy(); horaPicoChart = null; }
      wrap.innerHTML = emptyState('🕐', 'Sin datos de horario aún');
      return;
    }

    if (!document.getElementById('chart-hora-pico')) {
      wrap.innerHTML = '<canvas id="chart-hora-pico"></canvas>';
    }

    const labels = data.map(d => String(d.hora).padStart(2, '0') + 'h');

    if (horaPicoChart) horaPicoChart.destroy();

    horaPicoChart = new Chart(document.getElementById('chart-hora-pico').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Órdenes',  data: data.map(d => d.ordenes),  backgroundColor: '#c8692a', borderRadius: 5, stack: 'demanda' },
          { label: 'Reservas', data: data.map(d => d.reservas), backgroundColor: '#1a6090', borderRadius: 5, stack: 'demanda' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { title: items => `Hora ${items[0].label}` } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    });
  } catch(e) {
    wrap.innerHTML = emptyState('⚠️', e.message);
  }
}
