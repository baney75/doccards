#!/bin/bash
# Bundle game modules into a single JS file to reduce HTTP requests
cd "$(dirname "$0")/../public"

OUTPUT="js/doccards-games.js"
echo "// DocCards Game Bundle - auto-generated on $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUTPUT"

for f in js/agnes.js js/golf.js js/klondike.js js/klondike1t.js \
    js/flowergarden.js js/fortythieves.js js/grandclock.js \
    js/montecarlo.js js/pyramid.js js/russian-solitaire.js \
    js/scorpion.js js/spider.js js/spider1s.js js/spider2s.js \
    js/spiderette.js js/tritowers.js js/will-o-the-wisp.js js/yukon.js; do
    echo "" >> "$OUTPUT"
    echo "// --- $(basename "$f") ---" >> "$OUTPUT"
    cat "$f" >> "$OUTPUT"
done

SIZE=$(wc -c < "$OUTPUT" | tr -d ' ')
echo "Bundle created: ${SIZE} bytes"