# @prism3/studio — the web dashboard

The first **rendering host** over the Prism3 engine core (see `../Prism3/docs/09-architecture-and-repos.md`
and `08-theming-interfaces.md`). It imports the same pure engine modules the Figma
plugin will, and renders from the shared contracts:

- **Knobs** from the lever manifest (`Prism3/engine/levers.ts`).
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
npm run dev          # esbuild dev server on http://127.0.0.1:5173
npm run build        # bundle to apps/studio/dist/
npm run typecheck    # tsc --noEmit
```

The engine core stays **buildless** (run via `tsx`); only this adapter bundles it.
Imports reach the engine by relative path (`../../Prism3/engine/…`) and pull in
**pure modules only** — never the I/O shells (`nb-fixture`, `emit-*`, `cli`), which
touch `node:` and would not bundle for the browser.

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
`Prism3/engine/**` and `Prism3/schema/**` from outside `web/`. The Figma plugin is **not** part of
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

`build:site` (`build-site.mjs`) bundles with the same flags as `build`, then assembles
`apps/studio/public/` containing exactly `index.html` + `dist/main.js` + `.map` — and **fails
non-zero if the output is anything else**, so an emitted-but-unreferenced asset can't ship a
broken site on a green build. `dev` and `build` are unchanged and remain the local workflow;
`apps/studio/public/` is gitignored.

**Vercel's Root Directory must stay the repo root — not `web/`.** `src/main.ts` imports
`../../Prism3/engine/*` and `../../Prism3/schema/example-brands.json`, which a `web/`-scoped
build cannot resolve.

Only `apps/studio/src` and `Prism3/{engine,schema}` are **read by the build**; `plugin/`, `Tokens/`,
and `Prism3/engine/out/` are neither read nor served. Install is a different matter — it runs
at the repo root and resolves **both** workspaces, so `node_modules` also holds the plugin's
`@figma/plugin-typings`. Two consequences: the build needs devDependencies, so
`NODE_ENV=production` must not be set at install time; and a dependency bump in
`apps/plugin/package.json` without a regenerated root `package-lock.json` can fail this deploy's
install step (`npm ci` rejects a lockfile mismatch) before the build command ever runs.

**New Vercel projects enable Deployment Protection by default** — Settings → Deployment Protection →
disable Vercel Authentication, or the prod and preview URLs will be behind a login wall.

Pushes to `main` redeploy production; every PR gets its own preview URL.
