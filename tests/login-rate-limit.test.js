/**
 * @jest-environment node
 *
 * Pruebas para el rate limiter de POST /api/auth/login (ISS-032).
 *
 * Antes, `loginLimiter` no tenía `skipSuccessfulRequests: true`, así que
 * contaba TAMBIÉN los logins correctos contra el cupo de 10 cada 15 min por
 * IP — pese a que el mensaje de error dice "demasiados intentos FALLIDOS".
 * Con varios usuarios entrando desde el mismo IP (ej. WiFi del restaurante)
 * en una ventana de 15 min, el 11º login se bloqueaba aunque la contraseña
 * fuera correcta.
 *
 * Cada test levanta su propio servidor Express (con `jest.resetModules()`
 * antes) para que el contador del rate limiter, que vive en memoria dentro
 * del módulo, arranque limpio y no arrastre estado entre tests.
 */

const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test-secret-para-jest';

let db, app, server, baseUrl;
let idRestaurante, idUsuario;
const EMAIL    = 'login-rate-limit-tmp@example.com';
const PASSWORD = 'PasswordCorrecta123!';

// Arranca un server nuevo con el módulo de auth recién cargado (contador del
// rate limiter en cero) y crea un usuario de prueba.
async function levantarServidor() {
  jest.resetModules();
  db = require('../config/database');
  const express    = require('express');
  const authRoutes = require('../routes/auth');

  const { lastInsertRowid: idRest } = db.prepare(`
    INSERT INTO restaurantes (nombre, activo) VALUES ('__RATE_LIMIT_TEST__', 1)
  `).run();
  idRestaurante = idRest;

  const rolOwner = db.prepare(`SELECT id FROM roles WHERE nombre = 'owner'`).get();
  const hash     = bcrypt.hashSync(PASSWORD, 10);
  const { lastInsertRowid: idUser } = db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
    VALUES ('Rate Limit Test', ?, ?, ?, ?)
  `).run(EMAIL, hash, rolOwner.id, idRestaurante);
  idUsuario = idUser;

  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  await new Promise(resolve => { server = app.listen(0, resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
}

function limpiar() {
  if (idUsuario)     db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(idUsuario);
  if (idRestaurante) db.prepare(`DELETE FROM restaurantes WHERE id = ?`).run(idRestaurante);
  idUsuario = idRestaurante = null;
}

async function login(password) {
  const res = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password }),
  });
  return res;
}

describe('POST /api/auth/login — rate limiter (ISS-032)', () => {

  afterEach(async () => {
    limpiar();
    if (server) await new Promise(resolve => server.close(resolve));
  });

  test('12 logins CORRECTOS seguidos, ninguno debe bloquearse con 429', async () => {
    await levantarServidor();

    const statuses = [];
    for (let i = 0; i < 12; i++) {
      const res = await login(PASSWORD);
      statuses.push(res.status);
    }

    expect(statuses.every(s => s === 200)).toBe(true);
  }, 20000);

  test('11 intentos con contraseña INCORRECTA: el 11º queda bloqueado con 429', async () => {
    await levantarServidor();

    const statuses = [];
    for (let i = 0; i < 11; i++) {
      const res = await login('contraseña-incorrecta');
      statuses.push(res.status);
    }

    // Los primeros 10 fallan por credenciales (401); el 11º lo bloquea el limiter (429)
    expect(statuses.slice(0, 10).every(s => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  }, 20000);

  test('intentos fallidos no bloquean un login correcto posterior si no se llegó al máximo', async () => {
    await levantarServidor();

    const fallidos = [];
    for (let i = 0; i < 5; i++) fallidos.push((await login('mal')).status);
    expect(fallidos.every(s => s === 401)).toBe(true);

    const correcto = await login(PASSWORD);
    expect(correcto.status).toBe(200);
  }, 20000);

  test('mensaje del 429 menciona "intentos fallidos" y minutos de espera', async () => {
    await levantarServidor();

    let ultima;
    for (let i = 0; i < 11; i++) ultima = await login('mal');

    expect(ultima.status).toBe(429);
    const data = await ultima.json();
    expect(data.error).toMatch(/intentos fallidos/i);
    expect(data.error).toMatch(/15 minutos/);
  }, 20000);
});
