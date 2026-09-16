/**
 * Modalidad por línea — ISS-047.
 *
 * Antes `modalidad` vivía solo en `ordenes`/`reservas`: una por pedido. Eso hacía
 * imposible el caso real del día 5 del piloto — pedir 2 menús, llevarse uno y
 * comer el otro en el local. Ahora cada instancia de menú (todas las líneas que
 * comparten `grupo`, ver ISS-041) y cada plato de carta llevan la suya.
 *
 * Lo que se mezcla es `en_local` / `para_llevar`. **El delivery es del pedido
 * entero**: es un solo viaje, partirlo no significa nada.
 *
 * La columna del pedido se conserva como resumen derivado, así que todo lo que
 * hoy lee `orden.modalidad` (cocina, colaDia, pedidos.js) sigue funcionando.
 */

const { contarUnidadesMenu } = require('./menuPricing');

// Las únicas que pueden convivir dentro de un mismo pedido
const MODALIDADES_LINEA = ['en_local', 'para_llevar'];

/**
 * Decide la modalidad de una línea.
 * Si el cliente no la manda (versión vieja de menu.html), hereda la del pedido —
 * así un cliente sin actualizar sigue comportándose exactamente como antes.
 * Un pedido `delivery` deja todas sus líneas en `en_local`: el cargo de delivery
 * es del viaje, no del envase, y no queremos cobrar tapper por cada plato.
 */
function modalidadDeLinea(linea, modalidadPedido) {
  if (modalidadPedido === 'delivery') return 'en_local';
  const propia = linea && linea.modalidad;
  if (MODALIDADES_LINEA.includes(propia)) return propia;
  return MODALIDADES_LINEA.includes(modalidadPedido) ? modalidadPedido : 'en_local';
}

/**
 * Devuelve una copia de los ítems con `modalidad` ya resuelta en cada uno.
 * Las líneas de menú se normalizan **por grupo**: una instancia de menú se lleva
 * entera o no se lleva. Si dos líneas del mismo grupo vinieran en desacuerdo
 * (cliente manipulado o con bug), gana `para_llevar` — cobrar el envase de más
 * es preferible a que el cocinero no envase algo que el comensal se lleva.
 */
function normalizarModalidades(menuItems, cartaItems, modalidadPedido) {
  const menu  = (menuItems  || []).map(i => ({ ...i, modalidad: modalidadDeLinea(i, modalidadPedido) }));
  const carta = (cartaItems || []).map(i => ({ ...i, modalidad: modalidadDeLinea(i, modalidadPedido) }));

  const porGrupo = new Map();
  for (const i of menu) {
    if (i.grupo == null) continue;   // línea anterior a ISS-041: no agrupa
    if (i.modalidad === 'para_llevar') porGrupo.set(i.grupo, 'para_llevar');
    else if (!porGrupo.has(i.grupo))   porGrupo.set(i.grupo, 'en_local');
  }
  for (const i of menu) {
    if (i.grupo != null) i.modalidad = porGrupo.get(i.grupo);
  }

  return { menu, carta };
}

/**
 * Resumen que se guarda en `ordenes.modalidad` / `reservas.modalidad`.
 * `delivery` manda sobre todo lo demás: es una propiedad del pedido.
 */
function resumirModalidad(menuItems, cartaItems, modalidadPedido) {
  if (modalidadPedido === 'delivery') return 'delivery';

  const todas = [...(menuItems || []), ...(cartaItems || [])].map(i => i.modalidad);
  if (!todas.length) return MODALIDADES_LINEA.includes(modalidadPedido) ? modalidadPedido : 'en_local';

  const llevar = todas.filter(m => m === 'para_llevar').length;
  if (llevar === 0)           return 'en_local';
  if (llevar === todas.length) return 'para_llevar';
  return 'mixto';
}

/**
 * Cuenta cuántas instancias de menú van para llevar y cuántas en total.
 * Se cuenta por `grupo`, no por línea: 4 filas de 2 menús son 2 unidades.
 * Las líneas sin `grupo` (pedidos anteriores a ISS-041) se cuentan como una
 * unidad cada una, que es lo mismo que hacía el conteo viejo.
 */
function contarMenusPorModalidad(menuItems) {
  const vistos = new Map();
  let sueltas = 0, sueltasLlevar = 0;
  for (const i of menuItems || []) {
    if (i.grupo == null) {
      sueltas++;
      if (i.modalidad === 'para_llevar') sueltasLlevar++;
      continue;
    }
    if (!vistos.has(i.grupo)) vistos.set(i.grupo, i.modalidad);
  }
  const grupos = [...vistos.values()];
  return {
    total:  grupos.length + sueltas,
    llevar: grupos.filter(m => m === 'para_llevar').length + sueltasLlevar,
  };
}

// ─────────────────────────────────────────────────────
// Enriquece los menu_items recibidos ({ id_componente, ... }) con
// id_menu_dia / requerido / total_obligatorias, necesarios para deducir
// cuántas unidades de menú se pidieron (ver contarUnidadesMenu). Recibe
// `db` como parámetro para evitar dependencias circulares (igual que
// utils/totales.js).
// ─────────────────────────────────────────────────────
function enriquecerMenuItems(db, idRestaurante, menuItems) {
  const seccionesCache = new Map();
  return menuItems.map(item => {
    const info = db.prepare(`
      SELECT cmd.id_menu_dia, ms.requerido
      FROM componentes_menu_dia cmd
      JOIN menus_dia md      ON cmd.id_menu_dia = md.id
      JOIN menu_secciones ms ON ms.id_menu_dia = cmd.id_menu_dia
                            AND ms.id_seccion_menu = cmd.id_seccion_menu
      WHERE cmd.id = ? AND md.id_restaurante = ?
    `).get(item.id_componente, idRestaurante);
    if (!info) return null;

    if (!seccionesCache.has(info.id_menu_dia)) {
      const { total_obligatorias } = db.prepare(`
        SELECT COUNT(*) AS total_obligatorias FROM menu_secciones
        WHERE id_menu_dia = ? AND requerido = 1
      `).get(info.id_menu_dia);
      seccionesCache.set(info.id_menu_dia, total_obligatorias);
    }

    return {
      id_menu_dia:       info.id_menu_dia,
      requerido:         info.requerido,
      total_obligatorias: seccionesCache.get(info.id_menu_dia),
    };
  }).filter(Boolean);
}

// ─────────────────────────────────────────────────────
// Calcula el cargo por modalidad (Gap 5) — movido de routes/public.js a acá
// (ISS-095) para reusarlo también desde "Agregar manual" (routes/orders.js),
// sin duplicar la lógica del cargo por tapper.
//
// El tapper se cobra por cada menú completo (unidadesMenu) y por cada ítem a
// la carta (cada plato para llevar necesita su propio envase). La tarifa de
// delivery es fija por pedido (un solo viaje).
//
// ISS-047: el tapper se cobra **solo por lo que se lleva**, no por el pedido
// entero. Recibe los ítems con `modalidad` ya normalizada.
// ─────────────────────────────────────────────────────
function calcularCargoModalidad(db, modalidad, rest, idRestaurante, cartaItems, menuItems) {
  if (modalidad === 'en_local') return 0;

  // En delivery viaja el pedido entero, así que todo va envasado — el envase se
  // cobra por cada unidad, como antes de ISS-047. En para_llevar/mixto se cobra
  // solo lo que el comensal marcó para llevar.
  const esDelivery  = modalidad === 'delivery';
  const menuLlevar  = esDelivery ? (menuItems  || []) : (menuItems  || []).filter(i => i.modalidad === 'para_llevar');
  const cartaLlevar = esDelivery ? (cartaItems || []) : (cartaItems || []).filter(i => i.modalidad === 'para_llevar');

  // Con `grupo` (ISS-041) las unidades se cuentan directo; sin él —cliente viejo—
  // se deduce como siempre, contando filas de secciones obligatorias.
  const conGrupo = menuLlevar.length > 0 && menuLlevar.every(i => i.grupo != null);
  const unidadesMenu = conGrupo
    ? new Set(menuLlevar.map(i => i.grupo)).size
    : contarUnidadesMenu(enriquecerMenuItems(db, idRestaurante, menuLlevar));

  const unidadesCarta = cartaLlevar.reduce((s, i) => s + (i.cantidad || 1), 0);

  let cargo = (unidadesMenu + unidadesCarta) * (rest.costo_tapper ?? 0);
  if (modalidad === 'delivery') cargo += (rest.tarifa_delivery ?? 0);
  return cargo;
}

module.exports = {
  MODALIDADES_LINEA,
  modalidadDeLinea,
  normalizarModalidades,
  resumirModalidad,
  contarMenusPorModalidad,
  calcularCargoModalidad,
};
