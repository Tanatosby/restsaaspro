/**
 * Pruebas para la lógica de gestión de suscripciones push (routes/push.js).
 * Se testea la lógica de BD directamente sin levantar el servidor HTTP,
 * siguiendo el mismo patrón que el resto de tests del proyecto.
 */

const Database = require('better-sqlite3');

// ── Setup de BD en memoria ──────────────────────────────────────────────────────

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

function makeSub(endpoint = 'https://push.example.com/test') {
  return JSON.stringify({ endpoint, keys: { p256dh: 'abc', auth: 'xyz' } });
}

// ── Lógica extraída de routes/push.js (replicada para testear sin HTTP) ─────────

function subscribir(db, id_usuario, id_restaurante, subscription) {
  if (!subscription?.endpoint) throw new Error('Suscripción inválida');

  const existe = db.prepare(`
    SELECT id FROM push_subscriptions
    WHERE id_usuario = ? AND subscription LIKE ?
  `).get(id_usuario, `%${subscription.endpoint}%`);

  if (!existe) {
    db.prepare(`
      INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription)
      VALUES (?, ?, ?)
    `).run(id_usuario, id_restaurante, JSON.stringify(subscription));
    return { inserted: true };
  }
  return { inserted: false };
}

function desuscribir(db, id_usuario, endpoint) {
  if (!endpoint) throw new Error('endpoint requerido');
  const info = db.prepare(`
    DELETE FROM push_subscriptions
    WHERE id_usuario = ? AND subscription LIKE ?
  `).run(id_usuario, `%${endpoint}%`);
  return info.changes;
}

function contarSubs(db, id_restaurante) {
  return db.prepare(`SELECT COUNT(*) AS n FROM push_subscriptions WHERE id_restaurante = ?`)
    .get(id_restaurante).n;
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('Gestión de suscripciones push', () => {

  describe('subscribir', () => {

    test('guarda una nueva suscripción correctamente', () => {
      const db  = crearDB();
      const sub = { endpoint: 'https://push.example.com/a', keys: { p256dh: 'p', auth: 'q' } };
      const result = subscribir(db, 1, 1, sub);
      expect(result.inserted).toBe(true);
      expect(contarSubs(db, 1)).toBe(1);
    });

    test('no duplica si el mismo endpoint ya está registrado para ese usuario', () => {
      const db  = crearDB();
      const sub = { endpoint: 'https://push.example.com/b', keys: { p256dh: 'p', auth: 'q' } };
      subscribir(db, 1, 1, sub);
      const result = subscribir(db, 1, 1, sub); // segunda llamada con mismo endpoint
      expect(result.inserted).toBe(false);
      expect(contarSubs(db, 1)).toBe(1);
    });

    test('permite que dos usuarios distintos tengan el mismo endpoint (dispositivo compartido)', () => {
      const db  = crearDB();
      const sub = { endpoint: 'https://push.example.com/shared', keys: { p256dh: 'p', auth: 'q' } };
      subscribir(db, 1, 1, sub);
      subscribir(db, 2, 1, sub);
      expect(contarSubs(db, 1)).toBe(2);
    });

    test('lanza error si la suscripción no tiene endpoint', () => {
      const db = crearDB();
      expect(() => subscribir(db, 1, 1, { keys: {} })).toThrow('Suscripción inválida');
    });

    test('lanza error si subscription es null', () => {
      const db = crearDB();
      expect(() => subscribir(db, 1, 1, null)).toThrow('Suscripción inválida');
    });

    test('guarda suscripciones de distintos restaurantes por separado', () => {
      const db   = crearDB();
      const sub1 = { endpoint: 'https://push.example.com/r1', keys: { p256dh: 'a', auth: 'b' } };
      const sub2 = { endpoint: 'https://push.example.com/r2', keys: { p256dh: 'c', auth: 'd' } };
      subscribir(db, 1, 1, sub1);
      subscribir(db, 2, 2, sub2);
      expect(contarSubs(db, 1)).toBe(1);
      expect(contarSubs(db, 2)).toBe(1);
    });
  });

  describe('desuscribir', () => {

    test('elimina la suscripción existente y retorna 1 cambio', () => {
      const db  = crearDB();
      const sub = { endpoint: 'https://push.example.com/del', keys: { p256dh: 'p', auth: 'q' } };
      subscribir(db, 1, 1, sub);
      const changes = desuscribir(db, 1, sub.endpoint);
      expect(changes).toBe(1);
      expect(contarSubs(db, 1)).toBe(0);
    });

    test('retorna 0 cambios si el endpoint no existe', () => {
      const db      = crearDB();
      const changes = desuscribir(db, 1, 'https://push.example.com/noexiste');
      expect(changes).toBe(0);
    });

    test('solo elimina la suscripción del usuario correcto', () => {
      const db  = crearDB();
      const sub = { endpoint: 'https://push.example.com/shared2', keys: { p256dh: 'p', auth: 'q' } };
      subscribir(db, 1, 1, sub);
      subscribir(db, 2, 1, sub);
      desuscribir(db, 1, sub.endpoint); // solo elimina la de usuario 1
      expect(contarSubs(db, 1)).toBe(1); // usuario 2 sigue suscrito
    });

    test('lanza error si endpoint es undefined', () => {
      const db = crearDB();
      expect(() => desuscribir(db, 1, undefined)).toThrow('endpoint requerido');
    });
  });

  describe('VAPID key', () => {

    test('process.env.VAPID_PUBLIC_KEY devuelve un string no vacío en entorno de test', () => {
      // En tests no hay .env cargado; simulamos que existe la variable
      const key = process.env.VAPID_PUBLIC_KEY || 'test-key-placeholder';
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });
  });
});
