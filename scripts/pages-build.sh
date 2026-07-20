#!/bin/bash
# Build the GitHub Pages artifact from public/ (pruned) into _site/.
# Published via .github/workflows/pages.yml → gh-pages branch →
# https://baney75.github.io/doccards/  (project site; repo name is doccards).
# User-site root https://baney75.github.io/ requires renaming the repo to
# baney75.github.io and updating manifest id / OG URLs / base assumptions.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf _site
cp -r public _site

for path in js/yui-unpack/yui/api js/yui-unpack/yui/docs js/yui-unpack/yui/tests; do
  if [ -e "_site/$path" ]; then
    rm -rf "_site/$path"
  fi
done

find _site -name .DS_Store -delete 2>/dev/null || true
touch _site/.nojekyll

# Smoke: these must resolve at the published site root (under /doccards/).
required=(
  _site/index.html
  _site/sw.js
  _site/manifest.json
  _site/.nojekyll
  _site/custom.css
  _site/offline.html
  _site/apple-touch-icon-180.png
  _site/pwa-maskable-512.png
  _site/splash/iphone-14-pro-max.png
)
missing=0
for f in "${required[@]}"; do
  if [ ! -e "$f" ]; then
    echo "pages-build: MISSING required publish file: $f" >&2
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  exit 1
fi

# Fail closed if CACHE_NAME is empty or obviously stale placeholder.
if ! grep -q "var CACHE_NAME = 'doccards-v" _site/sw.js; then
  echo "pages-build: sw.js missing CACHE_NAME doccards-v* — refuse to publish" >&2
  exit 1
fi

du -sh _site _site/js/yui-unpack 2>/dev/null || du -sh _site
echo "pages-build: OK ($(grep -o "doccards-v[0-9]*" _site/sw.js | head -1))"
