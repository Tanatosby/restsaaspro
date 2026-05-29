// ════════════════════════════════════════════════════════
// MÓDULO: CHARTS-THEME
// Tema premium global para Chart.js — se adapta a claro/oscuro
// leyendo los tokens CSS reales. Debe cargarse DESPUÉS de Chart.js
// y ANTES de los módulos que crean gráficos.
// Expone: window.mpApplyChartTheme(), window.mpGradient(ctx, hex, alpha)
// ════════════════════════════════════════════════════════
(function () {
  if (typeof Chart === 'undefined') return;

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  function hexA(hex, a) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // Degradado vertical para rellenos de área (líneas).
  window.mpGradient = function (ctx, hex, alpha) {
    const a = alpha == null ? 0.30 : alpha;
    const chart = ctx.chart;
    const area = chart.chartArea;
    if (!area) return hexA(hex, a * 0.5); // primer frame sin layout aún
    const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, hexA(hex, a));
    g.addColorStop(1, hexA(hex, 0));
    return g;
  };

  // Aplica los defaults globales según el tema vigente.
  window.mpApplyChartTheme = function () {
    const text  = cssVar('--text', '#1c1813');
    const muted = cssVar('--muted', '#9a9088');
    const grid  = cssVar('--border', '#e8e1d7');

    Chart.defaults.font.family = "'Lato', system-ui, -apple-system, sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = muted;
    Chart.defaults.borderColor = grid;

    const lg = Chart.defaults.plugins.legend.labels;
    lg.usePointStyle = true;
    lg.pointStyle    = 'circle';
    lg.boxWidth      = 8;
    lg.boxHeight     = 8;
    lg.padding       = 14;
    lg.color         = text;

    const tt = Chart.defaults.plugins.tooltip;
    tt.backgroundColor = text;
    tt.titleColor   = '#fff';
    tt.bodyColor    = '#fff';
    tt.padding      = 10;
    tt.cornerRadius = 8;
    tt.boxPadding   = 6;
    tt.usePointStyle = true;
    tt.titleFont = { weight: '700', size: 12 };
    tt.bodyFont  = { size: 12 };

    Chart.defaults.elements.point.hoverRadius = 5;
    Chart.defaults.elements.line.borderCapStyle = 'round';
  };

  window.mpApplyChartTheme();
})();
