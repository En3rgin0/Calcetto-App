/* Service worker di Calcetto Club.
   - Pagine, JavaScript e CSS: prima la rete (gli aggiornamenti arrivano subito e non si mischiano
     file vecchi e nuovi), senza rete la copia salvata.
   - Immagini e icone: copia salvata e aggiornamento in sottofondo.
   - Librerie Firebase (URL con versione, non cambiano mai): copia salvata.
   - Tutto il resto (login, database) passa diretto alla rete.
   Se aggiungi, togli o rinomini file, aggiorna CORE e aumenta VERSION. */
const VERSION = 'v7';
const CACHE = 'calcetto-' + VERSION;
const CORE = [
  './', 'index.html', 'privacy.html', 'manifest.webmanifest',
  'css/base.css', 'css/layout.css', 'css/components.css', 'css/responsive.css',
  'js/main.js', 'js/config.js', 'js/state.js', 'js/utils.js', 'js/model.js', 'js/teams.js', 'js/stats.js', 'js/db.js', 'js/data.js', 'js/auth.js',
  'js/ui/components.js', 'js/ui/render.js', 'js/ui/modals.js',
  'js/views/login.js', 'js/views/profile.js', 'js/views/leagues.js', 'js/views/league.js', 'js/views/players.js',
  'js/views/matches.js', 'js/views/reports.js', 'js/views/calendar.js', 'js/views/fixtures.js', 'js/views/detail.js',
  'assets/icons.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/favicon-32.png', 'assets/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('calcetto-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const save = (req, res) => {
  if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => save(req, res))));
    return;
  }
  if (url.origin !== location.origin) return;

  /* immagini: dalla cache, aggiornate in sottofondo */
  if (req.destination === 'image' || url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => save(req, res));
      return hit ? (net.catch(() => {}), hit) : net;
    }));
    return;
  }

  /* pagine, JS, CSS: prima la rete */
  e.respondWith(fetch(req).then(res => save(req, res))
    .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
