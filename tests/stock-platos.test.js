/**
 * Pruebas del control de stock por plato del menú del día (utils/stock.js
 * + lógica de los endpoints). El stock vive en componentes_menu_dia
 * (stock_inicial / stock_restante, NULL = sin control).
 * Se prueban las funciones REALES de utils/stock.js contra BD en memoria.
 */

const Database = require('better-sqlite3');
const { descontarStock, devolverStock, itemsMenuDeOrden, itemsMenuDeReserva } = require('../utils/stock');

function crearDB() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE platos_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL
    );
    INSERT INTO platos_menu (nombre, id_restaurante) VALUES
      ('Arroz con pollo', 1), ('Lomo saltado', 1), ('Sopa de casa', 1);

    CREATE TABLE componentes_menu_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_menu_dia INTEGER NOT NULL,
      dia TEXT NOT NULL,
      id_seccion_menu INTEGER NOT NULL,
      id_plato_menu INTEGER NOT NULL,
      id_restaurante INTEGER NOT NULL,
      agotado INTEGER DEFAULT 0,
      stock_inicial  INTEGER DEFAULT NULL,
      stock_restante INTEGER DEFAULT NULL
    );

    CREATE TABLE ordenes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT);
    CREATE TABLE orden_menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_orden INTEGER NOT NULL,
      id_menu_dia INTEGER NOT NULL,
      id_componente INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE reserva_menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_reserva INTEGER NOT NULL,
      id_menu_dia INTEGER NOT NULL,
      id_componente INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1
    );
  `);
  return db;
}

// Componente con stock: 25 arroz con pollo en el menú 1, sección 2 (segundo)
function seedComponente(db, { plato = 1, stock = 25 } = {}) {
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante, stock_inicial, stock_restante)
    VALUES (1, '2026-07-02', 2, ?, 1, ?, ?)
  `).run(plato, stock, stock);
  return lastInsertRowid;
}

const restante = (db, id) =>
  db.prepare(`SELECT stock_restante FROM componentes_menu_dia WHERE id = ?`).get(id).stock_restante;

// ── descontarStock ──────────────────────────────────────────────

test('descuenta según la cantidad pedida', () => {
  const db = crearDB();
  const comp = seedComponente(db, { stock: 25 });

  descontarStock(db, [{ id_componente: comp, cantidad: 3 }]);
  expect(restante(db, comp)).toBe(22);

  descontarStock(db, [{ id_componente: comp }]); // cantidad por defecto = 1
  expect(restante(db, comp)).toBe(21);
});

test('NULL = sin control de stock — no descuenta nada', () => {
  const db = crearDB();
  const comp = seedComponente(db, { stock: null });

  descontarStock(db, [{ id_componente: comp, cantidad: 10 }]);
  expect(restante(db, comp)).toBe(null);
});

test('stock insuficiente lanza 409 con el nombre del plato', () => {
  const db = crearDB();
  const comp = seedComponente(db, { stock: 2 });

  let err;
  try { descontarStock(db, [{ id_componente: comp, cantidad: 3 }]); }
  catch (e) { err = e; }

  expect(err).toBeDefined();
  expect(err.status).toBe(409);
  expect(err.message).toContain('Arroz con pollo');
  expect(err.message).toContain('2');           // "Solo quedan 2 porciones…"
  expect(restante(db, comp)).toBe(2);           // no descontó nada
});

test('la transacción entera revierte si un plato no alcanza (orden no se crea)', () => {
  const db = crearDB();
  const compOk    = seedComponente(db, { plato: 1, stock: 10 });
  const compJusto = seedComponente(db, { plato: 2, stock: 1 });

  const crearOrden = db.transaction((items) => {
    const { lastInsertRowid } = db.prepare(`INSERT INTO ordenes (nombre) VALUES ('test')`).run();
    const stmt = db.prepare(`INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad) VALUES (?, 1, ?, ?)`);
    for (const it of items) stmt.run(lastInsertRowid, it.id_componente, it.cantidad || 1);
    descontarStock(db, items);
    return lastInsertRowid;
  });

  expect(() => crearOrden([
    { id_componente: compOk, cantidad: 2 },
    { id_componente: compJusto, cantidad: 5 },   // no alcanza → revierte TODO
  ])).toThrow(/Lomo saltado/);

  expect(restante(db, compOk)).toBe(10);         // el descuento del primero también revirtió
  expect(db.prepare(`SELECT COUNT(*) n FROM ordenes`).get().n).toBe(0);
  expect(db.prepare(`SELECT COUNT(*) n FROM orden_menu_items`).get().n).toBe(0);
});

test('carrera por la última porción: el segundo pedido falla', () => {
  const db = crearDB();
  const comp = seedComponente(db, { stock: 1 });

  descontarStock(db, [{ id_componente: comp }]);           // primer cliente se la lleva
  expect(restante(db, comp)).toBe(0);

  expect(() => descontarStock(db, [{ id_componente: comp }]))
    .toThrow(/Ya no quedan porciones/);
});

// ── devolverStock (cancelaciones) ───────────────────────────────

test('cancelar devuelve el stock según cantidad', () => {
  const db = crearDB();
  const comp = seedComponente(db, { stock: 25 });
  descontarStock(db, [{ id_componente: comp, cantidad: 4 }]);
  expect(restante(db, comp)).toBe(21);

  devolverStock(db, [{ id_componente: comp, cantidad: 4 }]);
  expect(restante(db, comp)).toBe(25);
});

test('devolver no toca componentes sin control de stock', () => {
  const db = crearDB();
  const comp = seedComponente(db, { stock: null });

  devolverStock(db, [{ id_componente: comp, cantidad: 3 }]);
  expect(restante(db, comp)).toBe(null);
});

test('itemsMenuDeOrden / itemsMenuDeReserva leen los ítems para devolver', () => {
  const db = crearDB();
  const comp = seedComponente(db, { stock: 10 });
  db.prepare(`INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad) VALUES (7, 1, ?, 2)`).run(comp);
  db.prepare(`INSERT INTO reserva_menu_items (id_reserva, id_menu_dia, id_componente, cantidad) VALUES (9, 1, ?, 3)`).run(comp);

  expect(itemsMenuDeOrden(db, 7)).toEqual([{ id_componente: comp, cantidad: 2 }]);
  expect(itemsMenuDeReserva(db, 9)).toEqual([{ id_componente: comp, cantidad: 3 }]);
});

// ── Filtro del menú público (misma condición que routes/public.js) ──

test('el menú público excluye platos con stock 0 pero incluye NULL (sin control)', () => {
  const db = crearDB();
  const agotadoStock = seedComponente(db, { plato: 1, stock: 0 });
  const conStock     = seedComponente(db, { plato: 2, stock: 5 });
  const sinControl   = seedComponente(db, { plato: 3, stock: null });

  const visibles = db.prepare(`
    SELECT id FROM componentes_menu_dia
    WHERE agotado = 0 AND (stock_restante IS NULL OR stock_restante > 0)
  `).all().map(r => r.id);

  expect(visibles).toContain(conStock);
  expect(visibles).toContain(sinControl);
  expect(visibles).not.toContain(agotadoStock);
});

// ── Fijar stock (misma lógica que el PATCH …/stock) ─────────────

test('fijar stock resetea inicial y restante; null quita el control', () => {
  const db = crearDB();
  const comp = seedComponente(db, { stock: 25 });
  descontarStock(db, [{ id_componente: comp, cantidad: 20 }]);   // quedan 5

  // El owner recuenta la olla: "me quedan 8"
  db.prepare(`UPDATE componentes_menu_dia SET stock_inicial = ?, stock_restante = ? WHERE id = ?`).run(8, 8, comp);
  expect(restante(db, comp)).toBe(8);

  // Quitar el control → ilimitado
  db.prepare(`UPDATE componentes_menu_dia SET stock_inicial = ?, stock_restante = ? WHERE id = ?`).run(null, null, comp);
  expect(restante(db, comp)).toBe(null);
  descontarStock(db, [{ id_componente: comp, cantidad: 99 }]);   // ya no limita
  expect(restante(db, comp)).toBe(null);
});

// ── Copiar menú a otra fecha (misma lógica que POST …/copiar) ───

test('copiar menú replica stock_inicial y arranca con la olla llena', () => {
  const db = crearDB();
  const comp = seedComponente(db, { stock: 25 });
  descontarStock(db, [{ id_componente: comp, cantidad: 10 }]);   // hoy quedan 15

  // Réplica del INSERT del endpoint copiar: inicial se copia, restante = inicial
  const fuente = db.prepare(`SELECT id_plato_menu, stock_inicial FROM componentes_menu_dia WHERE id = ?`).get(comp);
  const { lastInsertRowid: copia } = db.prepare(`
    INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante, stock_inicial, stock_restante)
    VALUES (2, '2026-07-03', 2, ?, 1, ?, ?)
  `).run(fuente.id_plato_menu, fuente.stock_inicial, fuente.stock_inicial);

  expect(restante(db, copia)).toBe(25);   // día nuevo, olla nueva
  expect(restante(db, comp)).toBe(15);    // el original no se toca
});
