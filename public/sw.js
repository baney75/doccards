var CACHE_NAME = 'doccards-v17';
// Warm sharp decks first; skip tiny 61 (too soft on retina).
var CARD_SIZES = [95, 122, 244];
var SUITS = ['s', 'h', 'c', 'd'];
var RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

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

function cachePut(cache, key, response) {
  // Never let cache writes reject the fetch handler.
  try {
    return cache.put(key, response).catch(function () { return false; });
  } catch (e) {
    return Promise.resolve(false);
  }
}

function stashCopy(cacheKey, resp) {
  // CRITICAL: clone synchronously BEFORE any await. If clone runs inside
  // caches.open().then(), Safari/Chrome may have already locked/consumed the body.
  if (!resp || !resp.ok) return;
  var copy;
  try {
    copy = resp.clone();
  } catch (e) {
    return;
  }
  caches.open(CACHE_NAME).then(function (c) {
    return cachePut(c, cacheKey, copy);
  }).catch(function () {});
}

// Core shell — install completes quickly so iOS/Android get a working SW immediately.
var PRECACHE_URLS = [
  asset('/'),
  asset('/index.html'),
  asset('/offline.html'),
  asset('/cards.css'),
  asset('/custom.css'),
  asset('/green.webp'),
  asset('/loading.gif'),
  asset('/trans.gif'),
  asset('/favicon.svg'),
  asset('/manifest.json'),
  asset('/apple-touch-icon-180.png'),
  asset('/apple-touch-icon-precomposed.png'),
  asset('/pwa-192x192.png'),
  asset('/pwa-512x512.png'),
  asset('/pwa-maskable-512.png'),
  asset('/brand-mark.webp'),
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
  asset('/js/auto-stack-clear.js'),
  asset('/js/auto-turnover.js'),
  asset('/js/statistics.js'),
  asset('/js/autoplay.js'),
  asset('/js/freecell.js'),
  asset('/js/doccards-games.js'),
  asset('/js/doccards-storage.js'),
  asset('/js/doccards-logger.js'),
  asset('/js/doccards-sound.js'),
  asset('/js/doccards-ui.js')
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
      return cachePut(cache, url, r).then(function () { return true; });
    }
    return false;
  }).catch(function () {
    return false;
  });
}

function warmCardsInBackground() {
  caches.open(CACHE_NAME).then(function (cache) {
    var bg = [];
    CARD_SIZES.forEach(function (size) {
      cardImagesForSize(size).forEach(function (url) {
        bg.push(cacheFile(cache, url));
      });
    });
    LAYOUT_ICONS.forEach(function (url) {
      bg.push(cacheFile(cache, url));
    });
    return Promise.allSettled(bg);
  }).catch(function () {});
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).then(function () {
        self.skipWaiting();
        warmCardsInBackground();
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
      warmCardsInBackground();
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
        stashCopy(asset('/index.html'), resp);
        return resp;
      }).catch(function () {
        return caches.match(asset('/index.html')).then(function (r) {
          return r || caches.match(asset('/offline.html'));
        });
      })
    );
    return;
  }

  var isJS = /\.js$/i.test(url.pathname);
  var isCSS = /\.css$/i.test(url.pathname);
  var isImage = /\.(png|jpg|webp|gif|svg|ico|woff2?)$/i.test(url.pathname);
  var cacheKey = url.pathname;

  // App shell scripts/CSS: network-first so updates land quickly on iOS PWAs.
  if (isJS || isCSS) {
    event.respondWith(
      fetch(req).then(function (resp) {
        stashCopy(cacheKey, resp);
        return resp;
      }).catch(function () {
        return caches.match(cacheKey).then(function (cached) {
          return cached || new Response(isCSS ? '/* offline */' : 'Offline', {
            status: 503,
            headers: { 'Content-Type': isCSS ? 'text/css' : 'text/plain' }
          });
        });
      })
    );
    return;
  }

  // Images/fonts: cache-first with background refresh.
  event.respondWith(
    caches.match(cacheKey).then(function (cached) {
      var network = fetch(req).then(function (resp) {
        stashCopy(cacheKey, resp);
        return resp;
      }).catch(function () {
        return null;
      });
      if (cached) {
        // Refresh in background; never fail the cached response.
        network.then(function () {}).catch(function () {});
        return cached;
      }
      return network.then(function (resp) {
        if (resp) return resp;
        if (isImage) return caches.match(asset('/trans.gif'));
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'WARM_CARDS') {
    warmCardsInBackground();
  }
});
