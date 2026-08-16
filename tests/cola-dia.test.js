/**
 * Pruebas para utils/colaDia.js (ISS-026).
 *
 * Cubre:
 *  - separación entre lo que se atiende hoy y lo que quedó sin cerrar
 *  - reservas futuras visibles en la cola (hay que poder confirmarlas)
 *  - filtro de fecha tolerante a los dos formatos que existen en la BD
 *    ('YYYY-MM-DD' y timestamp completo de registros viejos)
 *  - ítems agrupados sin N+1
 */

const Database = require('better-sqlite3');
const { colaDelDia, cocinaDelDia, pedidosSinCerrar, agruparPorPadre } = require('../utils/colaDia');

const HOY    = '2026-08-10';
const AYER   = '2026-08-09';
const MANANA = '2026-08-11';

function crearDB() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE estatus_orden (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      es_inicial INTEGER DEFAULT 0, es_en_cocina INTEGER DEFAULT 0,
      es_listo INTEGER DEFAULT 0,   es_entregado INTEGER DEFAULT 0,
      es_pagado INTEGER DEFAULT 0,  es_cancelado INTEGER DEFAULT 0
    );
    INSERT INTO estatus_orden (nombre, es_inicial)   VALUES ('pendiente',  1);
    INSERT INTO estatus_orden (nombre, es_en_cocina) VALUES ('preparando', 1);
    INSERT INTO estatus_orden (nombre, es_entregado) VALUES ('entregado',  1);
    INSERT INTO estatus_orden (nombre, es_pagado)    VALUES ('completado', 1);
    INSERT INTO estatus_orden (nombre, es_cancelado) VALUES ('cancelado',  1);

    CREATE TABLE estatus_reserva (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      es_inicial INTEGER DEFAULT 0, es_confirmada INTEGER DEFAULT 0,
      es_en_cocina INTEGER DEFAULT 0, es_listo INTEGER DEFAULT 0,
      es_cliente_llego INTEGER DEFAULT 0, es_full INTEGER DEFAULT 0,
      es_cancelado INTEGER DEFAULT 0
    );
    INSERT INTO estatus_reserva (nombre, es_inicial)   VALUES ('pendiente', 1);
    INSERT INTO estatus_reserva (nombre, es_confirmada) VALUES ('confirmada', 1);
    INSERT INTO estatus_reserva (nombre, es_en_cocina) VALUES ('en_cocina', 1);
    INSERT INTO estatus_reserva (nombre, es_full)      VALUES ('completada', 1);
    INSERT INTO estatus_reserva (nombre, es_cancelado) VALUES ('cancelada',  1);

    CREATE TABLE ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mesa TEXT, nombre_cliente TEXT, fecha TEXT, created_at TEXT,
      metodo_pago TEXT, estado_pago TEXT, comprobante_url TEXT, modalidad TEXT,
      id_restaurante INTEGER, id_estatus INTEGER, total REAL
    );
    CREATE TABLE reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT, nombre_cliente TEXT, telefono_cliente TEXT,
      fecha TEXT, hora_llegada TEXT, mesa TEXT, created_at TEXT,
      metodo_pago TEXT, estado_pago TEXT, comprobante_url TEXT, modalidad TEXT,
      id_restaurante INTEGER, id_estatus INTEGER, total REAL
    );

    CREATE TABLE platos_carta (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL);
    CREATE TABLE platos_menu  (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT);
    CREATE TABLE secciones_menu (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT);
    CREATE TABLE componentes_menu_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_menu_dia INTEGER, id_plato_menu INTEGER, id_seccion_menu INTEGER
    );

    CREATE TABLE orden_carta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_orden INTEGER, id_plato_carta INTEGER, cantidad INTEGER, precio_unitario REAL
    );
    CREATE TABLE orden_menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_orden INTEGER, id_menu_dia INTEGER, id_componente INTEGER, cantidad INTEGER,
      grupo INTEGER DEFAULT NULL
    );
    CREATE TABLE reserva_carta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_reserva INTEGER, id_plato_carta INTEGER, cantidad INTEGER, precio_unitario REAL
    );
    CREATE TABLE reserva_menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_reserva INTEGER, id_menu_dia INTEGER, id_componente INTEGER, cantidad INTEGER,
      grupo INTEGER DEFAULT NULL
    );

    INSERT INTO platos_carta (nombre, precio) VALUES ('Ceviche', 25.0);
    INSERT INTO platos_menu  (nombre) VALUES ('Arroz con pollo');
    INSERT INTO secciones_menu (nombre) VALUES ('Segundo');
    INSERT INTO componentes_menu_dia (id_menu_dia, id_plato_menu, id_seccion_menu) VALUES (1, 1, 1);

    -- El nombre del menú viaja al frontend para poder rotular los grupos
    -- cuando un pedido mezcla tipos distintos (ISS-041)
    CREATE TABLE menus_dia (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL);
    INSERT INTO menus_dia (nombre, precio) VALUES ('Menú del día', 11.0);
  `);
  return db;
}

const idEstatusOrden   = (db, n) => db.prepare('SELECT id FROM estatus_orden WHERE nombre = ?').get(n).id;
const idEstatusReserva = (db, n) => db.prepare('SELECT id FROM estatus_reserva WHERE nombre = ?').get(n).id;

function crearOrden(db, { fecha, estatus = 'pendiente', cliente = 'Cliente', rest = 1 }) {
  return db.prepare(`
    INSERT INTO ordenes (mesa, nombre_cliente, fecha, created_at, id_restaurante, id_estatus, modalidad)
    VALUES ('1', ?, ?, ?, ?, ?, 'en_local')
  `).run(cliente, fecha, fecha, rest, idEstatusOrden(db, estatus)).lastInsertRowid;
}

function crearReserva(db, { fecha, estatus = 'pendiente', cliente = 'Cliente', rest = 1 }) {
  return db.prepare(`
    INSERT INTO reservas (codigo, nombre_cliente, fecha, created_at, id_restaurante, id_estatus, modalidad)
    VALUES ('ABC123', ?, ?, ?, ?, ?, 'en_local')
  `).run(cliente, fecha, fecha, rest, idEstatusReserva(db, estatus)).lastInsertRowid;
}

// ── Separación hoy / días anteriores ─────────────────────────────────────────

describe('colaDelDia', () => {
  test('trae solo las órdenes de hoy', () => {
    const db = crearDB();
    crearOrden(db, { fecha: HOY,  cliente: 'De hoy' });
    crearOrden(db, { fecha: AYER, cliente: 'De ayer' });

    const { ordenes } = colaDelDia(db, 1, HOY);
    expect(ordenes).toHaveLength(1);
    expect(ordenes[0].nombre_cliente).toBe('De hoy');
  });

  test('las reservas futuras SÍ aparecen — hay que poder confirmarlas antes', () => {
    const db = crearDB();
    crearReserva(db, { fecha: HOY,    cliente: 'Hoy' });
    crearReserva(db, { fecha: MANANA, cliente: 'Mañana' });
    crearReserva(db, { fecha: AYER,   cliente: 'Ayer' });

    const { reservas } = colaDelDia(db, 1, HOY);
    expect(reservas.map(r => r.nombre_cliente).sort()).toEqual(['Hoy', 'Mañana']);
  });

  test('excluye lo ya cobrado y lo cancelado', () => {
    const db = crearDB();
    crearOrden(db, { fecha: HOY, estatus: 'pendiente',  cliente: 'Activa' });
    crearOrden(db, { fecha: HOY, estatus: 'completado', cliente: 'Cobrada' });
    crearOrden(db, { fecha: HOY, estatus: 'cancelado',  cliente: 'Cancelada' });

    const { ordenes } = colaDelDia(db, 1, HOY);
    expect(ordenes).toHaveLength(1);
    expect(ordenes[0].nombre_cliente).toBe('Activa');
  });

  test('no mezcla restaurantes', () => {
    const db = crearDB();
    crearOrden(db, { fecha: HOY, rest: 1, cliente: 'Mío' });
    crearOrden(db, { fecha: HOY, rest: 2, cliente: 'Ajeno' });

    const { ordenes } = colaDelDia(db, 1, HOY);
    expect(ordenes).toHaveLength(1);
    expect(ordenes[0].nombre_cliente).toBe('Mío');
  });

  test('devuelve listas vacías cuando no hay nada', () => {
    const db = crearDB();
    expect(colaDelDia(db, 1, HOY)).toEqual({ ordenes: [], reservas: [] });
  });
});

// ── Cola de cocina (ISS-030) ──────────────────────────────────────────────────

describe('cocinaDelDia', () => {
  test('trae pendientes y en preparación de hoy, no lo ya listo/entregado', () => {
    const db = crearDB();
    crearOrden(db, { fecha: HOY, estatus: 'pendiente',  cliente: 'Pendiente' });
    crearOrden(db, { fecha: HOY, estatus: 'preparando', cliente: 'En prep' });
    crearOrden(db, { fecha: HOY, estatus: 'entregado',  cliente: 'Ya entregada' });

    const { ordenes } = cocinaDelDia(db, 1, HOY);
    expect(ordenes.map(o => o.nombre_cliente).sort()).toEqual(['En prep', 'Pendiente']);
  });

  test('una orden "en preparación" de AYER ya no aparece en cocina (bug reportado)', () => {
    const db = crearDB();
    crearOrden(db, { fecha: AYER, estatus: 'preparando', cliente: 'Vieja, en prep' });
    crearOrden(db, { fecha: HOY,  estatus: 'preparando', cliente: 'De hoy' });

    const { ordenes } = cocinaDelDia(db, 1, HOY);
    expect(ordenes).toHaveLength(1);
    expect(ordenes[0].nombre_cliente).toBe('De hoy');
  });

  test('solo trae reservas ya disparadas a cocina (es_en_cocina), no las pendientes de confirmar', () => {
    const db = crearDB();
    crearReserva(db, { fecha: HOY, estatus: 'pendiente',  cliente: 'Aún no confirmada' });
    crearReserva(db, { fecha: HOY, estatus: 'confirmada', cliente: 'Confirmada, no en cocina aún' });
    crearReserva(db, { fecha: HOY, estatus: 'en_cocina',  cliente: 'En cocina' });

    const { reservas } = cocinaDelDia(db, 1, HOY);
    expect(reservas).toHaveLength(1);
    expect(reservas[0].nombre_cliente).toBe('En cocina');
  });

  test('una reserva "en cocina" de AYER que nunca se cerró ya no aparece (bug reportado)', () => {
    const db = crearDB();
    crearReserva(db, { fecha: AYER, estatus: 'en_cocina', cliente: 'Vieja, en cocina' });
    crearReserva(db, { fecha: HOY,  estatus: 'en_cocina', cliente: 'De hoy' });

    const { reservas } = cocinaDelDia(db, 1, HOY);
    expect(reservas).toHaveLength(1);
    expect(reservas[0].nombre_cliente).toBe('De hoy');
  });

  test('devuelve listas vacías cuando no hay nada para cocina', () => {
    const db = crearDB();
    crearOrden(db, { fecha: HOY, estatus: 'entregado' }); // ya listo, no le toca a cocina
    expect(cocinaDelDia(db, 1, HOY)).toEqual({ ordenes: [], reservas: [] });
  });
});

// ── Formatos de fecha mezclados ──────────────────────────────────────────────

describe('tolerancia a los formatos de fecha de la BD', () => {
  test("una orden guardada con timestamp completo cuenta como del mismo día", () => {
    const db = crearDB();
    crearOrden(db, { fecha: `${HOY} 13:45:02`, cliente: 'Con timestamp' });
    crearOrden(db, { fecha: HOY,               cliente: 'Solo fecha' });

    const { ordenes } = colaDelDia(db, 1, HOY);
    expect(ordenes).toHaveLength(2);
  });

  test('un timestamp de un día anterior va al cierre de caja, no a la cola', () => {
    const db = crearDB();
    crearOrden(db, { fecha: `${AYER} 20:10:00`, cliente: 'Vieja' });

    expect(colaDelDia(db, 1, HOY).ordenes).toHaveLength(0);
    expect(pedidosSinCerrar(db, 1, HOY).ordenes).toHaveLength(1);
  });
});

// ── Cierre de caja ───────────────────────────────────────────────────────────

describe('pedidosSinCerrar', () => {
  test('trae lo que quedó abierto de días anteriores, órdenes y reservas', () => {
    const db = crearDB();
    crearOrden(db,   { fecha: AYER, cliente: 'Orden vieja' });
    crearReserva(db, { fecha: AYER, cliente: 'Reserva vieja' });
    crearOrden(db,   { fecha: HOY,  cliente: 'De hoy' });

    const { ordenes, reservas } = pedidosSinCerrar(db, 1, HOY);
    expect(ordenes).toHaveLength(1);
    expect(reservas).toHaveLength(1);
    expect(ordenes[0].nombre_cliente).toBe('Orden vieja');
  });

  test('lo ya cerrado no reaparece', () => {
    const db = crearDB();
    crearOrden(db, { fecha: AYER, estatus: 'completado' });
    crearOrden(db, { fecha: AYER, estatus: 'cancelado' });

    expect(pedidosSinCerrar(db, 1, HOY).ordenes).toHaveLength(0);
  });

  test('nada de hoy se cuenta como sin cerrar', () => {
    const db = crearDB();
    crearOrden(db, { fecha: HOY });
    expect(pedidosSinCerrar(db, 1, HOY).ordenes).toHaveLength(0);
  });
});

// ── Ítems ────────────────────────────────────────────────────────────────────

describe('ítems agrupados (sin N+1)', () => {
  test('cada orden recibe solo sus propios ítems', () => {
    const db = crearDB();
    const a = crearOrden(db, { fecha: HOY, cliente: 'A' });
    const b = crearOrden(db, { fecha: HOY, cliente: 'B' });

    db.prepare(`INSERT INTO orden_carta_items (id_orden, id_plato_carta, cantidad, precio_unitario) VALUES (?,1,2,25.0)`).run(a);
    db.prepare(`INSERT INTO orden_menu_items  (id_orden, id_menu_dia, id_componente, cantidad) VALUES (?,1,1,1)`).run(a);
    db.prepare(`INSERT INTO orden_menu_items  (id_orden, id_menu_dia, id_componente, cantidad) VALUES (?,1,1,3)`).run(b);

    const { ordenes } = colaDelDia(db, 1, HOY);
    const ordenA = ordenes.find(o => o.nombre_cliente === 'A');
    const ordenB = ordenes.find(o => o.nombre_cliente === 'B');

    expect(ordenA.carta_items).toHaveLength(1);
    expect(ordenA.carta_items[0].nombre).toBe('Ceviche');
    expect(ordenA.menu_items).toHaveLength(1);
    expect(ordenA.menu_items[0].plato).toBe('Arroz con pollo');
    expect(ordenA.menu_items[0].seccion).toBe('Segundo');

    expect(ordenB.carta_items).toHaveLength(0);
    expect(ordenB.menu_items).toHaveLength(1);
    expect(ordenB.menu_items[0].cantidad).toBe(3);
  });

  // ── ISS-041 ────────────────────────────────────────────────────────────────
  // El cocinero necesita saber qué entrada va con qué segundo cuando el mismo
  // pedido trae 2 menús. El agrupamiento visual lo hace el frontend, pero solo
  // puede hacerlo si `grupo` y `menu_nombre` llegan hasta acá.
  test('los ítems de menú llegan con su grupo y el nombre del menú', () => {
    const db = crearDB();
    const id = crearOrden(db, { fecha: HOY });
    const ins = db.prepare(
      `INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad, grupo) VALUES (?,1,1,1,?)`
    );
    ins.run(id, 1);
    ins.run(id, 2);

    const items = colaDelDia(db, 1, HOY).ordenes[0].menu_items;
    expect(items).toHaveLength(2);
    expect(items.map(i => i.grupo)).toEqual([1, 2]);
    expect(items[0].menu_nombre).toBe('Menú del día');
  });

  test('los ítems viejos, sin grupo, siguen llegando con grupo null', () => {
    const db = crearDB();
    const id = crearOrden(db, { fecha: HOY });
    // Insert sin la columna `grupo`, como los pedidos anteriores a la migración
    db.prepare(`INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad) VALUES (?,1,1,1)`).run(id);

    const items = colaDelDia(db, 1, HOY).ordenes[0].menu_items;
    expect(items).toHaveLength(1);
    expect(items[0].grupo).toBeNull();
  });

  test('las reservas también traen el grupo — la orden que sale de una reserva lo hereda', () => {
    const db = crearDB();
    const id = crearReserva(db, { fecha: HOY, estatus: 'en_cocina' });
    const ins = db.prepare(
      `INSERT INTO reserva_menu_items (id_reserva, id_menu_dia, id_componente, cantidad, grupo) VALUES (?,1,1,1,?)`
    );
    ins.run(id, 1);
    ins.run(id, 2);

    const items = cocinaDelDia(db, 1, HOY).reservas[0].menu_items;
    expect(items.map(i => i.grupo)).toEqual([1, 2]);
    expect(items[0].menu_nombre).toBe('Menú del día');
  });

  test('el total no cambia por agregar grupo — el precio no depende de la instancia', () => {
    const db = crearDB();
    const id = crearOrden(db, { fecha: HOY });
    db.prepare(`INSERT INTO orden_carta_items (id_orden, id_plato_carta, cantidad, precio_unitario) VALUES (?,1,2,25.0)`).run(id);
    db.prepare(`INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad, grupo) VALUES (?,1,1,1,1)`).run(id);
    db.prepare(`INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad, grupo) VALUES (?,1,1,1,2)`).run(id);

    expect(colaDelDia(db, 1, HOY).ordenes[0].total).toBe(50);
  });

  test('el total sale de los ítems de carta', () => {
    const db = crearDB();
    const id = crearOrden(db, { fecha: HOY });
    db.prepare(`INSERT INTO orden_carta_items (id_orden, id_plato_carta, cantidad, precio_unitario) VALUES (?,1,2,25.0)`).run(id);

    expect(colaDelDia(db, 1, HOY).ordenes[0].total).toBe(50);
  });

  test('una orden sin ítems trae listas vacías, no undefined', () => {
    const db = crearDB();
    crearOrden(db, { fecha: HOY });

    const orden = colaDelDia(db, 1, HOY).ordenes[0];
    expect(orden.carta_items).toEqual([]);
    expect(orden.menu_items).toEqual([]);
    expect(orden.total).toBe(0);
  });
});

describe('agruparPorPadre', () => {
  test('agrupa y quita la columna del padre de cada fila', () => {
    const mapa = agruparPorPadre(
      [{ id_orden: 1, nombre: 'a' }, { id_orden: 1, nombre: 'b' }, { id_orden: 2, nombre: 'c' }],
      'id_orden'
    );
    expect(mapa.get(1)).toEqual([{ nombre: 'a' }, { nombre: 'b' }]);
    expect(mapa.get(2)).toEqual([{ nombre: 'c' }]);
    expect(mapa.has(3)).toBe(false);
  });

  test('sin filas devuelve un mapa vacío', () => {
    expect(agruparPorPadre([], 'id_orden').size).toBe(0);
  });
});
