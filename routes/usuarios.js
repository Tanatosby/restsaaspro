// routes/usuarios.js
// Gestión de usuarios del restaurante — accesible por owner
// El owner solo puede ver/crear/eliminar usuarios de su propio restaurante
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/database');
const { authenticate, authorize, authorizePermiso } = require('../middleware/authenticate');

router.use(authenticate);

// ─────────────────────────────────────────────────────
// GET /api/usuarios
// Lista todos los usuarios del restaurante del owner
// ─────────────────────────────────────────────────────
router.get('/', authorize('owner', 'admin'), (req, res) => {
  // Admin puede pasar ?restaurante=X para ver cualquier restaurante
  // Owner solo ve el suyo
  const restauranteId = req.user.role === 'admin'
    ? (req.query.restaurante || req.user.restaurant_id)
    : req.user.restaurant_id;

  const usuarios = db.prepare(`
    SELECT
      u.id,
      u.nombre,
      u.email,
      r.nombre AS rol,
      u.permisos,
      u.created_at
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id
    WHERE u.id_restaurante = ?
    ORDER BY r.nombre ASC, u.nombre ASC
  `).all(restauranteId);

  res.json(usuarios);
});

// ─────────────────────────────────────────────────────
// POST /api/usuarios
// Crea un nuevo usuario (cocinero o mozo) en el restaurante
// El owner no puede crear otros owners ni admins
// ─────────────────────────────────────────────────────
router.post('/', authorize('owner', 'admin'), (req, res) => {
  const { nombre, email, password, rol, id_restaurante } = req.body;

  if (!nombre?.trim())
    return res.status(400).json({ error: 'El nombre es requerido' });
  if (!email?.trim())
    return res.status(400).json({ error: 'El email es requerido' });
  if (!password || password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  if (!rol)
    return res.status(400).json({ error: 'El rol es requerido' });

  // El owner solo puede crear cocineros y mozos
  const rolesPermitidos = req.user.role === 'admin'
    ? ['owner', 'cocinero', 'mozo']
    : ['cocinero', 'mozo'];

  if (!rolesPermitidos.includes(rol))
    return res.status(403).json({
      error: `No puedes crear usuarios con rol "${rol}". Roles permitidos: ${rolesPermitidos.join(', ')}`
    });

  // El restaurante destino
  const restauranteId = req.user.role === 'admin'
    ? (id_restaurante || req.user.restaurant_id)
    : req.user.restaurant_id;

  if (!restauranteId)
    return res.status(400).json({ error: 'id_restaurante es requerido' });

  // Verificar que el restaurante existe
  const restaurante = db.prepare(`
    SELECT id FROM restaurantes WHERE id = ? AND activo = 1
  `).get(restauranteId);

  if (!restaurante)
    return res.status(404).json({ error: 'Restaurante no encontrado o inactivo' });

  // Email único
  const existe = db.prepare(`
    SELECT id FROM usuarios WHERE email = ?
  `).get(email.trim());

  if (existe)
    return res.status(400).json({ error: 'El email ya está registrado' });

  // Obtener rol
  const rolRow = db.prepare(`
    SELECT id FROM roles WHERE nombre = ?
  `).get(rol);

  if (!rolRow)
    return res.status(400).json({ error: `Rol inválido: ${rol}` });

  const hash = bcrypt.hashSync(password, 10);

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
    VALUES (?, ?, ?, ?, ?)
  `).run(nombre.trim(), email.trim(), hash, rolRow.id, restauranteId);

  res.status(201).json({
    message: `Usuario "${nombre.trim()}" creado correctamente`,
    id: lastInsertRowid
  });
});

// ─────────────────────────────────────────────────────
// PATCH /api/usuarios/:id/password
// Cambia la contraseña de un usuario del restaurante
// ─────────────────────────────────────────────────────
router.patch('/:id/password', authorize('owner', 'admin'), (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

  // Buscar usuario y verificar que pertenece al restaurante del owner
  const usuario = db.prepare(`
    SELECT u.id, u.nombre, r.nombre AS rol, u.id_restaurante
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id
    WHERE u.id = ?
  `).get(req.params.id);

  if (!usuario)
    return res.status(404).json({ error: 'Usuario no encontrado' });

  // Owner solo puede cambiar passwords de su propio restaurante
  if (req.user.role === 'owner' && usuario.id_restaurante !== req.user.restaurant_id)
    return res.status(403).json({ error: 'No tienes permiso sobre este usuario' });

  // Owner no puede cambiar password de otros owners ni del admin
  if (req.user.role === 'owner' && ['owner', 'admin'].includes(usuario.rol))
    return res.status(403).json({ error: 'No puedes cambiar la contraseña de este usuario' });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`UPDATE usuarios SET password_hash = ? WHERE id = ?`).run(hash, req.params.id);

  res.json({ message: `Contraseña de "${usuario.nombre}" actualizada` });
});

// ─────────────────────────────────────────────────────
// DELETE /api/usuarios/:id
// Elimina un usuario del restaurante
// El owner no puede eliminarse a sí mismo ni a otros owners
// ─────────────────────────────────────────────────────
router.delete('/:id', authorize('owner', 'admin'), (req, res) => {
  const usuario = db.prepare(`
    SELECT u.id, u.nombre, r.nombre AS rol, u.id_restaurante
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id
    WHERE u.id = ?
  `).get(req.params.id);

  if (!usuario)
    return res.status(404).json({ error: 'Usuario no encontrado' });

  // Owner solo puede eliminar usuarios de su restaurante
  if (req.user.role === 'owner' && usuario.id_restaurante !== req.user.restaurant_id)
    return res.status(403).json({ error: 'No tienes permiso sobre este usuario' });

  // No puede eliminarse a sí mismo
  if (usuario.id === req.user.id)
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });

  // Owner no puede eliminar a otros owners ni admins
  if (req.user.role === 'owner' && ['owner', 'admin'].includes(usuario.rol))
    return res.status(403).json({ error: 'No puedes eliminar a este usuario' });

  db.prepare(`DELETE FROM usuarios WHERE id = ?`).run(req.params.id);

  res.json({ message: `Usuario "${usuario.nombre}" eliminado` });
});

// ─────────────────────────────────────────────────────
// PATCH /api/usuarios/:id/permisos
// El owner asigna permisos granulares a un usuario de su restaurante
// ─────────────────────────────────────────────────────
router.patch('/:id/permisos', authorize('owner', 'admin'), (req, res) => {
  const { permisos } = req.body;

  if (!Array.isArray(permisos))
    return res.status(400).json({ error: 'permisos debe ser un array' });

  const usuario = db.prepare(`
    SELECT u.id, u.nombre, r.nombre AS rol, u.id_restaurante
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id
    WHERE u.id = ?
  `).get(req.params.id);

  if (!usuario)
    return res.status(404).json({ error: 'Usuario no encontrado' });

  // Owner solo puede modificar usuarios de su restaurante
  if (req.user.role === 'owner' && usuario.id_restaurante !== req.user.restaurant_id)
    return res.status(403).json({ error: 'No tienes permiso sobre este usuario' });

  // No se pueden asignar permisos a owners ni admins
  if (['owner', 'admin'].includes(usuario.rol))
    return res.status(400).json({ error: 'Los owners y admins tienen acceso completo; no se les asignan permisos' });

  const permisosJson = permisos.length > 0 ? JSON.stringify(permisos) : null;
  db.prepare(`UPDATE usuarios SET permisos = ? WHERE id = ?`).run(permisosJson, req.params.id);

  res.json({ message: `Permisos de "${usuario.nombre}" actualizados`, permisos });
});

module.exports = router;