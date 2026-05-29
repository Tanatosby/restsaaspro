// app.js
require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path         = require('path');
const logger       = require('./middleware/logger');

const webpush            = require('web-push');
const authRoutes         = require('./routes/auth');
const adminRoutes        = require('./routes/admin');
const menuRoutes         = require('./routes/menu');
const ordersRoutes       = require('./routes/orders');
const reservationsRoutes = require('./routes/reservations');
const publicRoutes       = require('./routes/public');
const usuariosRoutes     = require('./routes/usuarios');
const { router: reportesRoutes } = require('./routes/reportes');
const mesasRoutes        = require('./routes/mesas');
const pushRoutes         = require('./routes/push');
const { iniciarJob }     = require('./utils/autoPreparacion');


// Configurar Web Push con las VAPID keys del .env
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const app  = express();
const PORT = process.env.PORT || 3000;

// Seguridad: headers HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                   "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net",
                   "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:        ["'self'", "data:", "blob:"],
      connectSrc:    ["'self'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      // Desactivar el upgrade automático a HTTPS — rompe el login en LAN/celular
      // mientras el server no tenga TLS. En producción con HTTPS real, reactivar.
      upgradeInsecureRequests: null,
    },
  },
}));

// Rate limiting global
const limiterGeneral = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const limiterAuth    = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use('/api/auth', limiterAuth);
app.use('/api/',     limiterGeneral);

app.use(logger);
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
// Screenshots del bot para los manuales (fuera de public/)
app.use('/bot-screenshots', express.static(path.join(__dirname, 'landing', 'bot', 'output', 'screenshots')));

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth',         authRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/menu',         menuRoutes);
app.use('/api/orders',       ordersRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/usuarios',  usuariosRoutes);
app.use('/api/reportes',  reportesRoutes);
app.use('/api/mesas',     mesasRoutes);
app.use('/api/push',      pushRoutes);


const htmlRoutes = [
  ['/',                'landing.html'],
  ['/login',           'login.html'],
  ['/admin/login',     'admin/login.html'],
  ['/admin/dashboard', 'admin/dashboard.html'],
  ['/owner',           'owner.html'],
  ['/kitchen',         'kitchen.html'],
  ['/menu',            'menu.html'],
  ['/manuales',        'manuales.html'],
];

htmlRoutes.forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
});

// Endpoint público: sirve los .md de manuales para renderizado client-side
const ROLES_MANUALES = ['owner', 'cocina', 'mozo', 'cliente'];
app.get('/api/manuales/:rol', (req, res) => {
  const { rol } = req.params;
  if (!ROLES_MANUALES.includes(rol)) {
    return res.status(404).json({ error: 'Manual no encontrado' });
  }
  const mdPath = path.join(__dirname, 'landing', 'bot', 'output', `manual-${rol}.md`);
  res.type('text/plain; charset=utf-8').sendFile(mdPath);
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar job de auto-preparación de reservas (Gap 3)
const db = require('./config/database');
iniciarJob(db, webpush);

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running  → http://localhost:${PORT}`);
  console.log(`   Admin panel    → http://localhost:${PORT}/admin/login`);
  console.log(`   User login     → http://localhost:${PORT}/login`);
  console.log(`   Menu cliente   → http://localhost:${PORT}/menu?restaurante=1&mesa=1`);
  console.log(`   Environment    → ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown: cierra conexiones y BD antes de apagar
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Cerrando servidor...`);
  server.close(() => {
    console.log('Conexiones HTTP cerradas.');
    try { db.close(); } catch (_) {}
    console.log('Base de datos cerrada. Saliendo.');
    process.exit(0);
  });
  // Fuerza salida si tarda más de 10 segundos
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

module.exports = app;