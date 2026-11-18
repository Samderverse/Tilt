// Tilt service worker: network-first, so players always get the latest version when online,
// with a cached copy to fall back on when offline.
const CACHE = 'tilt-cache-v12';
const CORE = [
  './', 'index.html', 'style.css', 'manifest.json',
  'js/main.js', 'js/game.js', 'js/scoring.js', 'js/symbols.js', 'js/reels.js', 'js/rng.js',
  'js/bosses.js', 'js/regulars.js', 'js/shop.js', 'js/machines.js', 'js/art.js', 'js/audio.js',
  'js/fx.js', 'js/settings.js', 'js/howto.js', 'js/coach.js', 'js/album.js', 'js/version.js', 'js/scenery.js', 'js/sfxmap.js', 'js/drunk.js', 'js/stakes.js', 'js/changelog.js', 'js/bets.js', 'js/betsboard.js', 'js/tilly.js',
  ...['smug', 'blink', 'talk', 'point', 'nervous', 'tilt', 'defeated', 'jackpot'].flatMap((e) => [`img/tilly/${e}.webp`, `img/tilly/head-${e}.webp`]),
  'icons/icon-192.png', 'icons/apple-touch-icon.png', 'icons/favicon.svg',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // fonts etc: let the browser handle them
  if (url.pathname.endsWith('version.json')) return;     // always ask the network
  // Art and sound only change with a release, and each release gets a new cache name (old ones are deleted),
  // so serve them from the phone first: Tilly and the sounds appear instantly instead of waiting on GitHub.
  if (url.pathname.includes('/img/') || url.pathname.includes('/audio/') || url.pathname.includes('/icons/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  const fresh = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache' }) : fetch(req, { cache: 'no-cache' });
  e.respondWith(
    fresh.then((res) => {
      if (res.ok && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined))),
  );
});
