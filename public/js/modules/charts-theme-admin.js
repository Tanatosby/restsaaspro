// ════════════════════════════════════════════════════════
// MÓDULO: CHARTS-THEME-ADMIN (Fase 6 — Pro Console)
// Tema premium para Chart.js del panel super admin.
// Paleta dark slate + índigo-violeta.
// Debe cargarse DESPUÉS de Chart.js y ANTES de los charts.
// Expone: window.mpApplyChartThemeAdmin(), window.mpGradientAdmin(ctx, hex, alpha)
// ════════════════════════════════════════════════════════
(function () {
  if (typeof Chart === 'undefined') return;

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  function hexA(hex, a) {
    // Acepta hex (#rgb / #rrggbb) o rgba/rgb existente
    if (hex.startsWith('rgb')) return hex;
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // Degradado vertical para rellenos de área (líneas) — usa color índigo del admin.
  window.mpGradientAdmin = function (ctx, hex, alpha) {
    const a = alpha == null ? 0.35 : alpha;
    const chart = ctx.chart;
    const area = chart.chartArea;
    if (!area) return hexA(hex, a * 0.5);
    const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, hexA(hex, a));
    g.addColorStop(1, hexA(hex, 0));
    return g;
  };

  // Aplica defaults globales con la paleta admin (slate + índigo).
  window.mpApplyChartThemeAdmin = function () {
    const text  = cssVar('--text',   '#f5f5ff');
    const muted = cssVar('--muted',  '#6a6a90');
    const grid  = cssVar('--border', '#252538');
    const surf  = cssVar('--surface-2', '#1a1a2a');

    Chart.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";
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
    lg.font          = { family: "'Inter', sans-serif", weight: '600', size: 11 };

    const tt = Chart.defaults.plugins.tooltip;
    tt.backgroundColor = surf;
    tt.titleColor   = text;
    tt.bodyColor    = text;
    tt.borderColor  = grid;
    tt.borderWidth  = 1;
    tt.padding      = 12;
    tt.cornerRadius = 10;
    tt.boxPadding   = 6;
    tt.usePointStyle = true;
    tt.titleFont = { family: "'Inter', sans-serif", weight: '700', size: 12 };
    tt.bodyFont  = { family: "'JetBrains Mono', monospace", size: 12 };

    Chart.defaults.elements.point.hoverRadius      = 6;
    Chart.defaults.elements.point.hoverBorderWidth = 2;
    Chart.defaults.elements.line.borderCapStyle    = 'round';
    Chart.defaults.elements.line.borderJoinStyle   = 'round';
    Chart.defaults.elements.bar.borderRadius       = 4;
  };

  window.mpApplyChartThemeAdmin();
})();
