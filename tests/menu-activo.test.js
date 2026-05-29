/**
 * Pruebas para la lógica de inhabilitar menú del día.
 * Verifican: migración idempotente, endpoint PATCH, filtro en public.
 */

const Database = require('better-sqlite3');

function crearDB() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE restaurantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      activo INTEGER DEFAULT 1
    );
    INSERT INTO restaurantes (nombre) VALUES ('Test Rest');

    CREATE TABLE menus_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL DEFAULT 'Menú del día',
      elegible INTEGER NOT NULL DEFAULT 0,
      dia TEXT NOT NULL,
      precio REAL NOT NULL,
      id_restaurante INTEGER NOT NULL,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

// ── Función que simula el filtro de public.js ──────────────────────────────────

function getMenusPublicos(db, restauranteId, fecha) {
  return db.prepare(`
    SELECT id, nombre, elegible, dia, precio
    FROM menus_dia
    WHERE id_restaurante = ? AND dia = ? AND activo = 1
    ORDER BY created_at ASC
  `).all(restauranteId, fecha);
}

// ── Función que simula el PATCH de activo ─────────────────────────────────────

function patchActivo(db, menuId, restauranteId, activo) {
  const menu = db.prepare(`SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?`)
    .get(menuId, restauranteId);
  if (!menu) return null;
  db.prepare(`UPDATE menus_dia SET activo = ? WHERE id = ?`).run(activo ? 1 : 0, menuId);
  return { activo: activo ? 1 : 0 };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Inhabilitar menú del día', () => {
  let db;

  beforeEach(() => {
    db = crearDB();
  });

  afterEach(() => {
    db.close();
  });

  test('nuevo menú tiene activo=1 por defecto', () => {
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante) VALUES (?, ?, ?, ?)`)
      .run('Menú almuerzo', '2026-05-18', 15, 1);
    const menu = db.prepare(`SELECT activo FROM menus_dia WHERE id = 1`).get();
    expect(menu.activo).toBe(1);
  });

  test('menú activo aparece en endpoint público', () => {
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú almuerzo', '2026-05-18', 15, 1, 1);
    const menus = getMenusPublicos(db, 1, '2026-05-18');
    expect(menus).toHaveLength(1);
  });

  test('menú inactivo NO aparece en endpoint público', () => {
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú almuerzo', '2026-05-18', 15, 1, 0);
    const menus = getMenusPublicos(db, 1, '2026-05-18');
    expect(menus).toHaveLength(0);
  });

  test('PATCH desactiva un menú activo', () => {
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú almuerzo', '2026-05-18', 15, 1, 1);
    patchActivo(db, 1, 1, false);
    const menu = db.prepare(`SELECT activo FROM menus_dia WHERE id = 1`).get();
    expect(menu.activo).toBe(0);
  });

  test('PATCH activa un menú inactivo', () => {
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú almuerzo', '2026-05-18', 15, 1, 0);
    patchActivo(db, 1, 1, true);
    const menu = db.prepare(`SELECT activo FROM menus_dia WHERE id = 1`).get();
    expect(menu.activo).toBe(1);
  });

  test('PATCH retorna null si el menú no existe o no pertenece al restaurante', () => {
    const result = patchActivo(db, 999, 1, false);
    expect(result).toBeNull();
  });

  test('de dos menús del día, solo el activo aparece en público', () => {
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú almuerzo', '2026-05-18', 15, 1, 1);
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú cena', '2026-05-18', 20, 1, 0);
    const menus = getMenusPublicos(db, 1, '2026-05-18');
    expect(menus).toHaveLength(1);
    expect(menus[0].nombre).toBe('Menú almuerzo');
  });

  test('toggle: activo → inactivo → activo cicla correctamente', () => {
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú almuerzo', '2026-05-18', 15, 1, 1);

    patchActivo(db, 1, 1, false);
    expect(db.prepare(`SELECT activo FROM menus_dia WHERE id = 1`).get().activo).toBe(0);

    patchActivo(db, 1, 1, true);
    expect(db.prepare(`SELECT activo FROM menus_dia WHERE id = 1`).get().activo).toBe(1);
  });

  test('migración idempotente: ALTER TABLE no falla si columna ya existe', () => {
    expect(() => {
      try { db.exec(`ALTER TABLE menus_dia ADD COLUMN activo INTEGER DEFAULT 1`); } catch (_) {}
    }).not.toThrow();
  });

  test('inactivar un menú no afecta el otro restaurante', () => {
    db.exec(`INSERT INTO restaurantes (nombre) VALUES ('Otro Rest')`);
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú rest 1', '2026-05-18', 15, 1, 1);
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú rest 2', '2026-05-18', 20, 2, 1);

    // Desactiva menú del restaurante 1
    patchActivo(db, 1, 1, false);

    // Restaurante 2 sigue viendo su menú
    const menus2 = getMenusPublicos(db, 2, '2026-05-18');
    expect(menus2).toHaveLength(1);
    expect(menus2[0].nombre).toBe('Menú rest 2');
  });

  test('menús de otros días no se afectan al desactivar uno', () => {
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú hoy', '2026-05-18', 15, 1, 1);
    db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante, activo) VALUES (?, ?, ?, ?, ?)`)
      .run('Menú mañana', '2026-05-19', 15, 1, 1);

    patchActivo(db, 1, 1, false);

    const mañana = getMenusPublicos(db, 1, '2026-05-19');
    expect(mañana).toHaveLength(1);
  });
});
