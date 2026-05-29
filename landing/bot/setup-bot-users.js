'use strict';
// Script de configuración: crea usuarios de bot con contraseñas conocidas
// Ejecutar UNA VEZ antes de correr el bot: node landing/bot/setup-bot-users.js

const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../database.sqlite'));

const BOT_PASSWORD = 'BotMenuPro2026!';
const hash = bcrypt.hashSync(BOT_PASSWORD, 10);

// Verificar que el restaurante demo existe (id=1, Crisolito)
const rest = db.prepare('SELECT id, nombre FROM restaurantes WHERE id = 1').get();
if (!rest) {
  console.error('ERROR: No existe restaurante con id=1. Crear un restaurante primero.');
  process.exit(1);
}
console.log(`Restaurante base: [${rest.id}] ${rest.nombre}`);

// Roles
const roles = {};
db.prepare('SELECT id, nombre FROM roles').all().forEach(r => { roles[r.nombre] = r.id; });

// Función upsert usuario
function upsertUser(nombre, email, rol) {
  const existing = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existing) {
    db.prepare('UPDATE usuarios SET nombre=?, password_hash=?, id_rol=?, id_restaurante=1 WHERE email=?')
      .run(nombre, hash, roles[rol], email);
    console.log(`  [actualizado] ${rol}: ${email}`);
  } else {
    db.prepare('INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante) VALUES (?,?,?,?,1)')
      .run(nombre, email, hash, roles[rol]);
    console.log(`  [creado] ${rol}: ${email}`);
  }
}

console.log('\nCreando/actualizando usuarios del bot...');
upsertUser('María Dueña',  'owner@bot.com',    'owner');
upsertUser('Juan Cocina',  'cocina@bot.com',   'cocinero');
upsertUser('Luis Mozo',    'mozo@bot.com',     'mozo');

// Asignar permisos via columna JSON en usuarios
const mozo = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('mozo@bot.com');
if (mozo) {
  const permisosMovzo = ['mesas', 'ordenes_activas', 'reservas_activas', 'cola_dia'];
  db.prepare('UPDATE usuarios SET permisos = ? WHERE id = ?')
    .run(JSON.stringify(permisosMovzo), mozo.id);
  console.log('  Permisos del mozo asignados:', permisosMovzo.join(', '));
}

const cocinero = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('cocina@bot.com');
if (cocinero) {
  const permisosCocinero = ['cocina'];
  db.prepare('UPDATE usuarios SET permisos = ? WHERE id = ?')
    .run(JSON.stringify(permisosCocinero), cocinero.id);
  console.log('  Permisos del cocinero asignados:', permisosCocinero.join(', '));
}

db.close();

console.log('\n✓ Setup completado');
console.log(`  Contraseña de todos los bots: ${BOT_PASSWORD}`);
console.log('  owner@bot.com  → panel owner completo');
console.log('  cocina@bot.com → panel cocina');
console.log('  mozo@bot.com   → panel mesas + cola');
