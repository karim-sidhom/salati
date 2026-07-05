// Service Worker — مواقيت الصلاة العالمية
// Waqf khayri li ruh al-Hajj Hamouda Sidhom
// Stratégie : cache "app shell" (HTML/manifest/icônes) + réseau d'abord pour les APIs (prières/mosquées),
// avec repli sur le cache si hors-ligne.

const CACHE_NAME = 'mawaqit-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // On ne gère que les requêtes GET du même type de navigation/shell.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Pages HTML : réseau d'abord (contenu toujours à jour), repli sur le cache si hors-ligne.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Fichiers du shell (même origine) : cache d'abord, puis réseau + mise à jour du cache.
  if (isSameOrigin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Requêtes externes (Aladhan API, Overpass, Nominatim, polices, etc.) : laisser passer normalement.
  // (Les temps de prière et les mosquées nécessitent des données fraîches.)
});
