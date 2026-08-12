/**
 * @jest-environment node
 *
 * Pruebas de autorización por rol en órdenes y reservas (ISS-033).
 *
 * Contexto: `routes/orders.js` y `routes/reservations.js` tenían
 * `router.use(authenticate)` pero varias rutas sin `authorizePermiso()`.
 * Cualquier usuario autenticado del restaurante podía listar todas las
 * reservas (con nombre y teléfono de cada cliente) y crear órdenes/reservas,
 * aunque el owner no le hubiera dado ningún permiso.
 *
 * El rol `pensionista` (agregado en 7a92260) agravó el problema: un comensal
 * con cuenta podía saltarse su propio flujo de saldo llamando a
 * POST /api/orders, creando una orden normal que no le descontaba nada.
 *
 * Un pensionista se crea sin permisos (columna `permisos` NULL en `usuarios`),
 * y el login deja `permisos: null` en el JWT para todo rol que no sea
 * owner/admin — por eso `authorizePermiso()` lo rechaza.
 */

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const express = require('express');

process.env.JWT_SECRET = 'test-secret-para-jest';

const db                 = require('../config/database');
const ordersRoutes       = require('../routes/orders');
const reservationsRoutes = require('../routes/reservations');
const menuRoutes         = require('../routes/menu');
const mesasRoutes        = require('../routes/mesas');

let app, server, baseUrl;
let idRestaurante, idOtroRestaurante;
let idOwner, idPensionista, idMozo;
let tokenOwner, tokenPensionista, tokenMozo;

beforeAll(async () => {
  const { lastInsertRowid: idRest } = db.prepare(`
    INSERT INTO restaurantes (nombre, activo) VALUES ('__AUTORIZACION_TEST__', 1)
  `).run();
  idRestaurante = idRest;

  // Segundo restaurante: para probar que nadie crea órdenes en uno ajeno
  const { lastInsertRowid: idOtro } = db.prepare(`
    INSERT INTO restaurantes (nombre, activo) VALUES ('__AUTORIZACION_TEST_OTRO__', 1)
  `).run();
  idOtroRestaurante = idOtro;

  const hash = bcrypt.hashSync('PasswordTest123!', 10);
  const rolId = nombre => db.prepare(`SELECT id FROM roles WHERE nombre = ?`).get(nombre).id;

  const crearUsuario = (nombre, email, rol, permisos = null) => {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante, permisos)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nombre, email, hash, rolId(rol), idRestaurante, permisos);
    return lastInsertRowid;
  };

  idOwner       = crearUsuario('Owner Autz', 'owner-autz-tmp@menupro.tech', 'owner');
  idPensionista = crearUsuario('Pensionista Autz', 'pensionista-autz-tmp@menupro.tech', 'pensionista');
  idMozo        = crearUsuario('Mozo Autz', 'mozo-autz-tmp@menupro.tech', 'mozo', JSON.stringify(['ordenes']));

  const firmar = (id, name, role, permisos) => jwt.sign(
    { id, name, role, restaurant_id: idRestaurante, permisos },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Mismo payload que arma routes/auth.js: null para owner, null para un rol
  // sin permisos asignados (el pensionista), array para el mozo.
  tokenOwner       = firmar(idOwner,       'Owner Autz',       'owner',       null);
  tokenPensionista = firmar(idPensionista, 'Pensionista Autz', 'pensionista', null);
  tokenMozo        = firmar(idMozo,        'Mozo Autz',        'mozo',        ['ordenes']);

  app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRoutes);
  app.use('/api/reservations', reservationsRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/mesas', mesasRoutes);

  await new Promise(resolve => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  try {
    [idOwner, idPensionista, idMozo].forEach(id =>
      db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(id));
    // Las reservas creadas por el test cuelgan del restaurante — se borran antes
    db.prepare(`DELETE FROM reservas WHERE id_restaurante = ?`).run(idRestaurante);
    db.prepare(`DELETE FROM ordenes  WHERE id_restaurante = ?`).run(idRestaurante);
    [idRestaurante, idOtroRestaurante].forEach(id =>
      db.prepare(`DELETE FROM restaurantes WHERE id = ?`).run(id));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
  }
});

const pedir = (metodo, ruta, token, body) => fetch(`${baseUrl}${ruta}`, {
  method: metodo,
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

// Rutas que antes solo pedían estar autenticado
const RUTAS_LECTURA = [
  ['GET', '/api/orders'],
  ['GET', '/api/orders/activas'],
  ['GET', '/api/orders/estatus'],
  ['GET', '/api/reservations'],
  ['GET', '/api/reservations/estatus'],
];

describe('ISS-033 — un pensionista no puede leer órdenes ni reservas', () => {
  test.each(RUTAS_LECTURA)('%s %s → 403 con token de pensionista', async (metodo, ruta) => {
    const res = await pedir(metodo, ruta, tokenPensionista);
    expect(res.status).toBe(403);
  });

  test.each(RUTAS_LECTURA)('%s %s → 200 con token de owner', async (metodo, ruta) => {
    const res = await pedir(metodo, ruta, tokenOwner);
    expect(res.status).toBe(200);
  });

  test('sin token sigue devolviendo 401, no 403', async () => {
    const res = await pedir('GET', '/api/reservations', null);
    expect(res.status).toBe(401);
  });
});

describe('ISS-033 — un pensionista no puede crear órdenes ni reservas', () => {
  test('POST /api/orders → 403 (no puede saltarse el descuento de saldo)', async () => {
    const res = await pedir('POST', '/api/orders', tokenPensionista, {
      nombre_cliente: 'Colado',
      carta_items: [{ id_plato_carta: 1, cantidad: 1 }],
    });
    expect(res.status).toBe(403);
  });

  test('POST /api/reservations → 403', async () => {
    const res = await pedir('POST', '/api/reservations', tokenPensionista, {
      nombre_cliente: 'Colado',
      fecha: '2026-08-20',
    });
    expect(res.status).toBe(403);
  });
});

// Catálogo del panel: el pensionista no gestiona el menú ni las mesas. Su
// propia página leerá la carta por /api/public/menu y /api/public/carta, que
// son rutas anónimas de routes/public.js y no pasan por acá.
const RUTAS_PANEL = [
  ['GET', '/api/menu/secciones'],
  ['GET', '/api/menu/platos-menu'],
  ['GET', '/api/menu/menus-dia'],
  ['GET', '/api/menu/categorias'],
  ['GET', '/api/menu/platos-carta'],
  ['GET', '/api/mesas'],
  ['GET', '/api/mesas/estado'],
];

describe('ISS-033 — un pensionista no puede leer el catálogo del panel', () => {
  test.each(RUTAS_PANEL)('%s %s → 403 con token de pensionista', async (metodo, ruta) => {
    const res = await pedir(metodo, ruta, tokenPensionista);
    expect(res.status).toBe(403);
  });

  test.each(RUTAS_PANEL)('%s %s → 200 con token de owner', async (metodo, ruta) => {
    const res = await pedir(metodo, ruta, tokenOwner);
    expect(res.status).toBe(200);
  });
});

describe('ISS-033 — el restaurante sale del token, no del body', () => {
  test('POST /api/reservations ignora un id_restaurante ajeno en el body', async () => {
    const res = await pedir('POST', '/api/reservations', tokenMozo, {
      id_restaurante: idOtroRestaurante,   // intento de crear en otro restaurante
      nombre_cliente: 'Cliente Cruzado',
      fecha: '2026-08-20',
    });
    expect(res.status).toBe(201);

    const creada = db.prepare(`
      SELECT id_restaurante FROM reservas WHERE nombre_cliente = 'Cliente Cruzado'
    `).get();
    expect(creada.id_restaurante).toBe(idRestaurante);
    expect(creada.id_restaurante).not.toBe(idOtroRestaurante);
  });

  test('el mozo con al menos un permiso sí puede listar reservas', async () => {
    const res = await pedir('GET', '/api/reservations', tokenMozo);
    expect(res.status).toBe(200);
  });
});
