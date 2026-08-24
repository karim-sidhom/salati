// Service worker — cache l'app shell pour un accès hors-ligne.
// Bump la version à chaque déploiement pour forcer la mise à jour du cache.
const CACHE_NAME = 'mawaqit-shell-v1';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './apple-touch-icon.png'
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
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // لا نتدخل إلا في طلبات GET من نفس الأصل (الأصداف الثابتة).
    // كل ما هو خارجي (مواقيت الأذان، الخرائط، تعرّف الموقع الجغرافي...) يمر مباشرة عبر الشبكة.
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                    }
                    return res;
                })
                .catch(() => cached);
            // Stale-while-revalidate: نعرض النسخة المخزّنة فوراً إن وُجدت، ونحدّثها في الخلفية.
            return cached || network;
        })
    );
});
