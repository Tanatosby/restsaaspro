/**
 * @jest-environment node
 *
 * Pruebas para routes/pensionista.js — endpoints del propio pensionista
 * logueado: ver saldo, armar pedido con descuento automático, historial
 * propio. Ver pensionistas.md §0, §4, §7, §9.
 */

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const express = require('express');

process.env.JWT_SECRET = 'test-secret-para-jest';

const db = require('../config/database');
const { fechaLima } = require('../utils/fecha');
const pensionistaRoutes = require('../routes/pensionista');

let app, server, baseUrl;
let idRestaurante, idPensionista, idUsuarioPensionista, tokenPensionista;
let idComponente, idMenuDia, idPlatoCarta, precioMenu, precioCarta;

beforeAll(async () => {
  const { lastInsertRowid: idRest } = db.prepare(`
    INSERT INTO restaurantes (nombre, activo) VALUES ('__PENSIONISTA_PEDIDOS_TEST__', 1)
  `).run();
  idRestaurante = idRest;

  // Menú del día: 1 sección obligatoria, 1 plato, sin control de stock
  precioMenu = 15;
  const { lastInsertRowid: idSeccion } = db.prepare(`
    INSERT INTO secciones_menu (nombre, id_restaurante) VALUES ('Fondo', ?)
  `).run(idRestaurante);
  const { lastInsertRowid: idPlatoMenu } = db.prepare(`
    INSERT INTO platos_menu (nombre, id_restaurante) VALUES ('Arroz con pollo', ?)
  `).run(idRestaurante);
  const hoy = fechaLima();
  const { lastInsertRowid: idMenuDiaCreado } = db.prepare(`
    INSERT INTO menus_dia (nombre, elegible, dia, precio, id_restaurante) VALUES ('Menú del día', 0, ?, ?, ?)
  `).run(hoy, precioMenu, idRestaurante);
  idMenuDia = idMenuDiaCreado;
  db.prepare(`
    INSERT INTO menu_secciones (id_menu_dia, id_seccion_menu, requerido) VALUES (?, ?, 1)
  `).run(idMenuDia, idSeccion);
  const { lastInsertRowid: idComp } = db.prepare(`
    INSERT INTO componentes_menu_dia (id_menu_dia, dia, id_seccion_menu, id_plato_menu, id_restaurante)
    VALUES (?, ?, ?, ?, ?)
  `).run(idMenuDia, hoy, idSeccion, idPlatoMenu, idRestaurante);
  idComponente = idComp;

  // Carta: 1 plato adicional
  precioCarta = 5;
  const { lastInsertRowid: idCategoria } = db.prepare(`
    INSERT INTO categorias_carta (nombre, id_restaurante) VALUES ('Bebidas', ?)
  `).run(idRestaurante);
  const { lastInsertRowid: idPlato } = db.prepare(`
    INSERT INTO platos_carta (nombre, precio, activo, id_categoria, id_restaurante)
    VALUES ('Chicha morada', ?, 1, ?, ?)
  `).run(precioCarta, idCategoria, idRestaurante);
  idPlatoCarta = idPlato;

  // Pensionista con saldo 100
  const rolPensionista = db.prepare(`SELECT id FROM roles WHERE nombre = 'pensionista'`).get();
  const hash = bcrypt.hashSync('PasswordPension123!', 10);
  const { lastInsertRowid: idU } = db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
    VALUES ('Juan', 'pensionista-pedidos-tmp@menupro.tech', ?, ?, ?)
  `).run(hash, rolPensionista.id, idRestaurante);
  idUsuarioPensionista = idU;

  const { lastInsertRowid: idP } = db.prepare(`
    INSERT INTO pensionistas (id_usuario, apellido, saldo, id_restaurante) VALUES (?, 'Pérez', 100, ?)
  `).run(idUsuarioPensionista, idRestaurante);
  idPensionista = idP;

  tokenPensionista = jwt.sign(
    { id: idUsuarioPensionista, name: 'Juan', role: 'pensionista', restaurant_id: idRestaurante, permisos: null },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  app = express();
  app.use(express.json());
  app.use('/api/pensionista', pensionistaRoutes);

  await new Promise(resolve => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/pensionista`;
});

afterAll(async () => {
  // Orden inverso a las FK: primero los ítems/movimientos, al final el
  // restaurante. Envuelto en try/finally para que el server SIEMPRE se
  // cierre, aunque la limpieza falle (si no, Jest queda colgado esperando
  // el handle del server abierto).
  try {
    db.prepare(`DELETE FROM pensionista_movimientos WHERE id_pensionista = ?`).run(idPensionista);
    db.prepare(`DELETE FROM pedido_pensionista_menu_items WHERE id_pedido IN (SELECT id FROM pedidos_pensionista WHERE id_pensionista = ?)`).run(idPensionista);
    db.prepare(`DELETE FROM pedido_pensionista_carta_items WHERE id_pedido IN (SELECT id FROM pedidos_pensionista WHERE id_pensionista = ?)`).run(idPensionista);
    db.prepare(`DELETE FROM pedidos_pensionista WHERE id_pensionista = ?`).run(idPensionista);
    db.prepare(`DELETE FROM pensionistas WHERE id = ?`).run(idPensionista);
    db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(idUsuarioPensionista);
    db.prepare(`DELETE FROM componentes_menu_dia WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM menu_secciones WHERE id_menu_dia IN (SELECT id FROM menus_dia WHERE id_restaurante = ?)`).run(idRestaurante);
    db.prepare(`DELETE FROM menus_dia WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM platos_menu WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM secciones_menu WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM platos_carta WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM categorias_carta WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM restaurantes WHERE id = ?`).run(idRestaurante);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
  }
});

function auth() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenPensionista}` };
}

function saldoActual() {
  return db.prepare(`SELECT saldo FROM pensionistas WHERE id = ?`).get(idPensionista).saldo;
}

describe('GET /api/pensionista/me', () => {
  test('devuelve saldo y datos propios', async () => {
    const res = await fetch(`${baseUrl}/me`, { headers: auth() });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.saldo).toBe(100);
    expect(data.apellido).toBe('Pérez');
    expect(data.saldo_bajo).toBe(false); // 100 > umbral default 20
  });
});

describe('POST /api/pensionista/pedido', () => {
  test('crea el pedido, descuenta el saldo exacto y registra el movimiento de consumo', async () => {
    const res = await fetch(`${baseUrl}/pedido`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ menu_items: [{ id_componente: idComponente, id_menu_dia: idMenuDia, cantidad: 1 }] }),
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.total).toBe(precioMenu);
    expect(data.saldo_restante).toBe(100 - precioMenu);
    expect(saldoActual()).toBe(100 - precioMenu);

    const mov = db.prepare(`
      SELECT * FROM pensionista_movimientos WHERE id_pedido_pensionista = ?
    `).get(data.id_pedido);
    expect(mov.tipo).toBe('consumo');
    expect(mov.monto).toBe(-precioMenu);
    expect(mov.saldo_resultante).toBe(100 - precioMenu);
  });

  test('combina menú + carta y suma ambos totales', async () => {
    const antes = saldoActual();
    const res = await fetch(`${baseUrl}/pedido`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({
        menu_items: [{ id_componente: idComponente, id_menu_dia: idMenuDia, cantidad: 1 }],
        carta_items: [{ id_plato_carta: idPlatoCarta, cantidad: 2 }],
      }),
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.total).toBe(precioMenu + precioCarta * 2);
    expect(saldoActual()).toBe(antes - (precioMenu + precioCarta * 2));
  });

  test('bloquea el pedido si el saldo no alcanza, sin tocar el saldo', async () => {
    const antes = saldoActual();
    const res = await fetch(`${baseUrl}/pedido`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ carta_items: [{ id_plato_carta: idPlatoCarta, cantidad: 999 }] }),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Saldo insuficiente/);
    expect(saldoActual()).toBe(antes); // no se tocó
  });

  test('rechaza un pedido sin ítems', async () => {
    const res = await fetch(`${baseUrl}/pedido`, {
      method: 'POST', headers: auth(), body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test('respeta el horario de atención del restaurante', async () => {
    // Cierra el restaurante fuera de cualquier hora posible ahora mismo
    db.prepare(`
      UPDATE restaurantes SET horario_activo = 1, hora_apertura = '00:00', hora_cierre = '00:01'
      WHERE id = ?
    `).run(idRestaurante);

    const antes = saldoActual();
    const res = await fetch(`${baseUrl}/pedido`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ carta_items: [{ id_plato_carta: idPlatoCarta, cantidad: 1 }] }),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/cerrado/i);
    expect(saldoActual()).toBe(antes);

    db.prepare(`UPDATE restaurantes SET horario_activo = 0 WHERE id = ?`).run(idRestaurante);
  });

  test('revierte todo si el stock no alcanza (saldo intacto, pedido no se crea)', async () => {
    db.prepare(`UPDATE componentes_menu_dia SET stock_inicial = 0, stock_restante = 0 WHERE id = ?`).run(idComponente);
    const antes = saldoActual();
    const pedidosAntes = db.prepare(`SELECT COUNT(*) n FROM pedidos_pensionista WHERE id_pensionista = ?`).get(idPensionista).n;

    const res = await fetch(`${baseUrl}/pedido`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ menu_items: [{ id_componente: idComponente, id_menu_dia: idMenuDia, cantidad: 1 }] }),
    });
    expect(res.status).toBe(409);
    expect(saldoActual()).toBe(antes);
    const pedidosDespues = db.prepare(`SELECT COUNT(*) n FROM pedidos_pensionista WHERE id_pensionista = ?`).get(idPensionista).n;
    expect(pedidosDespues).toBe(pedidosAntes);

    db.prepare(`UPDATE componentes_menu_dia SET stock_inicial = NULL, stock_restante = NULL WHERE id = ?`).run(idComponente);
  });

  test('bloquea a un pensionista dado de baja', async () => {
    db.prepare(`UPDATE pensionistas SET activo = 0 WHERE id = ?`).run(idPensionista);
    const res = await fetch(`${baseUrl}/pedido`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ carta_items: [{ id_plato_carta: idPlatoCarta, cantidad: 1 }] }),
    });
    expect(res.status).toBe(403);
    db.prepare(`UPDATE pensionistas SET activo = 1 WHERE id = ?`).run(idPensionista);
  });
});

describe('GET /api/pensionista/mis-pedidos', () => {
  test('lista los pedidos propios con ítems y estatus', async () => {
    const res = await fetch(`${baseUrl}/mis-pedidos`, { headers: auth() });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('estatus');
    expect(data[0]).toHaveProperty('menu_items');
    expect(data[0]).toHaveProperty('carta_items');
  });
});
