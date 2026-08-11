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

// Cuenta cuántas unidades de menú completas (menús físicos, cada uno con su
// propio tapper en pedidos para llevar/delivery — Gap 5) hay en un pedido.
// No existe un ID de "instancia de menú" en la BD: solo filas por sección
// elegida. Se deduce contando las filas de secciones OBLIGATORIAS por
// id_menu_dia y dividiendo entre el total de secciones obligatorias de ese
// menú (cada unidad de menú aporta exactamente 1 fila por sección obligatoria).
// Cada item debe tener: { id_menu_dia, requerido, total_obligatorias }
function contarUnidadesMenu(menuItems) {
  const filasObligatoriasPorMenu = new Map(); // id_menu_dia -> filas requerido=1
  const totalObligatoriasPorMenu = new Map(); // id_menu_dia -> total_obligatorias
  const menusSinObligatorias     = new Set(); // caso borde: menú sin secciones requeridas

  for (const i of menuItems) {
    totalObligatoriasPorMenu.set(i.id_menu_dia, i.total_obligatorias);
    if (i.total_obligatorias > 0) {
      if (i.requerido) {
        filasObligatoriasPorMenu.set(i.id_menu_dia, (filasObligatoriasPorMenu.get(i.id_menu_dia) || 0) + 1);
      }
    } else {
      menusSinObligatorias.add(i.id_menu_dia);
    }
  }

  let unidades = 0;
  for (const [idMenuDia, filas] of filasObligatoriasPorMenu) {
    unidades += Math.round(filas / totalObligatoriasPorMenu.get(idMenuDia));
  }
  // Caso borde: menú sin secciones obligatorias no permite deducir cuántas
  // unidades se pidieron con exactitud — se cuenta como 1 (subestima si se
  // pidió 2+ veces el mismo menú sin obligatorias, nunca cobra de más).
  unidades += menusSinObligatorias.size;

  return unidades;
}

module.exports = { calcularPrecioUnitario, calcularMenuTotal, contarUnidadesMenu };
