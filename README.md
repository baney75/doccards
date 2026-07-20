# Doc's Cards

**Solitaire for Grandpa.** A refined, accessible, offline-first solitaire collection
built as a tribute to Grandpa and to the open-source heritage of
[Solitairey](https://github.com/foss-card-games/Solitairey).

[Play it live →](https://baney75.github.io/doccards/)

## About

Doc's Cards is a hand-tuned solitaire collection for touch and desktop. Nineteen
classic games, a vintage-club feel, and the kind of small kindnesses Grandpa
needs: deal numbers, undo, big-card mode, sound cues, deal sharing, and rules
right on screen.

It runs as a static PWA — no build step required to deploy, installable to the
home screen, and playable offline.

## Games

Agnes · Flower Garden · Forty Thieves · Freecell · Golf · Grandfather's Clock ·
Klondike · Klondike (Vegas) · Monte Carlo · Pyramid · Russian Solitaire ·
Scorpion · Spider · Spider (1 Suit) · Spider (2 Suit) · Spiderette · Tri Towers ·
Will O' The Wisp · Yukon

## Features

- **19 solitaire games** spanning the classic canon
- **Refined vintage-club look** — parchment toolbar, navy header, deep green felt
- **Big-card mode** for visibility
- **Sound cues** synthesized in real time with the Web Audio API (no audio assets to license)
- **Deal numbers** with one-tap copy
- **Undo** every move
- **Move counter and elapsed time** HUD
- **Rules overlay** for every game
- **Offline support** via service worker
- **Installable** to home screen on iOS and Android
- **No tracking, no analytics, no accounts** — purely client-side
- **Mobile, tablet, and desktop** layouts

## Quick start (local dev)

```bash
pnpm install   # or npm install
pnpm dev       # or: npx serve public -l 3000 -s
```

Then open <http://localhost:3000>.

## Production deploy (GitHub Pages)

**Live site:** <https://baney75.github.io/doccards/>

This is a **project Pages** site for the `doccards` repository (repo name stays
`doccards`). The app, manifest `id`, OG URLs, and service worker base path are
configured for `/doccards/`.

**User-site root** (`https://baney75.github.io/`) is **not** live today (root
returns 404). To get that URL, rename the repo to `baney75.github.io`, then
update `manifest.json` `id`, OG/Twitter URLs in `index.html`, and re-verify
`/`, `/sw.js`, `/manifest.json` at site root.

### Publish (push → deploy → live)

1. Repository must be **Public**.
2. Settings → Pages → **Deploy from a branch** → branch `gh-pages` / folder `/`
   (this is what works today — do not switch to “GitHub Actions” source unless
   the `github-pages` environment allows deployments from `master`).
3. Land mobile/layout fixes in `public/` (especially `custom.css`, JS, `sw.js`).
4. **Bump** `CACHE_NAME` in `public/sw.js` (e.g. `doccards-v34` → `doccards-v35`)
   whenever you need installed PWAs to drop old caches after a layout ship.
5. Commit on `master` (or merge a PR into `master`) and push:
   ```bash
   git push origin master
   ```
6. Watch [Actions → Deploy GitHub Pages](https://github.com/baney75/doccards/actions/workflows/pages.yml)
   — job `build-and-deploy` must succeed (peaceiris force-pushes `gh-pages`).
7. Wait ~1–2 minutes for Pages + CDN (`Cache-Control: max-age=600`), then smoke-test
   the URLs in the checklist below.

Local preview of the deploy artifact:

```bash
npm run pages:build
npx serve _site -l 3000 -s
```

## Project structure

```
public/
  index.html          # Single-page entry
  custom.css          # Doc's Cards branding & responsive layout
  cards.css           # YUI solitaire engine styles (don't touch unless you know why)
  js/
    doccards-ui.js    # Header, HUD, rules, big-cards, deal# share, sound toggle
    doccards-sound.js # Web Audio API synthesis (cards, win, error)
    doccards-logger.js# Structured JSON logger (browser console only)
    application.js    # Solitairey glue: game registry, switch, restart
    all.js            # Bundled YUI 3 + Solitairey engine (do not edit)
    doccards-games.js # Bundled game definitions (do not edit)
  brand-logo.jpg      # Source portrait photo (Grandpa)
  brand-mark.webp     # Shipped circular UI mark (from brand-logo.jpg)
  green.webp          # Felt background
```

## Tech

- **YUI 3.18.1** (Solitairey engine) — the workhorse that runs the games
- **Web Audio API** — every sound is synthesized in the browser, so there are
  no audio assets to license, ship, or fail to load
- **Service Worker** — offline play, install to home screen
- **Vanilla JS** — no framework, no build pipeline for the app itself

## Accessibility

- 44×44px minimum touch targets throughout
- `aria-label` and `role="button"` on icon-only controls
- Big-cards mode uses larger card theme images (not CSS scale) so drag still works
- Reduced-motion respected
- Sound can be turned off
- Color contrast passes WCAG AA on the toolbar and HUD

## Hosting note

GitHub Pages project site: <https://baney75.github.io/doccards/> (repo stays
named `doccards`). Cloudflare Workers/Pages config was removed from this
repository. If an old `doccards` Worker still exists on Cloudflare, delete it
in the Cloudflare dashboard.

**Required once in GitHub Settings (agent tokens cannot flip these):**
1. Repository **Public**.
2. Pages → Deploy from branch → `gh-pages` / `/`.
3. Do **not** re-enable `actions/deploy-pages` until Settings → Environments →
   `github-pages` allows branch `master` (past failures:
   *Branch "master" is not allowed to deploy to github-pages*).

A meta Content-Security-Policy is set in `index.html` (YUI 3 requires
`'unsafe-eval'`). GitHub Pages cannot set `X-Frame-Options` /
`frame-ancestors` HTTP headers; those need an edge proxy if you want them.

### Post-deploy smoke checklist

- [ ] `https://baney75.github.io/doccards/` → 200, viewport + app shell
- [ ] `https://baney75.github.io/doccards/sw.js` → 200, `CACHE_NAME` matches ship
- [ ] `https://baney75.github.io/doccards/manifest.json` → 200, `id` `/doccards/`
- [ ] `https://baney75.github.io/doccards/custom.css` → 200 (layout fixes)
- [ ] Phone: hard-refresh or tap **Update now** on the in-app banner (mid-game
      installs do not `skipWaiting` until the user accepts)
- [ ] Optional root check: `https://baney75.github.io/` is still 404 until rename

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow. Spoiler: there isn't
much ceremony. Open an issue, send a PR, ship.

## License & attribution

Doc's Cards is released under the FreeBSD (2-clause) License, inherited from
[Solitairey](https://github.com/foss-card-games/Solitairey), which was itself
released under the same license by Paul Harrington. See
[LICENSE](LICENSE) for the full text.

Upstream: <https://github.com/foss-card-games/Solitairey>
Original author: Paul Harrington <pharrington@solitairey.com>

The Doc's Cards branding, layout, sound synthesis, and tooling are © 2026
Donovan Baney. Use them under the same license.
