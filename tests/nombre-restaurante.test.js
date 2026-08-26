/**
 * Pruebas para el cambio de nombre del restaurante — pedido de la dueña
 * (2026-08-26) tras no encontrar dónde renombrar su restaurante.
 *
 * Cubre: BD, y la validación replicada de routes/menu.js (PATCH /config/nombre)
 * y routes/admin.js (PATCH /restaurantes/:id/nombre) — ambos endpoints comparten
 * la misma regla, así que se valida una sola vez y se prueba contra los dos
 * caminos de BD (owner via restaurant_id, admin via :id).
 */

const Database = require('better-sqlite3');

function crearDB() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE restaurantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    );
    INSERT INTO restaurantes (nombre) VALUES ('Crisolito');
  `);
  return db;
}

// ── Validación replicada de ambos endpoints (misma regla en menu.js y admin.js) ──
function validarNombre(nombreCrudo) {
  const nombre = (nombreCrudo || '').trim();
  if (nombre.length < 2 || nombre.length > 60) return { ok: false, error: 'El nombre debe tener entre 2 y 60 caracteres' };
  return { ok: true, nombre };
}

function actualizarNombre(db, id, nombreCrudo) {
  const v = validarNombre(nombreCrudo);
  if (!v.ok) return v;
  db.prepare(`UPDATE restaurantes SET nombre = ? WHERE id = ?`).run(v.nombre, id);
  return v;
}

describe('Cambio de nombre del restaurante', () => {

  describe('Validación', () => {
    test('nombre válido pasa', () => {
      expect(validarNombre('El Buen Sabor').ok).toBe(true);
    });
    test('nombre vacío rechaza', () => {
      expect(validarNombre('').ok).toBe(false);
    });
    test('solo espacios rechaza (trim deja largo 0)', () => {
      expect(validarNombre('   ').ok).toBe(false);
    });
    test('1 caracter rechaza (mínimo 2)', () => {
      expect(validarNombre('A').ok).toBe(false);
    });
    test('61 caracteres rechaza (máximo 60)', () => {
      expect(validarNombre('A'.repeat(61)).ok).toBe(false);
    });
    test('exactamente 60 caracteres pasa', () => {
      expect(validarNombre('A'.repeat(60)).ok).toBe(true);
    });
    test('recorta espacios al guardar', () => {
      const v = validarNombre('  Karina Menú  ');
      expect(v.ok).toBe(true);
      expect(v.nombre).toBe('Karina Menú');
    });
    test('undefined/null rechaza sin explotar', () => {
      expect(validarNombre(undefined).ok).toBe(false);
      expect(validarNombre(null).ok).toBe(false);
    });
  });

  describe('Actualización en BD', () => {
    test('nombre válido se guarda', () => {
      const db = crearDB();
      const r = actualizarNombre(db, 1, 'Nuevo Nombre');
      expect(r.ok).toBe(true);
      expect(db.prepare('SELECT nombre FROM restaurantes WHERE id = 1').get().nombre).toBe('Nuevo Nombre');
    });
    test('nombre inválido no toca la BD', () => {
      const db = crearDB();
      actualizarNombre(db, 1, '');
      expect(db.prepare('SELECT nombre FROM restaurantes WHERE id = 1').get().nombre).toBe('Crisolito');
    });
    test('no afecta otros restaurantes', () => {
      const db = crearDB();
      db.prepare(`INSERT INTO restaurantes (nombre) VALUES ('Otro Resto')`).run();
      actualizarNombre(db, 1, 'Cambiado');
      expect(db.prepare('SELECT nombre FROM restaurantes WHERE id = 2').get().nombre).toBe('Otro Resto');
    });
  });
});
