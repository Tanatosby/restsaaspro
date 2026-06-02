/**
 * Pruebas para "Editar platos" — PATCH /api/menu/platos-menu/:id y /platos-carta/:id.
 * Estilo del proyecto: BD SQLite en memoria, se verifica la lógica SQL (UPDATE con
 * scope por restaurante) y las validaciones del handler como funciones puras.
 */

const Database = require('better-sqlite3');

function crearDB() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE restaurantes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL);
    INSERT INTO restaurantes (nombre) VALUES ('Resto 1'), ('Resto 2');

    CREATE TABLE platos_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL, descripcion TEXT, url_foto TEXT,
      id_restaurante INTEGER NOT NULL
    );
    CREATE TABLE categorias_carta (
      id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, id_restaurante INTEGER NOT NULL
    );
    CREATE TABLE platos_carta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL, descripcion TEXT, precio REAL NOT NULL, url_foto TEXT,
      activo INTEGER DEFAULT 1, id_categoria INTEGER NOT NULL, id_restaurante INTEGER NOT NULL
    );

    INSERT INTO platos_menu (nombre, descripcion, id_restaurante) VALUES ('Arroz', 'viejo', 1);
    INSERT INTO platos_menu (nombre, id_restaurante) VALUES ('Ajeno', 2);

    INSERT INTO categorias_carta (nombre, id_restaurante) VALUES ('Carnes', 1), ('Postres', 1), ('OtraResto', 2);
    INSERT INTO platos_carta (nombre, descripcion, precio, id_categoria, id_restaurante)
      VALUES ('Lomo', 'rico', 25.0, 1, 1);
    INSERT INTO platos_carta (nombre, precio, id_categoria, id_restaurante)
      VALUES ('Ajeno', 9.0, 3, 2);
  `);
  return db;
}

// ── Validaciones del handler (réplica de la lógica de routes/menu.js) ──
function validarMenu({ nombre }) {
  if (!nombre?.trim()) return 'El nombre del plato es requerido';
  return null;
}
function validarCarta({ nombre, precio, id_categoria }) {
  if (!nombre?.trim()) return 'El nombre del plato es requerido';
  if (!precio || isNaN(precio)) return 'El precio es requerido';
  if (!id_categoria) return 'La categoría es requerida';
  return null;
}

describe('PATCH platos-menu — validación', () => {
  test('rechaza nombre vacío', () => {
    expect(validarMenu({ nombre: '   ' })).toBe('El nombre del plato es requerido');
    expect(validarMenu({})).toBe('El nombre del plato es requerido');
  });
  test('acepta nombre válido', () => {
    expect(validarMenu({ nombre: 'Arroz con pollo' })).toBeNull();
  });
});

describe('PATCH platos-menu — UPDATE con scope por restaurante', () => {
  let db;
  beforeEach(() => { db = crearDB(); });
  afterEach(() => db.close());

  const guard = (id, resto) =>
    db.prepare('SELECT id FROM platos_menu WHERE id = ? AND id_restaurante = ?').get(id, resto);

  test('actualiza nombre y descripción del plato propio', () => {
    expect(guard(1, 1)).toBeTruthy();
    db.prepare('UPDATE platos_menu SET nombre = ?, descripcion = ? WHERE id = ?')
      .run('Arroz nuevo', 'fresco', 1);
    const p = db.prepare('SELECT nombre, descripcion FROM platos_menu WHERE id = 1').get();
    expect(p.nombre).toBe('Arroz nuevo');
    expect(p.descripcion).toBe('fresco');
  });

  test('descripción vacía se guarda como null', () => {
    const desc = ''.trim() || null;
    db.prepare('UPDATE platos_menu SET nombre = ?, descripcion = ? WHERE id = ?').run('X', desc, 1);
    expect(db.prepare('SELECT descripcion FROM platos_menu WHERE id = 1').get().descripcion).toBeNull();
  });

  test('no encuentra (404) un plato de otro restaurante', () => {
    expect(guard(2, 1)).toBeUndefined(); // plato 2 es del resto 2
  });
});

describe('PATCH platos-carta — validación', () => {
  test('rechaza nombre/precio/categoría faltantes', () => {
    expect(validarCarta({ nombre: '', precio: 10, id_categoria: 1 })).toBe('El nombre del plato es requerido');
    expect(validarCarta({ nombre: 'X', precio: '', id_categoria: 1 })).toBe('El precio es requerido');
    expect(validarCarta({ nombre: 'X', precio: 'abc', id_categoria: 1 })).toBe('El precio es requerido');
    expect(validarCarta({ nombre: 'X', precio: 10, id_categoria: '' })).toBe('La categoría es requerida');
  });
  test('acepta payload completo', () => {
    expect(validarCarta({ nombre: 'Lomo', precio: 30, id_categoria: 2 })).toBeNull();
  });
});

describe('PATCH platos-carta — UPDATE con scope y categoría propia', () => {
  let db;
  beforeEach(() => { db = crearDB(); });
  afterEach(() => db.close());

  const guardPlato = (id, resto) =>
    db.prepare('SELECT id FROM platos_carta WHERE id = ? AND id_restaurante = ?').get(id, resto);
  const guardCat = (id, resto) =>
    db.prepare('SELECT id FROM categorias_carta WHERE id = ? AND id_restaurante = ?').get(id, resto);

  test('actualiza todos los campos del plato propio', () => {
    expect(guardPlato(1, 1)).toBeTruthy();
    expect(guardCat(2, 1)).toBeTruthy(); // mover a Postres
    db.prepare('UPDATE platos_carta SET nombre = ?, descripcion = ?, precio = ?, id_categoria = ? WHERE id = ?')
      .run('Lomo saltado', 'con papas', parseFloat('32.50'), 2, 1);
    const p = db.prepare('SELECT nombre, descripcion, precio, id_categoria FROM platos_carta WHERE id = 1').get();
    expect(p.nombre).toBe('Lomo saltado');
    expect(p.descripcion).toBe('con papas');
    expect(p.precio).toBeCloseTo(32.5);
    expect(p.id_categoria).toBe(2);
  });

  test('rechaza categoría de otro restaurante (no la encuentra)', () => {
    expect(guardCat(3, 1)).toBeUndefined(); // categoría 3 es del resto 2
  });

  test('no encuentra (404) un plato de otro restaurante', () => {
    expect(guardPlato(2, 1)).toBeUndefined();
  });
});
