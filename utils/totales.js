// utils/totales.js
// Calcula el total económico de una orden o reserva dado su ID.
// Recibe `db` como parámetro para evitar dependencias circulares.
const { calcularMenuTotal } = require('./menuPricing');

function calcularTotalOrden(db, ordenId) {
  const cartaItems = db.prepare(`
    SELECT cantidad, precio_unitario FROM orden_carta_items WHERE id_orden = ?
  `).all(ordenId);

  const menuItems = db.prepare(`
    SELECT omi.cantidad, omi.id_menu_dia, md.precio AS precio_menu, ms.requerido
    FROM orden_menu_items omi
    JOIN componentes_menu_dia cmd ON omi.id_componente  = cmd.id
    JOIN menus_dia md             ON omi.id_menu_dia    = md.id
    JOIN menu_secciones ms        ON ms.id_menu_dia     = omi.id_menu_dia
                                 AND ms.id_seccion_menu = cmd.id_seccion_menu
    WHERE omi.id_orden = ?
  `).all(ordenId);

  const seccionesCache = new Map();
  const itemsPerMenu   = new Map();
  for (const i of menuItems) {
    itemsPerMenu.set(i.id_menu_dia, (itemsPerMenu.get(i.id_menu_dia) || 0) + 1);
  }
  const enriched = menuItems.map(i => {
    if (!seccionesCache.has(i.id_menu_dia)) {
      const { total_obligatorias } = db.prepare(
        `SELECT COUNT(*) AS total_obligatorias FROM menu_secciones WHERE id_menu_dia = ? AND requerido = 1`
      ).get(i.id_menu_dia);
      seccionesCache.set(i.id_menu_dia, total_obligatorias);
    }
    return { ...i, total_obligatorias: seccionesCache.get(i.id_menu_dia) };
  });

  const orden = db.prepare(`SELECT cargo_modalidad FROM ordenes WHERE id = ?`).get(ordenId);
  const cartaTotal = cartaItems.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
  return cartaTotal + calcularMenuTotal(enriched) + (orden?.cargo_modalidad ?? 0);
}

function calcularTotalReserva(db, reservaId) {
  const cartaItems = db.prepare(`
    SELECT cantidad, precio_unitario FROM reserva_carta_items WHERE id_reserva = ?
  `).all(reservaId);

  const menuItems = db.prepare(`
    SELECT rmi.cantidad, rmi.id_menu_dia, md.precio AS precio_menu, ms.requerido
    FROM reserva_menu_items rmi
    JOIN componentes_menu_dia cmd ON rmi.id_componente  = cmd.id
    JOIN menus_dia md             ON rmi.id_menu_dia    = md.id
    JOIN menu_secciones ms        ON ms.id_menu_dia     = rmi.id_menu_dia
                                 AND ms.id_seccion_menu = cmd.id_seccion_menu
    WHERE rmi.id_reserva = ?
  `).all(reservaId);

  const seccionesCache = new Map();
  const itemsPerMenu   = new Map();
  for (const i of menuItems) {
    itemsPerMenu.set(i.id_menu_dia, (itemsPerMenu.get(i.id_menu_dia) || 0) + 1);
  }
  const enriched = menuItems.map(i => {
    if (!seccionesCache.has(i.id_menu_dia)) {
      const { total_obligatorias } = db.prepare(
        `SELECT COUNT(*) AS total_obligatorias FROM menu_secciones WHERE id_menu_dia = ? AND requerido = 1`
      ).get(i.id_menu_dia);
      seccionesCache.set(i.id_menu_dia, total_obligatorias);
    }
    return { ...i, total_obligatorias: seccionesCache.get(i.id_menu_dia) };
  });

  const reserva = db.prepare(`SELECT cargo_modalidad FROM reservas WHERE id = ?`).get(reservaId);
  const cartaTotal = cartaItems.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
  return cartaTotal + calcularMenuTotal(enriched) + (reserva?.cargo_modalidad ?? 0);
}

module.exports = { calcularTotalOrden, calcularTotalReserva };
