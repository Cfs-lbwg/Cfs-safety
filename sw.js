// Phase 1: moves everyone to the new app.
// Replaces the old caching service worker. On activation it clears every old cached page and sends any open window to the
// same-origin index.html, which then forwards to the new app (a service worker may only navigate within its own site).
// It has no fetch handler, so every page now comes straight from the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
    const home = new URL('index.html', self.registration.scope).href;
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    wins.forEach((w) => { try { w.navigate(home); } catch (e) { /* ignore */ } });
  })());
});
