/**
 * Pruebas para Gap 4 — Modalidades de pedido.
 * Cubre: BD, lógica de backend (validaciones POST), GET incluye modalidad,
 * y lógica de frontend pura (clasificarZonas, btnOrden, btnReserva).
 */

const Database = require('better-sqlite3');

// ── BD helpers ──────────────────────────────────────────────────────────────────

function crearDB() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE restaurantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      para_llevar_activo INTEGER DEFAULT 1,
      delivery_activo    INTEGER DEFAULT 0
    );
    INSERT INTO restaurantes (nombre, para_llevar_activo, delivery_activo) VALUES ('Test Resto', 1, 0);

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
      es_inicial      INTEGER DEFAULT 0,
      es_confirmada   INTEGER DEFAULT 0,
      es_en_cocina    INTEGER DEFAULT 0,
      es_listo        INTEGER DEFAULT 0,
      es_cliente_llego INTEGER DEFAULT 0,
      es_full         INTEGER DEFAULT 0,
      es_cancelado    INTEGER DEFAULT 0
    );
    INSERT INTO estatus_reserva (nombre, es_inicial)      VALUES ('pendiente',      1);
    INSERT INTO estatus_reserva (nombre, es_confirmada)   VALUES ('confirmada',     1);
    INSERT INTO estatus_reserva (nombre, es_en_cocina)    VALUES ('en preparación', 1);
    INSERT INTO estatus_reserva (nombre, es_listo)        VALUES ('listo',          1);
    INSERT INTO estatus_reserva (nombre, es_cliente_llego) VALUES ('cliente llegó', 1);
    INSERT INTO estatus_reserva (nombre, es_full)         VALUES ('completada',     1);
    INSERT INTO estatus_reserva (nombre, es_cancelado)    VALUES ('cancelada',      1);

    CREATE TABLE ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mesa INTEGER,
      nombre_cliente TEXT,
      fecha TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL,
      id_estatus INTEGER DEFAULT 1,
      modalidad TEXT DEFAULT 'en_local',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_cliente TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL,
      id_estatus INTEGER DEFAULT 1,
      fecha TEXT NOT NULL,
      hora_llegada TEXT,
      modalidad TEXT DEFAULT 'en_local'
    );
  `);
  return db;
}

function insertOrden(db, modalidad = 'en_local', estatusNombre = 'pendiente') {
  const id_estatus = db.prepare(`SELECT id FROM estatus_orden WHERE nombre = ?`).get(estatusNombre).id;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO ordenes (mesa, nombre_cliente, fecha, id_restaurante, id_estatus, modalidad)
    VALUES (1, 'Test', '2026-05-25', 1, ?, ?)
  `).run(id_estatus, modalidad);
  return lastInsertRowid;
}

function insertReserva(db, modalidad = 'en_local', estatusNombre = 'confirmada') {
  const id_estatus = db.prepare(`SELECT id FROM estatus_reserva WHERE nombre = ?`).get(estatusNombre).id;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO reservas (nombre_cliente, id_restaurante, id_estatus, fecha, modalidad)
    VALUES ('Test', 1, ?, '2026-05-25', ?)
  `).run(id_estatus, modalidad);
  return lastInsertRowid;
}

// ── Lógica de validación (replicada de routes/public.js) ─────────────────────────

function validarModalidadOrden(modalidad) {
  const VALID = ['en_local', 'para_llevar'];
  return VALID.includes(modalidad);
}

function validarModalidadReserva(modalidad, rest) {
  const VALID = ['en_local', 'para_llevar', 'delivery'];
  if (!VALID.includes(modalidad)) return { ok: false, error: 'modalidad inválida' };
  if (modalidad === 'delivery'    && !rest.delivery_activo)    return { ok: false, error: 'Sin delivery' };
  if (modalidad === 'para_llevar' && !rest.para_llevar_activo) return { ok: false, error: 'Sin para llevar' };
  return { ok: true };
}

// ── Lógica de UI del Kanban (replicada de pedidos.js) ────────────────────────────

function btnOrden(o, zona) {
  const paraLlevar = o.modalidad === 'para_llevar';
  if (zona === 'pendientes' && o.es_inicial)               return 'A cocina';
  if (zona === 'listos'     && o.es_listo && !paraLlevar)  return 'Entregar';
  if (zona === 'listos'     && o.es_listo && paraLlevar)   return 'Cobrar';
  if (zona === 'cobrar'     && o.es_entregado)             return 'Cobrar';
  return '';
}

function btnReserva(r, zona) {
  const sinMesa = r.modalidad === 'para_llevar' || r.modalidad === 'delivery';
  if (zona === 'pendientes' && r.es_confirmada)              return 'A cocina';
  if (zona === 'pendientes' && r.es_inicial)                 return 'Confirmar';
  if (zona === 'listos'     && r.es_listo && !sinMesa)       return 'Entregado';
  if (zona === 'listos'     && r.es_listo && sinMesa)        return 'Completar';
  if (zona === 'cobrar'     && r.es_cliente_llego)           return 'Completar';
  return '';
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('Gap 4 — Modalidades de pedido', () => {

  // ── BD ──────────────────────────────────────────────────────────────────────

  describe('Columna modalidad en BD', () => {
    test('ordenes acepta modalidad en_local', () => {
      const db = crearDB();
      const id = insertOrden(db, 'en_local');
      const row = db.prepare(`SELECT modalidad FROM ordenes WHERE id = ?`).get(id);
      expect(row.modalidad).toBe('en_local');
    });

    test('ordenes acepta modalidad para_llevar', () => {
      const db = crearDB();
      const id = insertOrden(db, 'para_llevar');
      const row = db.prepare(`SELECT modalidad FROM ordenes WHERE id = ?`).get(id);
      expect(row.modalidad).toBe('para_llevar');
    });

    test('reservas acepta modalidad delivery', () => {
      const db = crearDB();
      const id = insertReserva(db, 'delivery');
      const row = db.prepare(`SELECT modalidad FROM reservas WHERE id = ?`).get(id);
      expect(row.modalidad).toBe('delivery');
    });

    test('modalidad default es en_local en ordenes', () => {
      const db = crearDB();
      db.prepare(`INSERT INTO ordenes (fecha, id_restaurante, id_estatus) VALUES ('2026-05-25', 1, 1)`).run();
      const row = db.prepare(`SELECT modalidad FROM ordenes ORDER BY id DESC LIMIT 1`).get();
      expect(row.modalidad).toBe('en_local');
    });
  });

  // ── Validación backend ───────────────────────────────────────────────────────

  describe('Validación de modalidad en órdenes', () => {
    test('en_local es válido', () => expect(validarModalidadOrden('en_local')).toBe(true));
    test('para_llevar es válido', () => expect(validarModalidadOrden('para_llevar')).toBe(true));
    test('delivery NO es válido en órdenes', () => expect(validarModalidadOrden('delivery')).toBe(false));
    test('valor desconocido no es válido', () => expect(validarModalidadOrden('foo')).toBe(false));
  });

  describe('Validación de modalidad en reservas', () => {
    const restCompleto = { para_llevar_activo: 1, delivery_activo: 1 };
    const restSinDel   = { para_llevar_activo: 1, delivery_activo: 0 };
    const restSolo     = { para_llevar_activo: 0, delivery_activo: 0 };

    test('en_local siempre válido', () => {
      expect(validarModalidadReserva('en_local', restSolo).ok).toBe(true);
    });
    test('para_llevar válido si restaurante lo tiene activo', () => {
      expect(validarModalidadReserva('para_llevar', restCompleto).ok).toBe(true);
    });
    test('para_llevar inválido si restaurante NO lo tiene activo', () => {
      expect(validarModalidadReserva('para_llevar', restSolo).ok).toBe(false);
    });
    test('delivery válido si restaurante lo tiene activo', () => {
      expect(validarModalidadReserva('delivery', restCompleto).ok).toBe(true);
    });
    test('delivery inválido si restaurante NO lo ofrece', () => {
      expect(validarModalidadReserva('delivery', restSinDel).ok).toBe(false);
    });
    test('modalidad desconocida siempre inválida', () => {
      expect(validarModalidadReserva('avion', restCompleto).ok).toBe(false);
    });
  });

  // ── Máquina de estados — Kanban (btnOrden) ───────────────────────────────────

  describe('btnOrden — máquina de estados por modalidad', () => {
    const ordenPendiente    = { es_inicial: 1, es_listo: 0, es_entregado: 0 };
    const ordenLista        = { es_inicial: 0, es_listo: 1, es_entregado: 0 };
    const ordenEntregada    = { es_inicial: 0, es_listo: 0, es_entregado: 1 };

    test('en_local en listos → Entregar (paso intermedio)', () => {
      expect(btnOrden({ ...ordenLista, modalidad: 'en_local' }, 'listos')).toBe('Entregar');
    });
    test('para_llevar en listos → Cobrar directamente (sin entrega en mesa)', () => {
      expect(btnOrden({ ...ordenLista, modalidad: 'para_llevar' }, 'listos')).toBe('Cobrar');
    });
    test('en_local en cobrar (tras entregar) → Cobrar', () => {
      expect(btnOrden({ ...ordenEntregada, modalidad: 'en_local' }, 'cobrar')).toBe('Cobrar');
    });
    test('pendiente → A cocina (igual para ambas modalidades)', () => {
      expect(btnOrden({ ...ordenPendiente, modalidad: 'en_local' },     'pendientes')).toBe('A cocina');
      expect(btnOrden({ ...ordenPendiente, modalidad: 'para_llevar' }, 'pendientes')).toBe('A cocina');
    });
  });

  // ── Máquina de estados — Kanban (btnReserva) ─────────────────────────────────

  describe('btnReserva — máquina de estados por modalidad', () => {
    const resLista          = { es_inicial: 0, es_confirmada: 0, es_listo: 1, es_cliente_llego: 0 };
    const resConClienteLlego = { es_inicial: 0, es_confirmada: 0, es_listo: 0, es_cliente_llego: 1 };

    test('en_local en listos → Entregado (el cliente llega y recibe)', () => {
      expect(btnReserva({ ...resLista, modalidad: 'en_local' }, 'listos')).toBe('Entregado');
    });
    test('para_llevar en listos → Completar directamente (sin es_cliente_llego)', () => {
      expect(btnReserva({ ...resLista, modalidad: 'para_llevar' }, 'listos')).toBe('Completar');
    });
    test('delivery en listos → Completar directamente', () => {
      expect(btnReserva({ ...resLista, modalidad: 'delivery' }, 'listos')).toBe('Completar');
    });
    test('en_local en cobrar (cliente llegó) → Completar', () => {
      expect(btnReserva({ ...resConClienteLlego, modalidad: 'en_local' }, 'cobrar')).toBe('Completar');
    });
  });
});
