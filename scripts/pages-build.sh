#!/bin/bash
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

du -sh _site _site/js/yui-unpack 2>/dev/null
