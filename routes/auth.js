// routes/auth.js
const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db        = require('../config/database');
const { authenticate, authorize } = require('../middleware/authenticate');

const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,  // 15 minutes
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler: (req, res, next, options) => {
    const retryAfterSec = Math.ceil(options.windowMs / 1000);
    const minutes       = Math.ceil(retryAfterSec / 60);
    res.status(429).json({
      error: `Demasiados intentos fallidos. Intenta de nuevo en ${minutes} minutos.`
    });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/register
// Creates a new restaurant + owner account
// ─────────────────────────────────────────
router.post('/register',authenticate, authorize('admin'), (req, res) => {
  const { restaurantName, ownerName, email, password } = req.body;

  // 1. Validate — all fields required
  if (!restaurantName || !ownerName || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 8) {
  return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
}

  // 2. Check email not already taken
  const existingUser = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email ya registrado' });
  }

  // 3. Hash the password — never store plain text
  const password_hash = bcrypt.hashSync(password, 10);

  // 4. Get owner role_id
  const ownerRole = db.prepare("SELECT id FROM roles WHERE nombre = 'owner'").get();

  // 5. Create restaurant first
  const restaurant = db.prepare(`
    INSERT INTO restaurantes (nombre) VALUES (?)
  `).run(restaurantName);

  // 6. Create the owner user linked to that restaurant
  db.prepare(`
    INSERT INTO usuarios (nombre, email, password_hash, id_rol, id_restaurante)
    VALUES (?, ?, ?, ?, ?)
  `).run(ownerName, email, password_hash, ownerRole.id, restaurant.lastInsertRowid);

  res.status(201).json({ message: 'Restaurante creado de manera correcta' });
});

// ─────────────────────────────────────────
// POST /api/auth/login
// Returns a JWT token
// ─────────────────────────────────────────
router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;

  // 1. Find user + their role name in one query
  const user = db.prepare(`
    SELECT u.*, r.nombre AS role
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id
    WHERE u.email = ?
  `).get(email);

  // Parsear permisos almacenados (null para owner/admin = acceso total)
  let permisos = null;
  if (user && !['owner', 'admin'].includes(user.role) && user.permisos) {
    try { permisos = JSON.parse(user.permisos); } catch (_) { permisos = []; }
  }

  // 2. User not found or wrong password
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email o contraseña inválidos' });
  }

  // 3. If user belongs to a restaurant, check it's active
  if (user.id_restaurante) {
    const restaurant = db.prepare(`SELECT activo FROM restaurantes WHERE id = ?`).get(user.id_restaurante);
    if (!restaurant || !restaurant.activo) {
      return res.status(403).json({ error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' });
    }
  }

  // 3. Build the JWT payload — what we attach to every request
  const token = jwt.sign(
    {
      id:            user.id,
      name:          user.nombre,
      role:          user.role,
      restaurant_id: user.id_restaurante,  // null for admin
      permisos                             // null = acceso total (owner/admin)
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  // HttpOnly cookie — JS cannot read this, so XSS cannot steal the token
  res.cookie('auth_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   8 * 60 * 60 * 1000   // 8 h, matches JWT expiry
  });

  // Return only non-sensitive UI data — never expose the raw token to JS
  res.json({
    user: {
      name:          user.nombre,
      role:          user.role,
      restaurant_id: user.id_restaurante,
      permisos                              // null = owner/admin (acceso total)
    }
  });
});

// ─────────────────────────────────────────
// PATCH /api/auth/me/password
// Cambio de contraseña propio (cualquier usuario autenticado)
// ─────────────────────────────────────────
router.patch('/me/password', authenticate, (req, res) => {
  const { passwordActual, passwordNueva } = req.body;

  if (!passwordActual || !passwordNueva)
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });

  if (passwordNueva.length < 8)
    return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 8 caracteres' });

  const user = db.prepare(`SELECT id, password_hash FROM usuarios WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (!bcrypt.compareSync(passwordActual, user.password_hash))
    return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

  const hash = bcrypt.hashSync(passwordNueva, 10);
  db.prepare(`UPDATE usuarios SET password_hash = ? WHERE id = ?`).run(hash, user.id);

  res.json({ message: 'Contraseña actualizada correctamente' });
});

// ─────────────────────────────────────────
// POST /api/auth/logout
// Clears the auth cookie
// ─────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', { httpOnly: true, sameSite: 'strict' });
  res.json({ message: 'Sesión terminada' });
});

module.exports = router;