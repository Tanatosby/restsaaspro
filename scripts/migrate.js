// scripts/migrate.js
const db = require('../config/database');
try {
  db.prepare(`ALTER TABLE platos_carta ADD COLUMN activo INTEGER DEFAULT 1`).run();
  console.log('✅ Migración aplicada');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('ℹ️ Columna ya existe, sin cambios');
  } else throw e;
}