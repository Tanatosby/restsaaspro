/**
 * CartaExport — exporta la carta completa (platos a la carta) como imagen
 * JPEG lista para compartir. Hermano de MenuExport (menu-export.js): mismo
 * mecanismo (canvas compuesto en el propio celular, sin backend nuevo), pero
 * para los platos a la carta en vez del menú del día.
 *
 * Pedido real de la dueña del piloto (día 13): mismo estilo que "Descargar
 * menú", pero para la carta, con el precio de cada plato — la carta no tiene
 * un precio único como el menú del día.
 *
 * Diseño: banda superior con el nombre del restaurante + "CARTA", título
 * "Nuestra carta", y cada categoría en una fila de cards (foto + nombre +
 * precio) — mismo patrón de grilla que MenuExport, adaptado a que cada card
 * lleva su propio precio en vez de un precio compartido por sección.
 *
 * Los platos ocultos (`activo = 0`) no entran — mismo criterio que la vista
 * pública del cliente.
 *
 * Uso:
 *   await CartaExport.download();   // arma todo desde la API y descarga
 *   await CartaExport.render();     // el canvas sin descargar (lo usa el E2E)
 *
 * Depende de los globales de owner.html: api(), toast().
 */
(function () {
  'use strict';
  if (window.CartaExport) return;

  // ── Medidas del lienzo, todas en px reales del archivo exportado ──────────
  const L = {
    W: 1080,
    PAD: 64,
    BAND_TOP: 40, BAND_BOTTOM: 34, REST_SIZE: 54, TAG_SIZE: 32,
    TITLE_TOP: 46, TITLE_SIZE: 68, TITLE_BOTTOM: 40,
    BODY_TOP: 8, BODY_BOTTOM: 36,
    SEC_GAP: 34, SEC_LABEL: 30, SEC_HEAD_GAP: 18,
    COLS: 3, COL_GAP: 20,
    THUMB_H: 218, THUMB_R: 14,
    NAME_SIZE: 34, NAME_LH: 43, NAME_MAX: 2, NAME_TOP: 12,
    PRICE_SIZE: 32, PRICE_TOP: 6,
    FOOT_TOP: 32, FOOT_BOTTOM: 42, FOOT_CTA: 34, FOOT_URL: 30,
  };

  const SERIF = 'Georgia, "Times New Roman", serif';
  const SANS  = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  const COL_BG    = '#f5f1ed';
  const COL_TEXT  = '#1a1410';
  const COL_MUTED = '#8a8079';
  const COL_PH    = '#e8e0d8';   // fondo del placeholder cuando el plato no tiene foto

  const ANCHO_UTIL = L.W - L.PAD * 2;
  const ASPECTO = 304 / 218;
  const COL_W_MAX = 600;

  // Mismo criterio que MenuExport: reparte en filas parejas según cuántos
  // platos tiene la categoría, para no dejar huecos feos.
  function columnsFor(n) {
    if (n <= 3) return n;
    if (n === 4) return 2;
    return L.COLS;
  }

  function sectionGeometry(n) {
    const cols = columnsFor(n);
    let colW = (ANCHO_UTIL - L.COL_GAP * (cols - 1)) / cols;
    let offsetX = 0;
    if (cols === 1) {
      colW = Math.min(colW, COL_W_MAX);
      offsetX = (ANCHO_UTIL - colW) / 2;
    }
    const thumbH = Math.round(colW / ASPECTO);
    // A diferencia de MenuExport, cada card suma una línea de precio propia.
    const itemH  = thumbH + L.NAME_TOP + L.NAME_MAX * L.NAME_LH + L.PRICE_TOP + L.PRICE_SIZE;
    const rows   = Math.ceil(n / cols);
    const height = L.SEC_LABEL + L.SEC_HEAD_GAP + rows * itemH + (rows - 1) * L.COL_GAP;
    return { cols, colW, offsetX, thumbH, itemH, rows, height };
  }

  // ── Helpers (duplicados a propósito de menu-export.js — widget autocontenido) ──

  function loadImage(url) {
    return new Promise(resolve => {
      if (!url) return resolve(null);
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function wrapText(ctx, text, maxW, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width <= maxW || !line) {
        line = test;
      } else {
        lines.push(line);
        line = word;
        if (lines.length === maxLines) break;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines) {
      const usadas = lines.join(' ').split(/\s+/).length;
      if (usadas < words.length) {
        let ultima = lines[maxLines - 1];
        while (ultima && ctx.measureText(ultima + '…').width > maxW) {
          ultima = ultima.slice(0, -1);
        }
        lines[maxLines - 1] = ultima + '…';
      }
    }
    return lines;
  }

  // ctx.roundRect() no existe en WebViews viejos de Android (parque del piloto).
  function roundRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function drawCover(ctx, img, x, y, w, h) {
    const ar = img.width / img.height;
    const target = w / h;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (ar > target) { sw = img.height * target; sx = (img.width - sw) / 2; }
    else             { sh = img.width / target;  sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function formatPrice(n) {
    const v = Number(n) || 0;
    return 'S/ ' + (Number.isInteger(v) ? v : v.toFixed(2));
  }

  function setSpacing(ctx, px) {
    try { ctx.letterSpacing = px + 'px'; } catch (e) { /* WebView viejo */ }
  }

  // Agrupa el listado plano de /api/menu/platos-carta por categoría,
  // respetando el orden que ya devuelve la API (categoría, luego nombre) y
  // dejando afuera los platos ocultos — mismo criterio que menu.html.
  function agruparPorCategoria(platos) {
    const grupos = [];
    const porNombre = new Map();
    for (const p of platos) {
      if (p.activo === 0) continue;
      const nombre = p.categoria || 'Otros';
      if (!porNombre.has(nombre)) {
        const g = { nombre, platos: [] };
        porNombre.set(nombre, g);
        grupos.push(g);
      }
      porNombre.get(nombre).platos.push(p);
    }
    return grupos.filter(g => g.platos.length > 0);
  }

  // ── Composición del lienzo ────────────────────────────────────────────────

  async function buildCanvas(categorias, cfg) {
    const primary = cfg.color_primario || '#c8692a';

    const todos = [];
    categorias.forEach(c => c.platos.forEach(p => todos.push(p)));
    const platoImgs = await Promise.all(todos.map(p => loadImage(p.url_foto)));
    const imgPorPlato = new Map();
    todos.forEach((p, i) => imgPorPlato.set(p, platoImgs[i]));

    // ── Pasada de medición ──
    const bandH  = L.BAND_TOP + L.REST_SIZE + L.BAND_BOTTOM;
    const titleH = L.TITLE_TOP + L.TITLE_SIZE + L.TITLE_BOTTOM;

    const geoms = categorias.map(c => sectionGeometry(c.platos.length));
    const seccionesH = geoms.reduce((acc, g) => acc + g.height, 0)
      + Math.max(0, categorias.length - 1) * L.SEC_GAP;

    const footH = 2 + L.FOOT_TOP + L.FOOT_CTA + L.FOOT_BOTTOM;
    const H = bandH + titleH + L.BODY_TOP + seccionesH + L.BODY_BOTTOM + footH;

    const canvas = document.createElement('canvas');
    canvas.width  = L.W;
    canvas.height = Math.round(H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = COL_BG;
    ctx.fillRect(0, 0, L.W, H);
    ctx.textBaseline = 'top';

    // ── Banda superior: marca + "CARTA" ──
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, L.W, bandH);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `700 ${L.REST_SIZE}px ${SERIF}`;
    ctx.fillText(cfg.nombre || 'Mi restaurante', L.PAD, L.BAND_TOP, L.W - L.PAD * 2 - 260);

    ctx.textAlign = 'right';
    ctx.font = `700 ${L.TAG_SIZE}px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.93)';
    setSpacing(ctx, 2);
    ctx.fillText('CARTA', L.W - L.PAD, L.BAND_TOP + L.REST_SIZE - L.TAG_SIZE);
    setSpacing(ctx, 0);

    // ── Título ──
    let y = bandH;
    ctx.textAlign = 'left';
    ctx.fillStyle = COL_TEXT;
    ctx.font = `700 ${L.TITLE_SIZE}px ${SERIF}`;
    ctx.fillText('Nuestra carta', L.PAD, y + L.TITLE_TOP);
    y += titleH;

    // ── Cuerpo: una fila de cards por categoría, con precio por plato ──
    y += L.BODY_TOP;

    categorias.forEach((cat, si) => {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = primary;
      ctx.font = `700 ${L.SEC_LABEL}px ${SANS}`;
      setSpacing(ctx, 4.8);
      const etiqueta = String(cat.nombre || '').toUpperCase();
      ctx.fillText(etiqueta, L.PAD, y);
      const anchoEtiqueta = ctx.measureText(etiqueta).width;
      setSpacing(ctx, 0);

      const inicioRegla = L.PAD + anchoEtiqueta + 18;
      const finRegla = L.W - L.PAD;
      if (finRegla > inicioRegla) {
        ctx.fillStyle = primary;
        ctx.globalAlpha = 0.28;
        ctx.fillRect(inicioRegla, y + L.SEC_LABEL / 2 - 1, finRegla - inicioRegla, 2);
        ctx.globalAlpha = 1;
      }

      y += L.SEC_LABEL + L.SEC_HEAD_GAP;

      const g = geoms[si];
      cat.platos.forEach((plato, pi) => {
        const col = pi % g.cols;
        const fila = Math.floor(pi / g.cols);
        const px = L.PAD + g.offsetX + col * (g.colW + L.COL_GAP);
        const py = y + fila * (g.itemH + L.COL_GAP);
        const img = imgPorPlato.get(plato);
        const COL_W = g.colW;
        const THUMB_H = g.thumbH;

        // Miniatura
        ctx.save();
        roundRectPath(ctx, px, py, COL_W, THUMB_H, L.THUMB_R);
        ctx.clip();
        if (img) {
          drawCover(ctx, img, px, py, COL_W, THUMB_H);
        } else {
          ctx.fillStyle = COL_PH;
          ctx.fillRect(px, py, COL_W, THUMB_H);
          ctx.globalAlpha = 0.35;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `82px ${SANS}`;
          ctx.fillStyle = COL_TEXT;
          ctx.fillText('🍴', px + COL_W / 2, py + THUMB_H / 2);
          ctx.globalAlpha = 1;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
        }
        ctx.restore();

        // Nombre del plato
        ctx.fillStyle = COL_TEXT;
        ctx.font = `${L.NAME_SIZE}px ${SERIF}`;
        const lineas = wrapText(ctx, plato.nombre, COL_W, L.NAME_MAX);
        let ly = py + THUMB_H + L.NAME_TOP;
        lineas.forEach(linea => {
          ctx.fillText(linea, px, ly);
          ly += L.NAME_LH;
        });

        // Precio — lo que la carta tiene y el menú del día no necesita
        const precioY = py + THUMB_H + L.NAME_TOP + L.NAME_MAX * L.NAME_LH + L.PRICE_TOP;
        ctx.fillStyle = primary;
        ctx.font = `700 ${L.PRICE_SIZE}px ${SERIF}`;
        ctx.fillText(formatPrice(plato.precio), px, precioY);
      });

      y += g.rows * g.itemH + (g.rows - 1) * L.COL_GAP;
      if (si < categorias.length - 1) y += L.SEC_GAP;
    });

    // ── Pie: llamada a la acción + link ──
    const footY = H - footH;
    ctx.fillStyle = 'rgba(0,0,0,.1)';
    ctx.fillRect(L.PAD, footY, L.W - L.PAD * 2, 2);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COL_TEXT;
    ctx.font = `700 ${L.FOOT_CTA}px ${SANS}`;
    ctx.fillText('Pide ahora', L.PAD, footY + 2 + L.FOOT_TOP);

    ctx.textAlign = 'right';
    ctx.fillStyle = primary;
    ctx.font = `600 ${L.FOOT_URL}px ${SANS}`;
    ctx.fillText(menuUrl(cfg), L.W - L.PAD, footY + 2 + L.FOOT_TOP + (L.FOOT_CTA - L.FOOT_URL));

    return canvas;
  }

  function menuUrl(cfg) {
    const host = window.location.host;
    return cfg.slug ? `${host}/${cfg.slug}` : host;
  }

  // ── API pública ───────────────────────────────────────────────────────────

  let cachedConfig = null;

  // Trae platos + config y agrupa — compartido por render() y download() para
  // no duplicar el fetch.
  async function cargarDatos() {
    const [platos, cfg] = await Promise.all([
      api('GET', '/api/menu/platos-carta'),
      cachedConfig ? Promise.resolve(cachedConfig) : api('GET', '/api/menu/restaurante/config'),
    ]);
    cachedConfig = cfg;
    return { categorias: agruparPorCategoria(platos), cfg };
  }

  // Devuelve el canvas ya compuesto, sin descargarlo — separado de download()
  // para que el E2E pueda medirlo y leerle píxeles sin disparar una descarga.
  async function render() {
    const { categorias, cfg } = await cargarDatos();
    return buildCanvas(categorias, cfg);
  }

  async function download() {
    const { categorias, cfg } = await cargarDatos();
    if (!categorias.length) {
      toast('Todavía no hay platos a la carta visibles para descargar', 'err');
      return;
    }
    const canvas = await buildCanvas(categorias, cfg);

    const blob = await new Promise(resolve => {
      if (canvas.toBlob) canvas.toBlob(resolve, 'image/jpeg', 0.85);
      else resolve(null);
    });

    const a = document.createElement('a');
    a.download = 'carta.jpg';
    if (blob) {
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } else {
      a.href = canvas.toDataURL('image/jpeg', 0.85);
      a.click();
    }
  }

  window.CartaExport = { download, render };
})();
