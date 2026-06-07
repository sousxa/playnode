/* Service worker do CatDecks — instalável (PWA) + shell offline.
   Conservador de propósito: só intercepta GET same-origin. Firebase, fontes do
   Google e o gerador de QR (cross-origin) passam direto, sem cache. */
const CACHE = 'catdecks-v1';
const SCOPE = self.registration.scope;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE, SCOPE + 'index.html']).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // não mexe em Firebase/fontes/qr

  // Navegações: rede primeiro (app sempre fresco), cai pro shell em cache se offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => { const cl = r.clone(); caches.open(CACHE).then((c) => c.put(req, cl)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match(SCOPE) || caches.match(SCOPE + 'index.html'))),
    );
    return;
  }

  // Assets com hash no nome: cache primeiro (imutáveis), busca na rede se faltar.
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      if (r && r.ok && r.type === 'basic') { const cl = r.clone(); caches.open(CACHE).then((c) => c.put(req, cl)); }
      return r;
    })),
  );
});
