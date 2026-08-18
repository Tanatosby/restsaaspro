/**
 * MenuExport — exporta un menú del día como imagen JPEG lista para compartir.
 * Widget autocontenido, sin dependencias ni backend: compone un canvas en el
 * propio celular con los datos que la galería ya tiene en memoria.
 *
 * Nació del día 4 del piloto #1: varios comensales no pudieron usar la app
 * (sin internet, sin celular, o simplemente no quisieron). Una foto del menú
 * se ve sin abrir nada, se reenvía sola por WhatsApp y no gasta datos.
 *
 * Diseño (variante B+C, elegida sobre mockup):
 *   - Banda superior con el nombre del restaurante y la fecha.
 *   - Portada del menú a lo ancho, con el nombre y el precio encima.
 *   - Cada sección en una fila de 3 columnas, con la foto de cada plato.
 *   - Pie con la llamada a la acción y el link del menú.
 * Si el menú no tiene ninguna foto de portada, la banda superior se queda y en
 * lugar del hero va un título de texto — que es la variante "solo texto".
 *
 * Uso:
 *   await MenuExport.download(menu);   // menu = objeto de GET /api/menu/menus-dia
 *   await MenuExport.render(menu);     // el canvas sin descargar (lo usa el E2E)
 *
 * Depende de los globales de owner.html: api(), toast().
 */
(function () {
  'use strict';
  if (window.MenuExport) return;

  // ── Medidas del lienzo, todas en px reales del archivo exportado ──────────
  const L = {
    W: 1080,
    PAD: 64,
    BAND_TOP: 40, BAND_BOTTOM: 34, REST_SIZE: 54, DATE_SIZE: 32,
    HERO_H: 400, HERO_NAME: 68, HERO_PRICE: 84, HERO_BOTTOM: 40,
    TITLE_TOP: 46, TITLE_SIZE: 68, TITLE_PRICE: 92, TITLE_BOTTOM: 30,
    BODY_TOP: 36, BODY_BOTTOM: 36,
    SEC_GAP: 34, SEC_LABEL: 30, SEC_HEAD_GAP: 18, SEC_OPT: 23,
    COLS: 3, COL_GAP: 20,
    THUMB_H: 218, THUMB_R: 14,
    NAME_SIZE: 34, NAME_LH: 43, NAME_MAX: 2, NAME_TOP: 12,
    FOOT_TOP: 32, FOOT_BOTTOM: 42, FOOT_CTA: 34, FOOT_URL: 30,
  };

  const SERIF = 'Georgia, "Times New Roman", serif';
  const SANS  = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  const COL_BG    = '#f5f1ed';
  const COL_TEXT  = '#1a1410';
  const COL_MUTED = '#8a8079';
  const COL_PH    = '#e8e0d8';   // fondo del placeholder cuando el plato no tiene foto
  const COL_OFF   = '#a09890';   // texto de un plato agotado

  const ANCHO_UTIL = L.W - L.PAD * 2;                                   // 952
  const ASPECTO = 304 / 218;                                            // proporción de la miniatura
  const COL_W_MAX = 600;                                                // tope cuando hay un solo plato

  // Cuántas columnas usar según cuántos platos tiene la sección. Una grilla fija
  // de 3 deja un hueco feo cuando la sección tiene 1 o 2 platos, y con 4 parte
  // 3+1; repartir en filas parejas se ve mucho mejor en la imagen final.
  function columnsFor(n) {
    if (n <= 3) return n;
    if (n === 4) return 2;
    return L.COLS;
  }

  // Geometría de una sección: ancho de columna, alto de miniatura y de cada item.
  // El alto de la miniatura sigue al ancho para conservar la proporción del diseño.
  function sectionGeometry(n) {
    const cols = columnsFor(n);
    let colW = (ANCHO_UTIL - L.COL_GAP * (cols - 1)) / cols;
    let offsetX = 0;
    if (cols === 1) {
      colW = Math.min(colW, COL_W_MAX);
      offsetX = (ANCHO_UTIL - colW) / 2;   // un solo plato va centrado
    }
    const thumbH = Math.round(colW / ASPECTO);
    const itemH  = thumbH + L.NAME_TOP + L.NAME_MAX * L.NAME_LH;
    const rows   = Math.ceil(n / cols);
    const height = L.SEC_LABEL + L.SEC_HEAD_GAP + rows * itemH + (rows - 1) * L.COL_GAP;
    return { cols, colW, offsetX, thumbH, itemH, rows, height };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Carga una imagen; resuelve a null si falla (foto borrada, 404, etc.) para
  // que un plato sin imagen nunca rompa la exportación entera.
  function loadImage(url) {
    return new Promise(resolve => {
      if (!url) return resolve(null);
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  // Parte un texto en líneas que entren en maxW, hasta un máximo; la última
  // línea que se pasa termina en "…".
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
    // Si quedó texto fuera, marcar la última línea con puntos suspensivos
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

  // Rectángulo redondeado a mano — ctx.roundRect() no existe en WebViews viejos
  // de Android, que es justo el parque de celulares del piloto.
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

  // Dibuja una imagen recortada al centro para llenar el destino (object-fit: cover)
  function drawCover(ctx, img, x, y, w, h) {
    const ar = img.width / img.height;
    const target = w / h;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (ar > target) { sw = img.height * target; sx = (img.width - sw) / 2; }
    else             { sh = img.width / target;  sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  // "S/ 12" si es entero, "S/ 12.50" si no
  function formatPrice(n) {
    const v = Number(n) || 0;
    return 'S/ ' + (Number.isInteger(v) ? v : v.toFixed(2));
  }

  function formatDate(dia) {
    if (!dia) return '';
    const d = new Date(dia + 'T00:00:00');
    const txt = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  // El letter-spacing de canvas es reciente; si no existe, se ignora solo.
  function setSpacing(ctx, px) {
    try { ctx.letterSpacing = px + 'px'; } catch (e) { /* WebView viejo */ }
  }

  // Aplana el menú a las secciones que realmente tienen platos
  function readSections(menu) {
    return (menu.secciones || [])
      .map(s => ({
        nombre:    s.nombre_seccion,
        requerido: Number(s.requerido) === 1,
        platos:    s.platos || [],
      }))
      .filter(s => s.platos.length > 0);
  }

  // ── Composición del lienzo ────────────────────────────────────────────────

  async function buildCanvas(menu, cfg) {
    const secciones = readSections(menu);
    const primary   = cfg.color_primario || '#c8692a';

    // Portada: el plato marcado por el owner, si no el primero con foto.
    const todos = [];
    secciones.forEach(s => s.platos.forEach(p => todos.push(p)));
    let portada = null;
    if (menu.id_plato_portada) {
      const elegido = todos.find(p => p.id_plato === menu.id_plato_portada && p.url_foto);
      if (elegido) portada = elegido.url_foto;
    }
    if (!portada) {
      const primero = todos.find(p => p.url_foto);
      if (primero) portada = primero.url_foto;
    }

    // Cargar todas las imágenes de una (portada + platos)
    const [heroImg, ...platoImgs] = await Promise.all([
      loadImage(portada),
      ...todos.map(p => loadImage(p.url_foto)),
    ]);
    const imgPorPlato = new Map();
    todos.forEach((p, i) => imgPorPlato.set(p, platoImgs[i]));

    // ── Pasada de medición: el alto depende de cuántos platos hay ──
    const bandH = L.BAND_TOP + L.REST_SIZE + L.BAND_BOTTOM;
    const headH = heroImg ? L.HERO_H : (L.TITLE_TOP + L.TITLE_PRICE + L.TITLE_BOTTOM);

    const geoms = secciones.map(s => sectionGeometry(s.platos.length));
    const seccionesH = geoms.reduce((acc, g) => acc + g.height, 0)
      + Math.max(0, secciones.length - 1) * L.SEC_GAP;

    const footH = 2 + L.FOOT_TOP + L.FOOT_CTA + L.FOOT_BOTTOM;
    const H = bandH + headH + L.BODY_TOP + seccionesH + L.BODY_BOTTOM + footH;

    const canvas = document.createElement('canvas');
    canvas.width  = L.W;
    canvas.height = Math.round(H);
    const ctx = canvas.getContext('2d');

    // Fondo (el JPEG no tiene transparencia: hay que pintarlo sí o sí)
    ctx.fillStyle = COL_BG;
    ctx.fillRect(0, 0, L.W, H);
    ctx.textBaseline = 'top';

    // ── Banda superior: marca + fecha ──
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, L.W, bandH);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = `700 ${L.REST_SIZE}px ${SERIF}`;
    ctx.fillText(cfg.nombre || 'Mi restaurante', L.PAD, L.BAND_TOP, L.W - L.PAD * 2 - 300);

    ctx.textAlign = 'right';
    ctx.font = `${L.DATE_SIZE}px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,.93)';
    setSpacing(ctx, 1);
    ctx.fillText(formatDate(menu.dia), L.W - L.PAD, L.BAND_TOP + L.REST_SIZE - L.DATE_SIZE);
    setSpacing(ctx, 0);

    // ── Encabezado: portada con scrim, o título de texto ──
    const precio = formatPrice(menu.precio);
    let y = bandH;

    if (heroImg) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, L.W, L.HERO_H);
      ctx.clip();
      drawCover(ctx, heroImg, 0, y, L.W, L.HERO_H);

      // Scrim para que el texto blanco se lea sobre cualquier foto
      const grad = ctx.createLinearGradient(0, y, 0, y + L.HERO_H);
      grad.addColorStop(0,    'rgba(0,0,0,.12)');
      grad.addColorStop(0.52, 'rgba(0,0,0,.50)');
      grad.addColorStop(1,    'rgba(0,0,0,.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, L.W, L.HERO_H);
      ctx.restore();

      // Precio a la derecha, nombre a la izquierda, ambos apoyados abajo
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.font = `700 ${L.HERO_PRICE}px ${SERIF}`;
      const anchoPrecio = ctx.measureText(precio).width;
      ctx.fillText(precio, L.W - L.PAD, y + L.HERO_H - L.HERO_BOTTOM - L.HERO_PRICE);

      ctx.textAlign = 'left';
      ctx.font = `700 ${L.HERO_NAME}px ${SERIF}`;
      const anchoNombre = L.W - L.PAD * 2 - anchoPrecio - 24;
      const lineas = wrapText(ctx, menu.nombre, anchoNombre, 2);
      const altoNombre = lineas.length * (L.HERO_NAME * 1.04);
      let ny = y + L.HERO_H - L.HERO_BOTTOM - altoNombre;
      lineas.forEach(l => { ctx.fillText(l, L.PAD, ny); ny += L.HERO_NAME * 1.04; });

      y += L.HERO_H;
    } else {
      // Sin ninguna foto: título de texto sobre el beige
      ctx.textAlign = 'right';
      ctx.fillStyle = primary;
      ctx.font = `700 ${L.TITLE_PRICE}px ${SERIF}`;
      const anchoPrecio = ctx.measureText(precio).width;
      ctx.fillText(precio, L.W - L.PAD, y + L.TITLE_TOP);

      ctx.textAlign = 'left';
      ctx.fillStyle = COL_TEXT;
      ctx.font = `700 ${L.TITLE_SIZE}px ${SERIF}`;
      const lineas = wrapText(ctx, menu.nombre, L.W - L.PAD * 2 - anchoPrecio - 24, 2);
      let ny = y + L.TITLE_TOP + (L.TITLE_PRICE - lineas.length * L.TITLE_SIZE * 1.04);
      lineas.forEach(l => { ctx.fillText(l, L.PAD, ny); ny += L.TITLE_SIZE * 1.04; });

      y += headH;
    }

    // ── Cuerpo: una fila de 3 columnas por sección ──
    y += L.BODY_TOP;

    secciones.forEach((sec, si) => {
      // Encabezado de sección: etiqueta + regla + "OPCIONAL"
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = primary;
      ctx.font = `700 ${L.SEC_LABEL}px ${SANS}`;
      setSpacing(ctx, 4.8);
      const etiqueta = String(sec.nombre || '').toUpperCase();
      ctx.fillText(etiqueta, L.PAD, y);
      const anchoEtiqueta = ctx.measureText(etiqueta).width;
      setSpacing(ctx, 0);

      let finRegla = L.W - L.PAD;
      if (!sec.requerido) {
        ctx.textAlign = 'right';
        ctx.fillStyle = COL_MUTED;
        ctx.font = `600 ${L.SEC_OPT}px ${SANS}`;
        setSpacing(ctx, 1.8);
        ctx.fillText('OPCIONAL', L.W - L.PAD, y + (L.SEC_LABEL - L.SEC_OPT) / 2);
        finRegla = L.W - L.PAD - ctx.measureText('OPCIONAL').width - 18;
        setSpacing(ctx, 0);
        ctx.textAlign = 'left';
      }

      const inicioRegla = L.PAD + anchoEtiqueta + 18;
      if (finRegla > inicioRegla) {
        ctx.fillStyle = primary;
        ctx.globalAlpha = 0.28;
        ctx.fillRect(inicioRegla, y + L.SEC_LABEL / 2 - 1, finRegla - inicioRegla, 2);
        ctx.globalAlpha = 1;
      }

      y += L.SEC_LABEL + L.SEC_HEAD_GAP;

      // Platos
      const g = geoms[si];
      sec.platos.forEach((plato, pi) => {
        const col = pi % g.cols;
        const fila = Math.floor(pi / g.cols);
        const px = L.PAD + g.offsetX + col * (g.colW + L.COL_GAP);
        const py = y + fila * (g.itemH + L.COL_GAP);
        const agotado = Number(plato.agotado) === 1;
        const img = imgPorPlato.get(plato);
        const COL_W = g.colW;
        const THUMB_H = g.thumbH;

        // Miniatura
        ctx.save();
        roundRectPath(ctx, px, py, COL_W, THUMB_H, L.THUMB_R);
        ctx.clip();
        if (img) {
          if (agotado) {
            // Los agotados van en gris; si el WebView no soporta filter,
            // el globalAlpha igual los apaga visiblemente.
            try { ctx.filter = 'grayscale(1)'; } catch (e) { /* noop */ }
            ctx.globalAlpha = 0.5;
          }
          drawCover(ctx, img, px, py, COL_W, THUMB_H);
          ctx.globalAlpha = 1;
          try { ctx.filter = 'none'; } catch (e) { /* noop */ }
        } else {
          // Placeholder: mismo watermark 🍽️ que usa el panel
          ctx.fillStyle = COL_PH;
          ctx.fillRect(px, py, COL_W, THUMB_H);
          ctx.globalAlpha = 0.35;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `82px ${SANS}`;
          ctx.fillStyle = COL_TEXT;
          ctx.fillText('🍽️', px + COL_W / 2, py + THUMB_H / 2);
          ctx.globalAlpha = 1;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
        }
        ctx.restore();

        // Chip "AGOTADO" centrado sobre la miniatura
        if (agotado) {
          ctx.font = `700 24px ${SANS}`;
          setSpacing(ctx, 2.4);
          const txt = 'AGOTADO';
          const anchoTxt = ctx.measureText(txt).width;
          const chipW = anchoTxt + 32;
          const chipH = 40;
          const chipX = px + (COL_W - chipW) / 2;
          const chipY = py + (THUMB_H - chipH) / 2;
          ctx.fillStyle = 'rgba(26,20,16,.82)';
          roundRectPath(ctx, chipX, chipY, chipW, chipH, 8);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(txt, px + COL_W / 2, chipY + 8);
          setSpacing(ctx, 0);
          ctx.textAlign = 'left';
        }

        // Nombre del plato
        ctx.fillStyle = agotado ? COL_OFF : COL_TEXT;
        ctx.font = `${L.NAME_SIZE}px ${SERIF}`;
        const lineas = wrapText(ctx, plato.nombre, COL_W, L.NAME_MAX);
        let ly = py + THUMB_H + L.NAME_TOP;
        lineas.forEach(linea => {
          ctx.fillText(linea, px, ly);
          if (agotado) {
            // Tachado, a mitad de la altura de la línea
            const ancho = ctx.measureText(linea).width;
            ctx.fillRect(px, ly + L.NAME_SIZE * 0.55, ancho, 2);
          }
          ly += L.NAME_LH;
        });
      });

      y += g.rows * g.itemH + (g.rows - 1) * L.COL_GAP;
      if (si < secciones.length - 1) y += L.SEC_GAP;
    });

    // ── Pie: llamada a la acción + link del menú ──
    const footY = H - footH;
    ctx.fillStyle = 'rgba(0,0,0,.1)';
    ctx.fillRect(L.PAD, footY, L.W - L.PAD * 2, 2);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COL_TEXT;
    ctx.font = `700 ${L.FOOT_CTA}px ${SANS}`;
    ctx.fillText('Pide desde tu mesa', L.PAD, footY + 2 + L.FOOT_TOP);

    ctx.textAlign = 'right';
    ctx.fillStyle = primary;
    ctx.font = `600 ${L.FOOT_URL}px ${SANS}`;
    ctx.fillText(menuUrl(cfg), L.W - L.PAD, footY + 2 + L.FOOT_TOP + (L.FOOT_CTA - L.FOOT_URL));

    return canvas;
  }

  // Link público del menú, sin el protocolo (se lee mejor en la imagen)
  function menuUrl(cfg) {
    const host = window.location.host;
    return cfg.slug ? `${host}/${cfg.slug}` : host;
  }

  // ── API pública ───────────────────────────────────────────────────────────

  let cachedConfig = null;

  // Devuelve el canvas ya compuesto, sin descargarlo. Separado de download()
  // para que el E2E pueda medirlo y leerle píxeles sin disparar una descarga.
  async function render(menu) {
    if (!cachedConfig) cachedConfig = await api('GET', '/api/menu/restaurante/config');
    return buildCanvas(menu, cachedConfig);
  }

  async function download(menu) {
    if (!menu) return;
    if (!readSections(menu).length) {
      toast('Este menú todavía no tiene platos', 'err');
      return;
    }

    const canvas = await render(menu);

    const nombreArchivo = `menu-${menu.dia || 'del-dia'}.jpg`;
    const blob = await new Promise(resolve => {
      if (canvas.toBlob) canvas.toBlob(resolve, 'image/jpeg', 0.85);
      else resolve(null);
    });

    const a = document.createElement('a');
    a.download = nombreArchivo;
    if (blob) {
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.click();
      // Dar tiempo a que el navegador tome el blob antes de soltarlo
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } else {
      // WebView sin toBlob: data URI directo
      a.href = canvas.toDataURL('image/jpeg', 0.85);
      a.click();
    }
  }

  window.MenuExport = { download, render };
})();
