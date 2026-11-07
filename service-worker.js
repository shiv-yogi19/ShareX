/* ShareX Service Worker — PWA Application Shell Caching */

const CACHE_NAME = 'sharex-v1.0.0';
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/core.css',
  './css/animations.css',
  './css/mobile.css',
  './css/desktop.css',
  './css/player.css',
  './js/app.js',
  './js/navigation.js',
  './js/qr-engine.js',
  './js/pairing.js',
  './js/webrtc.js',
  './js/transfer.js',
  './js/streaming.js',
  './js/media-player.js',
  './js/document-viewer.js',
  './js/image-viewer.js',
  './js/notifications.js',
  './js/settings.js',
  './js/sound.js',
  './assets/logos/logo.svg',
  './assets/logos/sx-monogram.svg',
  './assets/logos/splash-logo.svg',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// Install: Cache all core application shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use catch-all resilient addAll to prevent 1 failed asset from blocking SW
      return Promise.allSettled(
        APP_SHELL_ASSETS.map((url) => cache.add(url).catch((err) => {
          console.warn('[SW] Could not cache asset:', url, err);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Delete legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate strategy for static assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https schemes
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Do not intercept external signaling websocket or TURN requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to cache if network fails (offline shell)
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for update message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
