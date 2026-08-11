// utils/sesion.js
// Reglas de vida de la sesión — funciones puras, testeables sin levantar HTTP
// (mismo patrón que utils/horarioAtencion.js y utils/verificacionPago.js).
//
// Contexto (ISS-027): la sesión duraba 8h y el dueño tenía que reingresar en
// plena atención. El objetivo es abrir el ícono de la PWA y ya estar dentro,
// como WhatsApp.

const DIA_MS = 24 * 60 * 60 * 1000;

const SESION_DIAS = 30;

// El admin del SaaS queda fuera: su cuenta puede crear y desactivar cualquier
// restaurante, así que mantiene la sesión corta. La comodidad de no reingresar
// es para quien atiende con el celular en la mano, no para la cuenta más
// privilegiada del sistema.
const SESION_DIAS_ADMIN = 1;

/** Días de vida de la sesión según el rol. */
function diasSesion(role) {
  return role === 'admin' ? SESION_DIAS_ADMIN : SESION_DIAS;
}

/**
 * Opciones de la cookie de sesión.
 *
 * sameSite 'lax' (no 'strict'): con 'strict' el navegador no manda la cookie en
 * la navegación inicial hacia la app, que es justo el caso de abrir la PWA desde
 * el ícono. 'lax' sigue bloqueando el envío en requests cross-site.
 */
function cookieSesion(role, esProduccion) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure:   !!esProduccion,
    maxAge:   diasSesion(role) * DIA_MS,
  };
}

/**
 * Renovación deslizante: ¿hay que emitir un token nuevo?
 * Se renueva cuando queda menos de la mitad de la vida original. Así quien usa
 * la app a diario nunca vuelve a ver el login, y quien la abandona el período
 * completo sí tiene que ingresar de nuevo.
 *
 * @param expSegundos `exp` del JWT (segundos desde epoch, estándar JWT)
 * @param role        rol del usuario — define la vida total
 * @param ahoraMs     momento actual en ms (inyectable para tests)
 */
function necesitaRenovacion(expSegundos, role, ahoraMs = Date.now()) {
  if (!expSegundos) return false;
  const vidaMs     = diasSesion(role) * DIA_MS;
  const restanteMs = (expSegundos * 1000) - ahoraMs;
  return restanteMs < vidaMs / 2;
}

module.exports = {
  DIA_MS,
  SESION_DIAS,
  SESION_DIAS_ADMIN,
  diasSesion,
  cookieSesion,
  necesitaRenovacion,
};
