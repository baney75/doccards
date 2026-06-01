var CACHE_NAME = 'doccards-v10';
var CARD_SIZES = [122, 95, 79, 61];
var SUITS = ['s','h','c','d'];
var RANKS = [1,2,3,4,5,6,7,8,9,10,11,12,13];

var PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/cards.css',
  '/custom.css',
  '/green.webp',
  '/green.jpg',
  '/loading.gif',
  '/trans.gif',
  '/x.gif',
  '/favicon.svg',
  '/manifest.json',
  '/apple-touch-icon-precomposed.png',
  '/apple-touch-icon-180.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/brand-logo.jpg',
  '/js/lodash.custom.min.js',
  '/js/require--debug.js',
  '/js/require.js',
  '/js/yui-debug.js',
  '/js/yui-breakout.js',
  '/js/solitaire.js',
  '/js/application.js',
  '/js/iphone.js',
  '/js/auto-stack-clear.js',
  '/js/auto-turnover.js',
  '/js/statistics.js',
  '/js/autoplay.js',
  '/js/freecell.js',
  '/js/solver-freecell.js',
  '/js/doccards-games.js',
  '/js/doccards-storage.js',
  '/js/doccards-logger.js',
  '/js/doccards-sound.js',
  '/js/doccards-ui.js',
  '/js/big-integer.js',
  '/js/flatted.js',
  '/js/libfreecell-solver.js',
  '/js/libfreecell-solver.wasm',
  '/js/libfreecell-solver.js.mem',
  '/js/solver-freecell-worker.js'
];

function cardImagesForSize(size) {
  var urls = [];
  SUITS.forEach(function(s) {
    RANKS.forEach(function(r) { urls.push('/dondorf/' + size + '/' + s + r + '.png'); });
  });
  urls.push('/dondorf/' + size + '/facedown.png');
  urls.push('/dondorf/' + size + '/freeslot.png');
  return urls;
}

var LAYOUT_ICONS = [
  '/layouts/mini/agnes.png','/layouts/mini/flower-garden.png',
  '/layouts/mini/forty-thieves.png','/layouts/mini/freecell.png',
  '/layouts/mini/gclock.png','/layouts/mini/golf.png',
  '/layouts/mini/klondike.png','/layouts/mini/klondike1t.png',
  '/layouts/mini/montecarlo.png','/layouts/mini/pyramid.png',
  '/layouts/mini/scorpion.png','/layouts/mini/spider.png',
  '/layouts/mini/spider1s.png','/layouts/mini/spider2s.png',
  '/layouts/mini/spiderette.png','/layouts/mini/tritowers.png',
  '/layouts/mini/will-o-the-wisp.png','/layouts/mini/yukon.png'
];

function cacheFile(cache, url) {
  return fetch(url).then(function(r) {
    if (r.ok) { cache.put(url, r); return true; }
    return false;
  }).catch(function() { return false; });
}

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS).then(function() {
        var bgCache = [];
        cardImagesForSize(122).forEach(function(url) { bgCache.push(cacheFile(cache, url)); });
        LAYOUT_ICONS.forEach(function(url) { bgCache.push(cacheFile(cache, url)); });
        return Promise.allSettled(bgCache);
      }).then(function() { return self.skipWaiting(); });
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function(resp) {
        if (resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(req, clone); });
        }
        return resp;
      }).catch(function() {
        return caches.match('/index.html').then(function(r) { return r || caches.match('/offline.html'); });
      })
    );
    return;
  }

  var isJS = url.pathname.match(/\.js$/);
  var isImage = url.pathname.match(/\.(png|jpg|webp|gif|svg|ico)$/);
  var isCSS = url.pathname.match(/\.css$/);

  if (isJS) {
    event.respondWith(
      fetch(req).then(function(resp) {
        if (resp.ok) {
          caches.open(CACHE_NAME).then(function(c) { c.put(url.pathname, resp.clone()); });
        }
        return resp;
      }).catch(function() {
        return caches.match(url.pathname).then(function(cached) {
          return cached || new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(url.pathname).then(function(cached) {
      if (cached) {
        fetch(req).then(function(netResp) {
          if (netResp && netResp.ok) {
            caches.open(CACHE_NAME).then(function(c) { c.put(req, netResp); });
          }
        }).catch(function() {});
        return cached;
      }
      return fetch(req).then(function(resp) {
        if (resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(url.pathname, clone); });
        }
        return resp;
      }).catch(function() {
        if (isImage) {
          return caches.match('/trans.gif');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') { self.skipWaiting(); }
});