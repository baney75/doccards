# CDN / PWA research (implemented)

- Self-host Playfair + Inter woff2 (no Google Fonts / no third-party CDN)
- Production seed: `yui-all-min.js` + `filter: 'min'`
- SW `doccards-v11`: root-absolute paths for https://baney75.github.io/
- Precache card sizes 61, 79, 122 + fonts + brand marks
- Pages build prunes yui api/docs/tests
- Cloudflare removed from repo; remote Worker delete requires user CF login
