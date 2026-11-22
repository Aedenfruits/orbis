const C = 'orbis-v10'; let pending = false;
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll([new Request('/', { cache: 'no-cache' }), '/icon-orbis-w-192.png'])).catch(() => { })); });
self.addEventListener('activate', e => { e.waitUntil((async () => { let had = false; for (const k of await caches.keys()) if (k !== C) { had = true; await caches.delete(k); } await self.clients.claim();
  /* an older version was running: reload open windows once so they show the newest ORBIS */
  if (had) for (const w of await self.clients.matchAll({ type: 'window' })) { try { await w.navigate(w.url); } catch { } } })()); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return; const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (u.pathname.endsWith('.webmanifest') || /\/(icon|apple-touch)/.test(u.pathname)) { e.respondWith(fetch(r, { cache: 'no-cache' }).catch(() => caches.match(r))); return; }
    if (r.mode === 'navigate' || u.pathname === '/' || u.pathname.endsWith('.html')) {
      /* open instantly from the saved copy, fetch the new version in the background */
      pending = false;
      e.respondWith((async () => {
        const c = await caches.open(C), old = await c.match('/'), oldTxt = old ? await old.clone().text() : null;
        const net = fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(async res => {
          if (res.ok) { const copy = res.clone(), t = await res.clone().text(); await c.put('/', copy);
            if (oldTxt !== null && oldTxt !== t) { pending = true; const all = await self.clients.matchAll({ type: 'window' }); all.forEach(w => w.postMessage({ orbis: 'update' })); } }
          return res; }).catch(() => old);
        if (old) { e.waitUntil(net.catch(() => { })); return old; }
        return net;
      })());
      return;
    }
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })));
    return;
  }
  if (u.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(C).then(c => c.match(r).then(m => { const net = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m); return m || net; })));
  }
});

self.addEventListener('message', e => { if (e.data && e.data.orbis === 'check' && pending && e.source) e.source.postMessage({ orbis: 'update' }); });
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'ORBIS', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'ORBIS', { body: d.body || '', icon: '/icon-orbis-w-192.png', badge: '/icon-orbis-192.png', tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || '/#punch' }, vibrate: [120, 60, 120] }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) if (c.url.startsWith(self.location.origin)) { await c.focus(); try { await c.navigate(url); } catch { } return; }
    await clients.openWindow(url);
  })());
});
