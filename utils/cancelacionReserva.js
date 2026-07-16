/**
 * Ventana de tiempo para que el cliente cancele su propia reserva
 * (minutos_cancelacion_reserva, configurable por restaurante, default 30).
 *
 * Si la reserva no tiene hora_llegada (el cliente no la especificó), no hay
 * ventana que aplicar — se permite cancelar mientras el estatus siga siendo
 * cancelable (decisión del negocio: sin hora exacta no se puede saber si
 * "faltan 30 min").
 */
function dentroDeVentanaCancelacion(fecha, hora_llegada, minutosLimite, ahora) {
  if (!hora_llegada) return { permitido: true };

  const momentoReserva = new Date(`${fecha}T${hora_llegada}:00Z`);
  const minutosRestantes = (momentoReserva - ahora) / 60000;

  if (minutosRestantes < minutosLimite) {
    return {
      permitido: false,
      error: minutosRestantes > 0
        ? `Ya no puedes cancelar: faltan menos de ${minutosLimite} minutos para tu reserva`
        : 'Ya no puedes cancelar: la hora de tu reserva ya pasó'
    };
  }
  return { permitido: true };
}

module.exports = { dentroDeVentanaCancelacion };
