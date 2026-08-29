const CACHE_NAME = 'cfs-safety-tools-v7';
const ASSETS = [
  './',
  './index.html',
  './hazard-report.html',
  './confidential-safety-report.html',
  './app.js',
  './manifest.json',
  './icon-source-light.png',
  './favicon.ico',
  './icon-192-dark.png',
  './icon-512-dark.png',
  './icon-maskable-512-dark.png',
  './apple-touch-icon-dark.png',
  './icon-192-light.png',
  './icon-512-light.png',
  './icon-maskable-512-light.png',
  './apple-touch-icon-light.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
