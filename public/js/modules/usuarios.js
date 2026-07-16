// ════════════════════════════════════════════════════════
// MÓDULO: USUARIOS
// ════════════════════════════════════════════════════════
const PERMISOS_DEF = [
  { key: 'menu_dia',           label: '📋 Menú del día' },
  { key: 'carta',              label: '🍴 Carta' },
  { key: 'ordenes_activas',    label: '🧾 Órdenes activas' },
  { key: 'ordenes_historial',  label: '📁 Historial órdenes' },
  { key: 'cocina',             label: '🍳 Cocina' },
  { key: 'reservas_activas',   label: '📅 Reservas activas' },
  { key: 'reservas_historial', label: '📁 Historial reservas' },
  { key: 'reportes',           label: '📊 Reportes' },
  { key: 'configuracion',      label: '⚙️ Configuración' },
];

async function loadUsuarios() {
  const el = document.getElementById('list-usuarios');
  el.innerHTML = '<div class="loading-text">Cargando…</div>';
  try {
    const usuarios = await api('GET', '/api/usuarios');
    if (!usuarios.length) {
      el.innerHTML = emptyState('👥', 'Sin usuarios en el equipo aún');
      return;
    }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr>
      <th>Nombre</th><th>Email</th><th>Rol</th><th></th>
    </tr></thead><tbody>` +
      usuarios.map(u => {
        let permisos = [];
        if (u.rol !== 'owner' && u.permisos) {
          try { permisos = JSON.parse(u.permisos); } catch (_) {}
        }

        const mainRow = `<tr>
          <td><strong>${esc(u.nombre)}</strong></td>
          <td style="color:var(--text-2)">${esc(u.email)}</td>
          <td><span class="badge ${u.rol === 'owner' ? 'badge-activo' : 'badge-inactivo'}"
            style="${u.rol === 'cocinero' ? 'background:#edf4fb;color:#1a6090' : u.rol === 'mozo' ? 'background:#f0eafc;color:#7c3aed' : ''}">
            ${esc(u.rol)}</span></td>
          <td style="text-align:right">
            ${u.rol !== 'owner'
              ? `<button class="btn btn-danger" onclick="eliminarUsuario(${u.id},'${esc(u.nombre)}')">Eliminar</button>`
              : '<span style="font-size:0.785714rem;color:var(--muted)">owner</span>'
            }
          </td>
        </tr>`;

        if (u.rol === 'owner') return mainRow;

        const checkboxes = PERMISOS_DEF.map(p =>
          `<label style="display:flex;align-items:center;gap:5px;font-size:0.857143rem;cursor:pointer;white-space:nowrap">
            <input type="checkbox" id="perm-${u.id}-${p.key}" value="${p.key}"
              ${permisos.includes(p.key) ? 'checked' : ''} />
            ${p.label}
          </label>`
        ).join('');

        const permRow = `<tr>
          <td colspan="4" style="background:var(--bg);padding:0.75rem 1rem;border-top:none">
            <div style="font-size:0.785714rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:0.5rem">Permisos de acceso</div>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem 1.5rem;margin-bottom:0.75rem">${checkboxes}</div>
            <button class="btn btn-primary btn-sm" onclick="guardarPermisos(${u.id})">Guardar permisos</button>
          </td>
        </tr>`;

        return mainRow + permRow;
      }).join('') +
    `</tbody></table></div>`;
  } catch(e) { el.innerHTML = emptyState('⚠️', e.message); }
}

async function guardarPermisos(userId) {
  const checkboxes = document.querySelectorAll(`input[id^="perm-${userId}-"]`);
  const permisos = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
  try {
    await api('PATCH', `/api/usuarios/${userId}/permisos`, { permisos });
    toast('Permisos guardados correctamente');
  } catch(e) { toast(e.message, 'err'); }
}

async function crearUsuario() {
  const nombre   = document.getElementById('u-nombre').value.trim();
  const email    = document.getElementById('u-email').value.trim();
  const password = document.getElementById('u-password').value;
  const rol      = document.getElementById('u-rol').value;
  setErr('err-usuario', '');
  if (!nombre)        return setErr('err-usuario', 'El nombre es requerido');
  if (!email)         return setErr('err-usuario', 'El email es requerido');
  if (!password || password.length < 8)
    return setErr('err-usuario', 'La contraseña debe tener al menos 8 caracteres');
  try {
    await api('POST', '/api/usuarios', { nombre, email, password, rol,
      id_restaurante: session.restaurant_id });
    toast('Usuario creado');
    ['u-nombre','u-email','u-password'].forEach(id => document.getElementById(id).value = '');
    loadUsuarios();
  } catch(e) { setErr('err-usuario', e.message); }
}

async function eliminarUsuario(id, nombre) {
  if (!confirm(`¿Eliminar a "${nombre}"?`)) return;
  try {
    await api('DELETE', `/api/usuarios/${id}`);
    toast('Usuario eliminado'); loadUsuarios();
  } catch(e) { toast(e.message, 'err'); }
}
