const TZ = 'America/Lima';

function fechaLima() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

// Fecha/hora actual de Lima representada como Date "naive" (componentes de
// Lima leídos como si fueran UTC). Sirve para comparar contra un `new
// Date('YYYY-MM-DDTHH:MM:00Z')` armado a partir de fecha/hora_llegada de una
// reserva, ambos en el mismo reloj de pared, sin conversión real de timezone.
function ahoraLima() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')));
}

module.exports = { fechaLima, ahoraLima };
