const C = 'orbis-v2';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll([new Request('/', { cache: 'no-cache' }), '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'])).catch(() => { })); });
self.addEventListener('activate', e => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== C) await caches.delete(k); await self.clients.claim(); })()); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return; const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (r.mode === 'navigate' || u.pathname === '/' || u.pathname.endsWith('.html')) {
      e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put('/', cp)); } return res; }).catch(() => caches.match('/')));
      return;
    }
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })));
    return;
  }
  if (u.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(C).then(c => c.match(r).then(m => { const net = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m); return m || net; })));
  }
});
