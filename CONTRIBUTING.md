# Contributing to Doc's Cards

Thanks for considering a contribution. This project values clear thinking,
small changes, and Grandpa being able to play it.

## How to contribute

1. **Open an issue first** for anything more than a typo. It's faster than
   discovering mid-PR that we're solving the wrong problem.
2. **Fork the repo** and create a feature branch off `main`:
   `git checkout -b fix/your-fix-name`
3. **Keep the change focused.** One concern per PR. Smaller is better.
4. **Run the smoke test** before opening the PR:
   - `pnpm dev` (serves `public/` at <http://localhost:3000>) — same layout
     GitHub Pages will ship
   - Click through: Freecell → Klondike → Spider → back to Klondike
   - Click the stock in Klondike three times
   - Undo a move
   - Toggle Big Cards
   - Toggle Sound
   - Resize the window down to phone size
5. **Open a draft PR** with a clear title and a one-paragraph description.

## What we care about

- **Playability** — Grandpa can read every card. Touch targets are 44px.
  Nothing obscures the felt on a phone.
- **No regressions** — a fix in one game doesn't break the others.
- **No asset creep** — keep it zero-build and no audio files. Prefer the
  existing self-hosted fonts and card bitmaps. Brand source photo is
  `brand-logo.jpg`; shipped UI mark is `brand-mark.webp` (regenerate icons
  from the source, don't invent a new mark).
- **Honest commits** — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.

## What we don't want

- New dependencies. If the engine needs something, add it to
  `doccards-games.js` or `doccards-ui.js`, not a 200kb npm package.
- New build steps. The app is intentionally `index.html + custom.css + js/`.
- Hidden state changes. If you mutate global state, log it.
- Comments that explain *what* the code does. The code is the comment.

## Project structure cheat sheet

| File | Purpose | Safe to edit? |
|------|---------|---------------|
| `public/index.html` | Page shell, brand, menu | Yes |
| `public/custom.css` | All Doc's Cards styling | Yes |
| `public/cards.css` | YUI engine baseline | Avoid |
| `public/js/doccards-ui.js` | Header, HUD, rules, big-cards | Yes |
| `public/js/doccards-sound.js` | Web Audio synthesis | Yes |
| `public/js/doccards-logger.js` | Structured JSON logger | Yes |
| `public/js/application.js` | Game registry, switch | Yes, carefully |
| `public/js/all.js` | Bundled YUI 3 + Solitairey | No |
| `public/js/doccards-games.js` | Bundled game rules | No |

## Reporting bugs

Include: browser + version, device, the game you were playing, the deal
number, and what you expected vs. what happened. Screenshots help.
