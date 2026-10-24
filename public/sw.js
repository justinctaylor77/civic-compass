// Service worker: app shell network-first with cache fallback (updates land quickly), API network-first with offline fallback.
const VERSION = 'cc-v1';
const SHELL = ['/', '/index.html', '/styles.css?v=1', '/app.js?v=1', '/manifest.webmanifest', '/img/stars.svg', '/fonts/montserrat-700.woff2', '/fonts/montserrat-800.woff2', '/fonts/atkinson-400.woff2', '/fonts/atkinson-700.woff2', '/icons/mark-192.png?v=1', '/icons/icon-192.png?v=1', '/icons/icon-512.png?v=1', '/icons/apple-touch-icon.png?v=1', '/icons/favicon-32.png?v=1', '/icons/favicon-16.png?v=1', '/icons/icon-maskable-512.png?v=1', '/favicon.ico?v=1'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isApi = url.pathname.startsWith('/api/');
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && !(isApi && /health|status/.test(url.pathname))) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || (isApi ? new Response(JSON.stringify({ error: 'You appear to be offline. Please reconnect and try again.' }), { status: 503, headers: { 'Content-Type': 'application/json' } }) : caches.match('/index.html')))));
});
