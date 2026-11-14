/* Service worker di Calcetto Club.
   - Pagine: prima la rete (così gli aggiornamenti arrivano subito), senza rete la copia salvata.
   - Icone, manifest, informativa: copia salvata e aggiornamento in sottofondo.
   - Librerie Firebase (URL con versione, non cambiano mai): copia salvata.
   - Tutto il resto (login, database) passa diretto alla rete.
   Se cambi questo file, aumenta VERSION. */
const VERSION = 'v2';
const CACHE = 'calcetto-' + VERSION;
const CORE = ['./', 'index.html', 'privacy.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'favicon-32.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('calcetto-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))));
    return;
  }

  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    });
    return hit ? (net.catch(() => {}), hit) : net;
  }));
});
