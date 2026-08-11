// utils/pensionistaPedido.js
// Cancelación de un pedido de pensionista — compartida entre el propio
// pensionista (routes/pensionista.js, cancela el suyo) y el owner/staff
// (routes/pensionistas.js, cancela desde Cola del día/Cocina).
//
// A diferencia de una orden walk-in, cancelar un pedido de pensionista
// también devuelve el SALDO descontado (ya estaba pagado de antemano) —
// no solo el stock. Ver pensionistas.md §7.
const { devolverStock, itemsMenuDePedidoPensionista } = require('./stock');

// Lanza un Error con `.status` (400/404) que el router traduce a HTTP.
function cancelarPedidoPensionista(db, idPedido, idUsuarioRegistro, nota = null) {
  const pedido = db.prepare(`
    SELECT pp.id, pp.id_pensionista, pp.total, pp.id_restaurante,
           eo.nombre AS estatus_actual, eo.es_pagado, eo.es_cancelado
    FROM pedidos_pensionista pp
    JOIN estatus_orden eo ON pp.id_estatus = eo.id
    WHERE pp.id = ?
  `).get(idPedido);

  if (!pedido) {
    const err = new Error('Pedido no encontrado');
    err.status = 404;
    throw err;
  }
  if (pedido.es_pagado || pedido.es_cancelado) {
    const err = new Error(`No se puede cancelar un pedido ${pedido.estatus_actual}`);
    err.status = 400;
    throw err;
  }

  const cancelado = db.prepare(`SELECT id FROM estatus_orden WHERE es_cancelado = 1`).get();
  const pensionista = db.prepare(`SELECT saldo FROM pensionistas WHERE id = ?`).get(pedido.id_pensionista);
  const nuevoSaldo = pensionista.saldo + pedido.total;

  const cancelar = db.transaction(() => {
    db.prepare(`UPDATE pedidos_pensionista SET id_estatus = ? WHERE id = ?`).run(cancelado.id, idPedido);
    devolverStock(db, itemsMenuDePedidoPensionista(db, idPedido));

    db.prepare(`UPDATE pensionistas SET saldo = ? WHERE id = ?`).run(nuevoSaldo, pedido.id_pensionista);
    db.prepare(`
      INSERT INTO pensionista_movimientos
        (id_pensionista, tipo, monto, saldo_resultante, id_pedido_pensionista, nota, id_usuario_registro)
      VALUES (?, 'devolucion', ?, ?, ?, ?, ?)
    `).run(pedido.id_pensionista, pedido.total, nuevoSaldo, idPedido, nota, idUsuarioRegistro);
  });
  cancelar();

  return { id_restaurante: pedido.id_restaurante, saldo: nuevoSaldo, total: pedido.total };
}

module.exports = { cancelarPedidoPensionista };
