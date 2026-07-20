var CACHE_NAME = 'doccards-v37';
// Include every size pickThemeSize() may choose (79 on small non-retina).
var CARD_SIZES = [79, 95, 122, 244];
// Warm the most common play size first so first offline deal has faces.
var PRIORITY_CARD_SIZE = 122;
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

function absoluteUrl(pathOrUrl) {
  try {
    return new URL(pathOrUrl, self.location.origin).href;
  } catch (e) {
    return pathOrUrl;
  }
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
  var key = absoluteUrl(cacheKey);
  caches.open(CACHE_NAME).then(function (c) {
    return cachePut(c, key, copy);
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
  asset('/favicon-32.png'),
  asset('/manifest.json'),
  asset('/apple-touch-icon-180.png'),
  asset('/apple-touch-icon-167.png'),
  asset('/apple-touch-icon-152.png'),
  asset('/apple-touch-icon-120.png'),
  asset('/apple-touch-icon-precomposed.png'),
  asset('/pwa-192x192.png'),
  asset('/pwa-512x512.png'),
  asset('/pwa-maskable-192.png'),
  asset('/pwa-maskable-512.png'),
  asset('/js/doccards-puzzle-common.js'),
  asset('/js/doccards-woodblock.js'),
  asset('/js/doccards-2048.js'),
  asset('/js/doccards-mines.js'),
  asset('/js/doccards-slide.js'),
  asset('/js/doccards-snake.js'),
  asset('/js/doccards-memory.js'),
  asset('/js/doccards-simon.js'),
  asset('/js/doccards-lights.js'),
  asset('/js/doccards-hub.js'),
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
  asset('/js/auto-stack-clear.js'),
  asset('/js/auto-turnover.js'),
  asset('/js/statistics.js'),
  asset('/js/autoplay.js'),
  asset('/js/freecell.js'),
  asset('/js/doccards-games.js'),
  asset('/js/doccards-storage.js'),
  asset('/js/doccards-logger.js'),
  asset('/js/doccards-sound.js'),
  asset('/js/doccards-ui.js'),
  asset('/js/doccards-fx.js')
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
  var key = absoluteUrl(url);
  return fetch(url).then(function (r) {
    if (r.ok) {
      return cachePut(cache, key, r).then(function () { return true; });
    }
    return false;
  }).catch(function () {
    return false;
  });
}

/** Resilient precache — one missing file must not fail the whole install (iOS is strict). */
function precacheShell(cache) {
  return Promise.all(
    PRECACHE_URLS.map(function (url) {
      return cacheFile(cache, url);
    })
  );
}

function warmPriorityCards(cache) {
  var urls = cardImagesForSize(PRIORITY_CARD_SIZE).concat(LAYOUT_ICONS);
  // Concurrency-limited warm to avoid flooding mobile radios.
  var i = 0;
  var workers = 6;
  function next() {
    if (i >= urls.length) return Promise.resolve();
    var url = urls[i++];
    return cacheFile(cache, url).then(next);
  }
  var chain = [];
  for (var w = 0; w < workers; w++) chain.push(next());
  return Promise.all(chain);
}

function warmCardsInBackground() {
  caches.open(CACHE_NAME).then(function (cache) {
    // After priority deck is warm, fill remaining sizes quietly.
    var rest = CARD_SIZES.filter(function (s) { return s !== PRIORITY_CARD_SIZE; });
    var urls = [];
    rest.forEach(function (size) {
      cardImagesForSize(size).forEach(function (url) { urls.push(url); });
    });
    var i = 0;
    function next() {
      if (i >= urls.length) return Promise.resolve();
      var url = urls[i++];
      return cacheFile(cache, url).then(next);
    }
    var chain = [];
    for (var w = 0; w < 4; w++) chain.push(next());
    return Promise.all(chain);
  }).catch(function () {});
}

function matchCache(requestOrUrl) {
  var req = typeof requestOrUrl === 'string'
    ? absoluteUrl(requestOrUrl)
    : requestOrUrl;
  return caches.match(req).then(function (hit) {
    if (hit) return hit;
    // Fallback: pathname-only (legacy keys from older SW versions).
    try {
      var path = typeof requestOrUrl === 'string'
        ? new URL(absoluteUrl(requestOrUrl)).pathname
        : new URL(requestOrUrl.url).pathname;
      return caches.match(path);
    } catch (e) {
      return null;
    }
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return precacheShell(cache).then(function () {
        // Priority deck before activate so first offline deal has faces.
        return warmPriorityCards(cache);
      });
    }).then(function () {
      // Do not skipWaiting here — mid-game reloads are owned by the page.
      warmCardsInBackground();
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
  var url;

  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).then(function (resp) {
        stashCopy(asset('/index.html'), resp);
        return resp;
      }).catch(function () {
        return matchCache(asset('/index.html')).then(function (r) {
          return r || matchCache(asset('/offline.html'));
        });
      })
    );
    return;
  }

  var isJS = /\.js$/i.test(url.pathname);
  var isCSS = /\.css$/i.test(url.pathname);
  var isImage = /\.(png|jpg|webp|gif|svg|ico|woff2?)$/i.test(url.pathname);
  var cacheKey = absoluteUrl(url.pathname + url.search);

  // App shell scripts/CSS: network-first so updates land quickly on iOS PWAs.
  if (isJS || isCSS) {
    event.respondWith(
      fetch(req).then(function (resp) {
        stashCopy(cacheKey, resp);
        return resp;
      }).catch(function () {
        return matchCache(req).then(function (cached) {
          if (cached) return cached;
          return matchCache(url.pathname).then(function (c2) {
            return c2 || new Response(isCSS ? '/* offline */' : '/* offline */', {
              status: 503,
              headers: { 'Content-Type': isCSS ? 'text/css' : 'application/javascript' }
            });
          });
        });
      })
    );
    return;
  }

  // Images/fonts: cache-first with background refresh.
  event.respondWith(
    matchCache(req).then(function (cached) {
      var network = fetch(req).then(function (resp) {
        stashCopy(cacheKey, resp);
        return resp;
      }).catch(function () {
        return null;
      });
      if (cached) {
        network.then(function () {}).catch(function () {});
        return cached;
      }
      return network.then(function (resp) {
        if (resp) return resp;
        if (isImage) return matchCache(asset('/trans.gif'));
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
    var size = event.data.size || PRIORITY_CARD_SIZE;
    caches.open(CACHE_NAME).then(function (cache) {
      var urls = cardImagesForSize(size);
      if (size !== 244 && size !== PRIORITY_CARD_SIZE) {
        urls = urls.concat(cardImagesForSize(PRIORITY_CARD_SIZE));
      }
      if (size !== 244) {
        urls = urls.concat(cardImagesForSize(244));
      }
      var i = 0;
      function next() {
        if (i >= urls.length) return Promise.resolve();
        var u = urls[i++];
        return cacheFile(cache, u).then(next);
      }
      var chain = [];
      for (var w = 0; w < 6; w++) chain.push(next());
      return Promise.all(chain);
    }).then(function () {
      warmCardsInBackground();
    }).catch(function () {});
  }
});
