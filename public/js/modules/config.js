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

    // Auto-merge (Gap 8)
    const amEl = document.getElementById('cfg-auto-merge-activo');
    if (amEl) amEl.checked = cfg.auto_merge_activo ?? true;

    // Slug / URL personalizada
    const slugEl = document.getElementById('config-slug');
    if (slugEl) slugEl.value = cfg.slug || '';
    actualizarSlugPreview(cfg.slug || null);

    generarQR(cfg.slug || null);
    loadMesasConfig();
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
  const formData = new FormData();
  formData.append('foto', input.files[0]);
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
async function loadMesasConfig() {
  const el = document.getElementById('cfg-mesas-list');
  if (!el) return;
  try {
    const mesas = await api('GET', '/api/mesas');
    if (!mesas.length) {
      el.innerHTML = '<span style="font-size:12px;color:var(--muted)">Sin mesas configuradas</span>';
      return;
    }
    el.innerHTML = mesas.map(m => `
      <div style="display:flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:13px">
        <span style="font-weight:700">Mesa ${m.numero}</span>
        <span style="color:var(--muted);font-size:11px">${m.capacidad} personas</span>
        <button onclick="eliminarMesa(${m.id}, ${m.numero})" style="margin-left:4px;background:none;border:none;color:var(--danger);cursor:pointer;font-size:13px;padding:0 2px" title="Eliminar">✕</button>
      </div>`).join('');
  } catch(e) { el.innerHTML = `<span style="color:var(--danger);font-size:12px">${e.message}</span>`; }
}

async function crearMesa() {
  const numero    = document.getElementById('cfg-mesa-numero').value;
  const capacidad = document.getElementById('cfg-mesa-capacidad').value;
  if (!numero) return toast('Ingresa el número de mesa', 'err');
  try {
    await api('POST', '/api/mesas', { numero, capacidad });
    document.getElementById('cfg-mesa-numero').value = '';
    toast(`Mesa ${numero} agregada`);
    loadMesasConfig();
  } catch(e) { toast(e.message, 'err'); }
}

async function eliminarMesa(id, numero) {
  if (!confirm(`¿Eliminar Mesa ${numero}?`)) return;
  try {
    await api('DELETE', `/api/mesas/${id}`);
    toast(`Mesa ${numero} eliminada`);
    loadMesasConfig();
  } catch(e) { toast(e.message, 'err'); }
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
    label.style.cssText = 'font-size:12px;font-weight:700;color:var(--text)';
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
