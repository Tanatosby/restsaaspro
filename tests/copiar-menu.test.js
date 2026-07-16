/**
 * Pruebas para POST /api/menu/menus-dia/:id/copiar
 * Verifican: copia completa (secciones + componentes), fecha inválida,
 * menú de otro restaurante (404), múltiples menús en la fecha destino.
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
      ('Entrada', 1), ('Segundo', 1);

    CREATE TABLE platos_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL
    );
    INSERT INTO platos_menu (nombre, id_restaurante) VALUES
      ('Sopa criolla', 1), ('Lomo saltado', 1), ('Arroz con pollo', 1);

    CREATE TABLE menus_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL DEFAULT 'Menú del día',
      elegible INTEGER NOT NULL DEFAULT 1,
      dia TEXT NOT NULL,
      precio REAL NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      id_plato_portada INTEGER DEFAULT NULL,
      id_restaurante INTEGER NOT NULL
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

// Replica la lógica del endpoint POST /menus-dia/:id/copiar
function copiarMenu(db, menuId, restaurantId, diaDest) {
  if (!diaDest || !/^\d{4}-\d{2}-\d{2}$/.test(diaDest))
    return { error: 'Fecha inválida (YYYY-MM-DD)', status: 400 };

  const fuente = db.prepare(`
    SELECT id, nombre, elegible, precio, activo, id_plato_portada
    FROM menus_dia WHERE id = ? AND id_restaurante = ?
  `).get(menuId, restaurantId);
  if (!fuente) return { error: 'Menú no encontrado', status: 404 };

  const secciones = db.prepare(`
    SELECT id_seccion_menu, requerido FROM menu_secciones WHERE id_menu_dia = ?
  `).all(fuente.id);

  const nuevoId = db.transaction(() => {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO menus_dia (nombre, elegible, dia, precio, activo, id_plato_portada, id_restaurante)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fuente.nombre, fuente.elegible, diaDest, fuente.precio, fuente.activo,
           fuente.id_plato_portada, restaurantId);

    const insSeccion    = db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido) VALUES (?, ?, ?)`);
    const insComponente = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, ?, ?, ?, ?)`);

    for (const sec of secciones) {
      insSeccion.run(lastInsertRowid, sec.id_seccion_menu, sec.requerido);
      const componentes = db.prepare(`
        SELECT id_plato_menu FROM componentes_menu_dia
        WHERE id_menu_dia = ? AND id_seccion_menu = ?
      `).all(fuente.id, sec.id_seccion_menu);
      for (const c of componentes)
        insComponente.run(lastInsertRowid, diaDest, sec.id_seccion_menu, c.id_plato_menu, restaurantId);
    }
    return lastInsertRowid;
  })();

  return { id: nuevoId, dia: diaDest, nombre: fuente.nombre, status: 201 };
}

// ── Setup común ─────────────────────────────────────────────────

function seedMenuConSecciones(db) {
  const { lastInsertRowid: menuId } = db.prepare(
    `INSERT INTO menus_dia (nombre, elegible, dia, precio, activo, id_restaurante)
     VALUES ('Menú del día', 1, '2026-06-15', 15, 1, 1)`
  ).run();
  // Sección Entrada (requerida) con 2 platos
  db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido) VALUES (?, 1, 1)`).run(menuId);
  db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-06-15', 1, 1, 1)`).run(menuId);
  // Sección Segundo (opcional) con 2 platos
  db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido) VALUES (?, 2, 0)`).run(menuId);
  db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-06-15', 2, 2, 1)`).run(menuId);
  db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-06-15', 2, 3, 1)`).run(menuId);
  return menuId;
}

// ── Tests ───────────────────────────────────────────────────────

test('copia el menú a otra fecha con secciones y componentes intactos', () => {
  const db     = crearDB();
  const menuId = seedMenuConSecciones(db);

  const res = copiarMenu(db, menuId, 1, '2026-06-16');

  expect(res.status).toBe(201);
  expect(res.dia).toBe('2026-06-16');
  expect(res.nombre).toBe('Menú del día');

  const nuevo = db.prepare(`SELECT * FROM menus_dia WHERE id = ?`).get(res.id);
  expect(nuevo.dia).toBe('2026-06-16');
  expect(nuevo.precio).toBe(15);
  expect(nuevo.elegible).toBe(1);

  const secciones = db.prepare(`SELECT * FROM menu_secciones WHERE id_menu_dia = ?`).all(res.id);
  expect(secciones).toHaveLength(2);
  expect(secciones.find(s => s.id_seccion_menu === 1).requerido).toBe(1);
  expect(secciones.find(s => s.id_seccion_menu === 2).requerido).toBe(0);

  const componentes = db.prepare(`SELECT * FROM componentes_menu_dia WHERE id_menu_dia = ?`).all(res.id);
  expect(componentes).toHaveLength(3);
  componentes.forEach(c => expect(c.dia).toBe('2026-06-16'));
});

test('el menú original no se modifica tras la copia', () => {
  const db     = crearDB();
  const menuId = seedMenuConSecciones(db);

  copiarMenu(db, menuId, 1, '2026-06-17');

  const original = db.prepare(`SELECT * FROM menus_dia WHERE id = ?`).get(menuId);
  expect(original.dia).toBe('2026-06-15');
  const secsOriginales = db.prepare(`SELECT * FROM menu_secciones WHERE id_menu_dia = ?`).all(menuId);
  expect(secsOriginales).toHaveLength(2);
  const compsOriginales = db.prepare(`SELECT * FROM componentes_menu_dia WHERE id_menu_dia = ?`).all(menuId);
  expect(compsOriginales).toHaveLength(3);
});

test('copia incluye id_plato_portada si estaba definido', () => {
  const db     = crearDB();
  const menuId = seedMenuConSecciones(db);
  db.prepare(`UPDATE menus_dia SET id_plato_portada = 1 WHERE id = ?`).run(menuId);

  const res = copiarMenu(db, menuId, 1, '2026-06-16');
  const nuevo = db.prepare(`SELECT id_plato_portada FROM menus_dia WHERE id = ?`).get(res.id);
  expect(nuevo.id_plato_portada).toBe(1);
});

test('permite copiar a una fecha que ya tiene otros menús', () => {
  const db     = crearDB();
  const menuId = seedMenuConSecciones(db);
  db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante) VALUES ('Otro menú', '2026-06-16', 20, 1)`).run();

  const res = copiarMenu(db, menuId, 1, '2026-06-16');
  expect(res.status).toBe(201);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM menus_dia WHERE dia = '2026-06-16'`).get();
  expect(total.n).toBe(2);
});

test('retorna 404 si el menú pertenece a otro restaurante', () => {
  const db     = crearDB();
  const menuId = seedMenuConSecciones(db);

  const res = copiarMenu(db, menuId, 2, '2026-06-16'); // restaurante 2 intentando copiar menú de restaurante 1
  expect(res.status).toBe(404);
});

test('retorna 400 con fecha inválida', () => {
  const db     = crearDB();
  const menuId = seedMenuConSecciones(db);

  expect(copiarMenu(db, menuId, 1, 'no-es-fecha').status).toBe(400);
  expect(copiarMenu(db, menuId, 1, '').status).toBe(400);
  expect(copiarMenu(db, menuId, 1, null).status).toBe(400);
  expect(copiarMenu(db, menuId, 1, '16/06/2026').status).toBe(400);
});

test('menú copiado sin secciones queda vacío en la fecha destino', () => {
  const db = crearDB();
  const { lastInsertRowid: menuId } = db.prepare(
    `INSERT INTO menus_dia (nombre, dia, precio, id_restaurante) VALUES ('Vacío', '2026-06-15', 10, 1)`
  ).run();

  const res = copiarMenu(db, menuId, 1, '2026-06-16');
  expect(res.status).toBe(201);
  const secs = db.prepare(`SELECT * FROM menu_secciones WHERE id_menu_dia = ?`).all(res.id);
  expect(secs).toHaveLength(0);
});
