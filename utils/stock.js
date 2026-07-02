/**
 * Stock por plato del menú del día (columnas stock_inicial / stock_restante
 * en componentes_menu_dia). El stock es POR MENÚ: si el mismo plato está en
 * dos menús del día, cada uno lleva su propia cuenta (decisión del negocio —
 * el owner reparte sus porciones entre menús).
 *
 * NULL = sin control de stock (comportamiento clásico, ilimitado).
 * El descuento ocurre al CREAR la orden/reserva; la devolución al CANCELAR.
 */

// Descuenta stock de items [{ id_componente, cantidad }].
// Debe llamarse DENTRO de una transacción del caller: si algún plato no
// alcanza, lanza un error con status 409 y la transacción entera revierte
// (no se crea la orden/reserva ni se descuenta nada).
function descontarStock(db, items) {
  if (!items || !items.length) return;

  const upd = db.prepare(`
    UPDATE componentes_menu_dia
    SET stock_restante = stock_restante - ?
    WHERE id = ? AND stock_restante IS NOT NULL AND stock_restante >= ?
  `);
  const info = db.prepare(`
    SELECT cmd.stock_restante, pm.nombre
    FROM componentes_menu_dia cmd
    JOIN platos_menu pm ON cmd.id_plato_menu = pm.id
    WHERE cmd.id = ?
  `);

  for (const item of items) {
    const n = item.cantidad || 1;
    const row = info.get(item.id_componente);
    if (!row) continue;                        // existencia ya validada por el caller
    if (row.stock_restante === null) continue; // sin control de stock → ilimitado

    const r = upd.run(n, item.id_componente, n);
    if (r.changes === 0) {
      // El guard `stock_restante >= ?` evita que dos pedidos simultáneos
      // se lleven la última porción: el segundo cae aquí.
      const err = new Error(
        row.stock_restante > 0
          ? `Solo quedan ${row.stock_restante} porciones de ${row.nombre}`
          : `Ya no quedan porciones de ${row.nombre}`
      );
      err.status = 409;
      throw err;
    }
  }
}

// Devuelve stock al cancelar una orden/reserva. Solo repone componentes con
// control activo (stock_restante NOT NULL). Puede superar stock_inicial si el
// owner bajó el stock a mano entre medio — se acepta como edge menor.
function devolverStock(db, items) {
  if (!items || !items.length) return;
  const upd = db.prepare(`
    UPDATE componentes_menu_dia
    SET stock_restante = stock_restante + ?
    WHERE id = ? AND stock_restante IS NOT NULL
  `);
  for (const item of items) upd.run(item.cantidad || 1, item.id_componente);
}

// Ítems de menú de una orden/reserva — para devolver stock al cancelar.
function itemsMenuDeOrden(db, ordenId) {
  return db.prepare(`
    SELECT id_componente, cantidad FROM orden_menu_items WHERE id_orden = ?
  `).all(ordenId);
}

function itemsMenuDeReserva(db, reservaId) {
  return db.prepare(`
    SELECT id_componente, cantidad FROM reserva_menu_items WHERE id_reserva = ?
  `).all(reservaId);
}

module.exports = { descontarStock, devolverStock, itemsMenuDeOrden, itemsMenuDeReserva };
