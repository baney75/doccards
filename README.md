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
`doccards` — no rename required). The app is configured for the `/doccards/`
base path.

### Publish

1. Make sure the repository is **Public** (Settings → General → Danger Zone).
2. Settings → Pages → Source = **GitHub Actions**.
3. Push to `master` (or `main`); [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
   builds `_site/` and deploys automatically.

Local preview of the deploy artifact:

```bash
pnpm pages:build
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
  brand-logo.jpg      # Round Doc's Cards mark
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

**Required once in GitHub Settings (this agent token cannot flip them):**
1. Repository must be **Public** (Settings → General → Change visibility).
2. Settings → Pages → Source = **GitHub Actions**, or Deploy from branch `gh-pages` / root.

A meta Content-Security-Policy is set in `index.html` (YUI 3 requires
`'unsafe-eval'`). GitHub Pages cannot set `X-Frame-Options` /
`frame-ancestors` HTTP headers; those need an edge proxy if you want them.

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
