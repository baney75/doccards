var CACHE_NAME = 'doccards-v13';
var CARD_SIZES = [61, 79, 95, 122];
var SUITS = ['s', 'h', 'c', 'd'];
var RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Project Pages live at /doccards/; local serve may be at /.
var BASE = (function () {
  var path = self.location.pathname || '/';
  var idx = path.lastIndexOf('/');
  var dir = idx >= 0 ? path.slice(0, idx) : '';
  return dir === '/' ? '' : dir;
})();

function asset(path) {
  if (path.charAt(0) !== '/') path = '/' + path;
  return BASE + path;
}

var PRECACHE_URLS = [
  asset('/'),
  asset('/index.html'),
  asset('/offline.html'),
  asset('/cards.css'),
  asset('/custom.css'),
  asset('/green.webp'),
  asset('/loading.gif'),
  asset('/trans.gif'),
  asset('/x.gif'),
  asset('/favicon.svg'),
  asset('/manifest.json'),
  asset('/apple-touch-icon-precomposed.png'),
  asset('/apple-touch-icon-180.png'),
  asset('/pwa-192x192.png'),
  asset('/pwa-512x512.png'),
  asset('/pwa-maskable-512.png'),
  asset('/brand-mark.webp'),
  asset('/brand-mark.png'),
  asset('/og-image.png'),
  asset('/fonts/playfair-display-latin-700-normal.woff2'),
  asset('/fonts/inter-latin-400-normal.woff2'),
  asset('/fonts/inter-latin-500-normal.woff2'),
  asset('/fonts/inter-latin-600-normal.woff2'),
  asset('/js/lodash.custom.min.js'),
  asset('/js/require.js'),
  asset('/js/yui-all-min.js'),
  asset('/js/yui-breakout.js'),
  asset('/js/solitaire.js'),
  asset('/js/application.js'),
  asset('/js/iphone.js'),
  asset('/js/auto-stack-clear.js'),
  asset('/js/auto-turnover.js'),
  asset('/js/statistics.js'),
  asset('/js/autoplay.js'),
  asset('/js/freecell.js'),
  asset('/js/solver-freecell.js'),
  asset('/js/doccards-games.js'),
  asset('/js/doccards-storage.js'),
  asset('/js/doccards-logger.js'),
  asset('/js/doccards-sound.js'),
  asset('/js/doccards-ui.js'),
  asset('/js/big-integer.js'),
  asset('/js/flatted.js'),
  asset('/js/libfreecell-solver.js'),
  asset('/js/libfreecell-solver.wasm'),
  asset('/js/libfreecell-solver.js.mem'),
  asset('/js/solver-freecell-worker.js')
];

function cardImagesForSize(size) {
  var urls = [];
  SUITS.forEach(function (s) {
    RANKS.forEach(function (r) {
      urls.push(asset('/dondorf/' + size + '/' + s + r + '.png'));
    });
  });
  urls.push(asset('/dondorf/' + size + '/facedown.png'));
  urls.push(asset('/dondorf/' + size + '/freeslot.png'));
  return urls;
}

var LAYOUT_ICONS = [
  'agnes', 'flower-garden', 'forty-thieves', 'freecell', 'gclock', 'golf',
  'klondike', 'klondike1t', 'montecarlo', 'pyramid', 'scorpion', 'spider',
  'spider1s', 'spider2s', 'spiderette', 'tritowers', 'will-o-the-wisp', 'yukon'
].map(function (name) {
  return asset('/layouts/mini/' + name + '.png');
});

function cacheFile(cache, url) {
  return fetch(url).then(function (r) {
    if (r.ok) {
      cache.put(url, r);
      return true;
    }
    return false;
  }).catch(function () {
    return false;
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).then(function () {
        var bgCache = [];
        CARD_SIZES.forEach(function (size) {
          cardImagesForSize(size).forEach(function (url) {
            bgCache.push(cacheFile(cache, url));
          });
        });
        LAYOUT_ICONS.forEach(function (url) {
          bgCache.push(cacheFile(cache, url));
        });
        return Promise.allSettled(bgCache);
      }).then(function () {
        return self.skipWaiting();
      });
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) {
          return n !== CACHE_NAME;
        }).map(function (n) {
          return caches.delete(n);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (resp) {
        if (resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function (c) {
            c.put(req, clone);
          });
        }
        return resp;
      }).catch(function () {
        return caches.match(asset('/index.html')).then(function (r) {
          return r || caches.match(asset('/offline.html'));
        });
      })
    );
    return;
  }

  var isJS = url.pathname.match(/\.js$/);
  var isImage = url.pathname.match(/\.(png|jpg|webp|gif|svg|ico|woff2?)$/);
  var isCSS = url.pathname.match(/\.css$/);
  var cacheKey = url.pathname;

  if (isJS) {
    event.respondWith(
      fetch(req).then(function (resp) {
        if (resp.ok) {
          caches.open(CACHE_NAME).then(function (c) {
            c.put(cacheKey, resp.clone());
          });
        }
        return resp;
      }).catch(function () {
        return caches.match(cacheKey).then(function (cached) {
          return cached || new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(cacheKey).then(function (cached) {
      if (cached) {
        fetch(req).then(function (netResp) {
          if (netResp && netResp.ok) {
            caches.open(CACHE_NAME).then(function (c) {
              c.put(req, netResp);
            });
          }
        }).catch(function () {});
        return cached;
      }
      return fetch(req).then(function (resp) {
        if (resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function (c) {
            c.put(cacheKey, clone);
          });
        }
        return resp;
      }).catch(function () {
        if (isImage) {
          return caches.match(asset('/trans.gif'));
        }
        if (isCSS) {
          return new Response('/* offline */', {
            status: 503,
            headers: { 'Content-Type': 'text/css' }
          });
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
