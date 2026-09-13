// ── Restaurante brand (sidebar) ──────────────────────────
async function loadRestauranteBrand() {
  try {
    const cfg = await api('GET', '/api/menu/restaurante/config');
    document.getElementById('sidebar-restaurant').textContent = cfg.nombre || 'Mi restaurante';
    const brandIcon = document.getElementById('brand-icon');
    if (cfg.foto_portada) {
      brandIcon.innerHTML = `<img src="${cfg.foto_portada}" alt="Logo" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`;
    } else {
      brandIcon.textContent = '🍽️';
    }
  } catch (_) {
    document.getElementById('sidebar-restaurant').textContent = 'Mi restaurante';
  }
}

// ── Configuración ────────────────────────────────────────
async function loadConfiguracion() {
  try {
    const cfg = await api('GET', '/api/menu/restaurante/config');

    // Nombre del restaurante
    const nombreEl = document.getElementById('config-nombre');
    if (nombreEl) nombreEl.value = cfg.nombre || '';

    // Preview foto
    const preview = document.getElementById('config-foto-preview');
    const btnElim = document.getElementById('btn-eliminar-foto');
    if (cfg.foto_portada) {
      preview.innerHTML = `<img src="${cfg.foto_portada}" alt="Portada" style="width:100%;height:100%;object-fit:cover">`;
      btnElim.style.display = 'inline-flex';
    } else {
      preview.innerHTML = '🍽️';
      btnElim.style.display = 'none';
    }

    // Colores
    const cp = cfg.color_primario   || '#c8692a';
    const cs = cfg.color_secundario || '#1a6090';
    document.getElementById('config-color-primario').value   = cp;
    document.getElementById('config-color-primario-hex').textContent = cp;
    document.getElementById('config-color-secundario').value   = cs;
    document.getElementById('config-color-secundario-hex').textContent = cs;

    // Métodos de pago
    document.getElementById('pago-yape-activo').checked       = !!cfg.yape_activo;
    document.getElementById('pago-yape-telefono').value       = cfg.yape_telefono || '';
    document.getElementById('pago-plin-activo').checked       = !!cfg.plin_activo;
    document.getElementById('pago-plin-telefono').value       = cfg.plin_telefono || '';
    document.getElementById('pago-efectivo-activo').checked   = !!cfg.efectivo_activo;

    // Auto-preparación (Gap 3)
    const mpEl = document.getElementById('cfg-minutos-preparacion');
    if (mpEl) mpEl.value = cfg.minutos_preparacion ?? 20;

    // Auto-entregado (ISS-091)
    const maeEl = document.getElementById('cfg-minutos-auto-entregado');
    if (maeEl) maeEl.value = cfg.minutos_auto_entregado ?? 3;

    // Aviso al cobrar una mesa (ISS-089). No viene del servidor: es una
    // preferencia de ESTE dispositivo, guardada por pedidos.js en localStorage.
    const ccmEl = document.getElementById('cfg-confirmar-cobro-mesa');
    if (ccmEl) ccmEl.checked = pideConfirmacionDeCobro();

    // Ventana de cancelación de reservas (cliente)
    const mcEl = document.getElementById('cfg-minutos-cancelacion-reserva');
    if (mcEl) mcEl.value = cfg.minutos_cancelacion_reserva ?? 30;

    // Horario de atención (Gap 18)
    const haEl = document.getElementById('cfg-horario-activo');
    const apEl = document.getElementById('cfg-hora-apertura');
    const ciEl = document.getElementById('cfg-hora-cierre');
    if (haEl) haEl.checked = !!cfg.horario_activo;
    if (apEl) apEl.value   = cfg.hora_apertura || '00:00';
    if (ciEl) ciEl.value   = cfg.hora_cierre   || '23:59';
    const diasActivos = (cfg.dias_atencion || '0,1,2,3,4,5,6').split(',').map(Number);
    document.querySelectorAll('.cfg-dia-check').forEach(chk => {
      chk.checked = diasActivos.includes(Number(chk.value));
    });

    // Modalidades y costos (Gap 4 + Gap 5)
    const plEl = document.getElementById('cfg-para-llevar-activo');
    const dlEl = document.getElementById('cfg-delivery-activo');
    if (plEl) plEl.checked = !!cfg.para_llevar_activo;
    if (dlEl) dlEl.checked = !!cfg.delivery_activo;
    const tapEl = document.getElementById('cfg-costo-tapper');
    const delEl = document.getElementById('cfg-tarifa-delivery');
    if (tapEl) tapEl.value = cfg.costo_tapper    ?? 0;
    if (delEl) delEl.value = cfg.tarifa_delivery  ?? 0;

    // Auto-merge (Gap 8) — apagado por defecto desde ISS-093
    const amEl = document.getElementById('cfg-auto-merge-activo');
    if (amEl) amEl.checked = cfg.auto_merge_activo ?? false;

    // Slug / URL personalizada
    const slugEl = document.getElementById('config-slug');
    if (slugEl) slugEl.value = cfg.slug || '';
    actualizarSlugPreview(cfg.slug || null);

    generarQR(cfg.slug || null);
    loadMesasConfig();

    // Tamaño de letra ajustable — preferencia por dispositivo (localStorage, no viaja al backend)
    // La lista y la migración de valores viejos viven en el script del <head>
    // de owner.html (se aplica antes del paint). Acá solo se marca el botón.
    const escalas = window.MP_FONT_SCALES || [1.15, 1.4, 1.7];
    let scaleActual = parseFloat(localStorage.getItem(window.MP_FONT_KEY || 'mp-font-scale-v2'));
    if (!escalas.includes(scaleActual)) scaleActual = escalas[0];
    document.querySelectorAll('.font-scale-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.scale) === scaleActual);
    });
  } catch(e) { toast(e.message, 'err'); }
}

function actualizarSlugPreview(slug) {
  const preview = document.getElementById('config-slug-preview');
  const urlEl   = document.getElementById('config-slug-url');
  if (!preview || !urlEl) return;
  if (slug) {
    const href = `${window.location.origin}/${slug}`;
    urlEl.textContent = href;
    urlEl.href = href;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

async function guardarNombreRestaurante() {
  const nombre = (document.getElementById('config-nombre')?.value || '').trim();
  if (nombre.length < 2) return toast('Ingresa un nombre de al menos 2 caracteres', 'err');
  try {
    await api('PATCH', '/api/menu/config/nombre', { nombre });
    toast('Nombre actualizado correctamente');
    loadRestauranteBrand();
  } catch(e) { toast(e.message, 'err'); }
}

async function guardarSlug() {
  const slug = (document.getElementById('config-slug')?.value || '').trim();
  try {
    const res = await api('PATCH', '/api/menu/config/slug', { slug });
    actualizarSlugPreview(res.slug || null);
    generarQR(res.slug || null);
    toast(res.slug ? `URL guardada: menupro.tech/${res.slug}` : 'URL personalizada eliminada');
  } catch(e) { toast(e.message, 'err'); }
}

function copiarSlugUrl() {
  const urlEl = document.getElementById('config-slug-url');
  if (!urlEl) return;
  navigator.clipboard.writeText(urlEl.textContent).then(() => toast('Link copiado'));
}

async function guardarConfigPagos() {
  const body = {
    yape_activo:     document.getElementById('pago-yape-activo').checked,
    yape_telefono:   document.getElementById('pago-yape-telefono').value.trim(),
    plin_activo:     document.getElementById('pago-plin-activo').checked,
    plin_telefono:   document.getElementById('pago-plin-telefono').value.trim(),
    efectivo_activo: document.getElementById('pago-efectivo-activo').checked,
  };
  try {
    await api('PATCH', '/api/menu/config/pagos', body);
    toast('Métodos de pago guardados');
  } catch(e) { toast(e.message, 'err'); }
}

async function guardarConfigColores() {
  const color_primario   = document.getElementById('config-color-primario').value;
  const color_secundario = document.getElementById('config-color-secundario').value;
  try {
    await api('PATCH', '/api/menu/restaurante/config', { color_primario, color_secundario });
    toast('Colores guardados correctamente');
  } catch(e) { toast(e.message, 'err'); }
}

async function subirFotoRestaurante(input) {
  if (!input.files.length) return;
  // Reducir antes de subir (ISS-083): la foto de portada se subía cruda y una
  // foto de cámara de 3-8 MB o excede el límite del servidor o cuelga celulares
  // de gama baja. El resto de fotos del sistema ya pasan por el recortador.
  let foto = input.files[0];
  try {
    if (typeof window.downscaleImage === 'function') {
      toast('Procesando foto…');
      foto = await window.downscaleImage(foto, { maxDim: 1600, quality: 0.85 });
    }
  } catch (_) { /* se sube el original */ }
  const formData = new FormData();
  formData.append('foto', foto);
  try {
    const res = await fetch('/api/menu/restaurante/foto', {
      method: 'POST',
      credentials: 'same-origin',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al subir la foto');
    toast('Foto actualizada correctamente');
    loadConfiguracion();
    loadRestauranteBrand();
  } catch(e) { toast(e.message, 'err'); }
  input.value = '';
}

async function eliminarFotoRestaurante() {
  try {
    await api('DELETE', '/api/menu/restaurante/foto');
    toast('Foto eliminada');
    loadConfiguracion();
    loadRestauranteBrand();
  } catch(e) { toast(e.message, 'err'); }
}

// ── Mesas (desde panel Configuración) ───────────────────
// ISS-094: se crean todas de una vez con POST /api/mesas/lote (antes, de a una:
// 20 vueltas para el piloto). Decidido con el usuario sobre el mockup: solo el
// formulario + un resumen, sin lista ni ✕ por mesa. Quitar mesas no tiene
// pantalla — nada del día a día depende de esta lista (solo el Plano de mesas).

let _mesasNumeros = [];  // números de mesa ya creados, ordenados

// "1 a 20, 30" — agrupa números consecutivos en rangos
function rangosMesas(numeros) {
  const partes = [];
  let i = 0;
  while (i < numeros.length) {
    let j = i;
    while (j + 1 < numeros.length && numeros[j + 1] === numeros[j] + 1) j++;
    partes.push(j > i ? `${numeros[i]} a ${numeros[j]}` : `${numeros[i]}`);
    i = j + 1;
  }
  return partes.join(', ');
}

async function loadMesasConfig() {
  const resumen = document.getElementById('cfg-mesas-resumen');
  if (!resumen) return;
  try {
    const mesas = await api('GET', '/api/mesas');
    _mesasNumeros = mesas.map(m => m.numero).sort((a, b) => a - b);
    const input = document.getElementById('cfg-mesas-cantidad');
    const btn   = document.getElementById('cfg-mesas-btn');

    if (!_mesasNumeros.length) {
      resumen.textContent = 'Crea todas tus mesas de una vez. Aparecen en el plano de mesas.';
      btn.textContent = 'Crear mesas';
    } else {
      const n = _mesasNumeros.length;
      resumen.innerHTML = `Tienes <strong style="color:var(--text)">${n} ${n === 1 ? 'mesa' : 'mesas'}</strong>: ${esc(rangosMesas(_mesasNumeros))}.`;
      btn.textContent = 'Crear las que faltan';
      input.value = _mesasNumeros[_mesasNumeros.length - 1];
    }
    actualizarAyudaMesas();
    // El generador de QR por mesa arranca con la cantidad de mesas creadas
    const qrNum = document.getElementById('qr-num-mesas');
    if (qrNum && _mesasNumeros.length) qrNum.value = Math.min(_mesasNumeros[_mesasNumeros.length - 1], 100);
  } catch(e) {
    resumen.innerHTML = `<span style="color:var(--danger)">${esc(e.message)}</span>`;
  }
}

// Texto bajo el campo: qué va a pasar al tocar el botón, antes de tocarlo
function actualizarAyudaMesas() {
  const ayuda = document.getElementById('cfg-mesas-ayuda');
  if (!ayuda) return;
  const n = parseInt(document.getElementById('cfg-mesas-cantidad').value, 10);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    ayuda.textContent = 'Pon un número entre 1 y 100.';
    return;
  }
  if (!_mesasNumeros.length) {
    ayuda.textContent = n === 1 ? 'Se crea la mesa 1.' : `Se crean numeradas del 1 al ${n}.`;
    return;
  }
  const existentes = new Set(_mesasNumeros);
  const faltan = [];
  for (let i = 1; i <= n; i++) if (!existentes.has(i)) faltan.push(i);
  ayuda.textContent = faltan.length
    ? `Se ${faltan.length === 1 ? 'agrega la mesa' : 'agregan las mesas'} ${rangosMesas(faltan)}. No se borra ninguna.`
    : 'Ya tienes todas esas mesas. Para agregar más, pon un número mayor.';
}

async function crearMesasLote() {
  const cantidad = parseInt(document.getElementById('cfg-mesas-cantidad').value, 10);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100)
    return toast('Pon cuántas mesas tiene tu local, entre 1 y 100', 'err');
  const btn = document.getElementById('cfg-mesas-btn');
  btn.disabled = true;
  try {
    const { creadas } = await api('POST', '/api/mesas/lote', { cantidad });
    toast(creadas.length
      ? `Se ${creadas.length === 1 ? 'creó 1 mesa' : `crearon ${creadas.length} mesas`}`
      : 'Ya tenías todas esas mesas');
    await loadMesasConfig();
  } catch(e) {
    toast(e.message, 'err');
  } finally {
    btn.disabled = false;
  }
}

// ── QR del menú ──────────────────────────────────────────
let _qrInstance = null;

function generarQR(slug) {
  const wrap = document.getElementById('qr-canvas-wrap');
  const linkInput = document.getElementById('qr-link-input');
  if (!wrap) return;

  const url = slug
    ? `${window.location.origin}/${slug}`
    : `${window.location.origin}/menu?restaurante=${session.restaurant_id}`;
  linkInput.value = url;
  wrap.innerHTML = '';

  _qrInstance = new QRCode(wrap, {
    text:          url,
    width:         180,
    height:        180,
    colorDark:     '#1a1612',
    colorLight:    '#ffffff',
    correctLevel:  QRCode.CorrectLevel.M
  });
}

function copiarLinkQR() {
  const val = document.getElementById('qr-link-input').value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => toast('Link copiado'));
}

function descargarQR() {
  const canvas = document.querySelector('#qr-canvas-wrap canvas');
  if (!canvas) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `menu-qr-restaurante-${session.restaurant_id}.png`;
  a.click();
}

function generarQRsMesas() {
  const n = parseInt(document.getElementById('qr-num-mesas').value) || 10;
  const grid = document.getElementById('qr-mesas-grid');
  const slug = document.getElementById('config-slug')?.value.trim() || null;
  grid.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    const url = slug
      ? `${window.location.origin}/${slug}/${i}`
      : `${window.location.origin}/menu?restaurante=${session.restaurant_id}&mesa=${i}`;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px';

    const canvasWrap = document.createElement('div');
    canvasWrap.id = `qr-mesa-${i}`;
    canvasWrap.style.cssText = 'background:#fff;padding:8px;border-radius:8px;border:1px solid var(--border)';

    new QRCode(canvasWrap, { text: url, width: 110, height: 110, colorDark: '#1a1612', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });

    const label = document.createElement('span');
    label.style.cssText = 'font-size:0.857143rem;font-weight:700;color:var(--text)';
    label.textContent = `Mesa ${i}`;

    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-sm';
    btn.textContent = '⬇ PNG';
    btn.onclick = () => {
      const c = canvasWrap.querySelector('canvas');
      if (!c) return;
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `qr-mesa-${i}.png`;
      a.click();
    };

    wrap.appendChild(canvasWrap);
    wrap.appendChild(label);
    wrap.appendChild(btn);
    grid.appendChild(wrap);
  }
}

async function guardarModalidades() {
  const body = {
    para_llevar_activo: document.getElementById('cfg-para-llevar-activo').checked,
    delivery_activo:    document.getElementById('cfg-delivery-activo').checked,
    costo_tapper:       parseFloat(document.getElementById('cfg-costo-tapper')?.value)    || 0,
    tarifa_delivery:    parseFloat(document.getElementById('cfg-tarifa-delivery')?.value) || 0,
  };
  try {
    await api('PATCH', '/api/menu/config/modalidades', body);
    toast('Modalidades guardadas');
  } catch(e) { toast(e.message, 'err'); }
}

async function guardarAutoMerge() {
  const activo = document.getElementById('cfg-auto-merge-activo').checked;
  try {
    await api('PATCH', '/api/menu/config/auto-merge', { auto_merge_activo: activo });
    toast('Configuración guardada');
  } catch(e) { toast(e.message, 'err'); }
}

async function guardarMinutosPreparacion() {
  const minutos = parseInt(document.getElementById('cfg-minutos-preparacion').value, 10);
  if (isNaN(minutos) || minutos < 1 || minutos > 180)
    return toast('Ingresa un valor entre 1 y 180 minutos', 'err');
  try {
    await api('PATCH', '/api/menu/config/minutos-preparacion', { minutos_preparacion: minutos });
    toast('Tiempo de preparación guardado');
  } catch(e) { toast(e.message, 'err'); }
}

// ISS-089 — volver a activar (o desactivar) el aviso previo al cobro de una
// mesa. Vive en localStorage: es de este celular, no del restaurante.
// CONFIRMAR_COBRO_KEY y pideConfirmacionDeCobro() los define pedidos.js. Se
// carga después que config.js, pero no importa: estas funciones solo corren
// cuando el usuario abre el panel, con todos los módulos ya evaluados.
function guardarConfirmarCobroMesa() {
  const preguntar = document.getElementById('cfg-confirmar-cobro-mesa').checked;
  try {
    if (preguntar) localStorage.removeItem(CONFIRMAR_COBRO_KEY);
    else           localStorage.setItem(CONFIRMAR_COBRO_KEY, 'no');
    toast(preguntar ? 'Te preguntaremos antes de cobrar una mesa' : 'No volveremos a preguntar en este celular');
  } catch { toast('No se pudo guardar la preferencia', 'err'); }
}

// ISS-091 — cuánto espera un pedido en "Listos" antes de pasar solo a
// "Por cobrar". 0 = apagado (se queda hasta que alguien toque "Entregar").
async function guardarMinutosAutoEntregado() {
  const minutos = parseInt(document.getElementById('cfg-minutos-auto-entregado').value, 10);
  if (isNaN(minutos) || minutos < 0 || minutos > 180)
    return toast('Ingresa un valor entre 0 y 180 minutos', 'err');
  try {
    await api('PATCH', '/api/menu/config/minutos-auto-entregado', { minutos_auto_entregado: minutos });
    toast(minutos === 0
      ? 'Apagado: los pedidos esperan en "Listos"'
      : `Los pedidos pasarán solos a "Por cobrar" tras ${minutos} min`);
  } catch(e) { toast(e.message, 'err'); }
}

async function guardarMinutosCancelacionReserva() {
  const minutos = parseInt(document.getElementById('cfg-minutos-cancelacion-reserva').value, 10);
  if (isNaN(minutos) || minutos < 0 || minutos > 1440)
    return toast('Ingresa un valor entre 0 y 1440 minutos', 'err');
  try {
    await api('PATCH', '/api/menu/config/minutos-cancelacion-reserva', { minutos_cancelacion_reserva: minutos });
    toast('Ventana de cancelación guardada');
  } catch(e) { toast(e.message, 'err'); }
}

async function guardarHorarioAtencion() {
  const horario_activo = document.getElementById('cfg-horario-activo').checked;
  const hora_apertura  = document.getElementById('cfg-hora-apertura').value;
  const hora_cierre    = document.getElementById('cfg-hora-cierre').value;
  const dias_atencion  = [...document.querySelectorAll('.cfg-dia-check:checked')].map(chk => Number(chk.value));

  if (!hora_apertura || !hora_cierre)
    return toast('Ingresa la hora de apertura y cierre', 'err');
  if (hora_apertura >= hora_cierre)
    return toast('La hora de apertura debe ser anterior a la de cierre', 'err');
  if (!dias_atencion.length)
    return toast('Selecciona al menos un día de atención', 'err');

  try {
    await api('PATCH', '/api/menu/config/horario', { horario_activo, hora_apertura, hora_cierre, dias_atencion });
    toast('Horario de atención guardado');
  } catch(e) { toast(e.message, 'err'); }
}

// ── Listeners de color picker (llamar desde init) ────────
function initConfigListeners() {
  document.getElementById('config-color-primario').addEventListener('input', function() {
    document.getElementById('config-color-primario-hex').textContent = this.value;
  });
  document.getElementById('config-color-secundario').addEventListener('input', function() {
    document.getElementById('config-color-secundario-hex').textContent = this.value;
  });
}
