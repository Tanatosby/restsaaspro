/**
 * Pruebas de utils/comprobanteDuplicado.js — detección de comprobante Yape/
 * Plin reutilizado. Pregunta real de la dueña de un piloto: "¿qué pasa si
 * un chico comparte su pago de Yape con otro y ambos envían la misma
 * captura?". Decisión: avisar al owner (que ya revisa cada comprobante a
 * mano antes de confirmar pago), no bloquear al comensal.
 */
const Database = require('better-sqlite3');
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { calcularHashArchivo, buscarComprobanteRepetido } = require('../utils/comprobanteDuplicado');

function crearDB() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE ordenes (
      id INTEGER PRIMARY KEY, id_restaurante INTEGER, comprobante_hash TEXT
    );
    CREATE TABLE reservas (
      id INTEGER PRIMARY KEY, id_restaurante INTEGER, comprobante_hash TEXT
    );
  `);
  return db;
}

function archivoTemporal(contenido) {
  const p = path.join(os.tmpdir(), `comprobante-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  fs.writeFileSync(p, contenido);
  return p;
}

describe('calcularHashArchivo', () => {
  it('el mismo contenido produce el mismo hash', () => {
    const a = archivoTemporal('foto-de-yape');
    const b = archivoTemporal('foto-de-yape');
    expect(calcularHashArchivo(a)).toBe(calcularHashArchivo(b));
    fs.unlinkSync(a); fs.unlinkSync(b);
  });

  it('contenido distinto produce hash distinto', () => {
    const a = archivoTemporal('comprobante 1');
    const b = archivoTemporal('comprobante 2');
    expect(calcularHashArchivo(a)).not.toBe(calcularHashArchivo(b));
    fs.unlinkSync(a); fs.unlinkSync(b);
  });
});

describe('buscarComprobanteRepetido', () => {
  let db, archivo;

  beforeEach(() => {
    db = crearDB();
    archivo = archivoTemporal('mismo comprobante');
  });

  afterEach(() => { fs.unlinkSync(archivo); });

  it('sin ningún comprobante previo, no hay repetido', () => {
    const { repetido } = buscarComprobanteRepetido(db, 1, archivo, 'ordenes', 5);
    expect(repetido).toBeNull();
  });

  it('detecta el mismo hash ya usado en otra orden del mismo restaurante', () => {
    const hash = calcularHashArchivo(archivo);
    db.prepare(`INSERT INTO ordenes (id, id_restaurante, comprobante_hash) VALUES (10, 1, ?)`).run(hash);

    const { repetido } = buscarComprobanteRepetido(db, 1, archivo, 'ordenes', 20);
    expect(repetido).toEqual({ tipo: 'orden', id: 10 });
  });

  it('detecta el mismo hash ya usado en una reserva del mismo restaurante', () => {
    const hash = calcularHashArchivo(archivo);
    db.prepare(`INSERT INTO reservas (id, id_restaurante, comprobante_hash) VALUES (7, 1, ?)`).run(hash);

    const { repetido } = buscarComprobanteRepetido(db, 1, archivo, 'ordenes', 20);
    expect(repetido).toEqual({ tipo: 'reserva', id: 7 });
  });

  it('NO cruza restaurantes distintos — el mismo hash en otro restaurante no cuenta', () => {
    const hash = calcularHashArchivo(archivo);
    db.prepare(`INSERT INTO ordenes (id, id_restaurante, comprobante_hash) VALUES (10, 2, ?)`).run(hash);

    const { repetido } = buscarComprobanteRepetido(db, 1, archivo, 'ordenes', 20);
    expect(repetido).toBeNull();
  });

  it('no se marca a sí mismo — reintentar la propia subida no cuenta como repetido', () => {
    const hash = calcularHashArchivo(archivo);
    db.prepare(`INSERT INTO ordenes (id, id_restaurante, comprobante_hash) VALUES (20, 1, ?)`).run(hash);

    // La orden #20 ya tiene ese hash guardado (de un intento anterior) y
    // ahora reintenta subir la misma foto para SÍ MISMA.
    const { repetido } = buscarComprobanteRepetido(db, 1, archivo, 'ordenes', 20);
    expect(repetido).toBeNull();
  });

  it('el caso real: dos pedidos de mesas distintas suben la misma captura', () => {
    const hash = calcularHashArchivo(archivo);
    db.prepare(`INSERT INTO ordenes (id, id_restaurante, comprobante_hash) VALUES (10, 1, ?)`).run(hash);

    // Un segundo comensal (orden #11) sube exactamente el mismo archivo.
    const { repetido } = buscarComprobanteRepetido(db, 1, archivo, 'ordenes', 11);
    expect(repetido).toEqual({ tipo: 'orden', id: 10 });
  });
});
