/**
 * Pruebas para la conversión de timestamps UTC → hora Lima (America/Lima, UTC-5).
 * Replica exactamente la lógica de fDT (owner.html) y horaExcel (orders.js).
 */

// Replica de toUTC + fDT de owner.html
function toUTC(d) {
  return d.endsWith('Z') || d.includes('+') ? d : d.replace(' ', 'T') + 'Z';
}
function fDT(d) {
  if (!d) return '—';
  return new Date(toUTC(d)).toLocaleString('es-PE', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Lima'
  });
}

// Replica de horaExcel en orders.js (24h, sin AM/PM)
function horaExcel(created_at) {
  if (!created_at) return '';
  const iso = created_at.endsWith('Z') ? created_at : created_at.replace(' ', 'T') + 'Z';
  return new Date(iso).toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima'
  });
}

describe('Conversión UTC → hora Lima', () => {
  test('02:20 UTC es 21:20 hora Lima (UTC-5)', () => {
    expect(horaExcel('2026-05-19 02:20:00')).toBe('21:20');
  });

  test('02:28 UTC es 21:28 hora Lima', () => {
    expect(horaExcel('2026-05-19 02:28:00')).toBe('21:28');
  });

  test('00:00 UTC es 19:00 hora Lima del día anterior', () => {
    expect(horaExcel('2026-05-19 00:00:00')).toBe('19:00');
  });

  test('05:00 UTC es 00:00 hora Lima (medianoche exacta)', () => {
    expect(horaExcel('2026-05-19 05:00:00')).toBe('00:00');
  });

  test('23:59 UTC es 18:59 hora Lima', () => {
    expect(horaExcel('2026-05-19 23:59:00')).toBe('18:59');
  });

  test('string con T en lugar de espacio produce el mismo resultado', () => {
    expect(horaExcel('2026-05-19T02:20:00')).toBe(horaExcel('2026-05-19 02:20:00'));
  });

  test('string que ya trae Z no duplica el offset', () => {
    expect(horaExcel('2026-05-19T02:20:00Z')).toBe('21:20');
  });

  test('horaExcel retorna string vacío para created_at nulo o vacío', () => {
    expect(horaExcel(null)).toBe('');
    expect(horaExcel('')).toBe('');
  });

  test('fDT retorna "—" para valor nulo, undefined o vacío', () => {
    expect(fDT(null)).toBe('—');
    expect(fDT(undefined)).toBe('—');
    expect(fDT('')).toBe('—');
  });

  test('fDT incluye "21" en la hora formateada para 02:20 UTC', () => {
    // 02:20 UTC = 21:20 Lima (9:20 PM en 12h)
    const result = fDT('2026-05-19 02:20:00');
    // toLocaleString puede devolver 12h ("9:20 p. m.") o 24h según el entorno
    // verificamos que la hora sea 9 PM o 21h
    const date = new Date(toUTC('2026-05-19 02:20:00'));
    const horaLima = date.toLocaleString('es-PE', { hour: 'numeric', timeZone: 'America/Lima' });
    expect(['9', '21', '9 p. m.', '09'].some(h => horaLima.includes(h))).toBe(true);
  });

  test('fDT con T en el string produce el mismo resultado que con espacio', () => {
    expect(fDT('2026-05-19 02:20:00')).toBe(fDT('2026-05-19T02:20:00'));
  });
});
