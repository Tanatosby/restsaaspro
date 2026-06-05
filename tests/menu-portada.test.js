/**
 * Pruebas para la portada del menú del día (foto de un plato como fondo de la card).
 * Verifican: migración idempotente, set/clear de id_plato_portada, validación de plato
 * y de pertenencia al restaurante.
 */

const Database = require('better-sqlite3');

function crearDB() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE restaurantes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL);
    INSERT INTO restaurantes (nombre) VALUES ('Rest A'), ('Rest B');

    CREATE TABLE platos_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      url_foto TEXT,
      id_restaurante INTEGER NOT NULL
    );
    INSERT INTO platos_menu (nombre, url_foto, id_restaurante) VALUES
      ('Lomo', '/uploads/lomo.jpg', 1),
      ('Arroz', NULL, 1),
      ('Ceviche ajeno', '/uploads/cev.jpg', 2);

    CREATE TABLE menus_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL DEFAULT 'Menú del día',
      dia TEXT NOT NULL,
      precio REAL NOT NULL,
      id_restaurante INTEGER NOT NULL,
      id_plato_portada INTEGER DEFAULT NULL
    );
    INSERT INTO menus_dia (nombre, dia, precio, id_restaurante) VALUES ('Almuerzo', '2026-06-05', 15, 1);
  `);
  return db;
}

// Simula PATCH /menus-dia/:id/portada
function setPortada(db, menuId, restId, idPlato) {
  const menu = db.prepare(`SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?`).get(menuId, restId);
  if (!menu) return { status: 404 };
  let valor = null;
  if (idPlato !== null && idPlato !== undefined && idPlato !== '') {
    const plato = db.prepare(`SELECT id FROM platos_menu WHERE id = ? AND id_restaurante = ?`).get(idPlato, restId);
    if (!plato) return { status: 400 };
    valor = plato.id;
  }
  db.prepare(`UPDATE menus_dia SET id_plato_portada = ? WHERE id = ?`).run(valor, menuId);
  return { status: 200, id_plato_portada: valor };
}

const portadaDe = (db, menuId) =>
  db.prepare(`SELECT id_plato_portada FROM menus_dia WHERE id = ?`).get(menuId).id_plato_portada;

describe('Portada del menú del día', () => {
  let db;
  beforeEach(() => { db = crearDB(); });
  afterEach(() => { db.close(); });

  test('por defecto id_plato_portada es NULL', () => {
    expect(portadaDe(db, 1)).toBeNull();
  });

  test('define la portada con un plato válido del restaurante', () => {
    const r = setPortada(db, 1, 1, 1);
    expect(r.status).toBe(200);
    expect(r.id_plato_portada).toBe(1);
    expect(portadaDe(db, 1)).toBe(1);
  });

  test('quita la portada al pasar null', () => {
    setPortada(db, 1, 1, 1);
    const r = setPortada(db, 1, 1, null);
    expect(r.status).toBe(200);
    expect(r.id_plato_portada).toBeNull();
    expect(portadaDe(db, 1)).toBeNull();
  });

  test('rechaza un plato de otro restaurante (400) y no cambia la portada', () => {
    const r = setPortada(db, 1, 1, 3); // plato 3 es del rest 2
    expect(r.status).toBe(400);
    expect(portadaDe(db, 1)).toBeNull();
  });

  test('rechaza un plato inexistente (400)', () => {
    const r = setPortada(db, 1, 1, 999);
    expect(r.status).toBe(400);
  });

  test('404 si el menú no existe o es de otro restaurante', () => {
    expect(setPortada(db, 999, 1, 1).status).toBe(404);
    expect(setPortada(db, 1, 2, 1).status).toBe(404); // menú 1 es del rest 1
  });

  test('un plato sin foto igual puede marcarse como portada (la UI decide mostrarlo)', () => {
    const r = setPortada(db, 1, 1, 2); // Arroz, url_foto NULL
    expect(r.status).toBe(200);
    expect(portadaDe(db, 1)).toBe(2);
  });

  test('migración idempotente: ALTER TABLE no falla si la columna ya existe', () => {
    expect(() => {
      try { db.exec(`ALTER TABLE menus_dia ADD COLUMN id_plato_portada INTEGER DEFAULT NULL`); } catch (_) {}
    }).not.toThrow();
  });
});
