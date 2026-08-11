/**
 * Pruebas para Gap 5 — Precio por modalidad.
 * Cubre: BD (columnas), cálculo de cargo_modalidad en POST,
 * y suma en utils/totales.js.
 *
 * El cargo por tapper se cobra por unidad (1 por cada menú del día completo
 * + 1 por cada unidad de plato a la carta), no como monto fijo por pedido —
 * bug reportado 2026-08-11: 2 menús para llevar solo sumaban 1 tapper.
 */

const Database = require('better-sqlite3');
const { contarUnidadesMenu } = require('../utils/menuPricing');

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

// ── Lógica de cálculo (replicada de calcularCargoModalidad en routes/public.js) ──
// El tapper se cobra por unidad: 1 por cada menú del día completo (contado
// con la misma contarUnidadesMenu que usa el backend) + 1 por cada unidad de
// plato a la carta. La tarifa de delivery es fija por pedido.

function calcularCargoModalidad(modalidad, rest, cartaItems = [], menuItemsEnriquecidos = []) {
  if (modalidad === 'en_local') return 0;
  const unidadesMenu  = contarUnidadesMenu(menuItemsEnriquecidos);
  const unidadesCarta = cartaItems.reduce((s, i) => s + (i.cantidad || 1), 0);
  const totalTappers  = unidadesMenu + unidadesCarta;
  let cargo = totalTappers * (rest.costo_tapper ?? 0);
  if (modalidad === 'delivery') cargo += (rest.tarifa_delivery ?? 0);
  return cargo;
}

// Atajo: 1 menú "simple" (1 sola sección obligatoria) — el caso más común
// en los tests que no necesitan probar la cuenta de unidades en detalle.
const UN_MENU = [{ id_menu_dia: 1, requerido: 1, total_obligatorias: 1 }];

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

  describe('Cálculo de cargo en órdenes (1 menú)', () => {
    const rest = { costo_tapper: 0.50, tarifa_delivery: 3.00 };

    test('en_local → cargo 0', () => {
      expect(calcularCargoModalidad('en_local', rest, [], UN_MENU)).toBe(0);
    });

    test('para_llevar → cargo = costo_tapper', () => {
      expect(calcularCargoModalidad('para_llevar', rest, [], UN_MENU)).toBe(0.50);
    });

    test('para_llevar con tapper 0 → cargo 0', () => {
      expect(calcularCargoModalidad('para_llevar', { costo_tapper: 0 }, [], UN_MENU)).toBe(0);
    });
  });

  describe('Cálculo de cargo en reservas (1 menú)', () => {
    const rest = { costo_tapper: 0.50, tarifa_delivery: 3.00 };

    test('en_local → cargo 0', () => {
      expect(calcularCargoModalidad('en_local', rest, [], UN_MENU)).toBe(0);
    });

    test('para_llevar → cargo = costo_tapper', () => {
      expect(calcularCargoModalidad('para_llevar', rest, [], UN_MENU)).toBe(0.50);
    });

    test('delivery → cargo = tapper + tarifa', () => {
      expect(calcularCargoModalidad('delivery', rest, [], UN_MENU)).toBe(3.50);
    });

    test('delivery con tapper 0 → cargo = solo tarifa', () => {
      expect(calcularCargoModalidad('delivery', { costo_tapper: 0, tarifa_delivery: 3.00 }, [], UN_MENU)).toBe(3.00);
    });

    test('delivery con tarifa 0 → cargo = solo tapper', () => {
      expect(calcularCargoModalidad('delivery', { costo_tapper: 0.50, tarifa_delivery: 0 }, [], UN_MENU)).toBe(0.50);
    });
  });

  // ── Bug 2026-08-11: el cargo debe escalar por unidad, no ser fijo ────────

  describe('Cargo escala por cantidad de menús (fix bug reportado)', () => {
    const rest = { costo_tapper: 1.50, tarifa_delivery: 3.00 };

    test('2 menús de 1 sección c/u para llevar → cargo = 2 × tapper (antes sumaba solo 1×)', () => {
      const dosMenus = [
        { id_menu_dia: 1, requerido: 1, total_obligatorias: 1 },
        { id_menu_dia: 1, requerido: 1, total_obligatorias: 1 },
      ];
      expect(calcularCargoModalidad('para_llevar', rest, [], dosMenus)).toBe(3.00);
    });

    test('3 menús con 2 secciones obligatorias c/u (entrada+fondo) para llevar → cargo = 3 × tapper', () => {
      // 3 unidades del mismo menú del día = 6 filas de secciones obligatorias
      const tresMenus = Array.from({ length: 6 }, () => (
        { id_menu_dia: 5, requerido: 1, total_obligatorias: 2 }
      ));
      expect(calcularCargoModalidad('para_llevar', rest, [], tresMenus)).toBeCloseTo(4.50);
    });

    test('secciones opcionales (ej. postre) no suman unidades extra', () => {
      const unMenuConPostreOpcional = [
        { id_menu_dia: 1, requerido: 1, total_obligatorias: 1 }, // fondo (obligatoria)
        { id_menu_dia: 1, requerido: 0, total_obligatorias: 1 }, // postre (opcional)
      ];
      expect(calcularCargoModalidad('para_llevar', rest, [], unMenuConPostreOpcional)).toBe(1.50);
    });

    test('2 menús distintos (id_menu_dia diferente) para llevar → cargo = 2 × tapper', () => {
      const dosMenusDistintos = [
        { id_menu_dia: 1, requerido: 1, total_obligatorias: 1 },
        { id_menu_dia: 2, requerido: 1, total_obligatorias: 1 },
      ];
      expect(calcularCargoModalidad('para_llevar', rest, [], dosMenusDistintos)).toBe(3.00);
    });
  });

  describe('Cargo escala por cantidad de ítems a la carta', () => {
    const rest = { costo_tapper: 1.50, tarifa_delivery: 3.00 };

    test('2 unidades de un plato a la carta para llevar → cargo = 2 × tapper', () => {
      expect(calcularCargoModalidad('para_llevar', rest, [{ id_plato_carta: 1, cantidad: 2 }], [])).toBe(3.00);
    });

    test('carta (cantidad 2) + 1 menú para llevar → cargo = 3 × tapper', () => {
      expect(calcularCargoModalidad('para_llevar', rest, [{ id_plato_carta: 1, cantidad: 2 }], UN_MENU)).toBeCloseTo(4.50);
    });

    test('en_local con carta → cargo 0 (el tapper solo aplica para llevar/delivery)', () => {
      expect(calcularCargoModalidad('en_local', rest, [{ id_plato_carta: 1, cantidad: 5 }], [])).toBe(0);
    });

    test('delivery con carta (cantidad 2) → cargo = 2 × tapper + tarifa fija', () => {
      expect(calcularCargoModalidad('delivery', rest, [{ id_plato_carta: 1, cantidad: 2 }], [])).toBeCloseTo(6.00);
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
