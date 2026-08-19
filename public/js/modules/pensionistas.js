// ════════════════════════════════════════════════════════
// MÓDULO: PENSIONISTAS
// Comensales recurrentes con saldo prepagado. El owner los crea, les recarga
// saldo y ve su historial de movimientos. Ver pensionistas.md §6.
//
// El backend ya existía (routes/pensionistas.js, 2026-08-11); esto es el panel
// que faltaba. El pensionista pide desde pensionista.html, que se descuenta del
// saldo sin pasar por pantalla de pago.
//
// Se listan como cards y no como tabla (a diferencia de usuarios.js): el saldo
// es el dato que la dueña mira de reojo y en 360px una tabla lo esconde.
// ════════════════════════════════════════════════════════

// Umbral de saldo bajo del restaurante; se llena al cargar el panel.
let _saldoAviso = 20;

const sPen = n => `S/ ${(Number(n) || 0).toFixed(2)}`;

async function loadPensionistas() {
  const el = document.getElementById('list-pensionistas');
  if (!el) return;
  el.innerHTML = '<div class="loading-text">Cargando…</div>';
  try {
    // El umbral vive en la config del restaurante, no en cada pensionista
    const [pensionistas, cfg] = await Promise.all([
      api('GET', '/api/pensionistas'),
      api('GET', '/api/menu/restaurante/config'),
    ]);
    _saldoAviso = cfg.pensionista_saldo_aviso ?? 20;

    if (!pensionistas.length) {
      el.innerHTML = emptyState('🧾', 'Aún no hay pensionistas. Creá el primero arriba.');
      return;
    }

    const bajos = pensionistas.filter(p => p.activo && p.saldo < _saldoAviso).length;
    const aviso = bajos
      ? `<div class="pen-aviso">⚠️ ${bajos} ${bajos === 1 ? 'pensionista está' : 'pensionistas están'} por quedarse sin saldo (menos de ${sPen(_saldoAviso)})</div>`
      : '';

    el.innerHTML = aviso + `<div class="pen-list">${pensionistas.map(cardPensionista).join('')}</div>`;
  } catch (e) {
    el.innerHTML = emptyState('⚠️', e.message);
  }
}

function cardPensionista(p) {
  const inactivo = !p.activo;
  const bajo     = p.activo && p.saldo < _saldoAviso;
  const nombre   = `${p.nombre} ${p.apellido}`;

  return `
  <div class="pen-card ${inactivo ? 'inactivo' : ''}" id="pen-card-${p.id}">
    <div class="pen-top">
      <div class="pen-id">
        <div class="pen-nombre">${esc(nombre)}</div>
        <div class="pen-meta">${esc(p.email)}${p.telefono ? ` · ${esc(p.telefono)}` : ''}</div>
      </div>
      <div class="pen-saldo ${bajo ? 'bajo' : ''}">
        <span class="pen-saldo-num">${sPen(p.saldo)}</span>
        <span class="pen-saldo-lbl">${inactivo ? 'de baja' : bajo ? 'saldo bajo' : 'saldo'}</span>
      </div>
    </div>
    <div class="pen-acciones">
      ${p.activo
        ? `<button class="btn btn-primary btn-sm" onclick="recargarPensionista(${p.id})">+ Recargar</button>`
        : ''}
      <button class="btn btn-ghost btn-sm" onclick="verMovimientos(${p.id})">📜 Movimientos</button>
      <button class="btn btn-ghost btn-sm" onclick="editarPensionista(${p.id})">✏ Editar</button>
      <button class="btn btn-ghost btn-sm" onclick="passwordPensionista(${p.id})">🔑 Contraseña</button>
      <button class="btn btn-ghost btn-sm ${p.activo ? 'pen-baja' : ''}" onclick="togglePensionistaActivo(${p.id}, ${p.activo ? 1 : 0})">
        ${p.activo ? '⏸ Dar de baja' : '▶ Reactivar'}
      </button>
    </div>
    <div class="pen-movs" id="pen-movs-${p.id}" hidden></div>
  </div>`;
}

// Busca un pensionista ya cargado sin volver a pedir la lista entera
async function _buscarPensionista(id) {
  const lista = await api('GET', '/api/pensionistas');
  return lista.find(p => p.id === id);
}

async function crearPensionista() {
  const nombre   = document.getElementById('pen-nombre').value.trim();
  const apellido = document.getElementById('pen-apellido').value.trim();
  const email    = document.getElementById('pen-email').value.trim();
  const telefono = document.getElementById('pen-telefono').value.trim();
  const password = document.getElementById('pen-password').value;
  const saldoRaw = document.getElementById('pen-saldo').value;

  setErr('err-pensionista', '');
  if (!nombre)   return setErr('err-pensionista', 'El nombre es requerido');
  if (!apellido) return setErr('err-pensionista', 'El apellido es requerido');
  if (!email)    return setErr('err-pensionista', 'El email es requerido');
  if (!email.toLowerCase().endsWith('@menupro.tech'))
    return setErr('err-pensionista', 'El email debe terminar en @menupro.tech');
  if (!password || password.length < 8)
    return setErr('err-pensionista', 'La contraseña debe tener al menos 8 caracteres');

  const saldo_inicial = saldoRaw === '' ? 0 : Number(saldoRaw);
  if (!Number.isFinite(saldo_inicial) || saldo_inicial < 0)
    return setErr('err-pensionista', 'El saldo inicial debe ser 0 o más');

  try {
    await api('POST', '/api/pensionistas', { nombre, apellido, email, telefono, password, saldo_inicial });
    toast(`${nombre} ${apellido} ya puede pedir con su saldo`);
    ['pen-nombre','pen-apellido','pen-email','pen-telefono','pen-password','pen-saldo']
      .forEach(id => { document.getElementById(id).value = ''; });
    loadPensionistas();
  } catch (e) { setErr('err-pensionista', e.message); }
}

async function recargarPensionista(id) {
  const p = await _buscarPensionista(id);
  if (!p) return toast('Pensionista no encontrado', 'err');

  FormModal.open({
    title: `Recargar a ${p.nombre} ${p.apellido}`,
    fields: [
      { name: 'monto', label: `Monto a agregar (saldo actual: ${sPen(p.saldo)})`,
        type: 'number', step: '0.10', min: '0.10', required: true },
      { name: 'nota', label: 'Nota (opcional)', type: 'text',
        placeholder: 'Ej: Recarga semana del 18 al 22' },
    ],
    submitLabel: 'Recargar',
    onSubmit: async (v) => {
      const r = await api('POST', `/api/pensionistas/${id}/recargar`, { monto: Number(v.monto), nota: v.nota || null });
      toast(`Saldo nuevo: ${sPen(r.saldo ?? (p.saldo + Number(v.monto)))}`);
      loadPensionistas();
    },
  });
}

// Historial de recargas y consumos. Se abre dentro de la card (no en modal)
// para que la dueña pueda comparar con el saldo que tiene arriba.
async function verMovimientos(id) {
  const cont = document.getElementById(`pen-movs-${id}`);
  if (!cont) return;
  if (!cont.hidden) { cont.hidden = true; cont.innerHTML = ''; return; }

  cont.hidden = false;
  cont.innerHTML = '<div class="loading-text">Cargando…</div>';
  try {
    const movs = await api('GET', `/api/pensionistas/${id}/movimientos`);
    if (!movs.length) {
      cont.innerHTML = '<div class="pen-movs-vacio">Sin movimientos todavía</div>';
      return;
    }
    cont.innerHTML = movs.map(m => {
      const esRecarga = m.tipo === 'recarga';
      return `<div class="pen-mov">
        <span class="pen-mov-tipo ${esRecarga ? 'recarga' : 'consumo'}">${esRecarga ? '↑ Recarga' : '↓ Consumo'}</span>
        <span class="pen-mov-monto ${esRecarga ? 'recarga' : 'consumo'}">${esRecarga ? '+' : '−'}${sPen(Math.abs(m.monto))}</span>
        <span class="pen-mov-saldo">queda ${sPen(m.saldo_resultante)}</span>
        <span class="pen-mov-fecha">${fDT(m.created_at)}</span>
        ${m.nota ? `<span class="pen-mov-nota">${esc(m.nota)}</span>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    cont.innerHTML = `<div class="pen-movs-vacio">${esc(e.message)}</div>`;
  }
}

async function editarPensionista(id) {
  const p = await _buscarPensionista(id);
  if (!p) return toast('Pensionista no encontrado', 'err');

  FormModal.open({
    title: 'Editar datos',
    fields: [
      { name: 'nombre',   label: 'Nombre',   type: 'text', value: p.nombre,   required: true },
      { name: 'apellido', label: 'Apellido', type: 'text', value: p.apellido, required: true },
      { name: 'telefono', label: 'Teléfono', type: 'tel',  value: p.telefono || '' },
    ],
    submitLabel: 'Guardar',
    onSubmit: async (v) => {
      await api('PATCH', `/api/pensionistas/${id}`, v);
      toast('Datos actualizados');
      loadPensionistas();
    },
  });
}

async function passwordPensionista(id) {
  const p = await _buscarPensionista(id);
  if (!p) return toast('Pensionista no encontrado', 'err');

  FormModal.open({
    title: `Contraseña de ${p.nombre}`,
    fields: [
      { name: 'password', label: 'Contraseña nueva (mín. 8 caracteres)', type: 'password', required: true },
    ],
    submitLabel: 'Cambiar',
    onSubmit: async (v) => {
      if (!v.password || v.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
      await api('PATCH', `/api/pensionistas/${id}/password`, { password: v.password });
      toast('Contraseña actualizada');
    },
  });
}

// Baja lógica: conserva el historial para la reportería, pero no deja pedir
// ni recargar. Reversible.
async function togglePensionistaActivo(id, activoActual) {
  const dando = activoActual === 1;
  if (dando && !confirm('¿Dar de baja? No podrá pedir ni recibir recargas, pero se conserva su historial.')) return;
  try {
    await api('PATCH', `/api/pensionistas/${id}/activo`, { activo: dando ? 0 : 1 });
    toast(dando ? 'Pensionista dado de baja' : 'Pensionista reactivado');
    loadPensionistas();
  } catch (e) { toast(e.message, 'err'); }
}
