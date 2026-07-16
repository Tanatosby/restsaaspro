/**
 * Cancelación de reserva desde el lado del cliente (gap detectado 2026-07-06,
 * implementado 2026-07-09). El cliente cancela con su código, sujeto a la
 * ventana de tiempo configurable por restaurante (minutos_cancelacion_reserva).
 *
 * Se prueba la función pura de ventana (utils/cancelacionReserva.js) y la
 * devolución de stock real (utils/stock.js), igual que el resto de la suite.
 */

const Database = require('better-sqlite3');
const { dentroDeVentanaCancelacion } = require('../utils/cancelacionReserva');
const { devolverStock, itemsMenuDeReserva } = require('../utils/stock');

// ── dentroDeVentanaCancelacion — función pura ────────────────────────────

describe('dentroDeVentanaCancelacion', () => {
  test('sin hora_llegada — siempre permitido', () => {
    const ahora = new Date('2026-07-09T15:00:00Z');
    const r = dentroDeVentanaCancelacion('2026-07-09', null, 30, ahora);
    expect(r.permitido).toBe(true);
  });

  test('faltan más minutos que el límite — permitido', () => {
    const ahora = new Date('2026-07-09T15:00:00Z');
    // reserva a las 16:00, límite 30 min → faltan 60 min
    const r = dentroDeVentanaCancelacion('2026-07-09', '16:00', 30, ahora);
    expect(r.permitido).toBe(true);
  });

  test('faltan exactamente el límite — permitido (borde inclusive)', () => {
    const ahora = new Date('2026-07-09T15:00:00Z');
    // reserva a las 15:30, límite 30 min → faltan exactamente 30
    const r = dentroDeVentanaCancelacion('2026-07-09', '15:30', 30, ahora);
    expect(r.permitido).toBe(true);
  });

  test('faltan menos minutos que el límite — bloqueado', () => {
    const ahora = new Date('2026-07-09T15:00:00Z');
    // reserva a las 15:15, límite 30 min → faltan 15
    const r = dentroDeVentanaCancelacion('2026-07-09', '15:15', 30, ahora);
    expect(r.permitido).toBe(false);
    expect(r.error).toContain('30 minutos');
  });

  test('la hora de la reserva ya pasó — bloqueado con mensaje distinto', () => {
    const ahora = new Date('2026-07-09T15:00:00Z');
    const r = dentroDeVentanaCancelacion('2026-07-09', '14:00', 30, ahora);
    expect(r.permitido).toBe(false);
    expect(r.error).toContain('ya pasó');
  });

  test('respeta un límite configurado distinto de 30 (0 = sin ventana)', () => {
    const ahora = new Date('2026-07-09T15:00:00Z');
    const r = dentroDeVentanaCancelacion('2026-07-09', '15:05', 0, ahora);
    expect(r.permitido).toBe(true); // faltan 5 min, límite 0 → siempre permitido salvo que ya pasó
  });
});

// ── Devolución de stock al cancelar (reutiliza utils/stock.js) ──────────

function crearDB() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE componentes_menu_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_inicial  INTEGER DEFAULT NULL,
      stock_restante INTEGER DEFAULT NULL
    );
    CREATE TABLE reserva_menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_reserva INTEGER NOT NULL,
      id_componente INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1
    );
  `);
  return db;
}

test('cancelar la reserva del cliente devuelve el stock de sus platos', () => {
  const db = crearDB();
  const { lastInsertRowid: comp } = db.prepare(`
    INSERT INTO componentes_menu_dia (stock_inicial, stock_restante) VALUES (25, 20)
  `).run();
  db.prepare(`INSERT INTO reserva_menu_items (id_reserva, id_componente, cantidad) VALUES (1, ?, 3)`).run(comp);

  devolverStock(db, itemsMenuDeReserva(db, 1));

  const restante = db.prepare(`SELECT stock_restante FROM componentes_menu_dia WHERE id = ?`).get(comp).stock_restante;
  expect(restante).toBe(23);
});
