/**
 * ISS-094 — crear las mesas de una sola vez + número de mesa escrito a mano.
 * Prueba las funciones reales de utils/mesas.js sobre una BD en memoria.
 */

const Database = require('better-sqlite3');
const { crearMesasLote, cantidadMesasValida, normalizarNumeroMesa, MAX_MESAS } = require('../utils/mesas');

function crearDB() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE mesas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      capacidad INTEGER NOT NULL DEFAULT 4,
      activo INTEGER NOT NULL DEFAULT 1,
      id_restaurante INTEGER NOT NULL,
      UNIQUE (numero, id_restaurante)
    );
  `);
  return db;
}

const numeros = (db, rid = 1) =>
  db.prepare(`SELECT numero FROM mesas WHERE id_restaurante = ? ORDER BY numero`).all(rid).map(m => m.numero);

describe('crearMesasLote', () => {
  let db;
  beforeEach(() => { db = crearDB(); });
  afterEach(() => db.close());

  test('sin mesas, crea de la 1 a la N con capacidad 4', () => {
    const r = crearMesasLote(db, 1, 20);
    expect(r.creadas).toHaveLength(20);
    expect(r.total).toBe(20);
    expect(numeros(db)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(db.prepare(`SELECT DISTINCT capacidad FROM mesas`).all()).toEqual([{ capacidad: 4 }]);
  });

  test('repetir con el mismo número no duplica', () => {
    crearMesasLote(db, 1, 20);
    const r = crearMesasLote(db, 1, 20);
    expect(r.creadas).toEqual([]);
    expect(r.total).toBe(20);
  });

  test('un número mayor agrega solo las que faltan', () => {
    crearMesasLote(db, 1, 20);
    const r = crearMesasLote(db, 1, 25);
    expect(r.creadas).toEqual([21, 22, 23, 24, 25]);
    expect(r.total).toBe(25);
  });

  test('un número menor no borra ninguna', () => {
    crearMesasLote(db, 1, 20);
    const r = crearMesasLote(db, 1, 5);
    expect(r.creadas).toEqual([]);
    expect(r.total).toBe(20);
  });

  test('rellena huecos y respeta las mesas creadas a mano (sin tocar su capacidad)', () => {
    db.exec(`INSERT INTO mesas (numero, capacidad, id_restaurante) VALUES (3, 8, 1), (30, 2, 1)`);
    const r = crearMesasLote(db, 1, 5);
    expect(r.creadas).toEqual([1, 2, 4, 5]);
    expect(r.total).toBe(6);  // 1-5 + la 30
    expect(db.prepare(`SELECT capacidad FROM mesas WHERE numero = 3`).get().capacidad).toBe(8);
  });

  test('no toca las mesas de otro restaurante', () => {
    crearMesasLote(db, 2, 3);
    const r = crearMesasLote(db, 1, 3);
    expect(r.creadas).toEqual([1, 2, 3]);
    expect(numeros(db, 2)).toEqual([1, 2, 3]);
    expect(r.total).toBe(3);
  });
});

describe('cantidadMesasValida', () => {
  test.each([[1, 1], ['20', 20], [MAX_MESAS, MAX_MESAS]])('%p es válida', (v, esperado) => {
    expect(cantidadMesasValida(v)).toBe(esperado);
  });
  test.each([0, -3, 2.5, 'abc', '', null, undefined, MAX_MESAS + 1])('%p no es válida', v => {
    expect(cantidadMesasValida(v)).toBeNull();
  });
});

describe('normalizarNumeroMesa', () => {
  test.each([undefined, null, '', '   '])('%p → sin mesa', v => {
    expect(normalizarNumeroMesa(v)).toEqual({ mesa: null });
  });
  test.each([[5, 5], ['5', 5], [' 12 ', 12], ['07', 7]])('%p → mesa %p', (v, esperado) => {
    expect(normalizarNumeroMesa(v)).toEqual({ mesa: esperado });
  });
  test.each(['0', 0, '-2', '2.5', 'mesa 3', 'abc'])('%p → error', v => {
    expect(normalizarNumeroMesa(v).error).toMatch(/número entero mayor a 0/);
  });
});
