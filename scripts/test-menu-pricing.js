// scripts/test-menu-pricing.js
// Valida que el precio por componente y el total de menuItems se calculen correctamente.
// Ejecutar: node scripts/test-menu-pricing.js

const db = require('../config/database');

// ─── Utilidades ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

function assertClose(actual, expected, message, tolerance = 0.001) {
  assert(Math.abs(actual - expected) < tolerance, `${message} (esperado=${expected}, obtenido=${actual})`);
}

// ─── Setup base compartido ─────────────────────────────────────────────────────

function setupBase() {
  const { lastInsertRowid: restauranteId } = db.prepare(
    `INSERT INTO restaurantes (nombre) VALUES ('Test Pricing')`
  ).run();

  const secEntrada   = db.prepare(`INSERT INTO secciones_menu (nombre, id_restaurante) VALUES ('Entrada', ?)`).run(restauranteId).lastInsertRowid;
  const secPrincipal = db.prepare(`INSERT INTO secciones_menu (nombre, id_restaurante) VALUES ('Principal', ?)`).run(restauranteId).lastInsertRowid;
  const secPostre    = db.prepare(`INSERT INTO secciones_menu (nombre, id_restaurante) VALUES ('Postre', ?)`).run(restauranteId).lastInsertRowid;
  const secRefresco  = db.prepare(`INSERT INTO secciones_menu (nombre, id_restaurante) VALUES ('Refresco', ?)`).run(restauranteId).lastInsertRowid;

  const platoSopa    = db.prepare(`INSERT INTO platos_menu (nombre, id_restaurante) VALUES ('Sopa', ?)`).run(restauranteId).lastInsertRowid;
  const platoCausa   = db.prepare(`INSERT INTO platos_menu (nombre, id_restaurante) VALUES ('Causa', ?)`).run(restauranteId).lastInsertRowid;
  const platoLomo    = db.prepare(`INSERT INTO platos_menu (nombre, id_restaurante) VALUES ('Lomo', ?)`).run(restauranteId).lastInsertRowid;
  const platoPollo   = db.prepare(`INSERT INTO platos_menu (nombre, id_restaurante) VALUES ('Pollo', ?)`).run(restauranteId).lastInsertRowid;
  const platoPanna   = db.prepare(`INSERT INTO platos_menu (nombre, id_restaurante) VALUES ('Panna Cotta', ?)`).run(restauranteId).lastInsertRowid;

  return { restauranteId, secEntrada, secPrincipal, secPostre, secRefresco, platoSopa, platoCausa, platoLomo, platoPollo, platoPanna };
}

function teardown(restauranteId) {
  db.prepare(`DELETE FROM reserva_menu_items  WHERE id_reserva  IN (SELECT id FROM reservas WHERE id_restaurante = ?)`).run(restauranteId);
  db.prepare(`DELETE FROM reserva_carta_items WHERE id_reserva  IN (SELECT id FROM reservas WHERE id_restaurante = ?)`).run(restauranteId);
  db.prepare(`DELETE FROM reservas            WHERE id_restaurante = ?`).run(restauranteId);
  db.prepare(`DELETE FROM componentes_menu_dia WHERE id_restaurante = ?`).run(restauranteId);
  db.prepare(`DELETE FROM menu_secciones       WHERE id_menu_dia IN (SELECT id FROM menus_dia WHERE id_restaurante = ?)`).run(restauranteId);
  db.prepare(`DELETE FROM menus_dia            WHERE id_restaurante = ?`).run(restauranteId);
  db.prepare(`DELETE FROM platos_menu          WHERE id_restaurante = ?`).run(restauranteId);
  db.prepare(`DELETE FROM secciones_menu       WHERE id_restaurante = ?`).run(restauranteId);
  db.prepare(`DELETE FROM restaurantes         WHERE id = ?`).run(restauranteId);
}

// ─── Lógica replicada del endpoint GET /api/reservations ───────────────────────

function fetchReservaEnriquecida(reservaId) {
  const r = db.prepare(`
    SELECT r.id, r.nombre_cliente, r.fecha,
           er.nombre AS estatus, er.es_full
    FROM reservas r
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE r.id = ?
  `).get(reservaId);

  const cartaItems = db.prepare(`
    SELECT rci.id, rci.cantidad, rci.precio_unitario, pc.nombre
    FROM reserva_carta_items rci
    JOIN platos_carta pc ON rci.id_plato_carta = pc.id
    WHERE rci.id_reserva = ?
  `).all(r.id);

  const menuItems = db.prepare(`
    SELECT
      rmi.id,
      rmi.cantidad,
      rmi.id_menu_dia,
      md.precio                                                        AS precio_menu,
      (SELECT COUNT(*) FROM menu_secciones WHERE id_menu_dia = rmi.id_menu_dia)
                                                                       AS total_componentes,
      pm.nombre  AS plato,
      sm.nombre  AS seccion
    FROM reserva_menu_items rmi
    JOIN componentes_menu_dia cmd ON rmi.id_componente = cmd.id
    JOIN platos_menu pm           ON cmd.id_plato_menu = pm.id
    JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
    JOIN menus_dia md             ON rmi.id_menu_dia = md.id
    WHERE rmi.id_reserva = ?
  `).all(r.id);

  const menuItemsConPrecio = menuItems.map(i => ({
    ...i,
    precio_unitario: i.total_componentes > 0 ? i.precio_menu / i.total_componentes : 0
  }));

  const total = r.es_full
    ? cartaItems.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0)
      + menuItemsConPrecio.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0)
    : 0;

  return { ...r, carta_items: cartaItems, menu_items: menuItemsConPrecio, total };
}

// ─── Casos de prueba ───────────────────────────────────────────────────────────

function runTests() {
  const base = setupBase();
  const { restauranteId, secEntrada, secPrincipal, secPostre, secRefresco,
          platoSopa, platoCausa, platoLomo, platoPollo, platoPanna } = base;

  try {

    // ── Caso 1: menú estático, $30, 3 secciones en menu_secciones ──────────────
    // precio_unitario = $30 / 3 = $10
    console.log('\nCaso 1: menú estático $30 con 3 secciones → precio_unitario = $10');
    {
      const menuId = db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante) VALUES ('Menú Estático', '2026-05-10', 30, ?)`).run(restauranteId).lastInsertRowid;

      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secEntrada);
      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secPrincipal);
      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secPostre);

      const compEntrada   = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secEntrada, platoSopa, restauranteId).lastInsertRowid;
      const compPrincipal = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secPrincipal, platoLomo, restauranteId).lastInsertRowid;
      const compPostre    = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secPostre, platoPanna, restauranteId).lastInsertRowid;

      const reservaId = db.prepare(`INSERT INTO reservas (nombre_cliente, fecha, id_restaurante, id_estatus) VALUES ('Cliente 1', '2026-05-10', ?, (SELECT id FROM estatus_reserva WHERE nombre = 'completada'))`).run(restauranteId).lastInsertRowid;
      for (const compId of [compEntrada, compPrincipal, compPostre]) {
        db.prepare(`INSERT INTO reserva_menu_items (id_reserva, id_menu_dia, id_componente, cantidad) VALUES (?, ?, ?, 1)`).run(reservaId, menuId, compId);
      }

      const reserva = fetchReservaEnriquecida(reservaId);
      assert(reserva.menu_items.length === 3, '3 líneas de menuItems');
      for (const item of reserva.menu_items) {
        assert(item.total_componentes === 3, `total_componentes = 3 (menu_secciones) en "${item.plato}"`);
        assertClose(item.precio_unitario, 10, `precio_unitario = $10 en "${item.plato}"`);
      }
      assertClose(reserva.total, 30, 'total = $30');
    }

    // ── Caso 2: menú elegible — 2 platos por sección, 3 secciones ──────────────
    // componentes_menu_dia tiene 6 filas, pero menu_secciones solo 3
    // precio_unitario debe seguir siendo $30 / 3 = $10, NO $30 / 6
    console.log('\nCaso 2: menú elegible con 2 opciones por sección (6 componentes, 3 secciones) → precio_unitario = $10');
    {
      const menuId = db.prepare(`INSERT INTO menus_dia (nombre, elegible, dia, precio, id_restaurante) VALUES ('Menú Elegible', 1, '2026-05-10', 30, ?)`).run(restauranteId).lastInsertRowid;

      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secEntrada);
      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secPrincipal);
      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secPostre);

      // 2 opciones por sección → 6 filas en componentes_menu_dia
      const compEntradaA  = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secEntrada, platoSopa, restauranteId).lastInsertRowid;
      db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secEntrada, platoCausa, restauranteId);
      const compPrincipalA = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secPrincipal, platoLomo, restauranteId).lastInsertRowid;
      db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secPrincipal, platoPollo, restauranteId);
      const compPostreA   = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secPostre, platoPanna, restauranteId).lastInsertRowid;
      db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secPostre, platoPanna, restauranteId);

      // Cliente elige uno por sección → 3 filas en reserva_menu_items
      const reservaId = db.prepare(`INSERT INTO reservas (nombre_cliente, fecha, id_restaurante, id_estatus) VALUES ('Cliente 2', '2026-05-10', ?, (SELECT id FROM estatus_reserva WHERE nombre = 'completada'))`).run(restauranteId).lastInsertRowid;
      for (const compId of [compEntradaA, compPrincipalA, compPostreA]) {
        db.prepare(`INSERT INTO reserva_menu_items (id_reserva, id_menu_dia, id_componente, cantidad) VALUES (?, ?, ?, 1)`).run(reservaId, menuId, compId);
      }

      const reserva = fetchReservaEnriquecida(reservaId);
      for (const item of reserva.menu_items) {
        assert(item.total_componentes === 3, `total_componentes = 3 (menu_secciones, no componentes) en "${item.plato}"`);
        assertClose(item.precio_unitario, 10, `precio_unitario = $10 (no $5) en "${item.plato}"`);
      }
      assertClose(reserva.total, 30, 'total = $30 con menú elegible');
    }

    // ── Caso 3: menú de 2 secciones (sin postre) — $20 / 2 = $10 ───────────────
    // secciones_menu tiene 4 secciones globales, este menú solo usa 2
    console.log('\nCaso 3: menú con solo 2 secciones de las 4 disponibles → precio_unitario = $20 / 2 = $10');
    {
      const menuId = db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante) VALUES ('Menú Reducido', '2026-05-10', 20, ?)`).run(restauranteId).lastInsertRowid;

      // Solo entrada y principal, sin postre ni refresco
      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secEntrada);
      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secPrincipal);

      const compEntrada   = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secEntrada, platoSopa, restauranteId).lastInsertRowid;
      const compPrincipal = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secPrincipal, platoLomo, restauranteId).lastInsertRowid;

      const reservaId = db.prepare(`INSERT INTO reservas (nombre_cliente, fecha, id_restaurante, id_estatus) VALUES ('Cliente 3', '2026-05-10', ?, (SELECT id FROM estatus_reserva WHERE nombre = 'completada'))`).run(restauranteId).lastInsertRowid;
      for (const compId of [compEntrada, compPrincipal]) {
        db.prepare(`INSERT INTO reserva_menu_items (id_reserva, id_menu_dia, id_componente, cantidad) VALUES (?, ?, ?, 1)`).run(reservaId, menuId, compId);
      }

      const reserva = fetchReservaEnriquecida(reservaId);
      for (const item of reserva.menu_items) {
        assert(item.total_componentes === 2, `total_componentes = 2 en "${item.plato}"`);
        assertClose(item.precio_unitario, 10, `precio_unitario = $10 ($20/2) en "${item.plato}"`);
      }
      assertClose(reserva.total, 20, 'total = $20');
    }

    // ── Caso 4: cantidad > 1 multiplica sin alterar precio_unitario ─────────────
    console.log('\nCaso 4: cantidad = 3 → total = $30 * 3 = $90');
    {
      const menuId = db.prepare(`INSERT INTO menus_dia (nombre, dia, precio, id_restaurante) VALUES ('Menú x3', '2026-05-10', 30, ?)`).run(restauranteId).lastInsertRowid;

      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secEntrada);
      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secPrincipal);
      db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu) VALUES (?, ?)`).run(menuId, secPostre);

      const compEntrada   = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secEntrada, platoSopa, restauranteId).lastInsertRowid;
      const compPrincipal = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secPrincipal, platoLomo, restauranteId).lastInsertRowid;
      const compPostre    = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, '2026-05-10', ?, ?, ?)`).run(menuId, secPostre, platoPanna, restauranteId).lastInsertRowid;

      const reservaId = db.prepare(`INSERT INTO reservas (nombre_cliente, fecha, id_restaurante, id_estatus) VALUES ('Cliente 4', '2026-05-10', ?, (SELECT id FROM estatus_reserva WHERE nombre = 'completada'))`).run(restauranteId).lastInsertRowid;
      for (const compId of [compEntrada, compPrincipal, compPostre]) {
        db.prepare(`INSERT INTO reserva_menu_items (id_reserva, id_menu_dia, id_componente, cantidad) VALUES (?, ?, ?, 3)`).run(reservaId, menuId, compId);
      }

      const reserva = fetchReservaEnriquecida(reservaId);
      for (const item of reserva.menu_items) {
        assert(item.cantidad === 3, `cantidad = 3 en "${item.plato}"`);
        assertClose(item.precio_unitario, 10, `precio_unitario = $10 en "${item.plato}"`);
      }
      assertClose(reserva.total, 90, 'total = $90 (3 menús × $30)');
    }

    // ── Caso 5: campos requeridos presentes en cada línea ──────────────────────
    console.log('\nCaso 5: campos requeridos presentes en cada línea de menu_items');
    {
      const anyReserva = fetchReservaEnriquecida(
        db.prepare(`SELECT id FROM reservas WHERE id_restaurante = ? LIMIT 1`).get(restauranteId).id
      );
      const item = anyReserva.menu_items[0];
      for (const campo of ['id', 'cantidad', 'id_menu_dia', 'precio_menu', 'total_componentes', 'precio_unitario', 'plato', 'seccion']) {
        assert(campo in item, `campo "${campo}" presente`);
      }
    }

  } finally {
    teardown(restauranteId);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Resultado: ${passed} pasaron, ${failed} fallaron`);
  if (failed > 0) process.exit(1);
}

runTests();
