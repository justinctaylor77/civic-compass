// Service worker: app shell network-first with cache fallback (updates land quickly), API network-first with offline fallback.
const VERSION = 'cc-v3';
const SHELL = ['/', '/index.html', '/styles.css?v=3', '/app.js?v=3', '/manifest.webmanifest', '/img/topo.svg', '/img/ribbon-body.svg', '/img/ribbon-left.svg', '/img/ribbon-right.svg', '/fonts/montserrat-700.woff2', '/fonts/montserrat-800.woff2', '/fonts/atkinson-400.woff2', '/fonts/atkinson-700.woff2', '/icons/mark-192.png?v=2', '/icons/icon-192.png?v=2', '/icons/icon-512.png?v=2', '/icons/apple-touch-icon.png?v=2', '/icons/favicon-32.png?v=2', '/icons/favicon-16.png?v=2', '/icons/icon-maskable-512.png?v=2', '/favicon.ico?v=2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isApi = url.pathname.startsWith('/api/');
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && !(isApi && /health|status/.test(url.pathname))) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || (isApi ? new Response(JSON.stringify({ error: 'You appear to be offline. Please reconnect and try again.' }), { status: 503, headers: { 'Content-Type': 'application/json' } }) : caches.match('/index.html')))));
});
