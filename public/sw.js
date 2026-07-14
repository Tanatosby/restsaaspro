const CACHE = 'menupro-v3';

const ASSETS = [
  '/owner.html',
  '/menu.html',
  '/css/owner.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Solo manejar peticiones del mismo origen.
  // Las cross-origin (CDN de Tailwind, Google Fonts, Chart.js, etc.) deben ir
  // directo a la red: si el SW las reenvía con fetch(e.request) fallan con
  // ERR_FAILED por ser peticiones no-cors, y la página queda sin estilos.
  if (url.origin !== self.location.origin) return;

  // Llamadas a la API siempre van a la red
  if (url.pathname.startsWith('/api/')) return;

  // Assets estáticos: cache primero, red como fallback
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Notificaciones push — muestra la alerta aunque la app esté cerrada
self.addEventListener('push', e => {
  let data = { title: '🍽 Menú Pro', body: 'Nueva actualización', icon: '/icons/icon-192.png' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  data.icon  || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-192.png',
      tag:   'menupro-preparacion',
      renotify: true,
    })
  );
});

// Al tocar la notificación, abrir/enfocar owner.html
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const owner = list.find(c => c.url.includes('/owner'));
      if (owner) return owner.focus();
      return clients.openWindow('/owner.html');
    })
  );
});
