const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'database.sqlite'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
-- ============================================================
-- 1. RESTAURANTES
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurantes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL,
  activo     INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. ROLES
-- requiere_restaurante: 1 = el usuario debe tener id_restaurante
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre               TEXT NOT NULL UNIQUE,
  requiere_restaurante INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO roles (nombre, requiere_restaurante) VALUES ('admin', 0);
INSERT OR IGNORE INTO roles (nombre, requiere_restaurante) VALUES ('owner', 1);
INSERT OR IGNORE INTO roles (nombre, requiere_restaurante) VALUES ('cocinero', 1);
INSERT OR IGNORE INTO roles (nombre, requiere_restaurante) VALUES ('mozo', 1);

-- ============================================================
-- 3. USUARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  id_rol         INTEGER NOT NULL,
  id_restaurante INTEGER,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_rol)         REFERENCES roles(id),
  FOREIGN KEY (id_restaurante) REFERENCES restaurantes(id)
);

-- ============================================================
-- 4. SECCIONES DE MENÚ
-- Catálogo base de secciones: entrada, fondo, postre, refresco...
-- ============================================================
CREATE TABLE IF NOT EXISTS secciones_menu (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  id_restaurante INTEGER NOT NULL,
  FOREIGN KEY (id_restaurante) REFERENCES restaurantes(id)
);

-- ============================================================
-- 5. PLATOS DE MENÚ
-- Catálogo de platos usados en menús del día.
-- Sin id_seccion: la sección la define el componente, no el plato.
-- Sin precio: el precio vive en menus_dia (precio del menú completo).
-- ============================================================
CREATE TABLE IF NOT EXISTS platos_menu (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  descripcion    TEXT,
  url_foto       TEXT,
  id_restaurante INTEGER NOT NULL,
  FOREIGN KEY (id_restaurante) REFERENCES restaurantes(id)
);

-- ============================================================
-- 6. MENÚS DEL DÍA
-- elegible: 0 = estático (Tipo A), 1 = el cliente elige por sección (Tipo B)
-- precio: precio del menú completo
-- ============================================================
CREATE TABLE IF NOT EXISTS menus_dia (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL DEFAULT 'Menú del día',
  elegible       INTEGER NOT NULL DEFAULT 0,
  dia            TEXT NOT NULL,
  precio         REAL NOT NULL,
  id_restaurante INTEGER NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_restaurante) REFERENCES restaurantes(id)
);

-- ============================================================
-- 6b. SECCIONES DEL MENÚ DEL DÍA
-- Define qué secciones tiene cada menú y si son obligatorias.
-- requerido: 1 = obligatoria (no se puede omitir al ordenar)
--            0 = opcional (ej: postre, refresco)
--
-- Ej: Menú Tradicional (id=1)
--   (id_menu=1, id_seccion=entrada, requerido=1)
--   (id_menu=1, id_seccion=fondo,   requerido=1)
--   (id_menu=1, id_seccion=postre,  requerido=0)  ← opcional
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_secciones (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  id_menu_dia     INTEGER NOT NULL,
  id_seccion_menu INTEGER NOT NULL,
  requerido       INTEGER NOT NULL DEFAULT 1,
  UNIQUE (id_menu_dia, id_seccion_menu),
  FOREIGN KEY (id_menu_dia)     REFERENCES menus_dia(id),
  FOREIGN KEY (id_seccion_menu) REFERENCES secciones_menu(id)
);

-- ============================================================
-- 7. COMPONENTES DEL MENÚ DEL DÍA
-- Los platos disponibles por sección para cada menú.
--
-- Menú ESTÁTICO (elegible=0): 1 fila por sección.
--   Ej: (menu=1, seccion=fondo, plato=arroz con pato)
--
-- Menú ELEGIBLE (elegible=1): N filas por sección.
--   Ej: (menu=2, seccion=entrada, plato=tequeños)
--       (menu=2, seccion=entrada, plato=causa)
--       (menu=2, seccion=entrada, plato=sopa)
-- ============================================================
CREATE TABLE IF NOT EXISTS componentes_menu_dia (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  id_menu_dia     INTEGER NOT NULL,
  dia             TEXT NOT NULL,
  id_seccion_menu INTEGER NOT NULL,
  id_plato_menu   INTEGER NOT NULL,
  id_restaurante  INTEGER NOT NULL,
  FOREIGN KEY (id_menu_dia)     REFERENCES menus_dia(id),
  FOREIGN KEY (id_seccion_menu) REFERENCES secciones_menu(id),
  FOREIGN KEY (id_plato_menu)   REFERENCES platos_menu(id),
  FOREIGN KEY (id_restaurante)  REFERENCES restaurantes(id)
);

-- ============================================================
-- 8. CATEGORÍAS DE LA CARTA
-- Independiente de secciones_menu.
-- Ejemplos: Entradas, Mariscos, Carnes, Postres
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias_carta (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  id_restaurante INTEGER NOT NULL,
  FOREIGN KEY (id_restaurante) REFERENCES restaurantes(id)
);

-- ============================================================
-- 9. PLATOS A LA CARTA
-- Precio unitario por plato. Independiente de platos_menu.
-- ============================================================
CREATE TABLE IF NOT EXISTS platos_carta (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  descripcion    TEXT,
  precio         REAL NOT NULL,
  url_foto       TEXT,
  activo         INTEGER DEFAULT 1,
  id_categoria   INTEGER NOT NULL,
  id_restaurante INTEGER NOT NULL,
  FOREIGN KEY (id_categoria)   REFERENCES categorias_carta(id),
  FOREIGN KEY (id_restaurante) REFERENCES restaurantes(id)
);

-- ============================================================
-- ESTATUS DE ÓRDENES
-- ============================================================
CREATE TABLE IF NOT EXISTS estatus_orden (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO estatus_orden (nombre) VALUES ('pendiente');
INSERT OR IGNORE INTO estatus_orden (nombre) VALUES ('preparando');
INSERT OR IGNORE INTO estatus_orden (nombre) VALUES ('entregando');
INSERT OR IGNORE INTO estatus_orden (nombre) VALUES ('completado');
INSERT OR IGNORE INTO estatus_orden (nombre) VALUES ('cancelado');

-- ============================================================
-- ESTATUS DE RESERVAS
-- ============================================================
CREATE TABLE IF NOT EXISTS estatus_reserva (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO estatus_reserva (nombre) VALUES ('pendiente');
INSERT OR IGNORE INTO estatus_reserva (nombre) VALUES ('confirmada');
INSERT OR IGNORE INTO estatus_reserva (nombre) VALUES ('cancelada');
INSERT OR IGNORE INTO estatus_reserva (nombre) VALUES ('completada');

-- ============================================================
-- 10. ÓRDENES
-- Cabecera unificadora: agrupa líneas de carta y/o menú del día.
-- ============================================================
CREATE TABLE IF NOT EXISTS ordenes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  mesa           INTEGER,
  nombre_cliente TEXT,
  fecha          TEXT NOT NULL,
  id_restaurante INTEGER NOT NULL,
  id_estatus     INTEGER DEFAULT 1,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_restaurante) REFERENCES restaurantes(id),
  FOREIGN KEY (id_estatus)     REFERENCES estatus_orden(id)
);

-- Líneas de menú dentro de una orden.
-- Una fila por sección elegida. El backend valida que todas las
-- secciones requeridas (menu_secciones.requerido=1) estén cubiertas.
CREATE TABLE IF NOT EXISTS orden_menu_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  id_orden       INTEGER NOT NULL,
  id_menu_dia    INTEGER NOT NULL,
  id_componente  INTEGER NOT NULL,
  cantidad       INTEGER DEFAULT 1,
  FOREIGN KEY (id_orden)      REFERENCES ordenes(id),
  FOREIGN KEY (id_menu_dia)   REFERENCES menus_dia(id),
  FOREIGN KEY (id_componente) REFERENCES componentes_menu_dia(id)
);

-- Líneas de carta dentro de una orden.
CREATE TABLE IF NOT EXISTS orden_carta_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  id_orden        INTEGER NOT NULL,
  id_plato_carta  INTEGER NOT NULL,
  cantidad        INTEGER DEFAULT 1,
  precio_unitario REAL NOT NULL,
  FOREIGN KEY (id_orden)       REFERENCES ordenes(id),
  FOREIGN KEY (id_plato_carta) REFERENCES platos_carta(id)
);

-- ============================================================
-- 11. RESERVAS
-- ============================================================
CREATE TABLE IF NOT EXISTS reservas (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_cliente   TEXT NOT NULL,
  telefono_cliente TEXT,
  fecha            TEXT NOT NULL,
  mesa             INTEGER,
  id_restaurante   INTEGER NOT NULL,
  id_estatus       INTEGER DEFAULT 1,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_restaurante) REFERENCES restaurantes(id),
  FOREIGN KEY (id_estatus)     REFERENCES estatus_reserva(id)
);

-- Líneas de menú dentro de una reserva.
CREATE TABLE IF NOT EXISTS reserva_menu_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  id_reserva     INTEGER NOT NULL,
  id_menu_dia    INTEGER NOT NULL,
  id_componente  INTEGER NOT NULL,
  cantidad       INTEGER DEFAULT 1,
  FOREIGN KEY (id_reserva)    REFERENCES reservas(id),
  FOREIGN KEY (id_menu_dia)   REFERENCES menus_dia(id),
  FOREIGN KEY (id_componente) REFERENCES componentes_menu_dia(id)
);

-- Líneas de carta dentro de una reserva.
CREATE TABLE IF NOT EXISTS reserva_carta_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  id_reserva      INTEGER NOT NULL,
  id_plato_carta  INTEGER NOT NULL,
  cantidad        INTEGER DEFAULT 1,
  precio_unitario REAL NOT NULL,
  FOREIGN KEY (id_reserva)     REFERENCES reservas(id),
  FOREIGN KEY (id_plato_carta) REFERENCES platos_carta(id)
);
`);

// Migración idempotente: columna activo en platos_carta
try {
  db.exec(`ALTER TABLE platos_carta ADD COLUMN activo INTEGER DEFAULT 1`);
} catch (_) { /* columna ya existe */ }

// Migración idempotente: columna es_full en estatus_reserva
try {
  db.exec(`ALTER TABLE estatus_reserva ADD COLUMN es_full INTEGER DEFAULT 0`);
} catch (_) { /* columna ya existe */ }

// Si ningún estatus tiene es_full=1, marcar 'completada' por defecto
const hayFull = db.prepare(`SELECT COUNT(*) AS n FROM estatus_reserva WHERE es_full = 1`).get().n;
if (!hayFull) {
  db.prepare(`UPDATE estatus_reserva SET es_full = 1 WHERE nombre = 'completada'`).run();
}

// Migración idempotente: columna total en ordenes y reservas
try { db.exec(`ALTER TABLE ordenes  ADD COLUMN total REAL DEFAULT NULL`); } catch (_) {}
try { db.exec(`ALTER TABLE reservas ADD COLUMN total REAL DEFAULT NULL`); } catch (_) {}

// Migración idempotente: flags semánticos en estatus_orden
try { db.exec(`ALTER TABLE estatus_orden ADD COLUMN es_inicial    INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE estatus_orden ADD COLUMN es_pagado     INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE estatus_orden ADD COLUMN es_cancelado  INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE estatus_orden ADD COLUMN es_en_cocina  INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE estatus_orden ADD COLUMN es_listo      INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE estatus_orden ADD COLUMN es_entregado  INTEGER DEFAULT 0`); } catch (_) {}

// Nueva fila de estatus para "entregado" (entre entregando y completado)
db.prepare(`INSERT OR IGNORE INTO estatus_orden (nombre) VALUES ('entregado')`).run();

// Backfill flags estatus_orden (solo si el flag aún no está asignado)
if (!db.prepare(`SELECT id FROM estatus_orden WHERE es_inicial    = 1`).get())
  db.prepare(`UPDATE estatus_orden SET es_inicial    = 1 WHERE nombre = 'pendiente'`).run();
if (!db.prepare(`SELECT id FROM estatus_orden WHERE es_en_cocina  = 1`).get())
  db.prepare(`UPDATE estatus_orden SET es_en_cocina  = 1 WHERE nombre = 'preparando'`).run();
if (!db.prepare(`SELECT id FROM estatus_orden WHERE es_listo      = 1`).get())
  db.prepare(`UPDATE estatus_orden SET es_listo      = 1 WHERE nombre = 'entregando'`).run();
if (!db.prepare(`SELECT id FROM estatus_orden WHERE es_entregado  = 1`).get())
  db.prepare(`UPDATE estatus_orden SET es_entregado  = 1 WHERE nombre = 'entregado'`).run();
if (!db.prepare(`SELECT id FROM estatus_orden WHERE es_pagado     = 1`).get())
  db.prepare(`UPDATE estatus_orden SET es_pagado     = 1 WHERE nombre = 'completado'`).run();
if (!db.prepare(`SELECT id FROM estatus_orden WHERE es_cancelado  = 1`).get())
  db.prepare(`UPDATE estatus_orden SET es_cancelado  = 1 WHERE nombre = 'cancelado'`).run();

// Migración idempotente: flags semánticos en estatus_reserva
try { db.exec(`ALTER TABLE estatus_reserva ADD COLUMN es_inicial       INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE estatus_reserva ADD COLUMN es_cancelado     INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE estatus_reserva ADD COLUMN es_confirmada    INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE estatus_reserva ADD COLUMN es_en_cocina     INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE estatus_reserva ADD COLUMN es_listo         INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE estatus_reserva ADD COLUMN es_cliente_llego INTEGER DEFAULT 0`); } catch (_) {}

// Estatus por defecto del flujo de reserva (idempotente)
db.exec(`INSERT OR IGNORE INTO estatus_reserva (nombre) VALUES ('en preparación')`);
db.exec(`INSERT OR IGNORE INTO estatus_reserva (nombre) VALUES ('listo')`);
db.exec(`INSERT OR IGNORE INTO estatus_reserva (nombre) VALUES ('cliente llegó')`);

// Backfill flags estatus_reserva (solo si el flag aún no está asignado)
if (!db.prepare(`SELECT id FROM estatus_reserva WHERE es_inicial       = 1`).get())
  db.prepare(`UPDATE estatus_reserva SET es_inicial       = 1 WHERE nombre = 'pendiente'`).run();
if (!db.prepare(`SELECT id FROM estatus_reserva WHERE es_confirmada    = 1`).get())
  db.prepare(`UPDATE estatus_reserva SET es_confirmada    = 1 WHERE nombre = 'confirmada'`).run();
if (!db.prepare(`SELECT id FROM estatus_reserva WHERE es_cancelado     = 1`).get())
  db.prepare(`UPDATE estatus_reserva SET es_cancelado     = 1 WHERE nombre = 'cancelada'`).run();
if (!db.prepare(`SELECT id FROM estatus_reserva WHERE es_en_cocina     = 1`).get())
  db.prepare(`UPDATE estatus_reserva SET es_en_cocina     = 1 WHERE nombre = 'en preparación'`).run();
if (!db.prepare(`SELECT id FROM estatus_reserva WHERE es_listo         = 1`).get())
  db.prepare(`UPDATE estatus_reserva SET es_listo         = 1 WHERE nombre = 'listo'`).run();
if (!db.prepare(`SELECT id FROM estatus_reserva WHERE es_cliente_llego = 1`).get())
  db.prepare(`UPDATE estatus_reserva SET es_cliente_llego = 1 WHERE nombre = 'cliente llegó'`).run();

// Migración idempotente: permisos granulares por usuario
try { db.exec(`ALTER TABLE usuarios ADD COLUMN permisos TEXT DEFAULT NULL`); } catch (_) {}

// Migración idempotente: columna activo en menus_dia
try { db.exec(`ALTER TABLE menus_dia ADD COLUMN activo INTEGER DEFAULT 1`); } catch (_) {}

// Migración idempotente: plato cuya foto es la portada de la card del menú (galería owner)
try { db.exec(`ALTER TABLE menus_dia ADD COLUMN id_plato_portada INTEGER DEFAULT NULL`); } catch (_) {}

// Migración idempotente: columna agotado en componentes_menu_dia
try { db.exec(`ALTER TABLE componentes_menu_dia ADD COLUMN agotado INTEGER DEFAULT 0`); } catch (_) {}

// Migración idempotente: hora de llegada en reservas
try { db.exec(`ALTER TABLE reservas ADD COLUMN hora_llegada TEXT DEFAULT NULL`); } catch (_) {}

// Migración idempotente: tabla de mesas por restaurante
db.exec(`
  CREATE TABLE IF NOT EXISTS mesas (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    numero         INTEGER NOT NULL,
    capacidad      INTEGER NOT NULL DEFAULT 4,
    activo         INTEGER NOT NULL DEFAULT 1,
    id_restaurante INTEGER NOT NULL,
    UNIQUE (numero, id_restaurante),
    FOREIGN KEY (id_restaurante) REFERENCES restaurantes(id)
  )
`);

// Migración idempotente: configuración visual del restaurante
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN foto_portada    TEXT`); } catch (_) {}
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN color_primario  TEXT DEFAULT '#c8692a'`); } catch (_) {}
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN color_secundario TEXT DEFAULT '#1a6090'`); } catch (_) {}

// Migración idempotente: métodos de pago por restaurante (Yape / Plin / Efectivo)
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN yape_activo    INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN yape_telefono  TEXT    DEFAULT NULL`); } catch (_) {}
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN plin_activo    INTEGER DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN plin_telefono  TEXT    DEFAULT NULL`); } catch (_) {}
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN efectivo_activo INTEGER DEFAULT 0`); } catch (_) {}

// Migración idempotente: estado de pago en órdenes
try { db.exec(`ALTER TABLE ordenes ADD COLUMN metodo_pago     TEXT DEFAULT NULL`); } catch (_) {}
try { db.exec(`ALTER TABLE ordenes ADD COLUMN estado_pago     TEXT DEFAULT NULL`); } catch (_) {}
try { db.exec(`ALTER TABLE ordenes ADD COLUMN comprobante_url TEXT DEFAULT NULL`); } catch (_) {}

// Migración idempotente: estado de pago en reservas
try { db.exec(`ALTER TABLE reservas ADD COLUMN metodo_pago     TEXT DEFAULT NULL`); } catch (_) {}
try { db.exec(`ALTER TABLE reservas ADD COLUMN estado_pago     TEXT DEFAULT NULL`); } catch (_) {}
try { db.exec(`ALTER TABLE reservas ADD COLUMN comprobante_url TEXT DEFAULT NULL`); } catch (_) {}

// Backfill: calcular y guardar total de órdenes completadas sin total guardado
const { calcularTotalOrden, calcularTotalReserva } = require('../utils/totales');

const backfillOrdenes = db.transaction(() => {
  const pendientes = db.prepare(`
    SELECT o.id FROM ordenes o
    JOIN estatus_orden e ON o.id_estatus = e.id
    WHERE e.es_pagado = 1 AND o.total IS NULL
  `).all();
  const upd = db.prepare(`UPDATE ordenes SET total = ? WHERE id = ?`);
  for (const { id } of pendientes) upd.run(calcularTotalOrden(db, id), id);
  return pendientes.length;
});

const backfillReservas = db.transaction(() => {
  const pendientes = db.prepare(`
    SELECT r.id FROM reservas r
    JOIN estatus_reserva e ON r.id_estatus = e.id
    WHERE e.nombre = 'completada' AND e.es_full = 1 AND r.total IS NULL
  `).all();
  const upd = db.prepare(`UPDATE reservas SET total = ? WHERE id = ?`);
  for (const { id } of pendientes) upd.run(calcularTotalReserva(db, id), id);
  return pendientes.length;
});

const nOrd = backfillOrdenes();
const nRes = backfillReservas();
if (nOrd > 0) console.log(`✅ Backfill: ${nOrd} órdenes completadas con total calculado`);
if (nRes > 0) console.log(`✅ Backfill: ${nRes} reservas completadas con total calculado`);

// Migración idempotente: código único de reserva
try { db.exec(`ALTER TABLE reservas ADD COLUMN codigo TEXT`); } catch (_) {}
// Índice único parcial (ignora NULLs para no conflictuarse durante el backfill)
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reservas_codigo ON reservas(codigo) WHERE codigo IS NOT NULL`);

// Índices de performance para queries frecuentes por restaurante y fecha
db.exec(`CREATE INDEX IF NOT EXISTS idx_ordenes_restaurante ON ordenes(id_restaurante)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_ordenes_fecha       ON ordenes(fecha)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_reservas_restaurante ON reservas(id_restaurante)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_reservas_fecha       ON reservas(fecha)`);

// Backfill: asignar código a reservas que no tienen uno
const { generarCodigoUnico } = require('../utils/codigoReserva');
const backfillCodigos = db.transaction(() => {
  const sinCodigo = db.prepare(`SELECT id FROM reservas WHERE codigo IS NULL`).all();
  const upd = db.prepare(`UPDATE reservas SET codigo = ? WHERE id = ?`);
  for (const { id } of sinCodigo) upd.run(generarCodigoUnico(db), id);
  return sinCodigo.length;
});
const nCod = backfillCodigos();
if (nCod > 0) console.log(`✅ Backfill: ${nCod} reservas con código asignado`);

// Migración idempotente: modalidad de reserva (en_local | para_llevar | delivery)
// Afecta la máquina de estados: para_llevar no tiene es_cliente_llego, va directo a es_full
try { db.exec(`ALTER TABLE reservas ADD COLUMN modalidad TEXT DEFAULT 'en_local'`); } catch (_) {}

// Migración idempotente: minutos de preparación anticipada por restaurante (Gap 3)
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN minutos_preparacion INTEGER DEFAULT 20`); } catch (_) {}

// Migración idempotente: modalidades de pedido (Gap 4)
try { db.exec(`ALTER TABLE ordenes ADD COLUMN modalidad TEXT DEFAULT 'en_local'`); } catch (_) {}
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN para_llevar_activo INTEGER DEFAULT 1`); } catch (_) {}
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN delivery_activo    INTEGER DEFAULT 0`); } catch (_) {}

// Migración idempotente: precio por modalidad (Gap 5)
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN costo_tapper    REAL DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN tarifa_delivery REAL DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE ordenes   ADD COLUMN cargo_modalidad REAL DEFAULT 0`); } catch (_) {}
try { db.exec(`ALTER TABLE reservas  ADD COLUMN cargo_modalidad REAL DEFAULT 0`); } catch (_) {}

// Migración idempotente: auto-merge cuenta por mesa (Gap 8)
try { db.exec(`ALTER TABLE restaurantes ADD COLUMN auto_merge_activo INTEGER DEFAULT 1`); } catch (_) {}

// Tabla de suscripciones push (Gap 3 — Web Push)
db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario     INTEGER NOT NULL,
    id_restaurante INTEGER NOT NULL,
    subscription   TEXT NOT NULL,
    creado_en      TEXT DEFAULT (datetime('now'))
  )
`);

console.log('✅ Database ready');

module.exports = db;