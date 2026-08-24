/**
 * Horario de atención configurable por restaurante (Gap 18).
 *
 * Si `horario_activo` es falsy, el restaurante atiende siempre — no hay
 * restricción (comportamiento por defecto para no romper restaurantes que
 * nunca configuraron esto).
 *
 * Límite conocido: no soporta horarios que crucen la medianoche
 * (asume hora_apertura < hora_cierre dentro del mismo día).
 */

function minutosDelDia(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function diasPermitidos(dias_atencion) {
  return (dias_atencion || '0,1,2,3,4,5,6').split(',').map(Number);
}

// `momento` es un Date "naive" (componentes UTC = hora de pared de Lima),
// mismo patrón que ahoraLima() / dentroDeVentanaCancelacion().
function estadoHorario(rest, momento) {
  if (!rest.horario_activo) return { abierto: true };

  const dia = momento.getUTCDay();
  if (!diasPermitidos(rest.dias_atencion).includes(dia))
    return { abierto: false, motivo: 'dia' };

  const minutosActual  = momento.getUTCHours() * 60 + momento.getUTCMinutes();
  const apertura        = minutosDelDia(rest.hora_apertura || '00:00');
  const cierre          = minutosDelDia(rest.hora_cierre   || '23:59');
  if (minutosActual < apertura || minutosActual >= cierre)
    return { abierto: false, motivo: 'hora' };

  return { abierto: true };
}

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function mensajeHorario(rest) {
  const dias = diasPermitidos(rest.dias_atencion).sort().map(d => NOMBRES_DIA[d]).join(', ');
  return `El restaurante está cerrado. Atendemos ${dias} de ${rest.hora_apertura} a ${rest.hora_cierre}.`;
}

// Valida el momento de creación (orden o reserva) contra "ahora".
function validarHorarioAhora(rest, ahora) {
  const { abierto } = estadoHorario(rest, ahora);
  if (!abierto) return { permitido: false, error: mensajeHorario(rest) };
  return { permitido: true };
}

// Reservas: si el cliente especificó hora_llegada, lo que importa es que ESE
// momento futuro caiga dentro del horario de atención — no si el restaurante
// está abierto justo ahora (reservar de noche para el almuerzo de mañana debe
// funcionar).
//
// Sin hora_llegada, el campo es opcional a propósito (D1, 2026-08-13): no se
// asume ninguna hora ni se bloquea la reserva por horario — la hora_llegada
// solo existe para ayudar a la dueña/cocinera a anticipar cuándo pasarla a
// cocina (a mano; no hay ningún paso automático), nunca como requisito para
// poder reservar. Corregido Día 9 del piloto: antes caía a validar "¿el
// restaurante está abierto AHORA?" — con la fecha de HOY, no la de la
// reserva — así que reservar sin hora para un día futuro podía fallar aunque
// esa fecha sí tuviera horario de atención. Confundía a la dueña y bloqueaba
// reservas reales de comensales que no sabían a qué hora iban a llegar.
function validarHorarioReserva(rest, fecha, hora_llegada) {
  if (!hora_llegada) return { permitido: true };

  const momentoReserva = new Date(`${fecha}T${hora_llegada}:00Z`);
  const { abierto } = estadoHorario(rest, momentoReserva);
  if (!abierto)
    return { permitido: false, error: `No puedes reservar para esa hora — ${mensajeHorario(rest)}` };
  return { permitido: true };
}

module.exports = { estadoHorario, mensajeHorario, validarHorarioAhora, validarHorarioReserva };
