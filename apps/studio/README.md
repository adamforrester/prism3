# @prism3/studio — the web dashboard

The first **rendering host** over the Prism3 engine core (see `../../docs/09-architecture-and-repos.md`
and `08-theming-interfaces.md`). It imports the same pure engine modules the Figma
plugin will, and renders from the shared contracts:

- **Knobs** from the lever manifest (`packages/engine/levers.ts`).
- **Live component preview + per-mode contrast overlay** from `previewSpec`
  (`preview.ts`) resolved through `resolvePreview(theme)` (`resolve-preview.ts`).
- **Generated palette ramps** straight off `brandTheme(input).palettes`.

The point is continuity: a lever added once in the core appears here and in the
Figma plugin without touching either UI (docs/08 §4).

## Shell — a four-stage build order

Organised as the order a theme actually composes:

1. **Brand primitives** — the bespoke Stage 1: a scalable brand-colour list (primary
   pinned + any number of accents), a tunable **neutral cast** with a **Derive⇄Pin**
   toggle (Pin surfaces the engine's `neutral.anchor` — a pre-defined grey the ramp is
   built around), and the generated ramps shown as labelled specimens.
2. **Semantic colours** — the action-palette / status / disabled / icon levers.
3. **Typography** — the type lever group + a **type-scale specimen** (one composite per
   group at its resolved size, so a `typeScale`/family/weight change is visible where the
   small component chips can't show it).
4. **Form factor** — density / radius / elevation / layout / motion levers.

The **live preview + contrast overlay** (sample components, per-mode selector) render on
every lever stage (2–4), reflecting that stage's axis — colour on Semantic, type on
Typography, geometry on Form. The mode selector lives with the preview (modes only matter
once colour resolves, so it's not global).

Colour-axis edits re-resolve the engine and repaint only the volatile region (ramps or
preview), so knob focus is never lost; a failed combination is caught and the last-good
render preserved.

## Run

```bash
npm install          # from the repo root (workspaces) or from web/
npm run dev          # esbuild dev server on http://127.0.0.1:5173 (build.mjs --dev)
npm run build        # bundle to apps/studio/dist/ (build.mjs)
npm run typecheck    # tsc --noEmit
```

The engine core stays **buildless** (run via `tsx`); only this adapter bundles it.
Imports reach the engine by relative path (`../../packages/engine/…`) and pull in
**pure modules only** — never the I/O shells (`nb-fixture`, `emit-*`, `cli`), which
touch `node:` and would not bundle for the browser.

## Driving it headlessly — read this before writing a probe

The session state — the working brand, the resolved theme, the last-good rule, the viewed mode and
page — lives in `src/state/store.ts`, which touches no DOM and is imported directly by the Node suite
`test-store.ts` (#896). Since #896 the only module with import-time effects is `src/entry.ts` (the
bundle's entry); `src/main.ts` defines the pages and runs nothing while it loads. What it renders is
still DOM, though, so anything that needs to observe this app's *behavior* on screen has to drive a
browser.
Two committed drivers do, and both are Playwright (an `apps/studio` devDependency since #767 —
the engine core stays dependency-free):

```bash
npm run test:smoke   -w @prism3/studio   # test-smoke.mjs — the CI suite: every page × mode × brand
npm run audit:modes  -w @prism3/studio   # mode-audit.mjs — which sections respond to the mode bar
```

Start from one of those rather than a blank file. What follows is the trap that neither of them
makes obvious, and that a third probe will hit on its first run.

**Mode is global state that survives navigation, so a sweep must loop modes OUTSIDE pages.**

- **Mechanism.** `currentMode` is a single module-level global, and its persistence across
  navigation is a deliberate design decision, not an accident of the implementation — see
  `../../docs/23-dashboard-ia-and-component-system.md` §7. The UI redesign is moving pages one slice
  at a time, so a page is one of two kinds, and each kind offers the mode differently. Which kind a
  page is lives in `src/shell/pages.ts` (`status: 'new'` or `'legacy'`). Read it there, not from a
  list in this file.
  - **Moved pages** draw the two panes (levers beside a preview). Every one carries the **mode
    control** in its preview header (`mode-option` hooks, derived modes hatched), whether or not
    anything on it is edited per mode. In a **derived** mode (HC light / HC dark / Wireframe), six of them
    keep their controls on screen but read-only, under an "auto-derived — read-only" state line: Surfaces &
    fills, Interactive, Type, Shape, Depth & motion and Layout. Each page's derived-mode arm in
    `test-chrome.mjs` pins it. **Brand and Palettes don't:** nothing they set varies by mode, so they show no
    line and stay editable in every mode. Components isn't a moved page yet; it goes read-only by the legacy
    rule below.
  - **Legacy pages** still render in the full-width legacy frame. Their old mode strip (`mode-tab`
    hooks) appears **only on pages that carry a mode-varying control** (#268). A strip-less legacy
    page still renders *through* whatever mode is selected. The strip's absence means "nothing here
    is edited per mode", never "mode does not apply". In a derived mode a legacy page drops its
    editors entirely for the read-only "auto-derived" note.

  Both controls set the same `currentMode`, so a choice made on either kind of page carries to the
  other.
- **Symptom.** A probe that loops pages on the outside and modes on the inside reads each page that
  offers no mode choice of its own in whichever mode the *previous* page happened to leave behind,
  so its results are ordering artefacts. Worse, it does not look like an ordering bug. Arrive at a
  strip-less legacy page from a derived mode and it shows the note in place of its editors, so the
  probe reports a blank page with no controls. Arrive at a moved page the same way and every field
  is read-only, so the probe reports controls that will not take an edit. Both are the app being
  correct. The first draft of `test-smoke.mjs` did exactly this and reported two false defects on
  its first run.
- **Rule.** Select the mode explicitly before reading a page, then walk the pages in that mode;
  repeat per mode. On a moved page, select through its own mode control. Across the legacy pages,
  pick the mode on one that has the strip, then walk the rest. That is also the sequence a person
  performs, and it is the difference between covering *every page in every mode* and covering
  *every page that offers a mode choice*.

Two smaller traps worth inheriting rather than rediscovering:

- **Serve on an ephemeral port** (`listen(0)`), as both drivers above do. `mode-audit.mjs` held
  **8899** until it gated (#1898); two harnesses on one port collide as `EADDRINUSE`, which reads exactly like a test failure and gets debugged as one.
- **Use a fresh browser context per brand.** The working brand persists to `localStorage`, so a shared
  context carries one brand's state — and any override a probe writes — into the next. A new context
  also returns the app to its first-run start screen, which is how a brand gets chosen without going
  through the overwrite-confirm path.

## Scope (what's here vs. next)

- ✅ Four-stage shell; the colour axis is the live interactive loop (edit a brand
  colour / neutral → the engine re-resolves and the ramps + preview repaint).
- ✅ Stage 1 bespoke: brand-colour list (add / rename / remove), neutral Derive⇄Pin
  (`neutral.anchor`), generated ramps with the pinned-anchor marker.
- ✅ Preview colours + contrast overlay resolved live per mode; chips render real
  geometry/type from the token tree.
- ✅ **Brand setup** — the selector is a menu: switch example brands, **New brand**
  (minimal known-good starter), **Import design.md** (pasted `design.md` → `parseDesignMd`
  → loaded; a parse error or `brandTheme` rejection is surfaced, working brand untouched
  until both pass), the per-brand **Name** + **Namespace (`root`)** fields (`root`
  validated inline against `^[a-z][a-z0-9-]*$`), and **Modes** toggles — `Light` is always
  on; `Dark` / `HC` / `Wireframe` opt-in and write `brandState.modes`, so the preview's mode
  selector narrows/extends automatically. `Wireframe` is a generated greyscale mode (non-neutral
  roles → equivalent neutral, radius → 0); the preview reads its per-mode geometry from
  `resolvePreview`'s `dimOverrides` so corners actually square off. *New brand* starts light-only.
- ✅ **Export** — from the menu: **design.md** (`toDesignMd`, re-imports here — the loop
  closes) and **tokens.json** (the resolved DTCG tree via `buildTree`, namespaced under the
  brand's `root`). Both are pure engine functions; the browser just Blob-downloads them.
- ✅ **Preview on every lever stage** — Semantic / Typography / Form each show the live
  component preview + overlay reflecting their axis; Typography also has a type-scale specimen.
- ⏭ **Next:** promote the engine to a named `@prism3/engine` workspace package so imports
  read by name instead of relative path; a browser-safe schema-validator export (import
  validation currently leans on `brandTheme` throwing, since the full validator is node-bound
  in `emit-dtcg`). *Type specimen:* the visual sample size is capped at 60px for layout — the
  real px is shown in each row's label.

## Deploy

**Production: <https://prism3-ds.vercel.app/>**

The dashboard is a **static site** — the engine runs client-side, there is no backend, and
`main.ts` makes no network calls at runtime. It deploys to Vercel from this monorepo.

**Which build is live is answerable from the page itself.** The rail's foot carries
`engine <version> · <commit>` — the short `VERCEL_GIT_COMMIT_SHA` the bundle was built from, or
`local` when it was not built by the deploy (#474). Check it before assuming a merged change is
missing: `/dist/main.js` is served from a fixed URL, so a stale bundle and a fresh one look identical,
and a shipped change was once reported missing on exactly that basis.

The same answer from outside, without opening a browser:

```bash
curl -s https://prism3-ds.vercel.app/dist/main.js | grep -oE '"[0-9a-f]{7}"' | head -1
```

If that commit is behind `main`, look at the deploy rather than the code. `ignoreCommand` (below)
skips builds for commits that cannot change the site, so being a few commits behind is expected —
being behind a commit that **did** touch `apps/studio/src/**` is not.

The deploy contract lives in the repo-root **`vercel.json`**, so it is reviewable in git rather than
hidden in dashboard settings. It is deliberately minimal — no `installCommand`, `rewrites` or
`framework`, each of which would be a redundant override of something already correct by default and
free to drift.

`headers` is the one exception, and it is not in that category (#474). `index.html` references the
bundle at a **fixed** `/dist/main.js` — no content hash, no query — because `build-site.mjs` copies
`index.html` verbatim so one absolute path resolves identically under the local dev server and the
deploy root. That invariant is worth keeping, but it means every deploy publishes different bytes at
an unchanged URL, and whether that goes stale in a browser would otherwise rest entirely on Vercel's
*default* `cache-control`. So the deploy states it: everything revalidates. An unchanged bundle costs
one 304; a changed one is picked up on the next load rather than whenever a cache happens to expire.

If you add a genuinely immutable, content-hashed asset later, give it its own longer-lived rule
rather than relaxing this one — the blanket rule is safe precisely because nothing here is hashed.

`ignoreCommand` is the second exception, added for the same reason `headers` was: it states
something whose default we were relying on without knowing. It points at **`apps/studio/vercel-ignore.sh`**,
which skips the build when a commit cannot change the deployed site. The script exists rather than a
one-liner because its exit codes are inverted from intuition — **0 skips the build, 1 runs it** — and
getting that backwards fails silently toward a stale deploy, which is the defect #474 cost a rebuild
to diagnose. Every branch in it normalizes to one of those two codes, and any uncertainty (a shallow
clone with no `HEAD^`, a bad ref) resolves toward *building*.

What can change the site is measured, not assumed: Vercel runs `build:site`, whose bundle takes only
`packages/engine/**` and `packages/engine/schema/**` from outside `apps/studio/`. The Figma plugin is **not** part of
this build, so `plugin/**` deliberately does not trigger a deploy.

Only 13 of the engine's 44 `.ts` files are actually imported by that bundle, so the script names the
other 31 as exclusions rather than naming the 13 as inclusions. That direction is the point: a new
engine file is unlisted, so it triggers a build it may not need — wasteful but safe. Naming the 13
would fail the other way, with a newly imported file missing from the list and its changes quietly
shipping nothing. `npm run -w @prism3/studio check:ignore` gates the list against esbuild's real
metafile and runs in CI, so an excluded file that later becomes a bundle input fails there instead
of going stale in production.

```bash
npm run build:site --workspace @prism3/studio   # what Vercel runs → apps/studio/public/
```

`build:site` (`build-site.mjs`) bundles with the same options as `build` (`build.mjs`), then assembles
`apps/studio/public/` containing exactly `index.html` + `dist/main.js` + `.map` — and **fails
non-zero if the output is anything else**, so an emitted-but-unreferenced asset can't ship a
broken site on a green build. `dev` and `build` are unchanged and remain the local workflow;
`apps/studio/public/` is gitignored.

**Vercel's Root Directory must stay the repo root — not `apps/studio/`.** `src/main.ts` imports
`../../packages/engine/*` and `../../packages/engine/schema/example-brands.json`, which a `apps/studio/`-scoped
build cannot resolve.

Only `apps/studio/src`, `apps/studio/chrome` and `packages/engine/{*,schema}` are **read by the build**,
plus two emitted files: the chrome plugin (`chrome/esbuild-plugin.mjs`, UI redesign S1.1) reads
`packages/engine/out/prism3.tokens.json` and `prism3.dark.overlay.tokens.json` to generate the shell's
`--p3-*` variables. `apps/plugin/`, `reference/` and the rest of `packages/engine/out/` are neither read
nor served. Install is a different matter — it runs
at the repo root and resolves **both** workspaces, so `node_modules` also holds the plugin's
`@figma/plugin-typings`. Two consequences: the build needs devDependencies, so
`NODE_ENV=production` must not be set at install time; and a dependency bump in
`apps/plugin/package.json` without a regenerated root `package-lock.json` can fail this deploy's
install step (`npm ci` rejects a lockfile mismatch) before the build command ever runs.

**New Vercel projects enable Deployment Protection by default** — Settings → Deployment Protection →
disable Vercel Authentication, or the prod and preview URLs will be behind a login wall.

Pushes to `main` redeploy production; every PR gets its own preview URL.
