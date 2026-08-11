/**
 * @jest-environment node
 *
 * Pruebas para POST /api/usuarios — dominio @menupro.tech obligatorio.
 *
 * Contexto: el owner crea cuentas de cocinero/mozo (y a futuro pensionista)
 * desde este panel, pero esos roles no tienen un email real — el owner les
 * inventa uno como identificador de login. Sin esto, `routes/usuarios.js`
 * aceptaba cualquier dominio. Ver pensionistas.md §0 punto 5.
 *
 * No aplica al alta de un restaurante nuevo (routes/admin.js), donde el
 * email sí es el real del dueño — ese endpoint no se toca acá.
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const express = require('express');

process.env.JWT_SECRET = 'test-secret-para-jest';

const db = require('../config/database');
const usuariosRoutes = require('../routes/usuarios');

let app, idRestaurante, idOwner, tokenOwner;
const usuariosCreados = [];

beforeAll(() => {
  const { lastInsertRowid: idRest } = db.prepare(`
    INSERT INTO restaurantes (nombre, activo) VALUES ('__EMAIL_DOMINIO_TEST__', 1)
  `).run();
  idRestaurante = idRest;

  const rolOwner = db.prepare(`SELECT id FROM roles WHERE nombre = 'owner'`).get();
  const hash = bcrypt.hashSync('PasswordDueño123!', 10);
  const { lastInsertRowid: idU } = db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
    VALUES ('Owner Test', 'owner-email-dominio-tmp@example.com', ?, ?, ?)
  `).run(hash, rolOwner.id, idRestaurante);
  idOwner = idU;

  tokenOwner = jwt.sign(
    { id: idOwner, name: 'Owner Test', role: 'owner', restaurant_id: idRestaurante, permisos: null },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  app = express();
  app.use(express.json());
  app.use('/api/usuarios', usuariosRoutes);
});

afterAll(() => {
  usuariosCreados.forEach(id => db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(id));
  db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(idOwner);
  db.prepare(`DELETE FROM restaurantes WHERE id = ?`).run(idRestaurante);
});

let server, baseUrl;
beforeAll(async () => {
  await new Promise(resolve => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/usuarios`;
});
afterAll(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
});

async function postUsuario(body) {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenOwner}`,
    },
    body: JSON.stringify(body),
  });
  return res;
}

describe('POST /api/usuarios — dominio @menupro.tech obligatorio', () => {

  test('rechaza un email de otro dominio con 400', async () => {
    const res = await postUsuario({
      nombre: 'Mozo Test', email: 'mozo@gmail.com',
      password: 'PasswordMozo123!', rol: 'mozo',
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/@menupro\.tech/);
  });

  test('acepta un email @menupro.tech', async () => {
    const res = await postUsuario({
      nombre: 'Mozo Test', email: 'mozo-dominio-tmp@menupro.tech',
      password: 'PasswordMozo123!', rol: 'mozo',
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    usuariosCreados.push(data.id);
  });

  test('es insensible a mayúsculas/minúsculas en el dominio', async () => {
    const res = await postUsuario({
      nombre: 'Cocinero Test', email: 'cocinero-dominio-tmp@MenuPro.Tech',
      password: 'PasswordCoc123!', rol: 'cocinero',
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    usuariosCreados.push(data.id);
  });

  test('sigue exigiendo que el email no esté vacío (mensaje distinto al de dominio)', async () => {
    const res = await postUsuario({
      nombre: 'Sin Email', email: '',
      password: 'Password123!', rol: 'mozo',
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/requerido/i);
  });
});
