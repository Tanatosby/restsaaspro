// Bumpear SIEMPRE que cambie alguno de los archivos de ASSETS — si no, los
// celulares con la PWA instalada siguen viendo la versión vieja para siempre
// (ver ISS-022). v5: auth guard de la sesión persistente. v6: escala
// tipográfica más grande + fixes de overflow en owner.html/owner.css. v7:
// ícono de badge propio para push (antes usaba icon-192.png, opaco — Android
// lo pintaba como un cuadrado gris plano al no poder generar una silueta).
// v8: reset de scroll al cambiar de panel en owner.html (la dueña del piloto
// no encontraba el botón "← Volver" porque nacía fuera de pantalla).
// v9: monto a pagar visible en la pantalla de Yape/Plin de menu.html (ISS-040).
// v10: agrupamiento de menús por instancia (ISS-041) — toca menu.html (numera
// los grupos al confirmar) y owner.css (.menu-grupo-head). Sin el bump, un
// celular con la PWA instalada seguiría mandando pedidos sin `grupo`.
//
// v11 en adelante: el número ya NO se escribe acá. Sale de
// `utils/buildVersion.js` y lo inyecta `app.js` reemplazando `__BUILD__` al
// servir este archivo (ISS-044). Bumpear ahí, que es el único lugar.
const BUILD = '__BUILD__';
const CACHE = `menupro-v${BUILD}`;

// Los módulos JS ahora también se precachean — T11. Antes solo estaban el HTML
// y el CSS, así que en cada arranque había que ir a la red por 15 archivos
// (de ahí que la primera apertura no entrara y la segunda sí), y peor: podían
// venir de versiones distintas y romper el panel (ISS-044).
// Van con `?v=` para que la URL cambie en cada build; así el navegador nunca
// puede servir una copia vieja desde su propio caché HTTP.
const v = ruta => `${ruta}?v=${BUILD}`;

const ASSETS = [
  '/owner.html',
  '/menu.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/badge-96.png',
  v('/css/owner.css'),
  v('/css/menu.css'),
  v('/js/session.js'),
  v('/js/modules/charts-theme.js'),
  v('/js/modules/utils.js'),
  v('/js/modules/config.js'),
  v('/js/modules/usuarios.js'),
  v('/js/modules/mesas.js'),
  v('/js/modules/cocina.js'),
  v('/js/modules/ordenes.js'),
  v('/js/modules/reservas.js'),
  v('/js/modules/reportes.js'),
  v('/js/modules/pedidos.js'),
  v('/js/widgets/photo-editor.js'),
  v('/js/widgets/form-modal.js'),
  v('/js/widgets/plato-picker.js'),
  v('/js/widgets/pwa-install.js'),
  v('/js/widgets/menu-wizard.js'),
  v('/js/widgets/menu-export.js'),
  v('/js/widgets/menu-modal.js'),
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // `cache: 'reload'` salta el caché HTTP del navegador al precachear. Sin
      // esto, `addAll` puede guardar en el caché del SW una copia vieja que el
      // navegador tenía dando vueltas — exactamente el bug de ISS-044, pero
      // fosilizado dentro del service worker.
      c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))
    )
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

  // El propio sw.js nunca se cachea: es lo que avisa que hay versión nueva.
  if (url.pathname === '/sw.js') return;

  // Los HTML son el punto de entrada y NO llevan `?v=` en la URL, así que son
  // los únicos que pueden quedar viejos en el caché. Se sirven del caché para
  // que la app abra rápido (T11) y se revalidan en segundo plano, de modo que
  // la apertura siguiente ya tenga la versión nueva sin esperar a nada.
  const esHTML = e.request.mode === 'navigate' || url.pathname.endsWith('.html');
  if (esHTML) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        const red = fetch(e.request).then(res => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => null);
        // Sin copia en caché (primera visita) hay que esperar a la red igual.
        return cached || red || fetch(e.request);
      })
    );
    return;
  }

  // El resto (JS, CSS, íconos) va del caché sin más: su URL lleva `?v=` y
  // cambia en cada build, así que una copia cacheada nunca puede estar vieja.
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
      badge: data.badge || '/icons/badge-96.png',
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
