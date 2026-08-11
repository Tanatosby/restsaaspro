/**
 * @jest-environment node
 *
 * Pruebas de cancelación de un pedido de pensionista — debe devolver saldo
 * Y stock automáticamente, tanto si cancela el propio pensionista
 * (routes/pensionista.js) como si lo cancela el owner/staff desde Cola del
 * día/Cocina (routes/pensionistas.js). Ver pensionistas.md §7.
 */

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const express = require('express');

process.env.JWT_SECRET = 'test-secret-para-jest';

const db = require('../config/database');
const { fechaLima } = require('../utils/fecha');
const pensionistaRoutes  = require('../routes/pensionista');
const pensionistasRoutes = require('../routes/pensionistas');

let app, server, baseUrl;
let idRestaurante, idOwner, tokenOwner;
let idPensionista, idUsuarioPensionista, tokenPensionista;
let idComponente, idMenuDia, precioMenu;

beforeAll(async () => {
  const { lastInsertRowid: idRest } = db.prepare(`
    INSERT INTO restaurantes (nombre, activo) VALUES ('__PENSIONISTA_CANCEL_TEST__', 1)
  `).run();
  idRestaurante = idRest;

  precioMenu = 12;
  const { lastInsertRowid: idSeccion } = db.prepare(`
    INSERT INTO secciones_menu (nombre, id_restaurante) VALUES ('Fondo', ?)
  `).run(idRestaurante);
  const { lastInsertRowid: idPlatoMenu } = db.prepare(`
    INSERT INTO platos_menu (nombre, id_restaurante) VALUES ('Lomo saltado', ?)
  `).run(idRestaurante);
  const hoy = fechaLima();
  const { lastInsertRowid: idMenuDiaCreado } = db.prepare(`
    INSERT INTO menus_dia (nombre, elegible, dia, precio, id_restaurante) VALUES ('Menú del día', 0, ?, ?, ?)
  `).run(hoy, precioMenu, idRestaurante);
  idMenuDia = idMenuDiaCreado;
  db.prepare(`
    INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido) VALUES (?, ?, 1)
  `).run(idMenuDia, idSeccion);
  // Con control de stock, para probar que la cancelación también lo devuelve
  const { lastInsertRowid: idComp } = db.prepare(`
    INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante, stock_inicial, stock_restante)
    VALUES (?, ?, ?, ?, ?, 10, 10)
  `).run(idMenuDia, hoy, idSeccion, idPlatoMenu, idRestaurante);
  idComponente = idComp;

  const rolOwner = db.prepare(`SELECT id FROM roles WHERE nombre = 'owner'`).get();
  const hashOwner = bcrypt.hashSync('PasswordDueño123!', 10);
  const { lastInsertRowid: idU1 } = db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
    VALUES ('Owner Cancel Test', 'owner-pensionista-cancel-tmp@example.com', ?, ?, ?)
  `).run(hashOwner, rolOwner.id, idRestaurante);
  idOwner = idU1;
  tokenOwner = jwt.sign(
    { id: idOwner, name: 'Owner Test', role: 'owner', restaurant_id: idRestaurante, permisos: null },
    process.env.JWT_SECRET, { expiresIn: '1d' }
  );

  const rolPensionista = db.prepare(`SELECT id FROM roles WHERE nombre = 'pensionista'`).get();
  const hashP = bcrypt.hashSync('PasswordPension123!', 10);
  const { lastInsertRowid: idU2 } = db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
    VALUES ('Juan', 'pensionista-cancel-tmp@menupro.tech', ?, ?, ?)
  `).run(hashP, rolPensionista.id, idRestaurante);
  idUsuarioPensionista = idU2;
  const { lastInsertRowid: idP } = db.prepare(`
    INSERT INTO pensionistas (id_usuario, apellido, saldo, id_restaurante) VALUES (?, 'Pérez', 100, ?)
  `).run(idUsuarioPensionista, idRestaurante);
  idPensionista = idP;
  tokenPensionista = jwt.sign(
    { id: idUsuarioPensionista, name: 'Juan', role: 'pensionista', restaurant_id: idRestaurante, permisos: null },
    process.env.JWT_SECRET, { expiresIn: '1d' }
  );

  app = express();
  app.use(express.json());
  app.use('/api/pensionista',  pensionistaRoutes);
  app.use('/api/pensionistas', pensionistasRoutes);

  await new Promise(resolve => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  try {
    db.prepare(`DELETE FROM pensionista_movimientos WHERE id_pensionista = ?`).run(idPensionista);
    db.prepare(`DELETE FROM pedido_pensionista_menu_items WHERE id_pedido IN (SELECT id FROM pedidos_pensionista WHERE id_pensionista = ?)`).run(idPensionista);
    db.prepare(`DELETE FROM pedidos_pensionista WHERE id_pensionista = ?`).run(idPensionista);
    db.prepare(`DELETE FROM pensionistas WHERE id = ?`).run(idPensionista);
    db.prepare(`DELETE FROM usuarios WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM componentes_menu_dia WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM menu_secciones WHERE id_menu_dia IN (SELECT id FROM menus_dia WHERE id_restaurante = ?)`).run(idRestaurante);
    db.prepare(`DELETE FROM menus_dia WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM platos_menu WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM secciones_menu WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM restaurantes WHERE id = ?`).run(idRestaurante);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
  }
});

function authPensionista() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenPensionista}` };
}
function authOwner() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenOwner}` };
}
function saldoActual() {
  return db.prepare(`SELECT saldo FROM pensionistas WHERE id = ?`).get(idPensionista).saldo;
}
function stockActual() {
  return db.prepare(`SELECT stock_restante FROM componentes_menu_dia WHERE id = ?`).get(idComponente).stock_restante;
}

async function crearPedido() {
  const res = await fetch(`${baseUrl}/api/pensionista/pedido`, {
    method: 'POST', headers: authPensionista(),
    body: JSON.stringify({ menu_items: [{ id_componente: idComponente, id_menu_dia: idMenuDia, cantidad: 1 }] }),
  });
  return res.json();
}

describe('PATCH /api/pensionista/pedido/:id/cancelar (autoservicio)', () => {
  test('devuelve saldo y stock, y marca el pedido como cancelado', async () => {
    const saldoAntes = saldoActual();
    const stockAntes = stockActual();
    const pedido = await crearPedido();
    expect(saldoActual()).toBe(saldoAntes - precioMenu);
    expect(stockActual()).toBe(stockAntes - 1);

    const res = await fetch(`${baseUrl}/api/pensionista/pedido/${pedido.id_pedido}/cancelar`, {
      method: 'PATCH', headers: authPensionista(),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.saldo_restante).toBe(saldoAntes);
    expect(saldoActual()).toBe(saldoAntes);
    expect(stockActual()).toBe(stockAntes);

    const estatus = db.prepare(`
      SELECT eo.nombre FROM pedidos_pensionista pp JOIN estatus_orden eo ON pp.id_estatus = eo.id WHERE pp.id = ?
    `).get(pedido.id_pedido);
    expect(estatus.nombre).toBe('cancelado');

    const mov = db.prepare(`
      SELECT * FROM pensionista_movimientos WHERE id_pedido_pensionista = ? AND tipo = 'devolucion'
    `).get(pedido.id_pedido);
    expect(mov.monto).toBe(precioMenu);
    expect(mov.saldo_resultante).toBe(saldoAntes);
  });

  test('rechaza cancelar un pedido ya cancelado', async () => {
    const pedido = await crearPedido();
    await fetch(`${baseUrl}/api/pensionista/pedido/${pedido.id_pedido}/cancelar`, { method: 'PATCH', headers: authPensionista() });

    const res = await fetch(`${baseUrl}/api/pensionista/pedido/${pedido.id_pedido}/cancelar`, {
      method: 'PATCH', headers: authPensionista(),
    });
    expect(res.status).toBe(400);
  });

  test('rechaza cancelar un pedido inexistente', async () => {
    const res = await fetch(`${baseUrl}/api/pensionista/pedido/999999/cancelar`, {
      method: 'PATCH', headers: authPensionista(),
    });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/pensionistas/pedidos/:id/estatus (owner/staff)', () => {
  test('mueve el pedido por el flujo de cocina sin tocar el saldo', async () => {
    const pedido = await crearPedido();
    const saldoTrasPedir = saldoActual();

    const res = await fetch(`${baseUrl}/api/pensionistas/pedidos/${pedido.id_pedido}/estatus`, {
      method: 'PATCH', headers: authOwner(), body: JSON.stringify({ flag: 'es_en_cocina' }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.estatus).toBe('preparando');
    expect(saldoActual()).toBe(saldoTrasPedir); // no cambia por avanzar de estado

    // limpieza: lo cancelamos para devolver saldo/stock del test
    await fetch(`${baseUrl}/api/pensionistas/pedidos/${pedido.id_pedido}/estatus`, {
      method: 'PATCH', headers: authOwner(), body: JSON.stringify({ flag: 'es_cancelado' }),
    });
  });

  test('cancelar desde el owner también devuelve saldo y stock', async () => {
    const saldoAntes = saldoActual();
    const stockAntes = stockActual();
    const pedido = await crearPedido();

    const res = await fetch(`${baseUrl}/api/pensionistas/pedidos/${pedido.id_pedido}/estatus`, {
      method: 'PATCH', headers: authOwner(), body: JSON.stringify({ flag: 'es_cancelado' }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.estatus).toBe('cancelado');
    expect(saldoActual()).toBe(saldoAntes);
    expect(stockActual()).toBe(stockAntes);
  });

  test('rechaza un flag inválido', async () => {
    const pedido = await crearPedido();
    const res = await fetch(`${baseUrl}/api/pensionistas/pedidos/${pedido.id_pedido}/estatus`, {
      method: 'PATCH', headers: authOwner(), body: JSON.stringify({ flag: 'no_existe' }),
    });
    expect(res.status).toBe(400);
    await fetch(`${baseUrl}/api/pensionistas/pedidos/${pedido.id_pedido}/estatus`, {
      method: 'PATCH', headers: authOwner(), body: JSON.stringify({ flag: 'es_cancelado' }),
    });
  });

  test('rechaza cambiar un pedido ya cancelado', async () => {
    const pedido = await crearPedido();
    await fetch(`${baseUrl}/api/pensionistas/pedidos/${pedido.id_pedido}/estatus`, {
      method: 'PATCH', headers: authOwner(), body: JSON.stringify({ flag: 'es_cancelado' }),
    });

    const res = await fetch(`${baseUrl}/api/pensionistas/pedidos/${pedido.id_pedido}/estatus`, {
      method: 'PATCH', headers: authOwner(), body: JSON.stringify({ flag: 'es_en_cocina' }),
    });
    expect(res.status).toBe(400);
  });
});
