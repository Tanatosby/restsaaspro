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

// Reservas: además de "ahora", si el cliente especificó hora_llegada,
// valida que ese momento futuro también caiga dentro del horario de atención.
function validarHorarioReserva(rest, fecha, hora_llegada, ahora) {
  const base = validarHorarioAhora(rest, ahora);
  if (!base.permitido) return base;

  if (hora_llegada) {
    const momentoReserva = new Date(`${fecha}T${hora_llegada}:00Z`);
    const { abierto } = estadoHorario(rest, momentoReserva);
    if (!abierto)
      return { permitido: false, error: `No puedes reservar para esa hora — ${mensajeHorario(rest)}` };
  }

  return { permitido: true };
}

module.exports = { estadoHorario, mensajeHorario, validarHorarioAhora, validarHorarioReserva };
