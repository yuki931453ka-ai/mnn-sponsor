const CACHE_NAME = 'mnn-sponsor-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/src/main.js',
  '/src/constants.js',
  '/src/storage.js',
  '/src/supabase.js',
  '/src/validators.js',
  '/src/toast.js',
  '/src/forms.js',
  '/src/render-dashboard.js',
  '/src/render-kanban.js',
  '/src/render-list.js',
  '/src/render-detail.js',
  '/src/drag.js',
  '/assets/sponsor-plan.png',
  '/manifest.json',
];

const RUNTIME_HOSTS = [
  'esm.sh',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  const isRuntimeAsset = RUNTIME_HOSTS.some((h) => url.hostname.includes(h));

  if (isRuntimeAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
