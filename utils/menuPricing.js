// utils/menuPricing.js
// Lógica de distribución del precio de menú del día entre sus secciones.
// Cada item debe tener: { precio_menu, requerido, total_obligatorias, cantidad, id_menu_dia }

function calcularPrecioUnitario(item, itemsPerMenu) {
  if (item.total_obligatorias > 0) {
    return item.requerido ? item.precio_menu / item.total_obligatorias : 0;
  }
  // Caso borde: todas las secciones son opcionales → precio completo dividido entre
  // las secciones que el cliente efectivamente pidió (siempre >= 1 porque hay orden)
  return item.precio_menu / itemsPerMenu.get(item.id_menu_dia);
}

function calcularMenuTotal(menuItems) {
  const itemsPerMenu = new Map();
  for (const i of menuItems) {
    itemsPerMenu.set(i.id_menu_dia, (itemsPerMenu.get(i.id_menu_dia) || 0) + 1);
  }
  return menuItems.reduce(
    (suma, i) => suma + calcularPrecioUnitario(i, itemsPerMenu) * i.cantidad,
    0
  );
}

module.exports = { calcularPrecioUnitario, calcularMenuTotal };
