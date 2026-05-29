'use strict';
// Seeder de datos demo para verificar el panel owner en local.
// Crea: secciones, platos, menú del día activo, carta, mesas, reservas y órdenes
// distribuidas en los estados del kanban (Pendientes, En cocina, Listos, Por cobrar).
// Idempotente: si ya hay menú del día de hoy, no duplica.
// Uso: node scripts/seed-demo-data.js

const Database = require('better-sqlite3');
const path     = require('path');
const { generarCodigoUnico } = require('../utils/codigoReserva');

// Inicializa el schema antes de seedear (corre migraciones idempotentes)
require('../config/database');

const db = new Database(path.join(__dirname, '..', 'database.sqlite'));
db.pragma('foreign_keys = ON');

const RID = 1; // Crisolito
const HOY = new Date().toISOString().slice(0, 10);

console.log(`\n🌱 Seed demo — restaurante ${RID} — fecha ${HOY}\n`);

// ─────────────────────────────────────────────────────────────
// Helpers para flags de estatus (sin hardcodear nombres)
// ─────────────────────────────────────────────────────────────
function estatusOrdenPorFlag(flag) {
  return db.prepare(`SELECT id FROM estatus_orden WHERE ${flag} = 1 LIMIT 1`).get().id;
}
function estatusReservaPorFlag(flag) {
  return db.prepare(`SELECT id FROM estatus_reserva WHERE ${flag} = 1 LIMIT 1`).get().id;
}

// ─────────────────────────────────────────────────────────────
// 1. Secciones del menú
// ─────────────────────────────────────────────────────────────
function getOrCreateSeccion(nombre) {
  const ex = db.prepare(`SELECT id FROM secciones_menu WHERE nombre=? AND id_restaurante=?`).get(nombre, RID);
  if (ex) return ex.id;
  return db.prepare(`INSERT INTO secciones_menu (nombre, id_restaurante) VALUES (?, ?)`).run(nombre, RID).lastInsertRowid;
}
const secEntrada = getOrCreateSeccion('Entrada');
const secFondo   = getOrCreateSeccion('Segundo');
const secPostre  = getOrCreateSeccion('Postre');
const secRefresco = getOrCreateSeccion('Refresco');
console.log(`  ✓ Secciones: Entrada, Segundo, Postre, Refresco`);

// ─────────────────────────────────────────────────────────────
// 2. Platos del menú (catálogo base)
// ─────────────────────────────────────────────────────────────
function getOrCreatePlatoMenu(nombre, descripcion = '') {
  const ex = db.prepare(`SELECT id FROM platos_menu WHERE nombre=? AND id_restaurante=?`).get(nombre, RID);
  if (ex) return ex.id;
  return db.prepare(`INSERT INTO platos_menu (nombre, descripcion, id_restaurante) VALUES (?, ?, ?)`).run(nombre, descripcion, RID).lastInsertRowid;
}
const entradas = [
  getOrCreatePlatoMenu('Sopa criolla',  'Sopa con fideos, carne y huevo'),
  getOrCreatePlatoMenu('Causa limeña',  'Causa con pollo'),
  getOrCreatePlatoMenu('Ensalada fresca', 'Lechuga, tomate, palta'),
];
const fondos = [
  getOrCreatePlatoMenu('Arroz con pollo',  'Tradicional con culantro'),
  getOrCreatePlatoMenu('Lomo saltado',     'Carne salteada con papas'),
  getOrCreatePlatoMenu('Tallarín verde',   'Pesto peruano con bistec'),
  getOrCreatePlatoMenu('Ají de gallina',   'Cremoso, con ají amarillo'),
];
const postres = [
  getOrCreatePlatoMenu('Mazamorra morada', 'Postre tradicional'),
  getOrCreatePlatoMenu('Arroz con leche',  'Con canela y pasas'),
];
const refrescos = [
  getOrCreatePlatoMenu('Chicha morada',  'Refresco de maíz morado'),
  getOrCreatePlatoMenu('Limonada',       'Recién exprimida'),
];
console.log(`  ✓ Platos de menú: ${entradas.length + fondos.length + postres.length + refrescos.length}`);

// ─────────────────────────────────────────────────────────────
// 3. Menú del día (elegible)
// ─────────────────────────────────────────────────────────────
let menuId = db.prepare(`SELECT id FROM menus_dia WHERE dia=? AND id_restaurante=? AND nombre=?`).get(HOY, RID, 'Menú del día')?.id || null;
if (!menuId) {
  menuId = db.prepare(`INSERT INTO menus_dia (nombre, elegible, dia, precio, id_restaurante, activo) VALUES (?, 1, ?, 15, ?, 1)`).run('Menú del día', HOY, RID).lastInsertRowid;
  // Vincula secciones al menú
  const insSec = db.prepare(`INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido) VALUES (?, ?, ?)`);
  insSec.run(menuId, secEntrada, 1);
  insSec.run(menuId, secFondo,   1);
  insSec.run(menuId, secPostre,  0);
  insSec.run(menuId, secRefresco,0);
  // Componentes: platos elegibles por sección
  const insComp = db.prepare(`INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante) VALUES (?, ?, ?, ?, ?)`);
  entradas.forEach(p => insComp.run(menuId, HOY, secEntrada, p, RID));
  fondos.forEach(p   => insComp.run(menuId, HOY, secFondo,   p, RID));
  postres.forEach(p  => insComp.run(menuId, HOY, secPostre,  p, RID));
  refrescos.forEach(p=> insComp.run(menuId, HOY, secRefresco,p, RID));
  console.log(`  ✓ Menú del día creado (id=${menuId}, precio S/15, elegible)`);
} else {
  console.log(`  ↻ Menú del día ya existe (id=${menuId}) — saltando`);
}

// IDs útiles de componentes para usar en pedidos
const compsByPlato = db.prepare(`SELECT id, id_plato_menu FROM componentes_menu_dia WHERE id_menu_dia=?`).all(menuId);
const compByPlato = Object.fromEntries(compsByPlato.map(c => [c.id_plato_menu, c.id]));

// ─────────────────────────────────────────────────────────────
// 4. Carta (categorías + platos)
// ─────────────────────────────────────────────────────────────
function getOrCreateCategoria(nombre) {
  const ex = db.prepare(`SELECT id FROM categorias_carta WHERE nombre=? AND id_restaurante=?`).get(nombre, RID);
  if (ex) return ex.id;
  return db.prepare(`INSERT INTO categorias_carta (nombre, id_restaurante) VALUES (?, ?)`).run(nombre, RID).lastInsertRowid;
}
function getOrCreatePlatoCarta(nombre, precio, idCat, descripcion = '') {
  const ex = db.prepare(`SELECT id FROM platos_carta WHERE nombre=? AND id_restaurante=?`).get(nombre, RID);
  if (ex) return ex.id;
  return db.prepare(`INSERT INTO platos_carta (nombre, descripcion, precio, id_categoria, id_restaurante, activo) VALUES (?, ?, ?, ?, ?, 1)`).run(nombre, descripcion, precio, idCat, RID).lastInsertRowid;
}
const catEntradas = getOrCreateCategoria('Entradas');
const catFondos   = getOrCreateCategoria('Fondos');
const catBebidas  = getOrCreateCategoria('Bebidas');

const ceviche  = getOrCreatePlatoCarta('Ceviche clásico', 28, catEntradas, 'Pescado, limón, cebolla');
const tequenos = getOrCreatePlatoCarta('Tequeños (6 u.)',  18, catEntradas, 'Con crema de rocoto');
const lomo     = getOrCreatePlatoCarta('Lomo saltado',     32, catFondos,   'Carne, papas, arroz');
const arroz    = getOrCreatePlatoCarta('Arroz con mariscos', 35, catFondos, 'Con mix de mariscos');
const chicha   = getOrCreatePlatoCarta('Chicha morada (1L)', 10, catBebidas, '');
const inca     = getOrCreatePlatoCarta('Inca Kola (500ml)',   7, catBebidas, '');
console.log(`  ✓ Carta: 3 categorías, 6 platos`);

// ─────────────────────────────────────────────────────────────
// 5. Mesas
// ─────────────────────────────────────────────────────────────
const insMesa = db.prepare(`INSERT OR IGNORE INTO mesas (numero, capacidad, activo, id_restaurante) VALUES (?, ?, 1, ?)`);
for (let n = 1; n <= 6; n++) insMesa.run(n, 4, RID);
console.log(`  ✓ Mesas 1..6`);

// ─────────────────────────────────────────────────────────────
// 6. Reservas en distintos estados
// ─────────────────────────────────────────────────────────────
function nowMinus(minutes) {
  const d = new Date(Date.now() - minutes * 60 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function horaLimaMas(minutes) {
  // hora local (HH:MM) sumando minutos a "ahora"
  const d = new Date(Date.now() + minutes * 60 * 1000);
  return d.toTimeString().slice(0, 5);
}

function crearReserva({ nombre, telefono, mesa, flag, minutosCreada, horaLlegadaMin, items, modalidad = 'en_local' }) {
  const codigo = generarCodigoUnico(db);
  const idEst  = estatusReservaPorFlag(flag);
  const id = db.prepare(`
    INSERT INTO reservas (nombre_cliente, telefono_cliente, fecha, mesa, id_restaurante, id_estatus, hora_llegada, codigo, modalidad)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nombre, telefono, nowMinus(minutosCreada), mesa, RID, idEst, horaLlegadaMin == null ? null : horaLimaMas(horaLlegadaMin), codigo, modalidad).lastInsertRowid;

  const insMenu = db.prepare(`INSERT INTO reserva_menu_items (id_reserva, id_menu_dia, id_componente, cantidad) VALUES (?, ?, ?, ?)`);
  const insCart = db.prepare(`INSERT INTO reserva_carta_items (id_reserva, id_plato_carta, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`);
  for (const it of items) {
    if (it.tipo === 'menu') insMenu.run(id, menuId, compByPlato[it.platoMenuId], it.cantidad || 1);
    else                    insCart.run(id, it.platoCartaId, it.cantidad || 1, db.prepare(`SELECT precio FROM platos_carta WHERE id=?`).get(it.platoCartaId).precio);
  }
  return { id, codigo };
}

// Limpia reservas demo anteriores del día para idempotencia
db.prepare(`DELETE FROM reserva_menu_items  WHERE id_reserva IN (SELECT id FROM reservas WHERE id_restaurante=? AND date(fecha)=date('now'))`).run(RID);
db.prepare(`DELETE FROM reserva_carta_items WHERE id_reserva IN (SELECT id FROM reservas WHERE id_restaurante=? AND date(fecha)=date('now'))`).run(RID);
db.prepare(`DELETE FROM reservas WHERE id_restaurante=? AND date(fecha)=date('now')`).run(RID);

const r1 = crearReserva({
  nombre: 'Ana López',  telefono: '987654321', mesa: 2, flag: 'es_inicial',
  minutosCreada: 5, horaLlegadaMin: 45,
  items: [{ tipo: 'menu', platoMenuId: entradas[1] }, { tipo: 'menu', platoMenuId: fondos[1] }],
});
const r2 = crearReserva({
  nombre: 'Carlos Pérez', telefono: '912345678', mesa: 3, flag: 'es_confirmada',
  minutosCreada: 15, horaLlegadaMin: 30,
  items: [{ tipo: 'menu', platoMenuId: entradas[0] }, { tipo: 'menu', platoMenuId: fondos[2] }, { tipo: 'menu', platoMenuId: postres[0] }],
});
const r3 = crearReserva({
  nombre: 'María Q.',   telefono: '998877665', mesa: 4, flag: 'es_en_cocina',
  minutosCreada: 30, horaLlegadaMin: 10,
  items: [{ tipo: 'menu', platoMenuId: entradas[2] }, { tipo: 'menu', platoMenuId: fondos[0] }, { tipo: 'carta', platoCartaId: chicha }],
});
const r4 = crearReserva({
  nombre: 'José Ramos', telefono: '922334455', mesa: 5, flag: 'es_listo',
  minutosCreada: 40, horaLlegadaMin: 5,
  items: [{ tipo: 'menu', platoMenuId: fondos[3] }, { tipo: 'menu', platoMenuId: refrescos[0] }],
});
const r5 = crearReserva({
  nombre: 'Lucía Vega', telefono: '955443322', mesa: 1, flag: 'es_cliente_llego',
  minutosCreada: 55, horaLlegadaMin: -5,
  items: [{ tipo: 'menu', platoMenuId: fondos[1] }, { tipo: 'carta', platoCartaId: tequenos }],
});
const r6 = crearReserva({
  nombre: 'Pedro M.',   telefono: '900112233', mesa: null, flag: 'es_listo',
  minutosCreada: 25, horaLlegadaMin: 15, modalidad: 'para_llevar',
  items: [{ tipo: 'menu', platoMenuId: fondos[2] }],
});
console.log(`  ✓ Reservas: 6 (inicial / confirmada / en cocina / listo×2 / cliente llegó) — códigos: ${[r1,r2,r3,r4,r5,r6].map(r=>r.codigo).join(', ')}`);

// ─────────────────────────────────────────────────────────────
// 7. Órdenes walk-in en distintos estados del kanban
// ─────────────────────────────────────────────────────────────
function crearOrden({ mesa, nombre, flag, minutosCreada, items, modalidad = 'en_local' }) {
  const idEst = estatusOrdenPorFlag(flag);
  const id = db.prepare(`
    INSERT INTO ordenes (mesa, nombre_cliente, fecha, id_restaurante, id_estatus, modalidad)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(mesa, nombre, nowMinus(minutosCreada), RID, idEst, modalidad).lastInsertRowid;

  const insMenu = db.prepare(`INSERT INTO orden_menu_items (id_orden, id_menu_dia, id_componente, cantidad) VALUES (?, ?, ?, ?)`);
  const insCart = db.prepare(`INSERT INTO orden_carta_items (id_orden, id_plato_carta, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`);
  for (const it of items) {
    if (it.tipo === 'menu') insMenu.run(id, menuId, compByPlato[it.platoMenuId], it.cantidad || 1);
    else                    insCart.run(id, it.platoCartaId, it.cantidad || 1, db.prepare(`SELECT precio FROM platos_carta WHERE id=?`).get(it.platoCartaId).precio);
  }
  return id;
}

// Limpia órdenes demo del día
db.prepare(`DELETE FROM orden_menu_items  WHERE id_orden IN (SELECT id FROM ordenes WHERE id_restaurante=? AND date(fecha)=date('now'))`).run(RID);
db.prepare(`DELETE FROM orden_carta_items WHERE id_orden IN (SELECT id FROM ordenes WHERE id_restaurante=? AND date(fecha)=date('now'))`).run(RID);
db.prepare(`DELETE FROM ordenes WHERE id_restaurante=? AND date(fecha)=date('now')`).run(RID);

crearOrden({ mesa: 1, nombre: 'Walk-in #1', flag: 'es_inicial',   minutosCreada: 3,
  items: [{ tipo: 'menu', platoMenuId: fondos[0] }, { tipo: 'menu', platoMenuId: refrescos[1] }] });
crearOrden({ mesa: 2, nombre: 'Walk-in #2', flag: 'es_en_cocina', minutosCreada: 12,
  items: [{ tipo: 'carta', platoCartaId: ceviche }, { tipo: 'carta', platoCartaId: inca }] });
crearOrden({ mesa: 3, nombre: 'Walk-in #3', flag: 'es_listo',     minutosCreada: 25,
  items: [{ tipo: 'menu', platoMenuId: fondos[1] }, { tipo: 'menu', platoMenuId: postres[1] }] });
crearOrden({ mesa: 6, nombre: 'Walk-in #4', flag: 'es_entregado', minutosCreada: 40,
  items: [{ tipo: 'menu', platoMenuId: fondos[3] }, { tipo: 'carta', platoCartaId: chicha }] });
crearOrden({ mesa: null, nombre: 'Para llevar — Sofía', flag: 'es_en_cocina', minutosCreada: 8, modalidad: 'para_llevar',
  items: [{ tipo: 'carta', platoCartaId: lomo }] });

console.log(`  ✓ Órdenes: 5 (inicial / en cocina×2 / listo / entregado)`);

console.log(`\n✅ Seed completo. Login: owner@bot.com / BotMenuPro2026!\n`);
db.close();
