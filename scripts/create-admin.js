// scripts/create-admin.js
// Run once to create the superadmin account:
//   node scripts/create-admin.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('../config/database');

const NAME     = 'Super Admin';
const EMAIL    = 'admin@platform.com';
const PASSWORD = 'admin1234';          // ← cambia esto antes de producción

const roleId = db.prepare(`SELECT id FROM roles WHERE nombre = 'admin'`).get()?.id;
if (!roleId) {
  console.error('Role "admin" not found. Is the DB initialised?');
  process.exit(1);
}

const existing = db.prepare(`SELECT id FROM usuarios WHERE email = ?`).get(EMAIL);
if (existing) {
  console.log(`Admin already exists (id=${existing.id}). Nothing to do.`);
  process.exit(0);
}

const hash = bcrypt.hashSync(PASSWORD, 10);
const { lastInsertRowid } = db.prepare(`
  INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
  VALUES (?, ?, ?, ?, NULL)
`).run(NAME, EMAIL, hash, roleId);

console.log(`✅ Admin created — id=${lastInsertRowid}`);
console.log(`   Email   : ${EMAIL}`);
console.log(`   Password: ${PASSWORD}`);
console.log(`   ⚠️  Cambia la contraseña en producción.`);
