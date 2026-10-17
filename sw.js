// Offline play: models, sound, textures and the libraries are kept in a cache after the first visit.
// The game's own code and pages are fetched fresh when online, with the cache as a fallback offline.
const CACHE = 'ravnens-ed-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const heavy = url.pathname.includes('/assets/') || url.pathname.includes('/icons/') || /jsdelivr|gstatic|googleapis/.test(url.hostname);
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (heavy) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }
    try {
      const res = await fetch(req);
      if (res.ok && url.origin === location.origin) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, {ignoreSearch: true});
      if (hit) return hit;
      throw err;
    }
  })());
});
