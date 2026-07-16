/**
 * Horario de atención configurable por restaurante (Gap 18, implementado
 * 2026-07-14). Un restaurante puede fijar un rango horario + días de la
 * semana en que atiende; fuera de eso no se puede crear ni orden ni reserva.
 *
 * Igual que el resto de la suite, se prueban las funciones puras de
 * utils/horarioAtencion.js — la integración HTTP real se cubre con
 * Playwright (scripts/, fuera de jest).
 */

const {
  estadoHorario,
  validarHorarioAhora,
  validarHorarioReserva,
} = require('../utils/horarioAtencion');

// Restaurante de lunes a sábado (0=Dom..6=Sáb), de 12:00 a 15:00
const REST = {
  horario_activo: 1,
  hora_apertura: '12:00',
  hora_cierre: '15:00',
  dias_atencion: '1,2,3,4,5,6',
};

describe('estadoHorario', () => {
  test('horario_activo apagado — siempre abierto sin importar la hora', () => {
    const rest = { ...REST, horario_activo: 0 };
    const r = estadoHorario(rest, new Date('2026-07-14T03:00:00Z')); // 3am, martes
    expect(r.abierto).toBe(true);
  });

  test('dentro del rango horario y día permitido — abierto', () => {
    // 2026-07-14 es martes
    const r = estadoHorario(REST, new Date('2026-07-14T13:00:00Z'));
    expect(r.abierto).toBe(true);
  });

  test('antes de la hora de apertura — cerrado', () => {
    const r = estadoHorario(REST, new Date('2026-07-14T11:59:00Z'));
    expect(r.abierto).toBe(false);
    expect(r.motivo).toBe('hora');
  });

  test('en la hora exacta de cierre — cerrado (borde exclusivo)', () => {
    const r = estadoHorario(REST, new Date('2026-07-14T15:00:00Z'));
    expect(r.abierto).toBe(false);
    expect(r.motivo).toBe('hora');
  });

  test('un minuto antes del cierre — abierto', () => {
    const r = estadoHorario(REST, new Date('2026-07-14T14:59:00Z'));
    expect(r.abierto).toBe(true);
  });

  test('día no atendido (domingo) — cerrado aunque la hora esté en rango', () => {
    // 2026-07-12 es domingo
    const r = estadoHorario(REST, new Date('2026-07-12T13:00:00Z'));
    expect(r.abierto).toBe(false);
    expect(r.motivo).toBe('dia');
  });
});

describe('validarHorarioAhora', () => {
  test('abierto — permitido', () => {
    const r = validarHorarioAhora(REST, new Date('2026-07-14T13:00:00Z'));
    expect(r.permitido).toBe(true);
  });

  test('cerrado — bloqueado con mensaje que incluye el rango y los días', () => {
    const r = validarHorarioAhora(REST, new Date('2026-07-12T13:00:00Z'));
    expect(r.permitido).toBe(false);
    expect(r.error).toContain('12:00');
    expect(r.error).toContain('15:00');
  });
});

describe('validarHorarioReserva', () => {
  test('ahora cerrado — bloquea sin importar hora_llegada', () => {
    const r = validarHorarioReserva(REST, '2026-07-15', '13:00', new Date('2026-07-12T13:00:00Z'));
    expect(r.permitido).toBe(false);
  });

  test('ahora abierto, sin hora_llegada — permitido (no hay hora futura que validar)', () => {
    const r = validarHorarioReserva(REST, '2026-07-15', null, new Date('2026-07-14T13:00:00Z'));
    expect(r.permitido).toBe(true);
  });

  test('ahora abierto, hora_llegada dentro del horario futuro — permitido', () => {
    // 2026-07-15 es miércoles, 13:00 está dentro del rango
    const r = validarHorarioReserva(REST, '2026-07-15', '13:00', new Date('2026-07-14T13:00:00Z'));
    expect(r.permitido).toBe(true);
  });

  test('ahora abierto, hora_llegada fuera del horario futuro — bloqueado', () => {
    // 20:00 está fuera del rango 12:00-15:00
    const r = validarHorarioReserva(REST, '2026-07-15', '20:00', new Date('2026-07-14T13:00:00Z'));
    expect(r.permitido).toBe(false);
    expect(r.error).toContain('No puedes reservar para esa hora');
  });

  test('ahora abierto, hora_llegada en un día no atendido (domingo) — bloqueado', () => {
    // 2026-07-19 es domingo
    const r = validarHorarioReserva(REST, '2026-07-19', '13:00', new Date('2026-07-14T13:00:00Z'));
    expect(r.permitido).toBe(false);
  });
});
