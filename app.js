// app.js
require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path         = require('path');
const fs           = require('fs');
const logger       = require('./middleware/logger');
const { BUILD }    = require('./utils/buildVersion');

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
const pensionistasRoutes = require('./routes/pensionistas');
const pensionistaRoutes  = require('./routes/pensionista');
const { iniciarJob }              = require('./utils/autoPreparacion');
const { iniciarJob: iniciarJobRecordatorioMenu } = require('./utils/recordatorioMenu');


// Configurar Web Push con las VAPID keys del .env
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const app  = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// El servidor corre detrás de Nginx (proxy_pass), que agrega X-Forwarded-For.
// Sin esto, express-rate-limit no puede identificar la IP real del cliente
// y tira ERR_ERL_UNEXPECTED_X_FORWARDED_FOR en cada request. Ver deploy.md §6.2.
app.set('trust proxy', 1);

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
      // upgrade-insecure-requests: automático por entorno.
      // En producción (HTTPS real) se activa ([]); en dev se desactiva (null)
      // porque rompe el login en LAN/celular mientras el server no tiene TLS.
      // Ver deploy.md §8.2. Controlado por NODE_ENV=production.
      upgradeInsecureRequests: isProd ? [] : null,
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

// /uploads (fotos de platos, comprobantes, portada) usa nombres versionados
// con Date.now() en cada subida (ver ISS-015/comentario en routes/menu.js) —
// una URL nunca cambia de contenido, así que cachearla "para siempre" en el
// navegador es seguro y evita re-descargar cada foto en cada carga de página.
// El resto de /public (owner.html, menu.html, JS, CSS) NO lleva max-age
// acá — deben revalidarse en cada visita para no quedar desactualizados
// (ISS-022 ya cubre el caso del Service Worker instalado).
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  maxAge: '1y',
  immutable: true,
}));

// ── Inyección de la versión de build — ISS-044 ──────────────────────────────
// Los 3 archivos de abajo llevan `__BUILD__` donde va el número de versión:
// los HTML en la URL de cada <script>/<link>, y el sw.js en el nombre del
// caché y en su lista de assets. Se reemplaza acá, al servirlos, para que
// `utils/buildVersion.js` sea el ÚNICO lugar que hay que tocar por deploy —
// si hubiera que editar 18 URLs a mano, tarde o temprano una queda vieja y
// vuelve el panel en blanco que motivó el issue.
// Va ANTES de express.static: si no, static los sirve tal cual con el
// placeholder sin reemplazar.
const PLANTILLAS = {
  '/owner.html':       'text/html; charset=utf-8',
  '/menu.html':        'text/html; charset=utf-8',
  '/pensionista.html': 'text/html; charset=utf-8',
  '/sw.js':            'application/javascript; charset=utf-8',
};
const _plantillaCache = new Map();

function servirConVersion(archivo, res) {
  let cuerpo = _plantillaCache.get(archivo);
  if (cuerpo === undefined) {
    cuerpo = fs.readFileSync(path.join(__dirname, 'public', archivo), 'utf8')
               .split('__BUILD__').join(BUILD);
    _plantillaCache.set(archivo, cuerpo);
  }
  res.type(PLANTILLAS[archivo]);
  // Los HTML y el sw.js se revalidan siempre: son el punto de entrada que
  // avisa al navegador que hay una versión nueva. Los assets que referencian
  // sí pueden cachearse fuerte, porque su URL cambia con cada build.
  res.set('Cache-Control', 'no-cache');
  res.send(cuerpo);
}

app.use((req, res, next) => {
  const archivo = req.path === '/' ? null : req.path;
  if (req.method === 'GET' && archivo && PLANTILLAS[archivo]) {
    try { return servirConVersion(archivo, res); }
    catch (e) {
      // Nunca dejar la app inaccesible por esto: si falla la lectura o el
      // reemplazo, que express.static sirva el archivo tal cual.
      console.error(`[build] no se pudo inyectar la versión en ${archivo}:`, e.message);
    }
  }
  next();
});

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
app.use('/api/pensionistas', pensionistasRoutes);
app.use('/api/pensionista',  pensionistaRoutes);


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

// Rutas por slug: /:slug y /:slug/:mesa
// Se resuelven aquí, después de todas las rutas fijas, para no interferir.
// ISS-045: comparación case-insensitive (COLLATE NOCASE) porque el slug siempre
// se guarda en minúsculas (routes/menu.js), pero el link puede llegar con la
// primera letra en mayúscula por autocapitalización del teclado/app externa
// (WhatsApp, notas, etc.) — sin esto, "/Karinamenu" daba "Cannot GET".
app.get('/:slug/:mesa', (req, res, next) => {
  const { slug, mesa } = req.params;
  if (!/^\d+$/.test(mesa)) return next();
  const db = require('./config/database');
  const rest = db.prepare(`SELECT id FROM restaurantes WHERE slug = ? COLLATE NOCASE AND activo = 1`).get(slug);
  if (!rest) return next();
  res.redirect(`/menu?restaurante=${rest.id}&mesa=${mesa}`);
});

app.get('/:slug', (req, res, next) => {
  const { slug } = req.params;
  const db = require('./config/database');
  const rest = db.prepare(`SELECT id FROM restaurantes WHERE slug = ? COLLATE NOCASE AND activo = 1`).get(slug);
  if (!rest) return next();
  res.redirect(`/menu?restaurante=${rest.id}`);
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} → ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar job de auto-preparación de reservas (Gap 3)
const db = require('./config/database');
iniciarJob(db, webpush);

// Iniciar job de recordatorio de menú sin configurar, cada 8h (Gap 21)
iniciarJobRecordatorioMenu(db, webpush);

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