// middleware/authenticate.js
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  // Prefer the HttpOnly cookie; fall back to Authorization header for API clients
  const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    if (err.name == 'TokenExpiredError'){
   return res.status(401).json({ error: 'Expired token' });
  }
  return res.status(403).json({error: 'Invalid token'})
  }

}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// middleware/authenticate.js  ← agregar aquí junto a los demás

function authorizeRestaurante(req, res, next) {
  const { role, restaurante_id } = req.user;

  // El admin no pertenece a ningún restaurante → pasa siempre
  if (role === 'admin') return next();

  // Para todos los demás roles, id_restaurante es obligatorio en el token
  if (!restaurante_id) {
    return res.status(403).json({ error: 'Usuario sin restaurante asignado' });
  }

  // El id_restaurante del recurso puede venir de tres lugares según la ruta
  const resourceRestauranteId =
    parseInt(req.params.restaurante_id) ||   // ej: /restaurantes/:restaurante_id/...
    parseInt(req.body.id_restaurante)   ||   // ej: POST con body
    parseInt(req.query.restaurante_id);      // ej: GET con query param

  if (!resourceRestauranteId) {
    // La ruta no expone restaurante_id → confiamos en el token directamente
    // (el handler usará req.user.restaurante_id para filtrar)
    return next();
  }

  // El restaurante del recurso debe coincidir con el del token
  if (resourceRestauranteId !== restaurante_id) {
    return res.status(403).json({ error: 'Acceso denegado a este restaurante' });
  }

  next();
}

// Permite acceso a owner/admin, o a cualquier usuario con al menos un permiso asignado.
// La granularidad por módulo la controla el frontend; el backend garantiza que solo
// usuarios autorizados por el owner accedan al API del restaurante.
function authorizePermiso() {
  return (req, res, next) => {
    if (['owner', 'admin'].includes(req.user.role)) return next();
    const permisos = req.user.permisos;
    if (Array.isArray(permisos) && permisos.length > 0) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

module.exports = { authenticate, authorize, authorizeRestaurante, authorizePermiso };
