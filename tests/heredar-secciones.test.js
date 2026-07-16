/**
 * Pruebas para POST /api/menu/menus-dia con heredar_secciones (flujo v2)
 * Verifican: herencia de secciones (con flag requerido, SIN platos) desde el
 * menú más reciente del restaurante, scope por restaurante, casos sin fuente.
 */

const Database = require('better-sqlite3');

function crearDB() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE restaurantes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL);
    INSERT INTO restaurantes (nombre) VALUES ('Rest A'), ('Rest B');

    CREATE TABLE secciones_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL
    );
    INSERT INTO secciones_menu (nombre, id_restaurante) VALUES
      ('Entrada', 1), ('Segundo', 1), ('Refresco', 1), ('Fondo', 2);

    CREATE TABLE platos_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL
    );
    INSERT INTO platos_menu (nombre, id_restaurante) VALUES
      ('Sopa criolla', 1), ('Lomo saltado', 1);

    CREATE TABLE menus_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL DEFAULT 'Menú del día',
      elegible INTEGER NOT NULL DEFAULT 1,
      dia TEXT NOT NULL,
      precio REAL NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      id_plato_portada INTEGER DEFAULT NULL,
      id_restaurante INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE menu_secciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_menu_dia INTEGER NOT NULL,
      id_seccion_menu INTEGER NOT NULL,
      requerido INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE componentes_menu_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_menu_dia INTEGER NOT NULL,
      dia TEXT NOT NULL,
      id_seccion_menu INTEGER NOT NULL,
      id_plato_menu INTEGER NOT NULL,
      id_restaurante INTEGER NOT NULL
    );
  `);
  return db;
}

// Replica la lógica del endpoint POST /menus-dia con heredar_secciones
function crearMenuDia(db, restaurantId, body) {
  const { nombre, elegible, dia, precio, heredar_secciones } = body;

  if (!dia) return { error: 'La fecha del menú es requerida', status: 400 };
  if (!precio || isNaN(precio)) return { error: 'El precio es requerido', status: 400 };

  const resultado = db.transaction(() => {
    const fuente = heredar_secciones
      ? db.prepare(`
          SELECT id FROM menus_dia
          WHERE id_restaurante = ?
          ORDER BY dia DESC, created_at DESC, id DESC
          LIMIT 1
        `).get(restaurantId)
      : null;

    const { lastInsertRowid } = db.prepare(`
      INSERT INTO menus_dia (nombre, elegible, dia, precio, id_restaurante)
      VALUES (?, ?, ?, ?, ?)
    `).run(nombre?.trim() || 'Menú del día', elegible ? 1 : 0, dia, parseFloat(precio), restaurantId);

    let heredadas = 0;
    if (fuente) {
      const secciones = db.prepare(`
        SELECT id_seccion_menu, requerido FROM menu_secciones WHERE id_menu_dia = ?
      `).all(fuente.id);
      const ins = db.prepare(`
        INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido) VALUES (?, ?, ?)
      `);
      for (const s of secciones) { ins.run(lastInsertRowid, s.id_seccion_menu, s.requerido); heredadas++; }
    }
    return { id: lastInsertRowid, heredadas };
  })();

  return { id: resultado.id, secciones_heredadas: resultado.heredadas, status: 201 };
}

// ── Setup común ─────────────────────────────────────────────────

// Menú "de ayer" con Entrada (obligatoria) + Segundo (opcional) y 2 platos asignados
function seedMenuAnterior(db, dia = '2026-07-01', restaurante = 1) {
  const { lastInsertRowid: menuId } = db.prepare(
    `INSERT INTO menus_dia (nombre, elegible, dia, precio, id_restaurante) VALUES ('Menú de ayer', 1, ?, 13, ?)`
  ).run(dia, restaurante);
  db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido) VALUES (?, 1, 1)`).run(menuId);
  db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido) VALUES (?, 2, 0)`).run(menuId);
  db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, ?, 1, 1, ?)`).run(menuId, dia, restaurante);
  db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, ?, 2, 2, ?)`).run(menuId, dia, restaurante);
  return menuId;
}

// ── Tests ───────────────────────────────────────────────────────

test('hereda las secciones (con flag requerido) del menú más reciente', () => {
  const db = crearDB();
  seedMenuAnterior(db);

  const res = crearMenuDia(db, 1, { nombre: 'Menú de hoy', precio: 14, dia: '2026-07-02', heredar_secciones: true });

  expect(res.status).toBe(201);
  expect(res.secciones_heredadas).toBe(2);

  const secs = db.prepare(`SELECT * FROM menu_secciones WHERE id_menu_dia = ?`).all(res.id);
  expect(secs).toHaveLength(2);
  expect(secs.find(s => s.id_seccion_menu === 1).requerido).toBe(1);
  expect(secs.find(s => s.id_seccion_menu === 2).requerido).toBe(0);
});

test('los platos NO se heredan — el menú nuevo nace sin componentes', () => {
  const db = crearDB();
  seedMenuAnterior(db);

  const res = crearMenuDia(db, 1, { precio: 14, dia: '2026-07-02', heredar_secciones: true });

  const comps = db.prepare(`SELECT * FROM componentes_menu_dia WHERE id_menu_dia = ?`).all(res.id);
  expect(comps).toHaveLength(0);
});

test('sin heredar_secciones el menú se crea vacío (comportamiento clásico)', () => {
  const db = crearDB();
  seedMenuAnterior(db);

  const res = crearMenuDia(db, 1, { precio: 14, dia: '2026-07-02' });

  expect(res.status).toBe(201);
  expect(res.secciones_heredadas).toBe(0);
  const secs = db.prepare(`SELECT * FROM menu_secciones WHERE id_menu_dia = ?`).all(res.id);
  expect(secs).toHaveLength(0);
});

test('sin menús previos crea el menú sin secciones y sin error', () => {
  const db = crearDB();

  const res = crearMenuDia(db, 1, { precio: 14, dia: '2026-07-02', heredar_secciones: true });

  expect(res.status).toBe(201);
  expect(res.secciones_heredadas).toBe(0);
});

test('hereda del menú MÁS RECIENTE cuando hay varios (por fecha)', () => {
  const db = crearDB();
  seedMenuAnterior(db, '2026-06-20');                 // viejo: Entrada + Segundo
  const { lastInsertRowid: reciente } = db.prepare(
    `INSERT INTO menus_dia (nombre, dia, precio, id_restaurante) VALUES ('Reciente', '2026-07-01', 13, 1)`
  ).run();
  db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido) VALUES (?, 3, 1)`).run(reciente); // solo Refresco

  const res = crearMenuDia(db, 1, { precio: 14, dia: '2026-07-02', heredar_secciones: true });

  expect(res.secciones_heredadas).toBe(1);
  const secs = db.prepare(`SELECT * FROM menu_secciones WHERE id_menu_dia = ?`).all(res.id);
  expect(secs).toHaveLength(1);
  expect(secs[0].id_seccion_menu).toBe(3);
});

test('no hereda secciones de menús de otro restaurante', () => {
  const db = crearDB();
  seedMenuAnterior(db, '2026-07-01', 2);   // solo el restaurante 2 tiene menús

  const res = crearMenuDia(db, 1, { precio: 14, dia: '2026-07-02', heredar_secciones: true });

  expect(res.status).toBe(201);
  expect(res.secciones_heredadas).toBe(0);
});

test('el menú fuente queda intacto tras la herencia', () => {
  const db = crearDB();
  const fuenteId = seedMenuAnterior(db);

  crearMenuDia(db, 1, { precio: 14, dia: '2026-07-02', heredar_secciones: true });

  const secsFuente = db.prepare(`SELECT * FROM menu_secciones WHERE id_menu_dia = ?`).all(fuenteId);
  expect(secsFuente).toHaveLength(2);
  const compsFuente = db.prepare(`SELECT * FROM componentes_menu_dia WHERE id_menu_dia = ?`).all(fuenteId);
  expect(compsFuente).toHaveLength(2);
});

test('valida fecha y precio requeridos', () => {
  const db = crearDB();
  expect(crearMenuDia(db, 1, { precio: 14 }).status).toBe(400);
  expect(crearMenuDia(db, 1, { dia: '2026-07-02' }).status).toBe(400);
  expect(crearMenuDia(db, 1, { dia: '2026-07-02', precio: 'abc' }).status).toBe(400);
});
