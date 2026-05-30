const CACHE = 'mawaqit-v1';
const SHELL = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@300;400;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css',
  'https://cdn.jsdelivr.net/npm/toastify-js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL.map(u => new Request(u, { mode: 'cors' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // External API calls — network only, don't cache
  if (url.hostname === 'nominatim.openstreetmap.org') {
    e.respondWith(fetch(e.request));
    return;
  }

  // Everything else — cache-first, fall back to network and cache the result
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
