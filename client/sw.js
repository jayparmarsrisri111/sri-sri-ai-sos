// Sri Sri ❤️SOS AI - Service Worker
// Enables 100% Offline App Loading, Standalone PWA Execution, and Cache Resiliency

const CACHE_NAME = 'sri-sri-sos-v2';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/admin',
  '/static/css/sos.css',
  '/static/css/dashboard.css',
  '/static/css/admin.css',
  '/static/js/sos.js',
  '/static/js/dashboard.js',
  '/static/js/admin.js',
  '/static/js/i18n.js',
  '/static/images/logo.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets for offline readiness');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Non-fatal precache error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass API calls and websockets (handled by app IndexedDB offline queue & fetch)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) {
    return;
  }

  // Network-First with Cache Fallback for HTML and static assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to root if navigating
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
