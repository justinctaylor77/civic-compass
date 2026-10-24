// Service worker: app shell network-first with cache fallback (updates land quickly), API network-first with offline fallback.
// v5/v6 hero photo: NOT precached (keeps install small). The one rendition a device actually uses (~15-100 KB) is cached cache-first on first view, so the hero also works offline afterwards; the old cache is dropped on every version bump.
const VERSION = 'cc-v6';
const SHELL = ['/', '/index.html', '/styles.css?v=6', '/app.js?v=6', '/manifest.webmanifest', '/img/topo.svg', '/img/ribbon-body.svg', '/img/ribbon-left.svg', '/img/ribbon-right.svg', '/fonts/montserrat-700.woff2', '/fonts/montserrat-800.woff2', '/fonts/atkinson-400.woff2', '/fonts/atkinson-700.woff2', '/icons/mark-192.png?v=2', '/icons/icon-192.png?v=2', '/icons/icon-512.png?v=2', '/icons/apple-touch-icon.png?v=2', '/icons/favicon-32.png?v=2', '/icons/favicon-16.png?v=2', '/icons/icon-maskable-512.png?v=2', '/favicon.ico?v=2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isApi = url.pathname.startsWith('/api/');
  if (url.pathname.startsWith('/img/hero/')) { e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return r; }))); return; }
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && !(isApi && /health|status/.test(url.pathname))) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || (isApi ? new Response(JSON.stringify({ error: 'You appear to be offline. Please reconnect and try again.' }), { status: 503, headers: { 'Content-Type': 'application/json' } }) : caches.match('/index.html')))));
});
