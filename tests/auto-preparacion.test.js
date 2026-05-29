/**
 * Pruebas para el job de auto-preparación de reservas (Gap 3).
 * Verifica: detección en ventana, skip fuera de ventana, idempotencia,
 * skip de reservas canceladas/sin hora, envío de push mockeado.
 *
 * Estrategia de tiempo:
 *   - Lima = UTC-5. SQLite usa datetime('now', '-5 hours') para hora Lima.
 *   - Forzamos las fechas de las reservas directamente en SQL usando
 *     valores relativos a datetime('now', '-5 hours') para ser agnósticos
 *     al huso horario del servidor de CI/CD.
 */

const Database = require('better-sqlite3');
const { procesarReservasPendientes, obtenerReservasParaPreparar } = require('../utils/autoPreparacion');

// ── Helpers de setup ────────────────────────────────────────────────────────────

function crearDB() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE restaurantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      minutos_preparacion INTEGER DEFAULT 20
    );
    INSERT INTO restaurantes (nombre, minutos_preparacion) VALUES ('Test Resto', 20);

    CREATE TABLE push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL,
      id_restaurante INTEGER NOT NULL,
      subscription TEXT NOT NULL,
      creado_en TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE estatus_reserva (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      es_confirmada INTEGER DEFAULT 0,
      es_en_cocina  INTEGER DEFAULT 0,
      es_cancelado  INTEGER DEFAULT 0,
      es_full       INTEGER DEFAULT 0
    );
    INSERT INTO estatus_reserva (nombre, es_confirmada) VALUES ('confirmada', 1);
    INSERT INTO estatus_reserva (nombre, es_en_cocina)  VALUES ('en preparación', 1);
    INSERT INTO estatus_reserva (nombre, es_cancelado)  VALUES ('cancelada', 1);
    INSERT INTO estatus_reserva (nombre, es_full)       VALUES ('completada', 1);

    CREATE TABLE reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_cliente TEXT NOT NULL,
      id_restaurante INTEGER NOT NULL,
      id_estatus INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      hora_llegada TEXT
    );
  `);
  return db;
}

function idEstatus(db, nombre) {
  return db.prepare(`SELECT id FROM estatus_reserva WHERE nombre = ?`).get(nombre).id;
}

/**
 * Inserta una reserva cuya hora de llegada está 'minutosDesde' minutos
 * desde ahora en hora Lima. Negativo = pasado, positivo = futuro.
 */
function insertarReserva(db, nombre, minutosDesde, idRestaurante = 1, estatusNombre = 'confirmada') {
  // Calculamos fecha y hora a partir de la hora Lima actual
  const limaAhora = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const target    = new Date(limaAhora.getTime() + minutosDesde * 60 * 1000);

  const fecha      = target.toISOString().slice(0, 10);
  const hora       = target.toISOString().slice(11, 16); // HH:MM

  const id_estatus = idEstatus(db, estatusNombre);
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO reservas (nombre_cliente, id_restaurante, id_estatus, fecha, hora_llegada)
    VALUES (?, ?, ?, ?, ?)
  `).run(nombre, idRestaurante, id_estatus, fecha, hora);
  return lastInsertRowid;
}

function estatusActual(db, id) {
  return db.prepare(`
    SELECT er.nombre FROM reservas r
    JOIN estatus_reserva er ON r.id_estatus = er.id
    WHERE r.id = ?
  `).get(id)?.nombre;
}

// ── Mock de web-push ────────────────────────────────────────────────────────────

function mockWpush() {
  const calls = [];
  return {
    sendNotification: jest.fn((sub, payload) => {
      calls.push({ sub, payload: JSON.parse(payload) });
      return Promise.resolve();
    }),
    calls,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('Job auto-preparación de reservas', () => {

  describe('obtenerReservasParaPreparar — detección en ventana', () => {

    test('detecta reserva que llega en exactamente minutos_preparacion minutos', () => {
      const db  = crearDB();
      insertarReserva(db, 'María', 20); // llega en 20 min, minutos_preparacion = 20
      const filas = obtenerReservasParaPreparar(db);
      expect(filas).toHaveLength(1);
      expect(filas[0].nombre_cliente).toBe('María');
    });

    test('detecta reserva que llega en menos tiempo que minutos_preparacion', () => {
      const db = crearDB();
      insertarReserva(db, 'Juan', 10); // llega en 10 min, ventana = 20 min
      expect(obtenerReservasParaPreparar(db)).toHaveLength(1);
    });

    test('NO detecta reserva que llega en más tiempo que minutos_preparacion', () => {
      const db = crearDB();
      insertarReserva(db, 'Pedro', 40); // llega en 40 min, ventana = 20 min → demasiado lejos
      expect(obtenerReservasParaPreparar(db)).toHaveLength(0);
    });

    test('NO detecta reserva sin hora_llegada', () => {
      const db = crearDB();
      db.prepare(`
        INSERT INTO reservas (nombre_cliente, id_restaurante, id_estatus, fecha, hora_llegada)
        VALUES ('Sin hora', 1, ?, date('now', '-5 hours'), NULL)
      `).run(idEstatus(db, 'confirmada'));
      expect(obtenerReservasParaPreparar(db)).toHaveLength(0);
    });

    test('NO detecta reserva de fecha pasada', () => {
      const db = crearDB();
      db.prepare(`
        INSERT INTO reservas (nombre_cliente, id_restaurante, id_estatus, fecha, hora_llegada)
        VALUES ('Ayer', 1, ?, date('now', '-5 hours', '-1 day'), '12:00')
      `).run(idEstatus(db, 'confirmada'));
      expect(obtenerReservasParaPreparar(db)).toHaveLength(0);
    });

    test('respeta minutos_preparacion distinto por restaurante', () => {
      const db = crearDB();
      // Restaurante 2 con preparación de 5 min
      db.prepare(`INSERT INTO restaurantes (nombre, minutos_preparacion) VALUES ('Resto2', 5)`).run();
      const id2 = db.prepare(`SELECT id FROM restaurantes WHERE nombre = 'Resto2'`).get().id;

      // Reserva en 15 min — dentro de la ventana de Resto1 (20) pero no de Resto2 (5)
      insertarReserva(db, 'ClienteResto1', 15, 1);
      insertarReserva(db, 'ClienteResto2', 15, id2);

      const filas = obtenerReservasParaPreparar(db);
      expect(filas).toHaveLength(1);
      expect(filas[0].nombre_cliente).toBe('ClienteResto1');
    });
  });

  describe('procesarReservasPendientes — mutación de estatus', () => {

    test('mueve reserva en ventana a es_en_cocina', () => {
      const db  = crearDB();
      const id  = insertarReserva(db, 'Ana', 15);
      procesarReservasPendientes(db, null);
      expect(estatusActual(db, id)).toBe('en preparación');
    });

    test('NO modifica reserva fuera de ventana', () => {
      const db = crearDB();
      const id = insertarReserva(db, 'Luis', 60);
      procesarReservasPendientes(db, null);
      expect(estatusActual(db, id)).toBe('confirmada');
    });

    test('NO modifica reserva ya en cocina (idempotente)', () => {
      const db = crearDB();
      const id = insertarReserva(db, 'Rosa', 5, 1, 'en preparación');
      procesarReservasPendientes(db, null);
      expect(estatusActual(db, id)).toBe('en preparación');
    });

    test('NO modifica reserva cancelada', () => {
      const db = crearDB();
      const id = insertarReserva(db, 'Carlos', 10, 1, 'cancelada');
      procesarReservasPendientes(db, null);
      expect(estatusActual(db, id)).toBe('cancelada');
    });

    test('NO modifica reserva completada', () => {
      const db = crearDB();
      const id = insertarReserva(db, 'Elena', 10, 1, 'completada');
      procesarReservasPendientes(db, null);
      expect(estatusActual(db, id)).toBe('completada');
    });

    test('retorna la cantidad de reservas procesadas', () => {
      const db = crearDB();
      insertarReserva(db, 'A', 5);
      insertarReserva(db, 'B', 10);
      insertarReserva(db, 'C', 60); // fuera de ventana
      const n = procesarReservasPendientes(db, null);
      expect(n).toBe(2);
    });

    test('retorna 0 si no hay reservas para procesar', () => {
      const db = crearDB();
      expect(procesarReservasPendientes(db, null)).toBe(0);
    });
  });

  describe('procesarReservasPendientes — envío de push', () => {

    test('llama a sendNotification por cada suscriptor del restaurante', () => {
      const db   = crearDB();
      const wpush = mockWpush();

      // 2 suscriptores del restaurante 1
      const sub1 = JSON.stringify({ endpoint: 'https://push.example.com/1', keys: { p256dh: 'a', auth: 'b' } });
      const sub2 = JSON.stringify({ endpoint: 'https://push.example.com/2', keys: { p256dh: 'c', auth: 'd' } });
      db.prepare(`INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription) VALUES (1, 1, ?)`).run(sub1);
      db.prepare(`INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription) VALUES (2, 1, ?)`).run(sub2);

      insertarReserva(db, 'Lucía', 10);
      procesarReservasPendientes(db, wpush);

      expect(wpush.sendNotification).toHaveBeenCalledTimes(2);
    });

    test('el payload contiene el nombre del cliente y los minutos', () => {
      const db    = crearDB();
      const wpush = mockWpush();

      const sub = JSON.stringify({ endpoint: 'https://push.example.com/x', keys: { p256dh: 'a', auth: 'b' } });
      db.prepare(`INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription) VALUES (1, 1, ?)`).run(sub);

      insertarReserva(db, 'Marco', 5);
      procesarReservasPendientes(db, wpush);

      const { payload } = wpush.calls[0];
      expect(payload.body).toContain('Marco');
      expect(payload.body).toContain('20');
    });

    test('NO llama a sendNotification si no hay suscriptores', () => {
      const db    = crearDB();
      const wpush = mockWpush();
      insertarReserva(db, 'Sola', 5);
      procesarReservasPendientes(db, wpush);
      expect(wpush.sendNotification).not.toHaveBeenCalled();
    });

    test('elimina suscripción expirada (statusCode 410)', async () => {
      const db    = crearDB();
      const wpush = {
        sendNotification: jest.fn().mockRejectedValue({ statusCode: 410, message: 'Gone' }),
      };

      const sub = JSON.stringify({ endpoint: 'https://push.example.com/gone', keys: { p256dh: 'a', auth: 'b' } });
      db.prepare(`INSERT INTO push_subscriptions (id_usuario, id_restaurante, subscription) VALUES (1, 1, ?)`).run(sub);

      insertarReserva(db, 'Ghost', 5);
      procesarReservasPendientes(db, wpush);

      // Esperar que la Promise rechazada sea manejada
      await new Promise(r => setTimeout(r, 50));

      const subs = db.prepare(`SELECT * FROM push_subscriptions`).all();
      expect(subs).toHaveLength(0);
    });

    test('no llama a sendNotification si wpush es null', () => {
      const db = crearDB();
      insertarReserva(db, 'Test', 5);
      // No debe lanzar error aunque wpush sea null
      expect(() => procesarReservasPendientes(db, null)).not.toThrow();
    });
  });
});
