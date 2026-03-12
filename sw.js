/*
  ════════════════════════════════════════════════════════════════
  OurToolkit — Generador QR
  Service Worker v1.0
  Estrategia: Network First para páginas, Cache First para assets
  ════════════════════════════════════════════════════════════════
*/

const CACHE_NAME    = 'qr-ourtoolkit-v1';
const CACHE_STATIC  = 'qr-static-v1';

const PRECACHE_URLS = [
  '/qr/',
  '/qr/es/',
  '/qr/en/',
  '/qr/pt/',
  '/qr/fr/',
  '/qr/manifest.json',
];

/* ── INSTALL ────────────────────────────────────────────────────────────── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function (err) {
        console.warn('[SW QR] Precache parcial:', err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ── ACTIVATE ───────────────────────────────────────────────────────────── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE_NAME && k !== CACHE_STATIC; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ── FETCH ──────────────────────────────────────────────────────────────── */
self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  if (url.origin !== location.origin) return;
  if (request.method !== 'GET') return;

  /* Fuentes Google — cache permanente */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  /* Páginas HTML — Network First */
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  /* Assets estáticos — Cache First */
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|webp|ico|woff|woff2)$/)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  event.respondWith(networkFirstWithFallback(request));
});

/* ── Helpers ────────────────────────────────────────────────────────────── */
function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.status === 200) cache.put(request, response.clone());
        return response;
      });
    });
  });
}

function networkFirstWithFallback(request) {
  return fetch(request)
    .then(function (response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(request, clone); });
      }
      return response;
    })
    .catch(function () {
      return caches.match(request).then(function (cached) {
        return cached || caches.match('/qr/es/');
      });
    });
}

/* ── Mensaje para forzar actualización ─────────────────────────────────── */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
