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

## Shell

The shell is a rail of areas: Theme · Components · Documentation · Export (#2909, IA v2;
`src/shell/pages.ts`). Theme holds the levers as a tab row in the order a theme composes:
Brand, Color, Type, Shape, Depth & motion, Layout. Each page puts its levers beside the live
preview, which has its own mode selector. What each area holds today: **Scope**, below.

Color-axis edits re-resolve the engine and repaint only the volatile region (ramps or
preview), so knob focus is never lost; a failed combination is caught and the last-good
render preserved.

## Run

```bash
npm ci               # from the repo root (workspaces)
npm run dev          # esbuild dev server on http://127.0.0.1:5173 (build.mjs --dev)
npm run build        # bundle to apps/studio/dist/ (build.mjs)
npm run typecheck    # tsc --noEmit
```

The engine core stays **buildless** (run via `tsx`); only this adapter bundles it.
Imports reach the engine by name (`@prism3/engine/…`) and pull in
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
npm run test:smoke   -w @prism3/studio   # test-smoke.mjs — the CI suite: every place × mode × brand
npm run test:chrome  -w @prism3/studio   # test-chrome.mjs — the shell's chrome, on both hosts
```

(`mode-audit.mjs`, which measured which legacy sections responded to the mode strip, was deleted in
UI redesign S8.3 with the web's last legacy page; the smoke sweep holds mode agreement on every place.)

Start from one of those rather than a blank file. What follows is the trap that neither of them
makes obvious, and that a third probe will hit on its first run.

**Mode is global state that survives navigation, so a sweep must loop modes OUTSIDE pages.**

- **Mechanism.** `currentMode` is a single module-level global, and its persistence across
  navigation is a deliberate design decision, not an accident of the implementation — see
  `../../docs/23-dashboard-ia-and-component-system.md` §7. Every page is now a moved page
  (`status: 'new'` in `src/shell/pages.ts`; the `'legacy'` kind remains in the type, but no page uses
  it). Read the kind there, not from a list in this file.
  - Each page draws the two panes (levers beside a preview) and carries the **mode control** in its
    preview header (`mode-option` hooks, derived modes hatched), whether or not anything on it is edited
    per mode.
  - In a **derived** mode (HC light / HC dark / Wireframe), seven pages keep their controls on screen but
    read-only, under an "auto-derived — read-only" state line: Surfaces & fills, Interactive, Type, Shape,
    Depth & motion, Layout and Components. Each page's derived-mode arm in `test-chrome.mjs` pins it.
  - **Brand and Palettes don't:** nothing they set varies by mode, so they show no line and stay editable
    in every mode.
- **Symptom.** A probe that loops pages on the outside and modes on the inside reads each page in
  whichever mode the *previous* page happened to leave behind, so its results are ordering artefacts.
  Worse, it does not look like an ordering bug. Arrive at one of the seven pages from a derived mode
  and every field is read-only, so the probe reports controls that will not take an edit. That is the
  app being correct. The first draft of `test-smoke.mjs` looped this way and reported two false
  defects on its first run.
- **Rule.** Select the mode explicitly, through a page's own mode control, before reading a page. Then
  walk the pages in that mode, and repeat per mode. That is also the sequence a person performs.

Two smaller traps worth inheriting rather than rediscovering:

- **Serve on an ephemeral port** (`listen(0)`), as both drivers above do. The deleted `mode-audit.mjs` held
  **8899** until it gated (#1898); two harnesses on one port collide as `EADDRINUSE`, which reads exactly like a test failure and gets debugged as one.
- **Use a fresh browser context per brand.** The working brand persists to `localStorage`, so a shared
  context carries one brand's state — and any override a probe writes — into the next. A new context
  also returns the app to its first-run start screen, which is how a brand gets chosen without going
  through the overwrite-confirm path.

## Scope (what's here vs. next)

- ✅ **The shell (IA v2, #2909):** a rail of areas, Theme · Components · Documentation · Export
  (`RAIL_AREAS`, `src/shell/pages.ts`). The web hides Documentation, which documents a Figma file
  (`railAreas`). Theme's pages are a tab row: Brand, Color (Palettes, Surfaces & fills, Interactive),
  Type, Shape, Depth & motion and Layout (`DOMAINS`, `THEME_TABS`). Every lever edit runs the
  engine again, and the preview redraws.
- ✅ **The brand menu** (`src/shell/bar.ts`) switches between the example brands, starts a
  **+ New brand**, or opens **↑ Import design.md…**. An import is parsed (`parseDesignMd`) and then
  built (`brandTheme`) before it loads. If either refuses, the menu shows why and the working brand
  stays as it was (`validateDesignMd`, `src/state/start-input.ts`).
- ✅ **Theme › Brand** holds the brand's **Identity** (name, and the namespace `root`, checked
  against `^[a-z][a-z0-9-]*$`), its **Personality**, and its **Modes**
  (`src/domains/brand.ts`). Light is always generated. Dark, High contrast light, High contrast
  dark and Wireframe are each a checkbox, and the brand can add custom modes. The checked modes
  set the preview's mode selector (`MODE_ROWS`, `src/state/brand-input.ts`).
- ✅ **Export**, a rail area since #2909, offers **Design tokens**, **Brand brief** (the
  `design.md`, which imports back into Studio) and **Component specs** (`src/export-settings.ts`).
  Design tokens are the consumer set, since #2552: `<brand>.base.tokens.json` plus one
  `<brand>.<mode>.overlay.tokens.json` per mode, with no `$extensions`. *Include build metadata*,
  off by default, keeps them. Studio never offers the single-file tree, because it holds the
  other modes in `$extensions`. The files are built by pure engine functions, and the browser
  downloads them as Blobs.
- ⏭ **Next:** a browser-safe schema validator. Import validation still relies on `brandTheme`
  refusing, because the full validator runs only under Node (`src/state/start-input.ts`).

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
`packages/engine/**`, `packages/engine/schema/**` and one plugin file, `apps/plugin/src/causes.ts` (#3326), from
outside `apps/studio/`, and copies `docs/public/` to `/docs` (#2637). The rest of the Figma plugin is **not** part of
this build, so the rest of `apps/plugin/**` deliberately does not trigger a deploy.

Only some of the engine's `.ts` files are actually imported by that bundle, so the script names the
others as exclusions rather than naming the imported ones as inclusions. That direction is the point: a new
engine file is unlisted, so it triggers a build it may not need — wasteful but safe. Naming the imported ones
would fail the other way, with a newly imported file missing from the list and its changes quietly
shipping nothing. `npm run -w @prism3/studio check:ignore` gates the list against esbuild's real
metafile and runs in CI, so an excluded file that later becomes a bundle input fails there instead
of going stale in production.

```bash
npm run build:site --workspace @prism3/studio   # what Vercel runs → apps/studio/public/
```

`build:site` (`build-site.mjs`) bundles with the same options as `build` (`build.mjs`), then assembles
`apps/studio/public/` containing exactly `index.html` + `dist/main.js` + `.map`, the `docs/public/` copy and the
guide pages drawn from it (#3176) — and **fails
non-zero if the output is anything else**, so an emitted-but-unreferenced asset can't ship a
broken site on a green build. `dev` and `build` are unchanged and remain the local workflow;
`apps/studio/public/` is gitignored.

**Vercel's Root Directory must stay the repo root — not `apps/studio/`.** `src/main.ts` imports
`@prism3/engine/*`, which resolves through the root workspace install, and an `apps/studio/`-scoped
build cannot resolve it.

Only `apps/studio/src`, `apps/studio/chrome`, `packages/engine/{*,schema}`, `apps/plugin/src/causes.ts` and
`docs/public/` are **read by the build**, plus two emitted files: the chrome plugin (`chrome/esbuild-plugin.mjs`, UI redesign S1.1) reads
`packages/engine/out/prism3.tokens.json` and `prism3.dark.overlay.tokens.json` to generate the shell's
`--p3-*` variables. The rest of `apps/plugin/`, `reference/` and the rest of `packages/engine/out/` are neither read
nor served. Install is a different matter — it runs
at the repo root and resolves **both** workspaces, so `node_modules` also holds the plugin's
`@figma/plugin-typings`. Two consequences: the build needs devDependencies, so
`NODE_ENV=production` must not be set at install time; and a dependency bump in
`apps/plugin/package.json` without a regenerated root `package-lock.json` can fail this deploy's
install step (`npm ci` rejects a lockfile mismatch) before the build command ever runs.

**New Vercel projects enable Deployment Protection by default** — Settings → Deployment Protection →
disable Vercel Authentication, or the prod and preview URLs will be behind a login wall.

Pushes to `main` redeploy production; every PR gets its own preview URL.
