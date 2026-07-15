# Doc's Cards

**Solitaire for Grandpa.** A refined, accessible, offline-first solitaire collection
built as a tribute to Grandpa and to the open-source heritage of
[Solitairey](https://github.com/foss-card-games/Solitairey).

[Play it live →](https://baney75.github.io/)

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

**Live site:** <https://baney75.github.io/>

This is a static site — no compile step. The deployable artifact is the
contents of `public/`.

### Repository name

For the game to load at the root URL (`https://baney75.github.io/`), the
GitHub repository must be named **`baney75.github.io`** (a GitHub user site).
If the repo is still named something else (e.g. `doccards`), rename it in
**Settings → General → Repository name** before publishing.

### Publish

1. Stage the site locally (optional, useful for CI):
   ```bash
   pnpm pages:build   # copies public/ → _site/
   ```
2. In the repo, go to **Settings → Pages** and publish from `public/` (or use a
   GitHub Actions workflow that deploys `_site/` or `public/`).
3. Push to `main`; GitHub Pages serves the static files.

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
- Big-cards mode toggles a `--dc-card-scale` CSS variable
- Reduced-motion respected
- Sound can be turned off
- Color contrast passes WCAG AA on the toolbar and HUD

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
