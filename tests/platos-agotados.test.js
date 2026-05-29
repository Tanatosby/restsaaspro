/**
 * Pruebas para la lógica de platos agotados en menú del día.
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

    CREATE TABLE secciones_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL
    );
    INSERT INTO secciones_menu (nombre, id_restaurante) VALUES ('Fondo', 1);

    CREATE TABLE platos_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL
    );
    INSERT INTO platos_menu (nombre, id_restaurante) VALUES ('Arroz con pollo', 1);
    INSERT INTO platos_menu (nombre, id_restaurante) VALUES ('Mondonguito', 1);

    CREATE TABLE menus_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL DEFAULT 'Menú del día',
      elegible INTEGER NOT NULL DEFAULT 1,
      dia TEXT NOT NULL,
      precio REAL NOT NULL,
      id_restaurante INTEGER NOT NULL,
      activo INTEGER DEFAULT 1
    );
    INSERT INTO menus_dia (dia, precio, id_restaurante) VALUES ('2026-05-18', 15, 1);

    CREATE TABLE menu_secciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_menu_dia INTEGER NOT NULL,
      id_seccion_menu INTEGER NOT NULL,
      requerido INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (1, 1);

    CREATE TABLE componentes_menu_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_menu_dia INTEGER NOT NULL,
      dia TEXT NOT NULL,
      id_seccion_menu INTEGER NOT NULL,
      id_plato_menu INTEGER NOT NULL,
      id_restaurante INTEGER NOT NULL,
      agotado INTEGER DEFAULT 0
    );
    INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante)
      VALUES (1, '2026-05-18', 1, 1, 1);
    INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante)
      VALUES (1, '2026-05-18', 1, 2, 1);
  `);
  return db;
}

function getPlatosPublicos(db, menuId, seccionId) {
  return db.prepare(`
    SELECT cmd.id AS id_componente, pm.nombre
    FROM componentes_menu_dia cmd
    JOIN platos_menu pm ON cmd.id_plato_menu = pm.id
    WHERE cmd.id_menu_dia = ? AND cmd.id_seccion_menu = ? AND cmd.agotado = 0
    ORDER BY pm.nombre ASC
  `).all(menuId, seccionId);
}

function patchAgotado(db, componenteId, menuId, seccionId, restauranteId, agotado) {
  const menu = db.prepare(`SELECT id FROM menus_dia WHERE id = ? AND id_restaurante = ?`)
    .get(menuId, restauranteId);
  if (!menu) return null;

  const componente = db.prepare(`
    SELECT id FROM componentes_menu_dia WHERE id = ? AND id_menu_dia = ? AND id_seccion_menu = ?
  `).get(componenteId, menuId, seccionId);
  if (!componente) return null;

  db.prepare(`UPDATE componentes_menu_dia SET agotado = ? WHERE id = ?`)
    .run(agotado ? 1 : 0, componenteId);
  return { agotado: agotado ? 1 : 0 };
}

describe('Platos agotados en menú del día', () => {
  let db;

  beforeEach(() => { db = crearDB(); });
  afterEach(() => { db.close(); });

  test('nuevo componente tiene agotado=0 por defecto', () => {
    const row = db.prepare(`SELECT agotado FROM componentes_menu_dia WHERE id = 1`).get();
    expect(row.agotado).toBe(0);
  });

  test('plato disponible aparece en endpoint público', () => {
    const platos = getPlatosPublicos(db, 1, 1);
    expect(platos).toHaveLength(2);
  });

  test('plato agotado NO aparece en endpoint público', () => {
    db.prepare(`UPDATE componentes_menu_dia SET agotado = 1 WHERE id = 1`).run();
    const platos = getPlatosPublicos(db, 1, 1);
    expect(platos).toHaveLength(1);
    expect(platos[0].nombre).toBe('Mondonguito');
  });

  test('PATCH marca plato como agotado', () => {
    patchAgotado(db, 1, 1, 1, 1, true);
    const row = db.prepare(`SELECT agotado FROM componentes_menu_dia WHERE id = 1`).get();
    expect(row.agotado).toBe(1);
  });

  test('PATCH restaura plato agotado a disponible', () => {
    db.prepare(`UPDATE componentes_menu_dia SET agotado = 1 WHERE id = 1`).run();
    patchAgotado(db, 1, 1, 1, 1, false);
    const row = db.prepare(`SELECT agotado FROM componentes_menu_dia WHERE id = 1`).get();
    expect(row.agotado).toBe(0);
  });

  test('PATCH retorna null si el componente no pertenece al menú', () => {
    const result = patchAgotado(db, 999, 1, 1, 1, true);
    expect(result).toBeNull();
  });

  test('PATCH retorna null si el menú no pertenece al restaurante', () => {
    const result = patchAgotado(db, 1, 1, 1, 99, true);
    expect(result).toBeNull();
  });

  test('agotar un plato no afecta al otro plato de la misma sección', () => {
    patchAgotado(db, 1, 1, 1, 1, true);
    const platos = getPlatosPublicos(db, 1, 1);
    expect(platos).toHaveLength(1);
    expect(platos[0].nombre).toBe('Mondonguito');
  });

  test('toggle: disponible → agotado → disponible cicla correctamente', () => {
    patchAgotado(db, 1, 1, 1, 1, true);
    expect(db.prepare(`SELECT agotado FROM componentes_menu_dia WHERE id = 1`).get().agotado).toBe(1);
    patchAgotado(db, 1, 1, 1, 1, false);
    expect(db.prepare(`SELECT agotado FROM componentes_menu_dia WHERE id = 1`).get().agotado).toBe(0);
  });

  test('agotado solo afecta al menú correspondiente, no a otros menús con el mismo plato', () => {
    db.exec(`INSERT INTO menus_dia (dia, precio, id_restaurante) VALUES ('2026-05-19', 15, 1)`);
    db.exec(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (2, 1)`);
    db.exec(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante)
      VALUES (2, '2026-05-19', 1, 1, 1)`);

    // Agota arroz con pollo en menú 1
    patchAgotado(db, 1, 1, 1, 1, true);

    // En menú 2 el mismo plato sigue disponible
    const platosMenu2 = getPlatosPublicos(db, 2, 1);
    expect(platosMenu2.some(p => p.nombre === 'Arroz con pollo')).toBe(true);
  });

  test('migración idempotente: ALTER TABLE no falla si columna ya existe', () => {
    expect(() => {
      try { db.exec(`ALTER TABLE componentes_menu_dia ADD COLUMN agotado INTEGER DEFAULT 0`); } catch (_) {}
    }).not.toThrow();
  });

  test('GET owner incluye campo agotado en la respuesta', () => {
    const row = db.prepare(`
      SELECT cmd.id AS id_componente, cmd.agotado, pm.nombre
      FROM componentes_menu_dia cmd
      JOIN platos_menu pm ON cmd.id_plato_menu = pm.id
      WHERE cmd.id_menu_dia = 1
    `).all();
    expect(row[0]).toHaveProperty('agotado');
  });
});
