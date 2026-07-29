# Web Dashboard Vercel Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `web/` (the Prism3 web dashboard) as a public static site on Vercel, deployed from the monorepo via a committed config, with per-PR preview URLs.

**Architecture:** A new `web/build-site.mjs` runs the existing esbuild bundle and then assembles a clean publishable directory `web/public/` containing exactly `index.html` + `dist/main.js` + `dist/main.js.map`. A two-key root `vercel.json` points Vercel at that directory with an explicit build command. Vercel's Root Directory stays the **repo root** — non-negotiable, because `web/src/main.ts` imports `../../Prism3/engine/*` and `../../schema/example-brands.json`, which a `web/`-scoped build cannot resolve.

**Tech Stack:** Node 22, npm workspaces, esbuild 0.24 (already a `web` devDependency), Vercel static hosting. No new dependencies.

## Global Constraints

- **No new dependencies.** The repo is deliberately dependency-light; the root lockfile is 15KB and both workspaces share only `esbuild ^0.24.0` + `typescript ^5.6.3`.
- **Do not modify the existing `dev` or `build` scripts** in `web/package.json`. Local development on the esbuild dev server must be unaffected.
- **Do not modify `web/index.html`.** Its `/dist/main.js` absolute path must keep resolving under both esbuild `--servedir=.` locally and Vercel's output root. It is copied verbatim.
- **Do not modify any file under `Prism3/engine/`, `Prism3/schema/`, `Tokens/`, or `plugin/`.** This PR touches no engine source and no other surface.
- **`Prism3/engine/out/` must stay byte-identical.** Confirm with `git status Prism3/engine/out/`, don't assume.
- **`web/public/` is a build artifact** — gitignored, never committed.
- **Exact build command string** (used verbatim in `vercel.json` and in verification): `npm run build:site --workspace @prism3/web`
- **Exact output directory string** (used verbatim in `vercel.json`): `web/public`
- **Bundle flags must match the existing `build` script exactly:** entry `src/main.ts`, `bundle: true`, `format: 'esm'`, the define `PRISM3_HOST` with the value `'web'` (note the inner single quotes — it is substituted as a JS string literal), and `sourcemap: true`.
- **Follow `plugin/build.mjs` conventions:** ESM, top-level `await`, `node:` imports, a header comment explaining *why* the script exists, resolve paths from `import.meta.url`, `console.log` a short summary of what was emitted.
- **Commit style:** write the message to a temp file and use `git commit -F` (apostrophes break heredocs in this environment). End every commit message with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Spec of record:** `docs/superpowers/specs/2026-07-29-web-vercel-deploy-design.md`.
- **Branch:** work on the existing `feat/web-vercel-deploy` (already cut from `main` at `083ac21`; the spec commit `a4aa732` is already on it).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `web/build-site.mjs` | Create | The only new logic: bundle, then assemble a clean `web/public/` with exactly the three files the site needs. |
| `web/package.json` | Modify | Add one `build:site` script entry. Existing scripts untouched. |
| `.gitignore` | Modify | Add `web/public/` beside the existing `web/dist/`. |
| `vercel.json` | Create | The deploy contract: build command + output directory. Repo root. |
| `web/README.md` | Modify | A `## Deploy` section explaining the Root-Directory constraint and which script Vercel runs. |
| `Prism3/docs/00-progress.md` | Modify | Newest-first status entry, riding in this PR per the go-forward rule. |

Two tasks. Task 1 is the build mechanism (independently testable: run it, inspect the output, serve it headless). Task 2 is the deploy contract plus docs (independently reviewable: a reviewer could accept the build script but reject the config shape or the wording).

---

### Task 1: The site build

**Files:**
- Create: `web/build-site.mjs`
- Modify: `web/package.json` (the `scripts` block)
- Modify: `.gitignore` (the "monorepo adapters" block)

**Interfaces:**
- Consumes: nothing from earlier tasks. Reads `web/src/main.ts` (esbuild entry) and `web/index.html` (copied verbatim).
- Produces: the npm script **`build:site`** in workspace `@prism3/web`, runnable as `npm run build:site --workspace @prism3/web` from the repo root. It emits the directory **`web/public/`** containing exactly `index.html`, `dist/main.js`, `dist/main.js.map`. Task 2's `vercel.json` depends on both of those exact strings.

- [ ] **Step 1: Write the failing check**

There is no unit-test framework in `web/` — this repo validates by running the thing and inspecting the result (see CLAUDE.md "Validation is by JSON parse + reference resolution"; the engine has `test.ts`, the surfaces do not). So the check is a command with an exact expected output. Run it now, before writing any code, to establish it fails:

```bash
cd /Users/aforrester/Documents/Prism3
npm run build:site --workspace @prism3/web
```

- [ ] **Step 2: Confirm it fails for the right reason**

Expected: non-zero exit with npm reporting a missing script, e.g. `Missing script: "build:site"`. If it fails for any other reason, stop and investigate — a different error means the workspace wiring is not what this plan assumes.

- [ ] **Step 3: Write `web/build-site.mjs`**

Create the file with exactly this content:

```javascript
/**
 * Site build (#104). Produces the directory Vercel publishes.
 *
 * `npm run build` emits web/dist/ for local use, but the deployable root is a directory
 * *containing* dist/ — index.html loads `/dist/main.js` by absolute path. Publishing web/
 * itself would expose src/main.ts and DESIGN-REVIEW.md at the site root, so this assembles a
 * clean web/public/ holding only the three files the site actually needs.
 *
 * index.html is copied VERBATIM: its absolute `/dist/main.js` resolves identically under
 * esbuild's `--servedir=.` locally and under Vercel's output root. One file, two hosts, no
 * host-conditional path logic.
 *
 * Vercel runs this via the root vercel.json buildCommand. Run: `node build-site.mjs`
 * (or `npm run build:site`).
 */
import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pub = resolve(root, 'public');

// Clean first — a stale file from a previous build must never survive into a deploy.
await rm(pub, { recursive: true, force: true });
await mkdir(pub, { recursive: true });

// Same flags as the `build` script — the deployed bundle must be the one we develop against.
await build({
  entryPoints: [resolve(root, 'src/main.ts')],
  outdir: resolve(pub, 'dist'),
  bundle: true,
  format: 'esm',
  define: { PRISM3_HOST: "'web'" },
  sourcemap: true,
  logLevel: 'info',
});

// Verbatim copy — see the header comment on why the path must not be rewritten.
await cp(resolve(root, 'index.html'), resolve(pub, 'index.html'));

console.log('site build complete → web/public/ (index.html + dist/main.js + .map)');
```

Order matters: `rm` must precede `build`, or the bundle is deleted after being written. The finished file contains exactly one `rm`, one `mkdir`, one `build`, one `cp`.

- [ ] **Step 4: Add the npm script**

In `web/package.json`, add `build:site` to the `scripts` object, immediately after the existing `build` line. Leave `dev`, `build`, and `typecheck` exactly as they are:

```json
    "build:site": "node build-site.mjs",
```

The resulting `scripts` block must read:

```json
  "scripts": {
    "dev": "esbuild src/main.ts --bundle --format=esm --outdir=dist --define:PRISM3_HOST=\"'web'\" --servedir=. --serve=127.0.0.1:5173",
    "build": "esbuild src/main.ts --bundle --format=esm --outdir=dist --define:PRISM3_HOST=\"'web'\" --sourcemap",
    "build:site": "node build-site.mjs",
    "typecheck": "tsc --noEmit"
  },
```

- [ ] **Step 5: Gitignore the artifact**

In `.gitignore`, add `web/public/` directly after the existing `web/dist/` line, inside the same "monorepo adapters" block:

```
# monorepo adapters (Node/bundler artifacts). The engine core stays buildless.
node_modules/
web/dist/
web/public/
plugin/dist/
```

- [ ] **Step 6: Run the build and verify the output is exactly three files**

```bash
cd /Users/aforrester/Documents/Prism3
npm run build:site --workspace @prism3/web
find web/public -type f | sort
```

Expected `find` output — exactly these three lines, no more:

```
web/public/dist/main.js
web/public/dist/main.js.map
web/public/index.html
```

If `src/`, `DESIGN-REVIEW.md`, `README.md`, or anything else appears, the assembly is wrong — fix before continuing.

- [ ] **Step 7: Verify the clean step actually cleans**

Prove a stale file cannot survive into a deploy:

```bash
cd /Users/aforrester/Documents/Prism3
touch web/public/STALE.txt
npm run build:site --workspace @prism3/web
test ! -f web/public/STALE.txt && echo "PASS: stale file removed" || echo "FAIL: stale file survived"
```

Expected: `PASS: stale file removed`.

- [ ] **Step 8: Verify the built site boots, live and headless**

Serve the output on a throwaway port (8099 — deliberately not 5173/5273, so this cannot accidentally pass against the dev server):

```bash
cd /Users/aforrester/Documents/Prism3/web/public
nohup python3 -m http.server 8099 --bind 127.0.0.1 > /tmp/prism3-site-check.log 2>&1 &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8099/
```

Expected: `200`.

Then, using the Playwright MCP tools, navigate to `http://127.0.0.1:8099/`:
1. `browser_navigate` to that URL.
2. `browser_console_messages` — expect **no** errors. A `Failed to load module script` or a bare-specifier resolution error means the bundle or the `index.html` path is wrong.
3. `browser_snapshot` — confirm the four-stage shell rendered (Brand primitives / Semantic colours / Typography / Form factor), i.e. the app booted rather than showing an empty `#app`.
4. Change one lever (e.g. click into a later stage and adjust a control) and re-snapshot to confirm the preview repaints — this proves the engine bundled and runs, not just that a file was served.

Screenshots must be written to the Playwright MCP temp output dir (it cannot write into the repo), then read back.

Kill the server when done: `pkill -f "http.server 8099"`.

- [ ] **Step 9: Confirm nothing else in the repo moved**

```bash
cd /Users/aforrester/Documents/Prism3
npm run typecheck --workspace @prism3/web
git status --short Prism3/engine/out/
git status --short
```

Expected: typecheck exits 0; `Prism3/engine/out/` reports **nothing**; `git status --short` shows only `web/build-site.mjs`, `web/package.json`, `.gitignore` as changes, plus the pre-existing untracked noise (`.handoff-prompt.md`, `.playwright-mcp/`, `Prism3/docs/nb-text-styles.json`, `Prism3/engine/out/Untitled`, `docs/`). `web/public/` must **not** appear — if it does, Step 6 didn't take.

- [ ] **Step 10: Run the engine gate**

```bash
cd /Users/aforrester/Documents/Prism3
npx tsx Prism3/engine/test.ts 2>&1 | tail -5
```

Expected: all green (934 at time of writing; the count may be higher if other lanes landed tests — what matters is zero failures).

- [ ] **Step 11: Commit**

```bash
cd /Users/aforrester/Documents/Prism3
printf '%s\n' "web: build-site.mjs — assemble a clean publishable web/public/ (#104)" "" "The deployable root is a directory *containing* dist/ (index.html loads" "/dist/main.js absolutely), and publishing web/ as-is would expose src/main.ts" "and DESIGN-REVIEW.md at the site root. build-site.mjs bundles with the same" "flags as the build script, then assembles web/public/ holding exactly" "index.html + dist/main.js + .map. index.html is copied verbatim so its" "absolute path keeps resolving under both the local dev server and the deploy" "root -- no host-conditional logic." "" "dev/build/typecheck are untouched; web/public/ is gitignored." "" "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" > /tmp/prism3-t1-msg.txt
git add web/build-site.mjs web/package.json .gitignore
git commit -F /tmp/prism3-t1-msg.txt
```

---

### Task 2: The deploy contract and docs

**Files:**
- Create: `vercel.json`
- Modify: `web/README.md` (append a `## Deploy` section)
- Modify: `Prism3/docs/00-progress.md` (new entry at the top, after the header block)

**Interfaces:**
- Consumes: from Task 1 — the npm script `build:site` in workspace `@prism3/web`, and its output directory `web/public/`. Both strings appear verbatim in `vercel.json`.
- Produces: nothing consumed by later tasks. This is the terminal task.

- [ ] **Step 1: Write `vercel.json` at the repo root**

Exactly two keys. Do not add `installCommand` (Vercel's lockfile-detected default is already correct, and a redundant override is one more thing that can drift), `rewrites` (no client-side routing — verified: zero `pushState` in `main.ts`), or `framework` (this is not a framework preset):

```json
{
  "buildCommand": "npm run build:site --workspace @prism3/web",
  "outputDirectory": "web/public"
}
```

- [ ] **Step 2: Verify the build command in `vercel.json` is literally runnable**

Extract the string from the JSON and run that exact value, so a typo cannot slip through:

```bash
cd /Users/aforrester/Documents/Prism3
rm -rf web/public
node -e "const c=require('./vercel.json');console.log(c.buildCommand)" | bash
find web/public -type f | sort
```

Expected: the build succeeds and `find` prints exactly the same three lines as Task 1 Step 7:

```
web/public/dist/main.js
web/public/dist/main.js.map
web/public/index.html
```

Also confirm the declared output directory exists and matches:

```bash
node -e "const c=require('./vercel.json');const fs=require('fs');console.log(c.outputDirectory, fs.existsSync(c.outputDirectory)?'EXISTS':'MISSING')"
```

Expected: `web/public EXISTS`.

- [ ] **Step 3: Add the Deploy section to `web/README.md`**

Append at the end of the file, after the existing "Scope (what's here vs. next)" section:

```markdown
## Deploy

The dashboard is a **static site** — the engine runs client-side, there is no backend, and
`main.ts` makes no network calls at runtime. It deploys to Vercel from this monorepo.

The deploy contract lives in the repo-root **`vercel.json`** (two keys: `buildCommand` +
`outputDirectory`), so it is reviewable in git rather than hidden in dashboard settings.

```bash
npm run build:site --workspace @prism3/web   # what Vercel runs → web/public/
```

`build:site` (`build-site.mjs`) bundles with the same flags as `build`, then assembles
`web/public/` containing exactly `index.html` + `dist/main.js` + `.map`. `dev` and `build`
are unchanged and remain the local workflow; `web/public/` is gitignored.

**Vercel's Root Directory must stay the repo root — not `web/`.** `src/main.ts` imports
`../../Prism3/engine/*` and `../../schema/example-brands.json`, which a `web/`-scoped build
cannot resolve. Nothing else in the monorepo participates: install pulls only esbuild +
typescript, and `plugin/`, `Tokens/`, and `Prism3/engine/out/` are never read by the build
or served.

Pushes to `main` redeploy production; every PR gets its own preview URL.
```

- [ ] **Step 4: Add the progress entry**

In `Prism3/docs/00-progress.md`, insert a new entry immediately after the `---` that closes the header block and **before** the existing `## (2026-07-29) — Fix #274…` entry (newest first). Match the house style of surrounding entries — a `**STATUS:**` line, then bolded-lead bullets:

```markdown
## (2026-07-29) — Web dashboard deploys as a static site on Vercel (#104)

**STATUS: deploy setup** (`web/build-site.mjs` + root `vercel.json` + docs; no engine change, `out/*`
byte-identical). Closes #104 — the dashboard was reachable only from a local esbuild dev server, so UI
review needed a running process, there was no link to send anyone, and PRs had no live surface.

- **Static by construction:** the engine runs client-side and `main.ts` has zero `fetch`/`XMLHttpRequest`/
  `pushState` — so no backend, no rewrites, no runtime data loading. Just files.
- **Root Directory is the REPO ROOT, not `web/`** — the load-bearing constraint. `web/src/main.ts` imports
  `../../Prism3/engine/*` and `../../schema/example-brands.json`; a `web/`-scoped build can't resolve them.
  Nothing else in the monorepo participates: install pulls only esbuild + typescript, and `plugin/`,
  `Tokens/`, `Prism3/engine/out/` are neither read by the build nor served.
- **`build:site` → `web/public/`:** the deployable root must *contain* `dist/` (index.html loads
  `/dist/main.js` absolutely), and publishing `web/` as-is would expose `src/main.ts` + `DESIGN-REVIEW.md`
  at the site root. `build-site.mjs` cleans, bundles with the same flags as `build`, and copies
  `index.html` **verbatim** — its absolute path resolves identically under the local dev server and the
  deploy root, so there's no host-conditional path logic. `dev`/`build` untouched; `web/public/` gitignored.
- **Contract in git:** root `vercel.json` is two keys (`buildCommand`, `outputDirectory`). No
  `installCommand`/`rewrites`/`framework` — each would be a redundant override that can drift.
- **Verified:** the literal `vercel.json` `buildCommand` emits exactly 3 files; stale-file wipe confirmed;
  served headless on a throwaway port with a clean console + a live lever edit repainting.
- **One manual step (owner):** authorise the Vercel GitHub app and import `adamforrester/prism3-tokens`
  (Root Directory = repo root, then Deploy). Can't be granted by an agent. Prod URL to be added to
  `web/README.md` once it exists.
- **Spec/plan:** `docs/superpowers/specs/2026-07-29-web-vercel-deploy-design.md`,
  `docs/superpowers/plans/2026-07-29-web-vercel-deploy.md`.

---
```

- [ ] **Step 5: Re-verify the full gate before pushing**

```bash
cd /Users/aforrester/Documents/Prism3
npm run typecheck --workspace @prism3/web
npx tsx Prism3/engine/test.ts 2>&1 | tail -3
git status --short Prism3/engine/out/
```

Expected: typecheck 0; engine tests all green; `Prism3/engine/out/` reports nothing.

- [ ] **Step 6: Commit**

```bash
cd /Users/aforrester/Documents/Prism3
printf '%s\n' "web: vercel.json deploy contract + deploy docs (#104)" "" "Two keys -- buildCommand + outputDirectory -- committed so the deploy contract" "is reviewable in git and survives the project being recreated. No" "installCommand (the lockfile-detected default is correct), no rewrites (no" "client-side routing), no framework preset." "" "README gains a Deploy section documenting the load-bearing constraint: Root" "Directory stays the repo root, because web/src reaches outside the workspace" "for the engine and example brands." "" "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" > /tmp/prism3-t2-msg.txt
git add vercel.json web/README.md Prism3/docs/00-progress.md
git commit -F /tmp/prism3-t2-msg.txt
```

- [ ] **Step 7: Push and open the PR**

```bash
cd /Users/aforrester/Documents/Prism3
git push -u origin feat/web-vercel-deploy
```

Then open the PR with `gh pr create --body-file` (not a heredoc — apostrophes break the shell here). The body must state: what it does, the Root-Directory constraint and why, that `out/*` is byte-identical, the verification performed, and the **one manual owner step** (authorise the Vercel GitHub app, import the repo with Root Directory = repo root). Reference `Closes #104`.

---

## Post-merge (owner, then agent)

Not plan steps — they need the owner's hands and cannot be done by an agent:

1. **Owner:** Vercel → Add New Project → import `adamforrester/prism3-tokens` → leave Root Directory at the repo root → Deploy. Team `adamforrester-vmlcoms-projects` (`team_rlZMCreyz4A8WlKTOISB5c1K`) is already connected over MCP.
2. **Agent, once it exists:** `list_projects` to get the project id, `get_deployment_build_logs` to confirm a clean build, `get_runtime_errors` for the served site, then load the production URL headless (console clean, shell rendered, one lever edit repaints).
3. **Agent:** a one-line follow-up PR adding the production URL to the `web/README.md` Deploy section.

## Out of scope

No favicon, no custom domain, no analytics, no CI workflow, no `@prism3/engine` named-package refactor (the deferred item in `web/README.md` — it would make this PR about two things). No schema or engine changes.
