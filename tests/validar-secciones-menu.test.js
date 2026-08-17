/**
 * Pruebas de utils/validarSeccionesMenu.js — ISS-046.
 *
 * Un plato de una sección puede exigir OTRA sección del mismo menú aunque esa
 * sección esté marcada como opcional en general (ej. "arroz con papas
 * fritas" exige "Proteínas"; "arroz con pollo", en la misma sección, no
 * exige nada porque ya está completo). Sin esta validación, un pedido podía
 * llegar incompleto a cocina — pasó en el piloto real del 2026-08-17.
 *
 * Se valida POR INSTANCIA de menú (agrupando por `grupo`, ISS-041): un mismo
 * pedido puede traer 2+ menús del mismo tipo con selecciones distintas, y
 * agrupar solo por id_menu_dia dejaría pasar una instancia incompleta si otra
 * instancia del mismo menú sí trae la sección completa.
 */

const Database = require('better-sqlite3');
const { validarSeccionesMenu } = require('../utils/validarSeccionesMenu');

function crearDB() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE secciones_menu (id INTEGER PRIMARY KEY, nombre TEXT);
    CREATE TABLE menu_secciones (
      id INTEGER PRIMARY KEY, id_menu_dia INTEGER, id_seccion_menu INTEGER, requerido INTEGER
    );
    CREATE TABLE componentes_menu_dia (
      id INTEGER PRIMARY KEY, id_menu_dia INTEGER, id_seccion_menu INTEGER, requiere_seccion_id INTEGER
    );
  `);
  return db;
}

// Menú 100: Entradas(1, oblig) + Arroces(2, oblig) + Proteínas(3, opcional).
// Componentes: 10=Ensalada(Entradas), 20=arroz con pollo(Arroces, autocontenido),
// 21=arroz con papas fritas(Arroces, exige Proteínas=3), 30=pollo(Proteínas).
function seedMenuConProteinaCondicional(db) {
  db.exec(`
    INSERT INTO secciones_menu VALUES (1,'Entradas'),(2,'Arroces'),(3,'Proteínas');
    INSERT INTO menu_secciones VALUES (1,100,1,1),(2,100,2,1),(3,100,3,0);
    INSERT INTO componentes_menu_dia VALUES (10,100,1,NULL);
    INSERT INTO componentes_menu_dia VALUES (20,100,2,NULL);
    INSERT INTO componentes_menu_dia VALUES (21,100,2,3);
    INSERT INTO componentes_menu_dia VALUES (30,100,3,NULL);
  `);
}

describe('validarSeccionesMenu — secciones obligatorias', () => {
  test('falta una sección obligatoria → bloquea', () => {
    const db = crearDB();
    seedMenuConProteinaCondicional(db);
    const error = validarSeccionesMenu(db, [
      { id_componente: 20, id_menu_dia: 100, grupo: 1 },
    ]);
    expect(error).toMatch(/Entradas/);
  });

  test('todas las obligatorias completas → pasa', () => {
    const db = crearDB();
    seedMenuConProteinaCondicional(db);
    const error = validarSeccionesMenu(db, [
      { id_componente: 10, id_menu_dia: 100, grupo: 1 },
      { id_componente: 20, id_menu_dia: 100, grupo: 1 },
    ]);
    expect(error).toBeNull();
  });
});

describe('validarSeccionesMenu — sección condicional por plato (ISS-046)', () => {
  test('plato combinable sin la sección que exige → bloquea (el incidente real del piloto)', () => {
    const db = crearDB();
    seedMenuConProteinaCondicional(db);
    const error = validarSeccionesMenu(db, [
      { id_componente: 10, id_menu_dia: 100, grupo: 1 }, // Entradas
      { id_componente: 21, id_menu_dia: 100, grupo: 1 }, // arroz con papas fritas, sin proteína
    ]);
    expect(error).toMatch(/Proteínas/);
  });

  test('plato combinable CON la sección exigida → pasa', () => {
    const db = crearDB();
    seedMenuConProteinaCondicional(db);
    const error = validarSeccionesMenu(db, [
      { id_componente: 10, id_menu_dia: 100, grupo: 1 },
      { id_componente: 21, id_menu_dia: 100, grupo: 1 },
      { id_componente: 30, id_menu_dia: 100, grupo: 1 }, // Proteínas
    ]);
    expect(error).toBeNull();
  });

  test('plato autocontenido (arroz con pollo) sin la sección opcional → pasa', () => {
    const db = crearDB();
    seedMenuConProteinaCondicional(db);
    const error = validarSeccionesMenu(db, [
      { id_componente: 10, id_menu_dia: 100, grupo: 1 },
      { id_componente: 20, id_menu_dia: 100, grupo: 1 }, // arroz con pollo, no exige nada
    ]);
    expect(error).toBeNull();
  });
});

describe('validarSeccionesMenu — múltiples instancias del mismo menú (ISS-041 + ISS-046)', () => {
  test('2 menús en el mismo pedido: uno completo y otro incompleto → bloquea igual', () => {
    // Sin agrupar por `grupo`, la proteína del grupo 1 "prestaría" su
    // selección al grupo 2 y el bug se colaría — el mismo tipo de error que
    // se encontró en reportes.js para el conteo.
    const db = crearDB();
    seedMenuConProteinaCondicional(db);
    const error = validarSeccionesMenu(db, [
      { id_componente: 10, id_menu_dia: 100, grupo: 1 },
      { id_componente: 20, id_menu_dia: 100, grupo: 1 }, // grupo 1: completo
      { id_componente: 10, id_menu_dia: 100, grupo: 2 },
      { id_componente: 21, id_menu_dia: 100, grupo: 2 }, // grupo 2: falta proteína
    ]);
    expect(error).toMatch(/Proteínas/);
  });

  test('2 menús en el mismo pedido, ambos completos → pasa', () => {
    const db = crearDB();
    seedMenuConProteinaCondicional(db);
    const error = validarSeccionesMenu(db, [
      { id_componente: 10, id_menu_dia: 100, grupo: 1 },
      { id_componente: 20, id_menu_dia: 100, grupo: 1 },
      { id_componente: 10, id_menu_dia: 100, grupo: 2 },
      { id_componente: 21, id_menu_dia: 100, grupo: 2 },
      { id_componente: 30, id_menu_dia: 100, grupo: 2 },
    ]);
    expect(error).toBeNull();
  });

  test('sin `grupo` (pedido viejo) se agrupa por id_menu_dia — no rompe', () => {
    const db = crearDB();
    seedMenuConProteinaCondicional(db);
    const error = validarSeccionesMenu(db, [
      { id_componente: 10, id_menu_dia: 100 },
      { id_componente: 20, id_menu_dia: 100 },
    ]);
    expect(error).toBeNull();
  });
});

describe('validarSeccionesMenu — casos borde', () => {
  test('lista vacía no rompe, devuelve null', () => {
    const db = crearDB();
    expect(validarSeccionesMenu(db, [])).toBeNull();
  });

  test('null/undefined no rompe, devuelve null', () => {
    const db = crearDB();
    expect(validarSeccionesMenu(db, null)).toBeNull();
    expect(validarSeccionesMenu(db, undefined)).toBeNull();
  });

  test('id_componente inválido se ignora silenciosamente (lo rechaza otra validación, no esta)', () => {
    const db = crearDB();
    seedMenuConProteinaCondicional(db);
    const error = validarSeccionesMenu(db, [
      { id_componente: 9999, id_menu_dia: 100, grupo: 1 },
    ]);
    expect(error).toBeNull();
  });
});
