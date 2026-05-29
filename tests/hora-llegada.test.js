/**
 * Pruebas para la lógica de hora_llegada en reservas y plano de mesas.
 */

// ── Helpers replicados de routes/mesas.js ─────────────────────────────────────

function horaAMinutos(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function esInminente(hora_llegada, ahoraHHMM) {
  if (!hora_llegada) return false;
  const horaMin  = horaAMinutos(hora_llegada);
  const ahoraMin = horaAMinutos(ahoraHHMM);
  return horaMin >= ahoraMin - 30 && horaMin <= ahoraMin + 120;
}

describe('Lógica de hora de llegada', () => {

  describe('horaAMinutos', () => {
    test('convierte 00:00 a 0', () => expect(horaAMinutos('00:00')).toBe(0));
    test('convierte 12:30 a 750', () => expect(horaAMinutos('12:30')).toBe(750));
    test('convierte 20:00 a 1200', () => expect(horaAMinutos('20:00')).toBe(1200));
    test('retorna null para valor nulo', () => expect(horaAMinutos(null)).toBeNull());
  });

  describe('esInminente', () => {
    test('reserva sin hora_llegada nunca es inminente', () => {
      expect(esInminente(null, '20:00')).toBe(false);
      expect(esInminente('', '20:00')).toBe(false);
    });

    test('reserva exactamente a la hora actual es inminente', () => {
      expect(esInminente('20:00', '20:00')).toBe(true);
    });

    test('reserva 30 min antes de ahora aún es inminente (llegó tarde)', () => {
      expect(esInminente('19:30', '20:00')).toBe(true);
    });

    test('reserva 31 min antes de ahora ya NO es inminente', () => {
      expect(esInminente('19:29', '20:00')).toBe(false);
    });

    test('reserva 2h después de ahora es inminente (hay que preparar)', () => {
      expect(esInminente('22:00', '20:00')).toBe(true);
    });

    test('reserva 2h 1min después de ahora NO es inminente', () => {
      expect(esInminente('22:01', '20:00')).toBe(false);
    });

    test('reserva al mediodía cuando son las 9am no es inminente', () => {
      expect(esInminente('12:00', '09:00')).toBe(false);
    });

    test('reserva a las 21:00 cuando son las 20:00 es inminente', () => {
      expect(esInminente('21:00', '20:00')).toBe(true);
    });

    test('reserva a las 20:00 cuando son las 21:30 ya no es inminente', () => {
      expect(esInminente('20:00', '21:31')).toBe(false);
    });

    test('ventana exacta: 30 min antes (límite inferior)', () => {
      expect(esInminente('20:00', '20:30')).toBe(true);
    });

    test('ventana exacta: 120 min después (límite superior)', () => {
      expect(esInminente('22:00', '20:00')).toBe(true);
    });
  });

  describe('Integración con plano de mesas', () => {
    // Simula el filtro que aplica mesas.js al construir el estado
    function reservasInminentes(reservas, ahoraHHMM) {
      return reservas.filter(r => esInminente(r.hora_llegada, ahoraHHMM));
    }

    test('solo reservas inminentes aparecen como reservadas en el plano', () => {
      const reservas = [
        { mesa: 1, nombre_cliente: 'Ana',   hora_llegada: '20:00' }, // inminente si son ~19:00-20:00
        { mesa: 2, nombre_cliente: 'Luis',  hora_llegada: '23:00' }, // no inminente a las 20:00
        { mesa: 3, nombre_cliente: 'María', hora_llegada: null    }, // sin hora → nunca inminente
      ];
      const inminentes = reservasInminentes(reservas, '19:30');
      expect(inminentes).toHaveLength(1);
      expect(inminentes[0].nombre_cliente).toBe('Ana');
    });

    test('reserva sin hora_llegada no bloquea la mesa todo el día', () => {
      const reservas = [{ mesa: 5, nombre_cliente: 'Carlos', hora_llegada: null }];
      expect(reservasInminentes(reservas, '14:00')).toHaveLength(0);
    });

    test('múltiples reservas inminentes se detectan correctamente', () => {
      const reservas = [
        { mesa: 1, hora_llegada: '20:00' },
        { mesa: 2, hora_llegada: '20:30' },
        { mesa: 3, hora_llegada: '21:00' },
      ];
      expect(reservasInminentes(reservas, '20:00')).toHaveLength(3);
    });
  });
});
