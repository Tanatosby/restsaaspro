/**
 * Pruebas para Gap 8 — Auto-merge cuenta por mesa.
 * Cubre: lógica de merge (ítems carta + menú), condiciones de no-merge
 * (sin mesa, sin orden activa, auto_merge desactivado) y cargo_modalidad.
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
      auto_merge_activo INTEGER DEFAULT 1
    );
    INSERT INTO restaurantes (nombre, auto_merge_activo) VALUES ('Test Resto', 1);

    CREATE TABLE estatus_orden (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      es_inicial   INTEGER DEFAULT 0,
      es_en_cocina INTEGER DEFAULT 0,
      es_listo     INTEGER DEFAULT 0,
      es_entregado INTEGER DEFAULT 0,
      es_pagado    INTEGER DEFAULT 0,
      es_cancelado INTEGER DEFAULT 0
    );
    INSERT INTO estatus_orden (nombre, es_inicial)   VALUES ('pendiente',  1);
    INSERT INTO estatus_orden (nombre, es_en_cocina) VALUES ('preparando', 1);
    INSERT INTO estatus_orden (nombre, es_listo)     VALUES ('listo',      1);
    INSERT INTO estatus_orden (nombre, es_entregado) VALUES ('entregado',  1);
    INSERT INTO estatus_orden (nombre, es_pagado)    VALUES ('completado', 1);
    INSERT INTO estatus_orden (nombre, es_cancelado) VALUES ('cancelado',  1);

    CREATE TABLE estatus_reserva (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      es_inicial       INTEGER DEFAULT 0,
      es_confirmada    INTEGER DEFAULT 0,
      es_cliente_llego INTEGER DEFAULT 0,
      es_full          INTEGER DEFAULT 0,
      es_cancelado     INTEGER DEFAULT 0
    );
    INSERT INTO estatus_reserva (nombre, es_inicial)       VALUES ('pendiente',     1);
    INSERT INTO estatus_reserva (nombre, es_confirmada)    VALUES ('confirmada',    1);
    INSERT INTO estatus_reserva (nombre, es_cliente_llego) VALUES ('cliente llegó', 1);
    INSERT INTO estatus_reserva (nombre, es_full)          VALUES ('completada',    1);
    INSERT INTO estatus_reserva (nombre, es_cancelado)     VALUES ('cancelada',     1);

    CREATE TABLE ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mesa INTEGER,
      fecha TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL,
      id_estatus INTEGER DEFAULT 1,
      cargo_modalidad REAL DEFAULT 0
    );

    CREATE TABLE reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_cliente TEXT NOT NULL,
      mesa INTEGER,
      fecha TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL,
      id_estatus INTEGER DEFAULT 1,
      cargo_modalidad REAL DEFAULT 0
    );

    CREATE TABLE platos_carta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      id_restaurante INTEGER NOT NULL
    );
    INSERT INTO platos_carta (nombre, precio, id_restaurante) VALUES ('Lomo saltado', 18.00, 1);
    INSERT INTO platos_carta (nombre, precio, id_restaurante) VALUES ('Arroz chaufa', 14.00, 1);

    CREATE TABLE menus_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      id_restaurante INTEGER NOT NULL
    );
    INSERT INTO menus_dia (nombre, precio, id_restaurante) VALUES ('Menú del día', 12.00, 1);

    CREATE TABLE componentes_menu_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_menu_dia INTEGER NOT NULL,
      id_plato_menu INTEGER DEFAULT 1,
      id_seccion_menu INTEGER DEFAULT 1
    );
    INSERT INTO componentes_menu_dia (id_menu_dia, id_plato_menu, id_seccion_menu) VALUES (1, 1, 1);

    CREATE TABLE orden_carta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_orden INTEGER NOT NULL,
      id_plato_carta INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL
    );

    CREATE TABLE orden_menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_orden INTEGER NOT NULL,
      id_menu_dia INTEGER NOT NULL,
      id_componente INTEGER NOT NULL,
      cantidad INTEGER NOT NULL
    );

    CREATE TABLE reserva_carta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_reserva INTEGER NOT NULL,
      id_plato_carta INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL
    );

    CREATE TABLE reserva_menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_reserva INTEGER NOT NULL,
      id_menu_dia INTEGER NOT NULL,
      id_componente INTEGER NOT NULL,
      cantidad INTEGER NOT NULL
    );
  `);
  return db;
}

function insertOrden(db, mesa, estatusNombre = 'pendiente') {
  const id_estatus = db.prepare(`SELECT id FROM estatus_orden WHERE nombre = ?`).get(estatusNombre).id;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO ordenes (mesa, fecha, id_restaurante, id_estatus) VALUES (?, '2026-05-25', 1, ?)
  `).run(mesa, id_estatus);
  return lastInsertRowid;
}

function insertReserva(db, mesa, estatusNombre = 'confirmada', cargo = 0) {
  const id_estatus = db.prepare(`SELECT id FROM estatus_reserva WHERE nombre = ?`).get(estatusNombre).id;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO reservas (nombre_cliente, mesa, fecha, id_restaurante, id_estatus, cargo_modalidad)
    VALUES ('Test', ?, '2026-05-25', 1, ?, ?)
  `).run(mesa, id_estatus, cargo);
  return lastInsertRowid;
}

function addCartaItemReserva(db, reservaId, platoId = 1, cantidad = 1) {
  const precio = db.prepare(`SELECT precio FROM platos_carta WHERE id = ?`).get(platoId).precio;
  db.prepare(`
    INSERT INTO reserva_carta_items (id_reserva, id_plato_carta, cantidad, precio_unitario) VALUES (?, ?, ?, ?)
  `).run(reservaId, platoId, cantidad, precio);
}

function addMenuItemReserva(db, reservaId) {
  db.prepare(`
    INSERT INTO reserva_menu_items (id_reserva, id_menu_dia, id_componente, cantidad) VALUES (?, 1, 1, 1)
  `).run(reservaId);
}

// ── Función de merge (replicada de routes/reservations.js) ───────────────────

function autoMergeReservaEnOrden(db, reservaId, restauranteId) {
  const rest = db.prepare(`SELECT auto_merge_activo FROM restaurantes WHERE id = ?`).get(restauranteId);
  if (!rest?.auto_merge_activo) return;

  const reserva = db.prepare(`SELECT mesa FROM reservas WHERE id = ?`).get(reservaId);
  if (!reserva?.mesa) return;

  const orden = db.prepare(`
    SELECT o.id FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id_restaurante = ? AND o.mesa = ?
      AND eo.es_pagado = 0 AND eo.es_cancelado = 0
    ORDER BY o.id DESC LIMIT 1
  `).get(restauranteId, reserva.mesa);
  if (!orden) return;

  db.transaction(() => {
    const cartaItems = db.prepare(
      `SELECT id_plato_carta, cantidad, precio_unitario FROM reserva_carta_items WHERE id_reserva = ?`
    ).all(reservaId);
    const stmtCarta = db.prepare(
      `INSERT INTO orden_carta_items (id_orden, id_plato_carta, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`
    );
    for (const i of cartaItems) stmtCarta.run(orden.id, i.id_plato_carta, i.cantidad, i.precio_unitario);

    const menuItems = db.prepare(
      `SELECT id_menu_dia, id_componente, cantidad FROM reserva_menu_items WHERE id_reserva = ?`
    ).all(reservaId);
    const stmtMenu = db.prepare(
      `INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad) VALUES (?, ?, ?, ?)`
    );
    for (const i of menuItems) stmtMenu.run(orden.id, i.id_menu_dia, i.id_componente, i.cantidad);

    const { cargo_modalidad } = db.prepare(`SELECT cargo_modalidad FROM reservas WHERE id = ?`).get(reservaId);
    if (cargo_modalidad > 0) {
      db.prepare(`UPDATE ordenes SET cargo_modalidad = cargo_modalidad + ? WHERE id = ?`)
        .run(cargo_modalidad, orden.id);
    }
  })();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Gap 8 — Auto-merge cuenta por mesa', () => {

  describe('Merge de ítems de carta', () => {
    test('copia ítems de carta de la reserva a la orden activa de la misma mesa', () => {
      const db = crearDB();
      const ordenId  = insertOrden(db, 3);
      const reservaId = insertReserva(db, 3);
      addCartaItemReserva(db, reservaId, 1, 2);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const items = db.prepare(`SELECT * FROM orden_carta_items WHERE id_orden = ?`).all(ordenId);
      expect(items).toHaveLength(1);
      expect(items[0].id_plato_carta).toBe(1);
      expect(items[0].cantidad).toBe(2);
      expect(items[0].precio_unitario).toBe(18.00);
    });

    test('copia múltiples ítems de carta', () => {
      const db = crearDB();
      const ordenId  = insertOrden(db, 3);
      const reservaId = insertReserva(db, 3);
      addCartaItemReserva(db, reservaId, 1, 1);
      addCartaItemReserva(db, reservaId, 2, 3);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const items = db.prepare(`SELECT * FROM orden_carta_items WHERE id_orden = ?`).all(ordenId);
      expect(items).toHaveLength(2);
    });
  });

  describe('Merge de ítems de menú', () => {
    test('copia ítems de menú de la reserva a la orden activa', () => {
      const db = crearDB();
      const ordenId  = insertOrden(db, 5);
      const reservaId = insertReserva(db, 5);
      addMenuItemReserva(db, reservaId);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const items = db.prepare(`SELECT * FROM orden_menu_items WHERE id_orden = ?`).all(ordenId);
      expect(items).toHaveLength(1);
      expect(items[0].id_menu_dia).toBe(1);
    });

    test('copia carta y menú juntos', () => {
      const db = crearDB();
      const ordenId  = insertOrden(db, 7);
      const reservaId = insertReserva(db, 7);
      addCartaItemReserva(db, reservaId, 1, 1);
      addMenuItemReserva(db, reservaId);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const carta = db.prepare(`SELECT * FROM orden_carta_items WHERE id_orden = ?`).all(ordenId);
      const menu  = db.prepare(`SELECT * FROM orden_menu_items  WHERE id_orden = ?`).all(ordenId);
      expect(carta).toHaveLength(1);
      expect(menu).toHaveLength(1);
    });
  });

  describe('Condiciones de no-merge', () => {
    test('no hace nada si la reserva no tiene mesa', () => {
      const db = crearDB();
      const ordenId  = insertOrden(db, 3);
      const reservaId = insertReserva(db, null); // sin mesa
      addCartaItemReserva(db, reservaId, 1, 1);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const items = db.prepare(`SELECT * FROM orden_carta_items WHERE id_orden = ?`).all(ordenId);
      expect(items).toHaveLength(0);
    });

    test('no hace nada si no hay orden activa en la mesa', () => {
      const db = crearDB();
      // No hay orden en mesa 4
      const reservaId = insertReserva(db, 4);
      addCartaItemReserva(db, reservaId, 1, 1);

      expect(() => autoMergeReservaEnOrden(db, reservaId, 1)).not.toThrow();
    });

    test('no hace nada si auto_merge_activo = 0', () => {
      const db = crearDB();
      db.prepare(`UPDATE restaurantes SET auto_merge_activo = 0 WHERE id = 1`).run();
      const ordenId  = insertOrden(db, 3);
      const reservaId = insertReserva(db, 3);
      addCartaItemReserva(db, reservaId, 1, 1);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const items = db.prepare(`SELECT * FROM orden_carta_items WHERE id_orden = ?`).all(ordenId);
      expect(items).toHaveLength(0);
    });

    test('no hace merge si la orden está pagada', () => {
      const db = crearDB();
      const ordenId  = insertOrden(db, 3, 'completado');
      const reservaId = insertReserva(db, 3);
      addCartaItemReserva(db, reservaId, 1, 1);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const items = db.prepare(`SELECT * FROM orden_carta_items WHERE id_orden = ?`).all(ordenId);
      expect(items).toHaveLength(0);
    });

    test('no hace merge si la orden está cancelada', () => {
      const db = crearDB();
      const ordenId  = insertOrden(db, 3, 'cancelado');
      const reservaId = insertReserva(db, 3);
      addCartaItemReserva(db, reservaId, 1, 1);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const items = db.prepare(`SELECT * FROM orden_carta_items WHERE id_orden = ?`).all(ordenId);
      expect(items).toHaveLength(0);
    });
  });

  describe('Estados activos de la orden', () => {
    test.each(['pendiente', 'preparando', 'listo', 'entregado'])(
      'sí hace merge si la orden está en estado "%s"',
      (estado) => {
        const db = crearDB();
        const ordenId  = insertOrden(db, 3, estado);
        const reservaId = insertReserva(db, 3);
        addCartaItemReserva(db, reservaId, 1, 1);

        autoMergeReservaEnOrden(db, reservaId, 1);

        const items = db.prepare(`SELECT * FROM orden_carta_items WHERE id_orden = ?`).all(ordenId);
        expect(items).toHaveLength(1);
      }
    );
  });

  describe('Cargo de modalidad', () => {
    test('suma cargo_modalidad de la reserva a la orden', () => {
      const db = crearDB();
      const ordenId  = insertOrden(db, 3);
      const reservaId = insertReserva(db, 3, 'confirmada', 0.50);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const orden = db.prepare(`SELECT cargo_modalidad FROM ordenes WHERE id = ?`).get(ordenId);
      expect(orden.cargo_modalidad).toBeCloseTo(0.50);
    });

    test('no suma cargo si la reserva tiene cargo 0', () => {
      const db = crearDB();
      const ordenId  = insertOrden(db, 3);
      const reservaId = insertReserva(db, 3, 'confirmada', 0);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const orden = db.prepare(`SELECT cargo_modalidad FROM ordenes WHERE id = ?`).get(ordenId);
      expect(orden.cargo_modalidad).toBe(0);
    });

    test('acumula cargo si la orden ya tenía cargo propio', () => {
      const db = crearDB();
      const ordenId  = insertOrden(db, 3);
      db.prepare(`UPDATE ordenes SET cargo_modalidad = 0.50 WHERE id = ?`).run(ordenId);
      const reservaId = insertReserva(db, 3, 'confirmada', 0.50);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const orden = db.prepare(`SELECT cargo_modalidad FROM ordenes WHERE id = ?`).get(ordenId);
      expect(orden.cargo_modalidad).toBeCloseTo(1.00);
    });
  });

  describe('Selección de orden: la más reciente de la mesa', () => {
    test('usa la orden más reciente cuando hay múltiples en la misma mesa', () => {
      const db = crearDB();
      insertOrden(db, 3); // orden antigua
      const ordenRecienteId = insertOrden(db, 3); // orden más reciente
      const reservaId = insertReserva(db, 3);
      addCartaItemReserva(db, reservaId, 1, 1);

      autoMergeReservaEnOrden(db, reservaId, 1);

      const items = db.prepare(`SELECT * FROM orden_carta_items WHERE id_orden = ?`).all(ordenRecienteId);
      expect(items).toHaveLength(1);
    });
  });
});
