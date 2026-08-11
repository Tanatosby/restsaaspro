/**
 * @jest-environment node
 *
 * Pruebas para routes/pensionistas.js — módulo owner del pensionista
 * (comensal recurrente con saldo prepagado). Ver pensionistas.md §0-§6.
 */

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const express = require('express');

process.env.JWT_SECRET = 'test-secret-para-jest';

const db = require('../config/database');
const pensionistasRoutes = require('../routes/pensionistas');
const usuariosRoutes     = require('../routes/usuarios');

let app, idRestaurante, idOwner, tokenOwner, server, baseUrl, baseUrlUsuarios;
const pensionistasCreados = []; // ids de pensionistas (para borrar usuario + pensionista)

beforeAll(async () => {
  const { lastInsertRowid: idRest } = db.prepare(`
    INSERT INTO restaurantes (nombre, activo) VALUES ('__PENSIONISTAS_TEST__', 1)
  `).run();
  idRestaurante = idRest;

  const rolOwner = db.prepare(`SELECT id FROM roles WHERE nombre = 'owner'`).get();
  const hash = bcrypt.hashSync('PasswordDueño123!', 10);
  const { lastInsertRowid: idU } = db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
    VALUES ('Owner Pensionistas Test', 'owner-pensionistas-tmp@example.com', ?, ?, ?)
  `).run(hash, rolOwner.id, idRestaurante);
  idOwner = idU;

  tokenOwner = jwt.sign(
    { id: idOwner, name: 'Owner Test', role: 'owner', restaurant_id: idRestaurante, permisos: null },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  app = express();
  app.use(express.json());
  app.use('/api/pensionistas', pensionistasRoutes);
  app.use('/api/usuarios', usuariosRoutes);

  await new Promise(resolve => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/pensionistas`;
  baseUrlUsuarios = `http://127.0.0.1:${server.address().port}/api/usuarios`;
});

afterAll(async () => {
  pensionistasCreados.forEach(id => {
    const p = db.prepare(`SELECT id_usuario FROM pensionistas WHERE id = ?`).get(id);
    db.prepare(`DELETE FROM pensionista_movimientos WHERE id_pensionista = ?`).run(id);
    db.prepare(`DELETE FROM pensionistas WHERE id = ?`).run(id);
    if (p) db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(p.id_usuario);
  });
  db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(idOwner);
  db.prepare(`DELETE FROM restaurantes WHERE id = ?`).run(idRestaurante);
  if (server) await new Promise(resolve => server.close(resolve));
});

function auth(headers = {}) {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenOwner}`, ...headers };
}

async function crearPensionista(overrides = {}) {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({
      nombre: 'Juan', apellido: 'Pérez', email: `pensionista-${Date.now()}-${Math.random()}@menupro.tech`,
      telefono: '999999999', password: 'PasswordPension123!', saldo_inicial: 50,
      ...overrides,
    }),
  });
  return res;
}

describe('POST /api/pensionistas', () => {
  test('crea el pensionista con saldo inicial y registra el movimiento de recarga', async () => {
    const res = await crearPensionista();
    const data = await res.json();
    expect(res.status).toBe(201);
    pensionistasCreados.push(data.id);

    const fila = db.prepare(`SELECT saldo FROM pensionistas WHERE id = ?`).get(data.id);
    expect(fila.saldo).toBe(50);

    const mov = db.prepare(`SELECT * FROM pensionista_movimientos WHERE id_pensionista = ?`).get(data.id);
    expect(mov.tipo).toBe('recarga');
    expect(mov.monto).toBe(50);
    expect(mov.saldo_resultante).toBe(50);
  });

  test('sin saldo_inicial, crea el pensionista con saldo 0 y sin movimiento', async () => {
    const res = await crearPensionista({ saldo_inicial: undefined, email: `pensionista-sinsaldo-${Date.now()}@menupro.tech` });
    const data = await res.json();
    expect(res.status).toBe(201);
    pensionistasCreados.push(data.id);

    const fila = db.prepare(`SELECT saldo FROM pensionistas WHERE id = ?`).get(data.id);
    expect(fila.saldo).toBe(0);

    const mov = db.prepare(`SELECT * FROM pensionista_movimientos WHERE id_pensionista = ?`).get(data.id);
    expect(mov).toBeUndefined();
  });

  test('rechaza email fuera de @menupro.tech', async () => {
    const res = await crearPensionista({ email: 'juan@gmail.com' });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/@menupro\.tech/);
  });

  test('rechaza saldo_inicial negativo', async () => {
    const res = await crearPensionista({ saldo_inicial: -10, email: `pensionista-neg-${Date.now()}@menupro.tech` });
    expect(res.status).toBe(400);
  });

  test('rechaza sin apellido', async () => {
    const res = await crearPensionista({ apellido: '', email: `pensionista-sinape-${Date.now()}@menupro.tech` });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/apellido/i);
  });
});

describe('GET /api/pensionistas', () => {
  test('lista solo los pensionistas del restaurante del owner', async () => {
    const res = await fetch(baseUrl, { headers: auth() });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data.every(p => 'saldo' in p && 'apellido' in p)).toBe(true);
  });
});

describe('POST /api/pensionistas/:id/recargar', () => {
  test('suma al saldo existente y registra el movimiento', async () => {
    const creado = await (await crearPensionista({ saldo_inicial: 20, email: `pensionista-recarga-${Date.now()}@menupro.tech` })).json();
    pensionistasCreados.push(creado.id);

    const res = await fetch(`${baseUrl}/${creado.id}/recargar`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ monto: 30, nota: 'Recarga semana' }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.saldo).toBe(50);

    const fila = db.prepare(`SELECT saldo FROM pensionistas WHERE id = ?`).get(creado.id);
    expect(fila.saldo).toBe(50);
  });

  test('rechaza monto <= 0', async () => {
    const creado = await (await crearPensionista({ email: `pensionista-recarga2-${Date.now()}@menupro.tech` })).json();
    pensionistasCreados.push(creado.id);

    const res = await fetch(`${baseUrl}/${creado.id}/recargar`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ monto: 0 }),
    });
    expect(res.status).toBe(400);
  });

  test('rechaza recargar a un pensionista dado de baja', async () => {
    const creado = await (await crearPensionista({ email: `pensionista-baja-${Date.now()}@menupro.tech` })).json();
    pensionistasCreados.push(creado.id);
    await fetch(`${baseUrl}/${creado.id}/activo`, { method: 'PATCH', headers: auth(), body: JSON.stringify({ activo: 0 }) });

    const res = await fetch(`${baseUrl}/${creado.id}/recargar`, {
      method: 'POST', headers: auth(), body: JSON.stringify({ monto: 10 }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/pensionistas/:id/movimientos', () => {
  test('devuelve el historial ordenado del más reciente al más viejo', async () => {
    const creado = await (await crearPensionista({ saldo_inicial: 10, email: `pensionista-hist-${Date.now()}@menupro.tech` })).json();
    pensionistasCreados.push(creado.id);
    await fetch(`${baseUrl}/${creado.id}/recargar`, { method: 'POST', headers: auth(), body: JSON.stringify({ monto: 15 }) });

    const res = await fetch(`${baseUrl}/${creado.id}/movimientos`, { headers: auth() });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.length).toBe(2);
    expect(data[0].tipo).toBe('recarga');
    expect(data[0].monto).toBe(15);
  });
});

describe('PATCH /api/pensionistas/:id', () => {
  test('edita nombre y teléfono', async () => {
    const creado = await (await crearPensionista({ email: `pensionista-edit-${Date.now()}@menupro.tech` })).json();
    pensionistasCreados.push(creado.id);

    const res = await fetch(`${baseUrl}/${creado.id}`, {
      method: 'PATCH', headers: auth(), body: JSON.stringify({ nombre: 'Juan Carlos', telefono: '988888888' }),
    });
    expect(res.status).toBe(200);

    const fila = db.prepare(`
      SELECT u.nombre, p.telefono FROM pensionistas p JOIN usuarios u ON p.id_usuario = u.id WHERE p.id = ?
    `).get(creado.id);
    expect(fila.nombre).toBe('Juan Carlos');
    expect(fila.telefono).toBe('988888888');
  });
});

describe('PATCH /api/pensionistas/:id/password', () => {
  test('actualiza el hash de password', async () => {
    const creado = await (await crearPensionista({ email: `pensionista-pass-${Date.now()}@menupro.tech` })).json();
    pensionistasCreados.push(creado.id);

    const res = await fetch(`${baseUrl}/${creado.id}/password`, {
      method: 'PATCH', headers: auth(), body: JSON.stringify({ password: 'NuevaPassword123!' }),
    });
    expect(res.status).toBe(200);
  });

  test('rechaza password corta', async () => {
    const creado = await (await crearPensionista({ email: `pensionista-passcorta-${Date.now()}@menupro.tech` })).json();
    pensionistasCreados.push(creado.id);

    const res = await fetch(`${baseUrl}/${creado.id}/password`, {
      method: 'PATCH', headers: auth(), body: JSON.stringify({ password: '123' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/pensionistas/:id/activo', () => {
  test('da de baja lógica sin borrar historial', async () => {
    const creado = await (await crearPensionista({ email: `pensionista-desact-${Date.now()}@menupro.tech` })).json();
    pensionistasCreados.push(creado.id);

    const res = await fetch(`${baseUrl}/${creado.id}/activo`, {
      method: 'PATCH', headers: auth(), body: JSON.stringify({ activo: 0 }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.activo).toBe(0);

    const fila = db.prepare(`SELECT activo FROM pensionistas WHERE id = ?`).get(creado.id);
    expect(fila.activo).toBe(0);
    const mov = db.prepare(`SELECT * FROM pensionista_movimientos WHERE id_pensionista = ?`).get(creado.id);
    expect(mov).toBeDefined(); // el movimiento de saldo inicial sigue existiendo
  });
});

describe('GET /api/usuarios no mezcla pensionistas', () => {
  test('un pensionista creado no aparece en el panel de Usuarios', async () => {
    const creado = await (await crearPensionista({ email: `pensionista-nomezcla-${Date.now()}@menupro.tech` })).json();
    pensionistasCreados.push(creado.id);

    const res = await fetch(baseUrlUsuarios, { headers: auth() });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.every(u => u.rol !== 'pensionista')).toBe(true);
  });
});
