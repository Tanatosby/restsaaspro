/**
 * Pruebas para utils/pushNotificaciones.js (ISS-025).
 *
 * Cubre la limpieza de suscripciones muertas: 410 (el dispositivo se
 * desuscribió) y 403 con VAPID keys desincronizadas (la suscripción se creó
 * con una clave que el servidor ya no usa — nunca va a funcionar hasta que
 * el dispositivo se resuscriba). Ambas deben eliminarse de la BD; cualquier
 * otro error debe quedar logueado pero NO borrar la suscripción (podría ser
 * transitorio).
 */

const Database = require('better-sqlite3');
const { enviarPushRestaurante } = require('../utils/pushNotificaciones');

function crearDB() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE push_subscriptions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario     INTEGER NOT NULL,
      id_restaurante INTEGER NOT NULL,
      subscription   TEXT NOT NULL,
      creado_en      TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function insertarSub(db, { id_usuario = 1, id_restaurante = 1, endpoint = 'https://push.example.com/x' } = {}) {
  const subscription = JSON.stringify({ endpoint, keys: { p256dh: 'p', auth: 'q' } });
  return db.prepare(`
    INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription)
    VALUES (?, ?, ?)
  `).run(id_usuario, id_restaurante, subscription).lastInsertRowid;
}

function contarSubs(db) {
  return db.prepare(`SELECT COUNT(*) AS n FROM push_subscriptions`).get().n;
}

// Mock de web-push: sendNotification responde según lo configurado por endpoint,
// o con éxito por defecto.
function mockWpush(respuestasPorEndpoint = {}) {
  return {
    sendNotification: jest.fn((sub, payload) => {
      const respuesta = respuestasPorEndpoint[sub.endpoint];
      if (respuesta) return Promise.reject(respuesta);
      return Promise.resolve({ statusCode: 201 });
    }),
  };
}

// enviarPushRestaurante no espera sus promesas internas (fire-and-forget) —
// hay que darle un tick al event loop para que los .catch() terminen de correr.
const esperarMicrotasks = () => new Promise(resolve => setTimeout(resolve, 0));

describe('enviarPushRestaurante — limpieza de suscripciones (ISS-025)', () => {

  test('410 (Gone) elimina la suscripción', async () => {
    const db = crearDB();
    const id = insertarSub(db, { endpoint: 'https://push.example.com/gone' });
    const wpush = mockWpush({ 'https://push.example.com/gone': { statusCode: 410, message: 'Gone' } });

    enviarPushRestaurante(db, 1, { title: 'x' }, wpush);
    await esperarMicrotasks();

    expect(contarSubs(db)).toBe(0);
  });

  test('403 con VAPID keys desincronizadas elimina la suscripción (fix ISS-025)', async () => {
    const db = crearDB();
    const id = insertarSub(db, { endpoint: 'https://push.example.com/vapid-mismatch' });
    const err = {
      statusCode: 403,
      message: 'Received unexpected response code',
      body: 'the VAPID credentials in the authorization header do not correspond to the credentials used to create the subscriptions.\n',
    };
    const wpush = mockWpush({ 'https://push.example.com/vapid-mismatch': err });

    enviarPushRestaurante(db, 1, { title: 'x' }, wpush);
    await esperarMicrotasks();

    expect(contarSubs(db)).toBe(0);
  });

  test('otros errores (ej. 500 transitorio) NO eliminan la suscripción', async () => {
    const db = crearDB();
    insertarSub(db, { endpoint: 'https://push.example.com/transitorio' });
    const wpush = mockWpush({ 'https://push.example.com/transitorio': { statusCode: 500, message: 'Server error' } });

    enviarPushRestaurante(db, 1, { title: 'x' }, wpush);
    await esperarMicrotasks();

    expect(contarSubs(db)).toBe(1);
  });

  test('envía a todas las suscripciones del restaurante, cada una se evalúa por separado', async () => {
    const db = crearDB();
    insertarSub(db, { id_usuario: 1, endpoint: 'https://push.example.com/ok' });
    insertarSub(db, { id_usuario: 2, endpoint: 'https://push.example.com/gone2' });
    const wpush = mockWpush({ 'https://push.example.com/gone2': { statusCode: 410 } });

    enviarPushRestaurante(db, 1, { title: 'x' }, wpush);
    await esperarMicrotasks();

    expect(contarSubs(db)).toBe(1); // solo sobrevive la que no falló
  });

  test('no manda nada si el restaurante no tiene suscripciones', async () => {
    const db = crearDB();
    const wpush = mockWpush();

    enviarPushRestaurante(db, 99, { title: 'x' }, wpush);
    await esperarMicrotasks();

    expect(wpush.sendNotification).not.toHaveBeenCalled();
  });

  test('sin wpush (falsy) no hace nada, no revienta', async () => {
    const db = crearDB();
    insertarSub(db);
    expect(() => enviarPushRestaurante(db, 1, { title: 'x' }, null)).not.toThrow();
  });

  test('una suscripción con JSON corrupto se salta sin romper el resto', async () => {
    const db = crearDB();
    db.prepare(`INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription) VALUES (1, 1, 'no-es-json')`).run();
    insertarSub(db, { id_usuario: 2, endpoint: 'https://push.example.com/valida' });
    const wpush = mockWpush();

    enviarPushRestaurante(db, 1, { title: 'x' }, wpush);
    await esperarMicrotasks();

    expect(wpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  test('no mezcla restaurantes', async () => {
    const db = crearDB();
    insertarSub(db, { id_restaurante: 1, endpoint: 'https://push.example.com/r1' });
    insertarSub(db, { id_restaurante: 2, endpoint: 'https://push.example.com/r2' });
    const wpush = mockWpush();

    enviarPushRestaurante(db, 1, { title: 'x' }, wpush);
    await esperarMicrotasks();

    expect(wpush.sendNotification).toHaveBeenCalledTimes(1);
    expect(wpush.sendNotification.mock.calls[0][0].endpoint).toBe('https://push.example.com/r1');
  });
});
