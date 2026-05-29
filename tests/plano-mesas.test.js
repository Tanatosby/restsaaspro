/**
 * Pruebas para la lógica del plano de mesas.
 * Verifica derivación de estado: libre / ocupada / reservada.
 */

const Database = require('better-sqlite3');

function crearDB() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE restaurantes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, activo INTEGER DEFAULT 1);
    INSERT INTO restaurantes (nombre) VALUES ('Test');

    CREATE TABLE mesas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      capacidad INTEGER NOT NULL DEFAULT 4,
      activo INTEGER NOT NULL DEFAULT 1,
      id_restaurante INTEGER NOT NULL,
      UNIQUE (numero, id_restaurante)
    );

    CREATE TABLE estatus_orden (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE);
    INSERT INTO estatus_orden (nombre) VALUES ('pendiente'),('preparando'),('entregando'),('completado'),('cancelado');

    CREATE TABLE estatus_reserva (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, es_full INTEGER DEFAULT 0);
    INSERT INTO estatus_reserva (nombre, es_full) VALUES ('pendiente',0),('confirmada',0),('cancelada',0),('completada',1);

    CREATE TABLE ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mesa INTEGER,
      nombre_cliente TEXT,
      fecha TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL,
      id_estatus INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_cliente TEXT NOT NULL,
      telefono_cliente TEXT,
      fecha TEXT NOT NULL,
      mesa INTEGER,
      id_restaurante INTEGER NOT NULL,
      id_estatus INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

// Replica de la lógica del endpoint GET /api/mesas/estado
function getEstadoMesas(db, restauranteId, hoy) {
  const mesas = db.prepare(`
    SELECT id, numero, capacidad
    FROM mesas WHERE id_restaurante = ? AND activo = 1 ORDER BY numero ASC
  `).all(restauranteId);

  const ordenesActivas = db.prepare(`
    SELECT o.mesa, o.id, o.nombre_cliente, eo.nombre AS estatus
    FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id_restaurante = ? AND eo.nombre IN ('pendiente','preparando','entregando') AND o.mesa IS NOT NULL
  `).all(restauranteId);

  const reservasHoy = db.prepare(`
    SELECT r.mesa, r.id, r.nombre_cliente
    FROM reservas r
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE r.id_restaurante = ? AND r.fecha = ? AND er.nombre = 'confirmada' AND r.mesa IS NOT NULL
  `).all(restauranteId, hoy);

  const porMesa = {};
  for (const o of ordenesActivas) porMesa[o.mesa] = { tipo: 'ocupada', orden: o };
  for (const r of reservasHoy)   if (!porMesa[r.mesa]) porMesa[r.mesa] = { tipo: 'reservada', reserva: r };

  return mesas.map(m => ({
    ...m,
    estado:  porMesa[m.numero]?.tipo  ?? 'libre',
    orden:   porMesa[m.numero]?.orden   ?? null,
    reserva: porMesa[m.numero]?.reserva ?? null,
  }));
}

describe('Plano de mesas — estado', () => {
  let db;
  const HOY = '2026-05-18';

  beforeEach(() => {
    db = crearDB();
    db.exec(`INSERT INTO mesas (numero, capacidad, id_restaurante) VALUES (1,4,1),(2,2,1),(3,6,1)`);
  });
  afterEach(() => db.close());

  test('sin órdenes ni reservas todas las mesas son libres', () => {
    const estado = getEstadoMesas(db, 1, HOY);
    expect(estado.every(m => m.estado === 'libre')).toBe(true);
  });

  test('mesa con orden pendiente aparece como ocupada', () => {
    db.prepare(`INSERT INTO ordenes (mesa,fecha,id_restaurante,id_estatus) VALUES (1,?,1,(SELECT id FROM estatus_orden WHERE nombre='pendiente'))`).run(HOY);
    const estado = getEstadoMesas(db, 1, HOY);
    expect(estado.find(m => m.numero === 1).estado).toBe('ocupada');
    expect(estado.find(m => m.numero === 2).estado).toBe('libre');
  });

  test('mesa con orden preparando aparece como ocupada', () => {
    db.prepare(`INSERT INTO ordenes (mesa,fecha,id_restaurante,id_estatus) VALUES (2,?,1,(SELECT id FROM estatus_orden WHERE nombre='preparando'))`).run(HOY);
    const estado = getEstadoMesas(db, 1, HOY);
    expect(estado.find(m => m.numero === 2).estado).toBe('ocupada');
  });

  test('mesa con orden completada NO aparece como ocupada', () => {
    db.prepare(`INSERT INTO ordenes (mesa,fecha,id_restaurante,id_estatus) VALUES (1,?,1,(SELECT id FROM estatus_orden WHERE nombre='completado'))`).run(HOY);
    const estado = getEstadoMesas(db, 1, HOY);
    expect(estado.find(m => m.numero === 1).estado).toBe('libre');
  });

  test('mesa con orden cancelada NO aparece como ocupada', () => {
    db.prepare(`INSERT INTO ordenes (mesa,fecha,id_restaurante,id_estatus) VALUES (1,?,1,(SELECT id FROM estatus_orden WHERE nombre='cancelado'))`).run(HOY);
    const estado = getEstadoMesas(db, 1, HOY);
    expect(estado.find(m => m.numero === 1).estado).toBe('libre');
  });

  test('mesa con reserva confirmada para hoy aparece como reservada', () => {
    db.prepare(`INSERT INTO reservas (nombre_cliente,fecha,mesa,id_restaurante,id_estatus) VALUES ('Ana',?,2,1,(SELECT id FROM estatus_reserva WHERE nombre='confirmada'))`).run(HOY);
    const estado = getEstadoMesas(db, 1, HOY);
    expect(estado.find(m => m.numero === 2).estado).toBe('reservada');
  });

  test('reserva de otro día no afecta el estado de hoy', () => {
    db.prepare(`INSERT INTO reservas (nombre_cliente,fecha,mesa,id_restaurante,id_estatus) VALUES ('Ana','2026-05-20',2,1,(SELECT id FROM estatus_reserva WHERE nombre='confirmada'))`).run();
    const estado = getEstadoMesas(db, 1, HOY);
    expect(estado.find(m => m.numero === 2).estado).toBe('libre');
  });

  test('reserva pendiente (no confirmada) no marca como reservada', () => {
    db.prepare(`INSERT INTO reservas (nombre_cliente,fecha,mesa,id_restaurante,id_estatus) VALUES ('Ana',?,2,1,(SELECT id FROM estatus_reserva WHERE nombre='pendiente'))`).run(HOY);
    const estado = getEstadoMesas(db, 1, HOY);
    expect(estado.find(m => m.numero === 2).estado).toBe('libre');
  });

  test('orden activa tiene prioridad sobre reserva confirmada en la misma mesa', () => {
    db.prepare(`INSERT INTO ordenes (mesa,fecha,id_restaurante,id_estatus) VALUES (2,?,1,(SELECT id FROM estatus_orden WHERE nombre='pendiente'))`).run(HOY);
    db.prepare(`INSERT INTO reservas (nombre_cliente,fecha,mesa,id_restaurante,id_estatus) VALUES ('Ana',?,2,1,(SELECT id FROM estatus_reserva WHERE nombre='confirmada'))`).run(HOY);
    const estado = getEstadoMesas(db, 1, HOY);
    expect(estado.find(m => m.numero === 2).estado).toBe('ocupada');
  });

  test('mesas inactivas no aparecen en el plano', () => {
    db.prepare(`UPDATE mesas SET activo = 0 WHERE numero = 3`).run();
    const estado = getEstadoMesas(db, 1, HOY);
    expect(estado.some(m => m.numero === 3)).toBe(false);
    expect(estado).toHaveLength(2);
  });

  test('estado incluye datos de la orden (nombre cliente, estatus)', () => {
    db.prepare(`INSERT INTO ordenes (mesa,nombre_cliente,fecha,id_restaurante,id_estatus) VALUES (1,'Juan López',?,1,(SELECT id FROM estatus_orden WHERE nombre='preparando'))`).run(HOY);
    const estado = getEstadoMesas(db, 1, HOY);
    const mesa1 = estado.find(m => m.numero === 1);
    expect(mesa1.orden.nombre_cliente).toBe('Juan López');
    expect(mesa1.orden.estatus).toBe('preparando');
  });

  test('mesas de otro restaurante no aparecen', () => {
    db.exec(`INSERT INTO restaurantes (nombre) VALUES ('Otro')`);
    db.prepare(`INSERT INTO mesas (numero, capacidad, id_restaurante) VALUES (1,4,2)`).run();
    const estado = getEstadoMesas(db, 2, HOY);
    expect(estado).toHaveLength(1);
    expect(estado[0].numero).toBe(1);
  });

  test('número único de mesa por restaurante', () => {
    expect(() => {
      db.prepare(`INSERT INTO mesas (numero, capacidad, id_restaurante) VALUES (1,4,1)`).run();
    }).toThrow();
  });
});
