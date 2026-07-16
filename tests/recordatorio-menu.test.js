/**
 * Pruebas para el job de recordatorio de menú sin configurar (Gap 21).
 * Verifica: detección de restaurantes sin menú de hoy, throttle de 8h,
 * envío de push mockeado, actualización del timestamp.
 */

const Database = require('better-sqlite3');
const {
  procesarRecordatoriosMenu,
  restaurantesSinMenuHoy,
  yaPasaron8Horas,
} = require('../utils/recordatorioMenu');

function crearDB() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE restaurantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      activo INTEGER DEFAULT 1,
      ultimo_recordatorio_menu TEXT DEFAULT NULL
    );

    CREATE TABLE menus_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_restaurante INTEGER NOT NULL,
      dia TEXT NOT NULL,
      activo INTEGER DEFAULT 1
    );

    CREATE TABLE push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL,
      id_restaurante INTEGER NOT NULL,
      subscription TEXT NOT NULL,
      creado_en TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function insertarRestaurante(db, nombre, { activo = 1, ultimoRecordatorio = null } = {}) {
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO restaurantes (nombre, activo, ultimo_recordatorio_menu) VALUES (?, ?, ?)
  `).run(nombre, activo, ultimoRecordatorio);
  return lastInsertRowid;
}

function insertarMenu(db, id_restaurante, dia, activo = 1) {
  db.prepare(`INSERT INTO menus_dia (id_restaurante, dia, activo) VALUES (?, ?, ?)`).run(id_restaurante, dia, activo);
}

function mockWpush() {
  const calls = [];
  return {
    sendNotification: jest.fn((sub, payload) => {
      calls.push({ sub, payload: JSON.parse(payload) });
      return Promise.resolve();
    }),
    calls,
  };
}

const HOY = '2026-07-16';

describe('Job de recordatorio de menú sin configurar', () => {

  describe('yaPasaron8Horas', () => {
    test('true si nunca se envió (null)', () => {
      expect(yaPasaron8Horas(null)).toBe(true);
    });

    test('false si el último envío fue hace menos de 8h', () => {
      const ahora = new Date('2026-07-16T16:00:00.000Z');
      const hace1h = new Date('2026-07-16T15:00:00.000Z').toISOString();
      expect(yaPasaron8Horas(hace1h, ahora)).toBe(false);
    });

    test('true si el último envío fue hace exactamente 8h', () => {
      const ahora = new Date('2026-07-16T16:00:00.000Z');
      const hace8h = new Date('2026-07-16T08:00:00.000Z').toISOString();
      expect(yaPasaron8Horas(hace8h, ahora)).toBe(true);
    });

    test('true si el último envío fue hace más de 8h', () => {
      const ahora = new Date('2026-07-16T16:00:00.000Z');
      const hace10h = new Date('2026-07-16T06:00:00.000Z').toISOString();
      expect(yaPasaron8Horas(hace10h, ahora)).toBe(true);
    });
  });

  describe('restaurantesSinMenuHoy', () => {
    test('incluye restaurante sin ningún menú', () => {
      const db = crearDB();
      insertarRestaurante(db, 'Sin menú');
      expect(restaurantesSinMenuHoy(db, HOY)).toHaveLength(1);
    });

    test('excluye restaurante con menú activo hoy', () => {
      const db = crearDB();
      const id = insertarRestaurante(db, 'Con menú');
      insertarMenu(db, id, HOY, 1);
      expect(restaurantesSinMenuHoy(db, HOY)).toHaveLength(0);
    });

    test('incluye restaurante cuyo menú de hoy está desactivado', () => {
      const db = crearDB();
      const id = insertarRestaurante(db, 'Menú oculto');
      insertarMenu(db, id, HOY, 0);
      expect(restaurantesSinMenuHoy(db, HOY)).toHaveLength(1);
    });

    test('incluye restaurante cuyo menú es de otro día', () => {
      const db = crearDB();
      const id = insertarRestaurante(db, 'Menú de ayer');
      insertarMenu(db, id, '2026-07-15', 1);
      expect(restaurantesSinMenuHoy(db, HOY)).toHaveLength(1);
    });

    test('excluye restaurante inactivo aunque no tenga menú', () => {
      const db = crearDB();
      insertarRestaurante(db, 'Inactivo', { activo: 0 });
      expect(restaurantesSinMenuHoy(db, HOY)).toHaveLength(0);
    });
  });

  describe('procesarRecordatoriosMenu', () => {
    test('envía push y actualiza timestamp si nunca se avisó', () => {
      const db    = crearDB();
      const wpush = mockWpush();
      const id    = insertarRestaurante(db, 'Resto1');
      const sub   = JSON.stringify({ endpoint: 'https://push.example.com/1', keys: { p256dh: 'a', auth: 'b' } });
      db.prepare(`INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription) VALUES (1, ?, ?)`).run(id, sub);

      const ahora = new Date('2026-07-16T16:00:00.000Z');
      const n = procesarRecordatoriosMenu(db, wpush, ahora);

      expect(n).toBe(1);
      expect(wpush.sendNotification).toHaveBeenCalledTimes(1);
      const row = db.prepare(`SELECT ultimo_recordatorio_menu FROM restaurantes WHERE id = ?`).get(id);
      expect(row.ultimo_recordatorio_menu).toBe(ahora.toISOString());
    });

    test('NO envía si el restaurante ya tiene menú de hoy', () => {
      const db    = crearDB();
      const wpush = mockWpush();
      const id    = insertarRestaurante(db, 'Resto2');
      insertarMenu(db, id, HOY, 1);

      const n = procesarRecordatoriosMenu(db, wpush, new Date('2026-07-16T16:00:00.000Z'));
      expect(n).toBe(0);
      expect(wpush.sendNotification).not.toHaveBeenCalled();
    });

    test('NO reenvía si pasaron menos de 8h desde el último aviso', () => {
      const db = crearDB();
      const wpush = mockWpush();
      const ultimoRecordatorio = new Date('2026-07-16T10:00:00.000Z').toISOString();
      insertarRestaurante(db, 'Resto3', { ultimoRecordatorio });

      const n = procesarRecordatoriosMenu(db, wpush, new Date('2026-07-16T16:00:00.000Z')); // 6h después
      expect(n).toBe(0);
      expect(wpush.sendNotification).not.toHaveBeenCalled();
    });

    test('reenvía si ya pasaron 8h o más desde el último aviso', () => {
      const db = crearDB();
      const wpush = mockWpush();
      const ultimoRecordatorio = new Date('2026-07-16T06:00:00.000Z').toISOString();
      const id = insertarRestaurante(db, 'Resto4', { ultimoRecordatorio });
      const sub = JSON.stringify({ endpoint: 'https://push.example.com/4', keys: { p256dh: 'a', auth: 'b' } });
      db.prepare(`INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription) VALUES (1, ?, ?)`).run(id, sub);

      const n = procesarRecordatoriosMenu(db, wpush, new Date('2026-07-16T16:00:00.000Z')); // 10h después
      expect(n).toBe(1);
      expect(wpush.sendNotification).toHaveBeenCalledTimes(1);
    });

    test('el payload invita a configurar el menú', () => {
      const db    = crearDB();
      const wpush = mockWpush();
      const id    = insertarRestaurante(db, 'Resto5');
      const sub   = JSON.stringify({ endpoint: 'https://push.example.com/5', keys: { p256dh: 'a', auth: 'b' } });
      db.prepare(`INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription) VALUES (1, ?, ?)`).run(id, sub);

      procesarRecordatoriosMenu(db, wpush, new Date('2026-07-16T16:00:00.000Z'));

      const { payload } = wpush.calls[0];
      expect(payload.title).toContain('menú');
      expect(payload.body.toLowerCase()).toContain('configuraste');
    });

    test('no hace nada si wpush es null (sin lanzar error)', () => {
      const db = crearDB();
      insertarRestaurante(db, 'Resto6');
      expect(() => procesarRecordatoriosMenu(db, null)).not.toThrow();
      expect(procesarRecordatoriosMenu(db, null)).toBe(0);
    });

    test('procesa varios restaurantes en el mismo tick', () => {
      const db    = crearDB();
      const wpush = mockWpush();
      insertarRestaurante(db, 'A');
      insertarRestaurante(db, 'B');
      const conMenu = insertarRestaurante(db, 'C');
      insertarMenu(db, conMenu, HOY, 1);

      const n = procesarRecordatoriosMenu(db, wpush, new Date('2026-07-16T16:00:00.000Z'));
      expect(n).toBe(2);
    });
  });
});
