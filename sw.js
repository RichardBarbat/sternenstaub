/* Sternenstaub – Service Worker
   Netz zuerst: Ist das Gerät online, kommt immer die neueste Version (kurzer Abgleich per ETag).
   Nur offline oder bei sehr langsamem Netz wird die gespeicherte Kopie genutzt.
   Version erhöhen mit:  node version.mjs <neue-version> */
const VERSION = '1.2';
const CACHE = 'sternenstaub-' + VERSION;
const TIMEOUT = 2500;
const ASSETS = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './js/data.js', './js/fx.js', './js/game.js',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' – am HTTP-Zwischenspeicher vorbei, sonst landen evtl. alte Dateien im neuen Speicher
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')) return; // Versions-Check geht immer direkt ans Netz

  const key = url.origin + url.pathname; // ohne ?v=…, damit offline jede Version gefunden wird
  const network = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then(async res => {
    if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { res });
    const copy = res.clone();
    await (await caches.open(CACHE)).put(key, copy);
    return res;
  });
  e.waitUntil(network.then(() => {}, () => {}));

  e.respondWith((async () => {
    try {
      return await Promise.race([network, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), TIMEOUT))]);
    } catch (err) {
      const hit = await caches.match(key, { ignoreSearch: true });
      if (hit) return hit;
      if (err && err.res) return err.res;
      return network.catch(e2 => (e2 && e2.res) || Response.error());
    }
  })());
});
