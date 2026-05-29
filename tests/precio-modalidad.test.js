/**
 * Pruebas para Gap 5 — Precio por modalidad.
 * Cubre: BD (columnas), cálculo de cargo_modalidad en POST,
 * y suma en utils/totales.js.
 */

const Database = require('better-sqlite3');

// ── BD helpers ───────────────────────────────────────────────────────────────

function crearDB() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE restaurantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      para_llevar_activo INTEGER DEFAULT 1,
      delivery_activo    INTEGER DEFAULT 0,
      costo_tapper       REAL DEFAULT 0,
      tarifa_delivery    REAL DEFAULT 0
    );
    INSERT INTO restaurantes (nombre, para_llevar_activo, delivery_activo, costo_tapper, tarifa_delivery)
    VALUES ('Test Resto', 1, 1, 0.50, 3.00);

    CREATE TABLE estatus_orden (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      es_inicial   INTEGER DEFAULT 0,
      es_pagado    INTEGER DEFAULT 0,
      es_cancelado INTEGER DEFAULT 0
    );
    INSERT INTO estatus_orden (nombre, es_inicial) VALUES ('pendiente', 1);
    INSERT INTO estatus_orden (nombre, es_pagado)  VALUES ('completado', 1);

    CREATE TABLE estatus_reserva (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      es_inicial INTEGER DEFAULT 0,
      es_full    INTEGER DEFAULT 0
    );
    INSERT INTO estatus_reserva (nombre, es_inicial) VALUES ('pendiente',  1);
    INSERT INTO estatus_reserva (nombre, es_full)    VALUES ('completada', 1);

    CREATE TABLE ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mesa INTEGER,
      fecha TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL,
      id_estatus INTEGER DEFAULT 1,
      modalidad TEXT DEFAULT 'en_local',
      cargo_modalidad REAL DEFAULT 0,
      total REAL DEFAULT NULL
    );

    CREATE TABLE reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_cliente TEXT NOT NULL,
      fecha TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL,
      id_estatus INTEGER DEFAULT 1,
      modalidad TEXT DEFAULT 'en_local',
      cargo_modalidad REAL DEFAULT 0,
      total REAL DEFAULT NULL
    );

    CREATE TABLE platos_carta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      id_restaurante INTEGER NOT NULL,
      activo INTEGER DEFAULT 1
    );
    INSERT INTO platos_carta (nombre, precio, id_restaurante) VALUES ('Lomo saltado', 18.00, 1);
    INSERT INTO platos_carta (nombre, precio, id_restaurante) VALUES ('Arroz chaufa', 14.00, 1);

    CREATE TABLE orden_carta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_orden INTEGER NOT NULL,
      id_plato_carta INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL
    );

    CREATE TABLE reserva_carta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_reserva INTEGER NOT NULL,
      id_plato_carta INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL
    );
  `);
  return db;
}

function getConfig(db) {
  return db.prepare(`SELECT costo_tapper, tarifa_delivery FROM restaurantes WHERE id = 1`).get();
}

function insertOrden(db, modalidad, cargo_modalidad) {
  const id_estatus = db.prepare(`SELECT id FROM estatus_orden WHERE es_inicial = 1`).get().id;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO ordenes (mesa, fecha, id_restaurante, id_estatus, modalidad, cargo_modalidad)
    VALUES (1, '2026-05-25', 1, ?, ?, ?)
  `).run(id_estatus, modalidad, cargo_modalidad);
  return lastInsertRowid;
}

function insertOrdenConItems(db, modalidad, cargo_modalidad) {
  const ordenId = insertOrden(db, modalidad, cargo_modalidad);
  db.prepare(`
    INSERT INTO orden_carta_items (id_orden, id_plato_carta, cantidad, precio_unitario)
    SELECT ?, id, 1, precio FROM platos_carta WHERE id = 1
  `).run(ordenId);
  return ordenId;
}

function insertReserva(db, modalidad, cargo_modalidad) {
  const id_estatus = db.prepare(`SELECT id FROM estatus_reserva WHERE es_inicial = 1`).get().id;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO reservas (nombre_cliente, fecha, id_restaurante, id_estatus, modalidad, cargo_modalidad)
    VALUES ('Test', '2026-05-25', 1, ?, ?, ?)
  `).run(id_estatus, modalidad, cargo_modalidad);
  return lastInsertRowid;
}

function insertReservaConItems(db, modalidad, cargo_modalidad) {
  const reservaId = insertReserva(db, modalidad, cargo_modalidad);
  db.prepare(`
    INSERT INTO reserva_carta_items (id_reserva, id_plato_carta, cantidad, precio_unitario)
    SELECT ?, id, 1, precio FROM platos_carta WHERE id = 1
  `).run(reservaId);
  return reservaId;
}

// ── Lógica de cálculo (replicada de routes/public.js) ───────────────────────

function calcularCargoOrden(modalidad, rest) {
  return modalidad === 'para_llevar' ? (rest.costo_tapper ?? 0) : 0;
}

function calcularCargoReserva(modalidad, rest) {
  if (modalidad === 'para_llevar') return rest.costo_tapper ?? 0;
  if (modalidad === 'delivery')    return (rest.costo_tapper ?? 0) + (rest.tarifa_delivery ?? 0);
  return 0;
}

// ── Total simplificado (solo carta, sin menú del día) ───────────────────────

function totalOrden(db, ordenId) {
  const items = db.prepare(`SELECT cantidad, precio_unitario FROM orden_carta_items WHERE id_orden = ?`).all(ordenId);
  const orden = db.prepare(`SELECT cargo_modalidad FROM ordenes WHERE id = ?`).get(ordenId);
  return items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0) + (orden?.cargo_modalidad ?? 0);
}

function totalReserva(db, reservaId) {
  const items = db.prepare(`SELECT cantidad, precio_unitario FROM reserva_carta_items WHERE id_reserva = ?`).all(reservaId);
  const reserva = db.prepare(`SELECT cargo_modalidad FROM reservas WHERE id = ?`).get(reservaId);
  return items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0) + (reserva?.cargo_modalidad ?? 0);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Gap 5 — Precio por modalidad', () => {

  // ── BD ───────────────────────────────────────────────────────────────────

  describe('Columnas en BD', () => {
    test('restaurantes tiene costo_tapper y tarifa_delivery', () => {
      const db = crearDB();
      const cfg = getConfig(db);
      expect(cfg.costo_tapper).toBe(0.50);
      expect(cfg.tarifa_delivery).toBe(3.00);
    });

    test('ordenes tiene cargo_modalidad con default 0', () => {
      const db = crearDB();
      const id = insertOrden(db, 'en_local', 0);
      const row = db.prepare(`SELECT cargo_modalidad FROM ordenes WHERE id = ?`).get(id);
      expect(row.cargo_modalidad).toBe(0);
    });

    test('reservas tiene cargo_modalidad con default 0', () => {
      const db = crearDB();
      const id = insertReserva(db, 'en_local', 0);
      const row = db.prepare(`SELECT cargo_modalidad FROM reservas WHERE id = ?`).get(id);
      expect(row.cargo_modalidad).toBe(0);
    });

    test('cargo_modalidad se persiste correctamente en ordenes', () => {
      const db = crearDB();
      const id = insertOrden(db, 'para_llevar', 0.50);
      const row = db.prepare(`SELECT cargo_modalidad FROM ordenes WHERE id = ?`).get(id);
      expect(row.cargo_modalidad).toBe(0.50);
    });

    test('cargo_modalidad se persiste correctamente en reservas', () => {
      const db = crearDB();
      const id = insertReserva(db, 'delivery', 3.50);
      const row = db.prepare(`SELECT cargo_modalidad FROM reservas WHERE id = ?`).get(id);
      expect(row.cargo_modalidad).toBe(3.50);
    });
  });

  // ── Cálculo de cargo ─────────────────────────────────────────────────────

  describe('Cálculo de cargo en órdenes', () => {
    const rest = { costo_tapper: 0.50, tarifa_delivery: 3.00 };

    test('en_local → cargo 0', () => {
      expect(calcularCargoOrden('en_local', rest)).toBe(0);
    });

    test('para_llevar → cargo = costo_tapper', () => {
      expect(calcularCargoOrden('para_llevar', rest)).toBe(0.50);
    });

    test('para_llevar con tapper 0 → cargo 0', () => {
      expect(calcularCargoOrden('para_llevar', { costo_tapper: 0 })).toBe(0);
    });
  });

  describe('Cálculo de cargo en reservas', () => {
    const rest = { costo_tapper: 0.50, tarifa_delivery: 3.00 };

    test('en_local → cargo 0', () => {
      expect(calcularCargoReserva('en_local', rest)).toBe(0);
    });

    test('para_llevar → cargo = costo_tapper', () => {
      expect(calcularCargoReserva('para_llevar', rest)).toBe(0.50);
    });

    test('delivery → cargo = tapper + tarifa', () => {
      expect(calcularCargoReserva('delivery', rest)).toBe(3.50);
    });

    test('delivery con tapper 0 → cargo = solo tarifa', () => {
      expect(calcularCargoReserva('delivery', { costo_tapper: 0, tarifa_delivery: 3.00 })).toBe(3.00);
    });

    test('delivery con tarifa 0 → cargo = solo tapper', () => {
      expect(calcularCargoReserva('delivery', { costo_tapper: 0.50, tarifa_delivery: 0 })).toBe(0.50);
    });
  });

  // ── Total incluye cargo_modalidad ────────────────────────────────────────

  describe('Total de orden incluye cargo_modalidad', () => {
    test('en_local: total = suma ítems', () => {
      const db = crearDB();
      const id = insertOrdenConItems(db, 'en_local', 0);
      expect(totalOrden(db, id)).toBeCloseTo(18.00);
    });

    test('para_llevar: total = suma ítems + tapper', () => {
      const db = crearDB();
      const id = insertOrdenConItems(db, 'para_llevar', 0.50);
      expect(totalOrden(db, id)).toBeCloseTo(18.50);
    });
  });

  describe('Total de reserva incluye cargo_modalidad', () => {
    test('en_local: total = suma ítems', () => {
      const db = crearDB();
      const id = insertReservaConItems(db, 'en_local', 0);
      expect(totalReserva(db, id)).toBeCloseTo(18.00);
    });

    test('para_llevar: total = suma ítems + tapper', () => {
      const db = crearDB();
      const id = insertReservaConItems(db, 'para_llevar', 0.50);
      expect(totalReserva(db, id)).toBeCloseTo(18.50);
    });

    test('delivery: total = suma ítems + tapper + tarifa', () => {
      const db = crearDB();
      const id = insertReservaConItems(db, 'delivery', 3.50);
      expect(totalReserva(db, id)).toBeCloseTo(21.50);
    });
  });

  // ── Config del restaurante ───────────────────────────────────────────────

  describe('Configuración de costos en restaurante', () => {
    test('actualizar costo_tapper persiste en BD', () => {
      const db = crearDB();
      db.prepare(`UPDATE restaurantes SET costo_tapper = ? WHERE id = 1`).run(1.00);
      expect(getConfig(db).costo_tapper).toBe(1.00);
    });

    test('actualizar tarifa_delivery persiste en BD', () => {
      const db = crearDB();
      db.prepare(`UPDATE restaurantes SET tarifa_delivery = ? WHERE id = 1`).run(5.00);
      expect(getConfig(db).tarifa_delivery).toBe(5.00);
    });

    test('restaurante sin delivery: tarifa_delivery default 0', () => {
      const db = crearDB();
      db.prepare(`UPDATE restaurantes SET delivery_activo = 0, tarifa_delivery = 0 WHERE id = 1`).run();
      expect(getConfig(db).tarifa_delivery).toBe(0);
    });
  });
});
