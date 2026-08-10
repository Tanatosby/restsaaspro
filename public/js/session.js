// ════════════════════════════════════════════════════════
// SESIÓN PERSISTENTE DEL PANEL — ISS-027
//
// Antes la sesión vivía en sessionStorage, que el navegador borra al cerrar la
// pestaña o la PWA. Por eso el dueño tenía que iniciar sesión cada vez que
// abría el ícono de la app, aunque su cookie siguiera viva. Ahora vive en
// localStorage y persiste hasta que se cierre sesión explícitamente.
//
// La fuente de verdad sigue siendo la cookie httpOnly de 30 días que emite el
// backend (routes/auth.js); esto es solo la copia local que permite pintar la
// UI al instante, sin esperar una respuesta del servidor.
//
// Key propia ('mp-session', igual convención que mp-theme/mp-font-scale) para
// no cruzarse con el panel admin, que usa sessionStorage['session'].
// ════════════════════════════════════════════════════════

const MP_SESSION_KEY = 'mp-session';

// Lee la sesión local. Migra automáticamente la sesión vieja de sessionStorage
// para que nadie quede deslogueado el día que se despliegue este cambio.
function leerSesion() {
  try {
    const guardada = localStorage.getItem(MP_SESSION_KEY);
    if (guardada) return JSON.parse(guardada);

    const vieja = sessionStorage.getItem('session');
    if (vieja) {
      localStorage.setItem(MP_SESSION_KEY, vieja);
      sessionStorage.removeItem('session');
      return JSON.parse(vieja);
    }
    return null;
  } catch (_) {
    return null;
  }
}

function guardarSesion(user) {
  try {
    localStorage.setItem(MP_SESSION_KEY, JSON.stringify({
      name:          user.name,
      role:          user.role,
      restaurant_id: user.restaurant_id,
      permisos:      user.permisos   // null = acceso total (owner/admin)
    }));
  } catch (_) { /* storage lleno o bloqueado — la cookie sigue siendo la verdad */ }
}

function limpiarSesion() {
  try {
    localStorage.removeItem(MP_SESSION_KEY);
    sessionStorage.removeItem('session');
  } catch (_) {}
}

// Pregunta al backend si la cookie sigue viva y, de paso, la renueva
// (renovación deslizante en GET /api/auth/me).
//
// Devuelve { estado, user }:
//   'ok'        → sesión válida, `user` viene fresco del servidor
//   'rechazada' → cookie vencida o revocada; la sesión local ya fue borrada
//   'sin-red'   → no hubo respuesta; NO se borra nada, quien ya estaba dentro
//                 debe poder seguir usando la app aunque se caiga la conexión
async function restaurarSesion() {
  let res;
  try {
    res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  } catch (_) {
    return { estado: 'sin-red', user: null };
  }

  if (!res.ok) {
    limpiarSesion();
    return { estado: 'rechazada', user: null };
  }

  const data = await res.json();
  guardarSesion(data.user);
  return { estado: 'ok', user: data.user };
}
