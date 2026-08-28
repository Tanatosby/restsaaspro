/**
 * Pruebas para la aceptación de Términos y Condiciones del owner — Gap 22 / ISS-082.
 *
 * Cubre la regla de `GET /api/auth/terminos` (cuándo `pendiente` es true) y el
 * efecto de `POST /api/auth/terminos/aceptar` sobre la tabla `restaurantes`.
 * Lógica replicada de routes/auth.js contra una BD en memoria — mismo patrón
 * que tests/nombre-restaurante.test.js.
 */

const Database = require('better-sqlite3');
const { TERMINOS_VERSION } = require('../utils/terminos');

function crearDB() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE restaurantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      terminos_aceptados_at TEXT DEFAULT NULL,
      terminos_version      TEXT DEFAULT NULL,
      terminos_aceptado_por INTEGER DEFAULT NULL
    );
    INSERT INTO restaurantes (nombre) VALUES ('Karina Menú');
  `);
  return db;
}

// ── Réplica de GET /api/auth/terminos ──
function estadoTerminos(db, user) {
  if (user.role !== 'owner' || !user.restaurant_id) {
    return { version: TERMINOS_VERSION, pendiente: false, aceptados_at: null };
  }
  const rest = db.prepare(`
    SELECT terminos_aceptados_at, terminos_version FROM restaurantes WHERE id = ?
  `).get(user.restaurant_id);
  const pendiente = !rest || rest.terminos_version !== TERMINOS_VERSION;
  return {
    version: TERMINOS_VERSION,
    pendiente,
    aceptados_at: pendiente ? null : rest.terminos_aceptados_at,
  };
}

// ── Réplica de POST /api/auth/terminos/aceptar ──
function aceptarTerminos(db, user) {
  if (!user.restaurant_id) return { error: 'Tu usuario no está asociado a un restaurante' };
  const ahora = new Date().toISOString();
  db.prepare(`
    UPDATE restaurantes
    SET terminos_aceptados_at = ?, terminos_version = ?, terminos_aceptado_por = ?
    WHERE id = ?
  `).run(ahora, TERMINOS_VERSION, user.id, user.restaurant_id);
  return { ok: true, version: TERMINOS_VERSION, aceptados_at: ahora };
}

describe('Aceptación de Términos y Condiciones (Gap 22 / ISS-082)', () => {

  describe('GET /api/auth/terminos — regla de "pendiente"', () => {
    test('owner sin aceptar nada → pendiente', () => {
      const db = crearDB();
      const r = estadoTerminos(db, { id: 1, role: 'owner', restaurant_id: 1 });
      expect(r.pendiente).toBe(true);
      expect(r.aceptados_at).toBeNull();
    });

    test('owner que aceptó la versión vigente → NO pendiente', () => {
      const db = crearDB();
      aceptarTerminos(db, { id: 1, role: 'owner', restaurant_id: 1 });
      const r = estadoTerminos(db, { id: 1, role: 'owner', restaurant_id: 1 });
      expect(r.pendiente).toBe(false);
      expect(r.aceptados_at).toEqual(expect.any(String));
    });

    test('owner que aceptó una versión vieja → pendiente de nuevo', () => {
      const db = crearDB();
      db.prepare(`UPDATE restaurantes SET terminos_aceptados_at = ?, terminos_version = ? WHERE id = 1`)
        .run('2020-01-01T00:00:00.000Z', '2020-01-01');
      const r = estadoTerminos(db, { id: 1, role: 'owner', restaurant_id: 1 });
      expect(r.pendiente).toBe(true);
    });

    test('mozo nunca tiene términos pendientes', () => {
      const db = crearDB();
      const r = estadoTerminos(db, { id: 2, role: 'mozo', restaurant_id: 1 });
      expect(r.pendiente).toBe(false);
    });

    test('cocinero nunca tiene términos pendientes', () => {
      const db = crearDB();
      const r = estadoTerminos(db, { id: 3, role: 'cocinero', restaurant_id: 1 });
      expect(r.pendiente).toBe(false);
    });

    test('admin (sin restaurante) nunca tiene términos pendientes', () => {
      const db = crearDB();
      const r = estadoTerminos(db, { id: 9, role: 'admin', restaurant_id: null });
      expect(r.pendiente).toBe(false);
    });
  });

  describe('POST /api/auth/terminos/aceptar', () => {
    test('guarda timestamp, versión vigente y el id del owner', () => {
      const db = crearDB();
      const res = aceptarTerminos(db, { id: 7, role: 'owner', restaurant_id: 1 });
      expect(res.ok).toBe(true);

      const row = db.prepare(`SELECT * FROM restaurantes WHERE id = 1`).get();
      expect(row.terminos_version).toBe(TERMINOS_VERSION);
      expect(row.terminos_aceptado_por).toBe(7);
      expect(row.terminos_aceptados_at).toEqual(expect.any(String));
      expect(() => new Date(row.terminos_aceptados_at).toISOString()).not.toThrow();
    });

    test('re-aceptar actualiza el registro (nuevo timestamp y usuario)', () => {
      const db = crearDB();
      aceptarTerminos(db, { id: 7, role: 'owner', restaurant_id: 1 });
      const primero = db.prepare(`SELECT terminos_aceptados_at FROM restaurantes WHERE id = 1`).get().terminos_aceptados_at;
      aceptarTerminos(db, { id: 8, role: 'owner', restaurant_id: 1 });
      const row = db.prepare(`SELECT * FROM restaurantes WHERE id = 1`).get();
      expect(row.terminos_aceptado_por).toBe(8);
      expect(row.terminos_aceptados_at >= primero).toBe(true);
    });

    test('usuario sin restaurante → error, no toca la BD', () => {
      const db = crearDB();
      const res = aceptarTerminos(db, { id: 9, role: 'owner', restaurant_id: null });
      expect(res.error).toBeDefined();
      const row = db.prepare(`SELECT * FROM restaurantes WHERE id = 1`).get();
      expect(row.terminos_aceptados_at).toBeNull();
    });
  });
});
