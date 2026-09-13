/**
 * Pruebas del job de auto-entregado (ISS-091).
 *
 * "Listos" solo se vaciaba si alguien tocaba "🍽 Entregar", y en hora pico nadie
 * lo toca: día 15 del piloto, ~39 pedidos acumulados (ISS-085). El job pasa las
 * órdenes a "Por cobrar" solas pasados los minutos configurados.
 *
 * Lo que se verifica acá es sobre todo lo que el job NO debe tocar: reservas,
 * pedidos que todavía no cumplieron su tiempo, los que ya estaban listos antes
 * del deploy (sin `listo_at`), y los de un restaurante que lo tenga apagado.
 *
 * Estrategia de tiempo: `listo_at` se guarda en UTC (CURRENT_TIMESTAMP), así que
 * las pruebas escriben valores relativos a datetime('now') y son agnósticas al
 * huso horario de la máquina.
 */

const Database = require('better-sqlite3');
const { procesarOrdenesListas, obtenerOrdenesParaEntregar } = require('../utils/autoEntregado');

function crearDB({ minutos = 3 } = {}) {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE restaurantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      minutos_auto_entregado INTEGER DEFAULT 3
    );
    INSERT INTO restaurantes (nombre, minutos_auto_entregado) VALUES ('Test Resto', ${minutos});

    CREATE TABLE estatus_orden (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      es_listo     INTEGER DEFAULT 0,
      es_entregado INTEGER DEFAULT 0,
      es_pagado    INTEGER DEFAULT 0,
      es_cancelado INTEGER DEFAULT 0
    );
    INSERT INTO estatus_orden (nombre, es_listo)     VALUES ('entregando', 1);
    INSERT INTO estatus_orden (nombre, es_entregado) VALUES ('entregado',  1);
    INSERT INTO estatus_orden (nombre, es_pagado)    VALUES ('completado', 1);
    INSERT INTO estatus_orden (nombre, es_cancelado) VALUES ('cancelado',  1);

    CREATE TABLE ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mesa TEXT,
      id_restaurante INTEGER NOT NULL,
      id_estatus INTEGER NOT NULL,
      modalidad TEXT DEFAULT 'en_local',
      listo_at DATETIME DEFAULT NULL
    );
  `);
  return db;
}

const idEstatus = (db, nombre) =>
  db.prepare('SELECT id FROM estatus_orden WHERE nombre = ?').get(nombre).id;

const estatusDe = (db, id) => db.prepare(`
  SELECT eo.nombre FROM ordenes o JOIN estatus_orden eo ON o.id_estatus = eo.id WHERE o.id = ?
`).get(id).nombre;

/** `haceMinutos: null` → listo_at NULL (orden anterior al deploy) */
function crearOrden(db, { estatus = 'entregando', haceMinutos = 10, mesa = '5', modalidad = 'en_local', rest = 1 } = {}) {
  const listoAt = haceMinutos === null ? null : `datetime('now', '-${haceMinutos} minutes')`;
  return db.prepare(`
    INSERT INTO ordenes (mesa, id_restaurante, id_estatus, modalidad, listo_at)
    VALUES (?, ?, ?, ?, ${listoAt === null ? 'NULL' : listoAt})
  `).run(mesa, rest, idEstatus(db, estatus), modalidad).lastInsertRowid;
}

// ── Lo que sí mueve ─────────────────────────────────────────────────────────

describe('auto-entregado — lo que mueve', () => {
  test('pasa a "entregado" una orden que cumplió su tiempo en Listos', () => {
    const db = crearDB({ minutos: 3 });
    const id = crearOrden(db, { haceMinutos: 10 });

    expect(procesarOrdenesListas(db)).toBe(1);
    expect(estatusDe(db, id)).toBe('entregado');
  });

  test('mueve las de TODAS las modalidades — una orden para llevar es alguien que está en el local', () => {
    const db = crearDB({ minutos: 3 });
    const enLocal   = crearOrden(db, { haceMinutos: 10, modalidad: 'en_local' });
    const paraLlevar = crearOrden(db, { haceMinutos: 10, modalidad: 'para_llevar' });
    const mixto     = crearOrden(db, { haceMinutos: 10, modalidad: 'mixto' });

    expect(procesarOrdenesListas(db)).toBe(3);
    expect(estatusDe(db, enLocal)).toBe('entregado');
    expect(estatusDe(db, paraLlevar)).toBe('entregado');
    expect(estatusDe(db, mixto)).toBe('entregado');
  });

  test('respeta el umbral configurado por restaurante', () => {
    const db = crearDB({ minutos: 30 });
    const reciente = crearOrden(db, { haceMinutos: 10 });   // todavía no
    const vieja    = crearOrden(db, { haceMinutos: 45 });   // ya

    expect(procesarOrdenesListas(db)).toBe(1);
    expect(estatusDe(db, reciente)).toBe('entregando');
    expect(estatusDe(db, vieja)).toBe('entregado');
  });

  test('es idempotente: correrlo de nuevo no vuelve a mover nada', () => {
    const db = crearDB();
    crearOrden(db, { haceMinutos: 10 });

    expect(procesarOrdenesListas(db)).toBe(1);
    expect(procesarOrdenesListas(db)).toBe(0);
  });
});

// ── Lo que NO debe tocar ────────────────────────────────────────────────────

describe('auto-entregado — lo que no toca', () => {
  test('no mueve una orden que todavía no cumplió el tiempo', () => {
    const db = crearDB({ minutos: 3 });
    const id = crearOrden(db, { haceMinutos: 1 });

    expect(procesarOrdenesListas(db)).toBe(0);
    expect(estatusDe(db, id)).toBe('entregando');
  });

  test('no mueve órdenes sin listo_at — las que ya estaban en Listos antes del deploy', () => {
    const db = crearDB();
    const id = crearOrden(db, { haceMinutos: null });

    // Vaciarlas de golpe al arrancar marcaría como entregados platos que quizá
    // siguen en la barra: se cierran a mano, una sola vez.
    expect(procesarOrdenesListas(db)).toBe(0);
    expect(estatusDe(db, id)).toBe('entregando');
  });

  test('no mueve nada si el restaurante lo tiene apagado (0 minutos)', () => {
    const db = crearDB({ minutos: 0 });
    const id = crearOrden(db, { haceMinutos: 90 });

    expect(procesarOrdenesListas(db)).toBe(0);
    expect(estatusDe(db, id)).toBe('entregando');
  });

  test('no toca órdenes que ya salieron de Listos (entregadas, cobradas, canceladas)', () => {
    const db = crearDB();
    const entregada = crearOrden(db, { estatus: 'entregado',  haceMinutos: 60 });
    const cobrada   = crearOrden(db, { estatus: 'completado', haceMinutos: 60 });
    const cancelada = crearOrden(db, { estatus: 'cancelado',  haceMinutos: 60 });

    expect(procesarOrdenesListas(db)).toBe(0);
    expect(estatusDe(db, entregada)).toBe('entregado');
    expect(estatusDe(db, cobrada)).toBe('completado');
    expect(estatusDe(db, cancelada)).toBe('cancelado');
  });

  test('cada restaurante usa su propio umbral', () => {
    const db = crearDB({ minutos: 3 });
    db.prepare(`INSERT INTO restaurantes (nombre, minutos_auto_entregado) VALUES ('Lento', 60)`).run();
    const rapido = crearOrden(db, { haceMinutos: 10, rest: 1 });
    const lento  = crearOrden(db, { haceMinutos: 10, rest: 2 });

    expect(procesarOrdenesListas(db)).toBe(1);
    expect(estatusDe(db, rapido)).toBe('entregado');
    expect(estatusDe(db, lento)).toBe('entregando');
  });

  test('las RESERVAS quedan fuera: el job solo mira la tabla de órdenes', () => {
    const db = crearDB();
    // `obtenerOrdenesParaEntregar` consulta únicamente `ordenes`; si algún día
    // alguien le agregara reservas, este test lo delata al romper por tabla
    // inexistente en vez de pasar en silencio.
    expect(() => obtenerOrdenesParaEntregar(db)).not.toThrow();
    expect(db.prepare(`SELECT COUNT(*) n FROM sqlite_master WHERE name = 'reservas'`).get().n).toBe(0);
  });
});
