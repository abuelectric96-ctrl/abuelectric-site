// AbuElectric service worker.
// Sahifalar: avval tarmoqdan (yangi ma'lumot), internet yo'q bo'lsa — keshdan.
// CSS/JS/rasmlar: avval keshdan (tez ochilishi uchun), fonda yangilanadi.
// Firebase so'rovlariga tegmaydi.
const VERSION = 'ae-v3';
const CORE = ['/', '/qidiruv/', '/assets/css/app.css?v=3', '/assets/js/ui.js', '/assets/js/api.js', '/assets/js/data.js',
  '/assets/js/firebase.js', '/assets/js/pages/home.js?v=1', '/assets/js/pages/search.js?v=1', '/assets/js/pages/profile.js?v=1', '/usta/', '/assets/img/app-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const fresh = fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
  }
});
