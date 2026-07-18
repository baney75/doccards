# AGENTS.md

## Cursor Cloud specific instructions

Doc's Cards is a single, zero-build **static PWA** (browser solitaire collection based on
Solitairey). There is no backend, database, auth, or API — everything runs client-side in
the browser. Node is only used to serve the static `public/` directory.

### Running the app (development)
- Start the dev server with `npm run dev` (defined in `package.json` → `npx serve public -l 3000 -s`), then open `http://localhost:3000`.
- It **must** be served over HTTP, not opened as a `file://` path: the service worker, the
  freecell WASM solver, and Web Workers all require an HTTP origin.
- Run it as a long-lived process (e.g. a tmux session); it does not exit on its own.

### Build / deploy artifact
- `npm run pages:build` (→ `scripts/pages-build.sh`) copies `public/` into `_site/` and strips
  YUI docs/tests. Preview it with `npx serve _site -l 3000 -s`. This is only for the GitHub
  Pages deploy artifact — not needed for normal development.

### Lint / test
- There is no automated test suite wired into `package.json`. The only lint/test entry point is
  the legacy Ruby `Rakefile` (`rake test` → eslint + rubocop), which requires a heavy toolchain
  (Ruby, rubocop, browserify, tsc, pysassc, GraphicsMagick) and is **not** needed to run or
  verify the app. Prefer manual browser smoke testing (see CONTRIBUTING.md).

### Gotchas
- The `jStorage` git submodule (`.gitmodules`) is referenced by `bin/install-npm-deps.sh`, but a
  prebuilt `public/js/jstorage.min.js` is already committed, so the submodule does **not** need to
  be initialized to run or build the app.
- Bundled engine files (`public/js/all.js`, `public/js/doccards-games.js`) are generated/vendored —
  do not hand-edit them (see the CONTRIBUTING.md "Safe to edit?" table).
- `README.md` mentions `pnpm`, but the committed lockfile is `package-lock.json`, so use `npm`.
