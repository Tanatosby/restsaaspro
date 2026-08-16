// utils/colaDia.js
// Consultas de la Cola del día — órdenes y reservas activas en un solo viaje.
//
// Antes la Cola pedía 6 endpoints en paralelo (órdenes activas + 5 estados de
// reserva), y cada uno resolvía sus ítems con una consulta por registro (N+1).
// Como better-sqlite3 es síncrono, cada una de esas consultas bloquea el
// proceso Node entero: con 2-3 pedidos y varios celulares polleando, la app se
// sentía trabada y las acciones tardaban en responder. Ver ISS-026.
//
// Acá se usa un número fijo de consultas (6) sin importar cuántos pedidos haya:
// una por lista y una por tipo de ítem, agrupando en JS.

// `fecha` guarda 'YYYY-MM-DD' desde utils/fecha.js, pero hay registros viejos
// con timestamp completo ('2026-06-04 03:46:13'). substr(...,1,10) hace que el
// filtro funcione con ambos formatos.
const SOLO_FECHA = `substr(%s.fecha, 1, 10)`;

function columnaFecha(alias) {
  return SOLO_FECHA.replace('%s', alias);
}

// ── Ítems, agrupados por id padre (evita el N+1) ─────────────────────────────

function agruparPorPadre(filas, campoPadre) {
  const mapa = new Map();
  for (const fila of filas) {
    const id = fila[campoPadre];
    if (!mapa.has(id)) mapa.set(id, []);
    const { [campoPadre]: _, ...resto } = fila;
    mapa.get(id).push(resto);
  }
  return mapa;
}

// SQLite tiene un límite de variables por consulta (999 por defecto). La cola
// nunca se acerca, pero si no hay ids no se debe ejecutar la consulta.
function placeholders(ids) {
  return ids.map(() => '?').join(',');
}

function itemsDeOrdenes(db, ids) {
  if (!ids.length) return { carta: new Map(), menu: new Map() };

  const carta = db.prepare(`
    SELECT oci.id_orden, oci.id, oci.cantidad, oci.precio_unitario, pc.nombre
    FROM orden_carta_items oci
    JOIN platos_carta pc ON oci.id_plato_carta = pc.id
    WHERE oci.id_orden IN (${placeholders(ids)})
  `).all(...ids);

  // `grupo` + `menu_nombre` alimentan el agrupamiento por instancia de menú en
  // la vista de Cocina y en Cola del día — ISS-041.
  const menu = db.prepare(`
    SELECT omi.id_orden, omi.id, omi.cantidad, omi.grupo, omi.id_menu_dia,
           pm.nombre AS plato, sm.nombre AS seccion, md.nombre AS menu_nombre
    FROM orden_menu_items omi
    JOIN componentes_menu_dia cmd ON omi.id_componente  = cmd.id
    JOIN platos_menu pm           ON cmd.id_plato_menu  = pm.id
    JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
    JOIN menus_dia md             ON omi.id_menu_dia    = md.id
    WHERE omi.id_orden IN (${placeholders(ids)})
    ORDER BY omi.grupo, omi.id
  `).all(...ids);

  return {
    carta: agruparPorPadre(carta, 'id_orden'),
    menu:  agruparPorPadre(menu,  'id_orden'),
  };
}

function itemsDeReservas(db, ids) {
  if (!ids.length) return { carta: new Map(), menu: new Map() };

  const carta = db.prepare(`
    SELECT rci.id_reserva, rci.id, rci.cantidad, rci.precio_unitario, pc.nombre
    FROM reserva_carta_items rci
    JOIN platos_carta pc ON rci.id_plato_carta = pc.id
    WHERE rci.id_reserva IN (${placeholders(ids)})
  `).all(...ids);

  const menu = db.prepare(`
    SELECT rmi.id_reserva, rmi.id, rmi.cantidad, rmi.grupo, rmi.id_menu_dia,
           pm.nombre AS plato, sm.nombre AS seccion, md.nombre AS menu_nombre
    FROM reserva_menu_items rmi
    JOIN componentes_menu_dia cmd ON rmi.id_componente  = cmd.id
    JOIN platos_menu pm           ON cmd.id_plato_menu  = pm.id
    JOIN secciones_menu sm        ON cmd.id_seccion_menu = sm.id
    JOIN menus_dia md             ON rmi.id_menu_dia    = md.id
    WHERE rmi.id_reserva IN (${placeholders(ids)})
    ORDER BY rmi.grupo, rmi.id
  `).all(...ids);

  return {
    carta: agruparPorPadre(carta, 'id_reserva'),
    menu:  agruparPorPadre(menu,  'id_reserva'),
  };
}

function conItems(registros, items) {
  return registros.map(r => {
    const carta = items.carta.get(r.id) || [];
    const menu  = items.menu.get(r.id)  || [];
    return {
      ...r,
      carta_items: carta,
      menu_items:  menu,
      total: carta.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0),
    };
  });
}

// ── Órdenes ──────────────────────────────────────────────────────────────────

// `anteriores` = false → solo las de hoy (lo que se atiende ahora)
//              = true  → las que quedaron colgadas de días previos (cierre de caja)
function ordenesActivas(db, id_restaurante, hoy, anteriores = false) {
  const comparador = anteriores ? '<' : '=';

  const ordenes = db.prepare(`
    SELECT
      o.id,
      ROW_NUMBER() OVER (PARTITION BY ${columnaFecha('o')} ORDER BY o.id ASC) AS numero_dia,
      o.mesa,
      o.nombre_cliente,
      o.fecha,
      o.created_at,
      o.metodo_pago,
      o.estado_pago,
      o.comprobante_url,
      o.modalidad,
      eo.nombre      AS estatus,
      eo.es_inicial,
      eo.es_en_cocina,
      eo.es_listo,
      eo.es_entregado,
      eo.es_pagado,
      eo.es_cancelado
    FROM ordenes o
    JOIN estatus_orden eo ON o.id_estatus = eo.id
    WHERE o.id_restaurante = ?
      AND eo.es_pagado = 0 AND eo.es_cancelado = 0
      AND ${columnaFecha('o')} ${comparador} ?
    ORDER BY o.created_at ASC
  `).all(id_restaurante, hoy);

  return conItems(ordenes, itemsDeOrdenes(db, ordenes.map(o => o.id)));
}

// ── Reservas ─────────────────────────────────────────────────────────────────

// A diferencia de las órdenes, las reservas futuras SÍ deben verse en la cola:
// el owner necesita confirmarlas antes de que llegue el día. Por eso el corte
// es `>= hoy` y no `= hoy`.
function reservasActivas(db, id_restaurante, hoy, anteriores = false) {
  const comparador = anteriores ? '<' : '>=';

  const reservas = db.prepare(`
    SELECT
      r.id,
      r.codigo,
      r.nombre_cliente,
      r.telefono_cliente,
      r.fecha,
      r.hora_llegada,
      r.mesa,
      r.created_at,
      r.metodo_pago,
      r.estado_pago,
      r.comprobante_url,
      r.modalidad,
      er.nombre          AS estatus,
      er.es_inicial,
      er.es_confirmada,
      er.es_en_cocina,
      er.es_listo,
      er.es_cliente_llego,
      er.es_full,
      er.es_cancelado
    FROM reservas r
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE r.id_restaurante = ?
      AND er.es_full = 0 AND er.es_cancelado = 0
      AND ${columnaFecha('r')} ${comparador} ?
    ORDER BY r.fecha ASC, r.created_at ASC
  `).all(id_restaurante, hoy);

  return conItems(reservas, itemsDeReservas(db, reservas.map(r => r.id)));
}

// ── API del módulo ───────────────────────────────────────────────────────────

/** Todo lo que se atiende hoy: órdenes de hoy + reservas de hoy en adelante. */
function colaDelDia(db, id_restaurante, hoy) {
  return {
    ordenes:  ordenesActivas(db, id_restaurante, hoy),
    reservas: reservasActivas(db, id_restaurante, hoy),
  };
}

/**
 * Cola de cocina — igual que colaDelDia pero acotada a lo que le importa al
 * cocinero: órdenes por preparar (pendientes o en preparación) y reservas ya
 * disparadas a cocina, ambas de HOY. Antes `cocina.js` pedía
 * `/api/orders/activas` (sin filtro de fecha, con N+1) y
 * `/api/reservations?flag=es_en_cocina` (tampoco filtra fecha) — cualquier
 * pedido viejo que quedó "en cocina" sin cerrarse se quedaba ahí para
 * siempre. Ver ISS-030 (mismo patrón que ya resolvió Cola del día en ISS-026).
 *
 * Las reservas futuras (fecha > hoy) nunca tienen es_en_cocina=1 todavía —
 * el job de auto-preparación solo las dispara el mismo día — así que
 * reutilizar reservasActivas (>= hoy) y filtrar por el flag no cuela ninguna
 * reserva de otro día.
 */
function cocinaDelDia(db, id_restaurante, hoy) {
  return {
    ordenes:  ordenesActivas(db, id_restaurante, hoy).filter(o => o.es_inicial || o.es_en_cocina),
    reservas: reservasActivas(db, id_restaurante, hoy).filter(r => r.es_en_cocina),
  };
}

/**
 * Pedidos que quedaron sin cerrar en días anteriores.
 *
 * Importan porque `total` solo se escribe al marcar la orden como cobrada
 * (routes/orders.js) y Ganancias suma `WHERE total IS NOT NULL`: mientras
 * sigan abiertos, ese dinero no aparece en ningún reporte. Ocultarlos sin más
 * sería perderlos; por eso el owner los cierra a mano desde el cierre de caja.
 */
function pedidosSinCerrar(db, id_restaurante, hoy) {
  return {
    ordenes:  ordenesActivas(db, id_restaurante, hoy, true),
    reservas: reservasActivas(db, id_restaurante, hoy, true),
  };
}

module.exports = {
  colaDelDia,
  cocinaDelDia,
  pedidosSinCerrar,
  ordenesActivas,
  reservasActivas,
  agruparPorPadre,
};
