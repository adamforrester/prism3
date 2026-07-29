# Deploy the web dashboard as a static site on Vercel

**Date:** 2026-07-29 · **Issue:** [#104](https://github.com/adamforrester/prism3-tokens/issues/104) · **Lane:** web

## Problem

`web/` (`@prism3/web`) is the Prism3 web dashboard. It runs entirely client-side — esbuild
bundles the pure engine into the browser, so there is no backend and nothing to serve
dynamically. Today the only way to reach it is a local esbuild dev server (the `dev` script binds
`127.0.0.1:5173`; sessions here run it on `5273` because 5173 is contended). That means UI
review needs a running local process, there is no link to send anyone, and pull requests
have no live surface to review against.

The deploy should serve three purposes roughly equally: a working tool at a stable
production URL, a shareable demo link, and a per-PR preview URL for review batches.

## Constraints discovered

Verified against the working tree at `083ac21`:

- **`web/src/main.ts` imports outside `web/`** — `../../Prism3/engine/{color,design-md,levers,modes,persist-input,preview,ramp,resolve-preview,theme,tree}`
  and `../../Prism3/schema/example-brands.json`. A build scoped to `web/` cannot resolve these.
- **`web/index.html` loads `/dist/main.js`** by absolute path. The deployable root is
  therefore a directory *containing* `dist/`, not `dist/` itself.
- **No client-side routing, no runtime network** — `main.ts` contains zero occurrences of
  `fetch(`, `XMLHttpRequest`, or `pushState`. The site is a single self-contained document.
- **The dependency surface is tiny** — the root lockfile is 15KB; both workspaces share
  only `esbuild ^0.24.0` + `typescript ^5.6.3`.
- **Current state is green** — `npm run build --workspace @prism3/web` produces a 356KB
  bundle in ~150ms; `typecheck` exits 0.
- Local Node is v22.18.0, matching Vercel's current default. No `.nvmrc`, no `engines`.
- The repo is public. There is no secret in the bundle: the engine is open source and all
  brand data is example fixtures.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Vercel Root Directory | **repo root**, not `web/` | The out-of-workspace engine imports must be resolvable. |
| Publishable root | new **`web/public/`**, gitignored | Publishing `web/` as-is would expose `DESIGN-REVIEW.md` at the site root. (The sourcemap ships `src/main.ts` deliberately.) |
| Deploy mechanism | **GitHub integration** | The only option that yields per-PR preview URLs, which is one of the three stated purposes. |
| Access | **fully public**, prod and previews | Consistent with the public repo; no secrets; frictionless stakeholder links. |
| Config location | committed **`vercel.json`** | The deploy contract stays reviewable in git and survives the project being recreated, rather than hiding in dashboard settings. |
| Sourcemap | **kept** | 820KB, costs nothing unless devtools are open, and makes preview URLs debuggable — half the point of the deploy. |

## Design

### `web/build-site.mjs`

A new script following the existing `plugin/build.mjs` precedent, so the repo keeps one
pattern for "a workspace that bundles". It:

1. Runs the same esbuild bundle as `npm run build` (entry `src/main.ts`, `--bundle`,
   `--format=esm`, `--define:PRISM3_HOST="'web'"`, `--sourcemap`).
2. Recreates `web/public/` from empty, then writes exactly:

```
web/public/index.html          ← copied verbatim from web/index.html
web/public/dist/main.js
web/public/dist/main.js.map
```

Exposed as `"build:site"` in `web/package.json`. The existing `dev` and `build` scripts are
**untouched**, so local development on :5273 is unaffected.

The verbatim `index.html` copy is deliberate: its `/dist/main.js` absolute path resolves
identically under esbuild's `--servedir=.` locally and under Vercel's output root. One
file, two hosts, no path branching and no host-conditional logic.

### `vercel.json` (repo root)

```json
{
  "buildCommand": "npm run build:site --workspace @prism3/web",
  "outputDirectory": "web/public"
}
```

Two keys, and nothing else on purpose:

- **No `installCommand`** — Vercel's lockfile-detected default is already correct, and a
  redundant override is one more thing that can drift from reality.
- **No `rewrites`** — there is no client-side routing to rewrite (verified: no `pushState`).
- **No `framework`** — this is not a framework preset; the explicit build command is the
  whole contract.

`plugin/`, `Prism3/engine/out/`, and `Tokens/` are never read by the build and never reach
the deployment. `Prism3/engine/` is consumed as source only.

### `.gitignore`

Add `web/public/` beside the existing `web/dist/` entry, under the same
"monorepo adapters" comment.

### Docs

- `web/README.md` — a **Deploy** section: the fact that Root Directory is the repo root and
  *why* (the out-of-workspace imports), and that `build:site` is the Vercel entry point
  while `dev`/`build` remain the local ones. The production URL is not known until the
  project is created, so this PR describes the setup and the URL is added in a follow-up
  one-liner once the owner has imported the project.
- `Prism3/docs/00-progress.md` — a newest-first entry, riding in this PR per the
  go-forward rule.

## Split of work

**In this PR (agent):** `web/build-site.mjs`, `web/package.json` script, `vercel.json`,
`.gitignore`, `web/README.md` deploy section, `00-progress.md` entry.

**Manual, once, by the owner (~2 min):** Vercel → Add New Project → import
`adamforrester/prism3-tokens` → leave Root Directory at the repo root → Deploy. It reads
`vercel.json` and needs no further input. **Also disable Deployment Protection** in Settings —
Vercel enables `ssoProtection` by default on new projects, which puts prod and preview URLs behind
a login wall, defeating the shareable-demo and per-PR-review purposes. The Vercel GitHub app
authorisation cannot be granted by the agent. Team `adamforrester-vmlcoms-projects`
(`team_rlZMCreyz4A8WlKTOISB5c1K`) is already connected over MCP, so once the project
exists the agent can read build logs and runtime errors to verify.

After that: push to `main` → production redeploy; every PR → its own preview URL.

## Verification

Before pushing:

1. Run the literal `buildCommand` on a clean tree; assert `web/public/` contains exactly
   the three expected files and no others.
2. Serve `web/public/` on a throwaway port and verify **live, headless** (Playwright): the
   app boots, a lever edit repaints the preview, and the console is clean.
3. `npm run typecheck --workspace @prism3/web` exits 0.
4. `git status Prism3/engine/out/` reports no change — this PR touches no engine source,
   but confirm rather than assume.
5. `npx tsx Prism3/engine/test.ts` green (currently 934), per the standard pre-push gate.

After the project exists: pull the Vercel build log and runtime errors over MCP, and load
the production URL headless.

## Out of scope

No favicon, no custom domain, no analytics, no CI workflow, and no `@prism3/engine`
named-package refactor (the deferred item in `web/README.md` — it would make this PR about
two things). No schema or engine changes.
