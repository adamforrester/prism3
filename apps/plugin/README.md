# @prism3/plugin — the Figma plugin

The Figma **write host** over the Prism3 engine (see `../../docs/18-plugin-and-host-architecture.md`
and `22-plugin-plan.md`). The organizing goal is **one UI, many front doors**: the same vanilla
`apps/studio/src` control UI that drives the web dashboard runs verbatim inside this plugin's iframe; only
the write step below it is plugin-specific.

## Two contexts (the load-bearing split)

A Figma plugin runs in two isolated JS contexts that talk **only** by message passing (docs/18 §1):

| | Main thread (sandbox) | UI iframe |
|---|---|---|
| `figma.*` (document, variables, nodes) | ✅ only here | ❌ |
| DOM / rendering | ❌ | ✅ |
| entry | `src/main.ts` → `dist/main.js` (`manifest.main`) | `src/ui/` → `dist/ui.html` (`manifest.ui`) |
| tsconfig | `tsconfig.main.json` — plugin-typings, **no `dom` lib** | `tsconfig.ui.json` — DOM, **no plugin-typings** |

The split tsconfigs make context violations **compile errors**: a `document` reference in the main
thread or a `figma.*` reference in the UI won't typecheck. `src/messages.ts` is the pure shared wire
contract (two discriminated unions, one per direction) that compiles under both.

## The typed bridge

`src/bridge-main.ts` / `src/bridge-ui.ts` are thin typed wrappers over the raw channel — the
figma-plugin-dev skill's React `usePluginMessage` hook adapted to a vanilla `addEventListener`
wrapper (docs/22 §3). Every message is a variant of `UiToMain` / `MainToUi`; `assertNever` makes
each handler's `switch` exhaustive, so a new message type can't be silently dropped.

## Scope (#107 — the scaffold)

- ✅ `manifest.json` — `documentAccess: "dynamic-page"`, `networkAccess.allowedDomains: ["none"]`
  (the engine is bundled; nothing loads at runtime), `editorType: ["figma"]`, `api: "1.0.0"`.
  Verified against the current Figma plugin docs (2026-07).
- ✅ Two-context split + split tsconfigs (violations proven to fail compilation).
- ✅ Typed `postMessage` bridge with a placeholder UI that exercises the round-trip both ways
  (`ui-ready` → `main-ready`; button `ping` → `main-pong`).

## Scope (#108 — the write adapter)

- ✅ **`src/write-figma.ts` — `applyWritePlan(plan, figma.variables)`**: the live executor for the
  engine's host-neutral `WritePlan` (`../../packages/engine/write-plan.ts`). Same pure colour-materialisation
  core the CLI paste-path (`materialise-to-figma.ts`) uses; a real executor instead of a JS-string emitter.
- ✅ **Idempotent** find-by-name → update in place (via the async `getLocalVariables*Async` getters
  required under `dynamic-page`). Three passes: `core-palette` (hidden primitives) → `color` create
  (N modes, literal fallbacks) → `color` aliases (**per-mode** binding — the collapse-guard).
- ✅ **Colour only** (`core-palette` + `color`), matching the CLI today. The theme is the bundled NB
  fixture (`nbThemeFrom(nbMeasured)`, JSON inlined) — `buildFigmaColor` bundles with **zero `node:`
  builtins** thanks to the node-free `engine/emit-figma-color.ts`. A UI button fires `apply-theme`.
- ✅ **Tested** without a live Figma: `test-write.ts` drives the executor against an in-memory
  `figma.variables` shim (twice — idempotency), asserting the materialisation contract. `npm test`.

## Scope (#109 — the read adapter)

- ✅ **`src/read-figma.ts` — `readFigmaVariables(figma.variables)`**: the inverse of `applyWritePlan`.
  Reads `core-palette` + `color` back into the engine's host-neutral `ReadbackSnapshot`
  (`../../packages/engine/read-back.ts`), resolving each alias to its target variable NAME. Uses the same
  async getters, and shares the `VariablesApi` port with the write executor.
- ✅ **`verifyReadback(snapshot)`** (pure, engine) — ports the `materialise-to-figma` verify contract:
  modes distinct (collapse-guard), aliases resolve, slot scopes, field family present, retired/renamed
  roles absent, bare `foreground/danger` present, primitives hidden. A live health-check for a themed file.
- ✅ **Bridge + trigger** — `read-theme` / `read-result`; a "Read current file" button. The snapshot
  stays main-side until #110 hands it up to **seed the shared UI** from an existing themed file.
- ✅ **Tested**: `test-readback.ts` drives write→read→verify on the shim (`npm test` runs both harnesses).

## Scope (#110 — one build, two outputs: the no-fork capstone)

- ✅ **The iframe IS the shared `apps/studio/src` UI** — `apps/plugin/build.mjs` bundles `../../apps/studio/src/main.ts` into
  `dist/ui.html` (host=figma), retiring the placeholder. The same source the standalone web app builds;
  not a second UI. `tsconfig.ui.json` repoints at the shared UI so the DOM-clean/no-plugin-typings check
  runs on what's bundled.
- ✅ **Host selected at BUILD time** via `PRISM3_HOST` (esbuild `--define`; `apps/studio/src/prism3-host.d.ts`).
  `makeWriteHost` → `cssVarAdapter` for both (the preview paints CSS vars in either host); the COMMIT
  seam (`hostCommit`) differs — web downloads via the export bar, figma posts the live `BrandInput` to
  the main thread. esbuild DCEs the unused branch.
- ✅ **Write path = #108 verbatim**, only the theme source changed (bundled NB → live UI knobs):
  `apply-theme` carries a `BrandInput`; the main thread runs `buildWritePlan(buildFigmaColor(brandTheme(input)))`
  → `applyWritePlan`. On boot it runs #109 read-back → a `seed-info` panel.
- ✅ **Read-SEED is informational** — the `seed-info` panel reports whether an existing theme's contract
  holds; the actual knob-rehydration is #131 (below), not this snapshot (resolved values can't be
  reverse-engineered into knobs).

## Scope (#131 — persist `BrandInput` → true knob round-trip)

- ✅ **Persist on apply** — after a successful `applyWritePlan`, the main thread writes the live
  `BrandInput` into `figma.root` shared-data (namespace `prism3`, key `brandInput`), so the knobs travel
  with the file, not just the resolved variables.
- ✅ **Rehydrate on boot** — `ui-ready` runs `restoreToUi()` (independent of the #109 seed): reads the
  blob back, and if trusted posts `restore-input`; the shared UI loads it via `loadBrand`, so re-opening a
  themed file boots on that brand instead of the default `aurora`.
- ✅ **Versioned + defensive** — pure `engine/persist-input.ts` (`PERSIST_VERSION`) tags the blob;
  `deserializeBrandInput` returns `null` only on genuine absence (nothing ever stored). A NON-EMPTY
  blob it can't trust — parse error, no recognizable version stamp, or a version this build doesn't
  understand — THROWS `UnrecognizedPersistedInputError` instead (#480), and `restoreToUi` catches it
  and posts `restore-input-error` so the UI tells the designer the file needs re-import rather than
  silently opening on defaults. The blob is PUBLIC shared-data (any plugin can write it), so once past
  the version check the envelope guard is still deliberately shallow — the SHAPE gate is downstream:
  the restore handler runs `brandTheme` (as Import does) and keeps defaults on reject, so a
  versioned-but-malformed payload can't crash the boot render. Bump the version on an incompatible
  `BrandInput` change (#480 is the stamp/refusal floor only — no migration for old shapes is built;
  that's a deliberately separate decision, see `docs/00-progress.md`).
- ✅ **Knobs only** — restore does NOT re-write `figma.variables` (they're already in the file). The port
  (`apps/plugin/src/persist-figma.ts`) is a minimal `SharedDataPort`, shim-tested in `test-persist.ts`.

## Scope (#146 — write beyond colour: the FLOAT-variable axes)

- ✅ **Eight FLOAT collections** materialise alongside colour: `core-dimension`, `space`, `radius`,
  `size`, `border-width`, `focus`, `opacity`, and `layout`. An apply now writes the geometric layer,
  not just colour.
- ✅ **Node-free extraction** — `buildFigmaDims` + `buildFigmaLayout` moved to `engine/emit-figma-dims.ts`
  (like the colour core), so they bundle into the plugin main thread (0 `node:` builtins preserved).
- ✅ **Pure plan + executor** — `buildFloatWritePlan(theme)` reshapes both builders into a uniform
  `FloatCollectionPlan[]`; `applyFloatPlan` runs the same two-pass shape as the colour write, binding
  cross-collection aliases (space→dimension, size→dimension/space, radius→dimension, layout grid→space)
  against one global name map. Idempotent find-by-name; `layout` carries one mode per breakpoint,
  `radius` a `wireframe` mode when the brand opts in.
- ⏭ **Typography + shadow/gradient** land in their own lanes (below) — they're Figma *Styles* and a
  mixed font-variable collection, distinct from the FLOAT axes here.

## Scope (shadow/gradient — write beyond variables: Figma Styles)

- ✅ **The first non-variable write** — shadow → **Effect Styles**, gradient → **Paint Styles** (via
  `createEffectStyle`/`createPaintStyle`, not `figma.variables`). New `apps/plugin/src/write-styles.ts`
  `StylesApi` port + `applyStylesPlan` (idempotent find-by-name), run after the FLOAT write.
- ✅ **Shadow → BOTH style sets** — `shadow/*` (light) + `shadow-dark/*` (dark), exactly as the engine
  emits them (Effect Styles can't carry Figma modes; a component swaps the pair by mode).
- ✅ **Gradient → Paint Styles with BAKED resolved stops** + Figma `gradientTransform` (the emit's
  `angle`/`center` → a 2×3 affine via `gradientTransformFor`). Node-free `engine/emit-figma-styles.ts`
  + pure `buildStylesPlan`. Live-verified: a linear gradient + shadow render on a real rect.
- ⏭ **Variable-linked gradient stops** (bind `ColorStop.boundVariables` to `palette/*` so gradients
  re-theme live) — a fast-follow; this lane bakes resolved colours.

## Scope (#237 — write typography: core-font/type-sets variables + Text Styles)

- ✅ **The last write axis** — the plugin now materialises the whole generated system. Font VARIABLES
  (`core-font` per-mode: STRING family + FLOAT size/weight + FLOAT weight-role aliased; `type-sets`
  mobile/desktop) via the widened `VariablesApi` + `applyVarCollectionPlan` (mixed STRING+FLOAT, per-row
  `resolvedType`). Node-free `engine/emit-figma-font.ts` + pure `buildFontVarPlan`/`buildTextStylePlan`.
- ✅ **Text Styles** — new `apps/plugin/src/write-text-styles.ts` `TextStylesApi` port + `applyTextStylePlan`.
  fontFamily/fontSize/fontWeight bound to the font vars via `setBoundVariable`; fontStyle/lineHeight/
  letterSpacing/case/decoration baked. Run after the font vars (bound targets must exist first).
- ✅ **Font fallback = SKIP-WITH-WARNING** — `loadFontAsync` is the first write that loads a resource; if
  a family/style isn't available in that Figma, the style is skipped + reported (never substituted, never
  a throw that aborts the write). The font variables write regardless.
- ⏭ **Variable-linked gradient stops** (#236) and per-(category,size) links remain the only deferred bits.

## Scope (#113 — offer the font list the host can actually load)

- ✅ **The reader + its port** — node-free `apps/plugin/src/list-fonts.ts`: a structural `FontsApi` (so the global
  `figma` satisfies it with **no cast**) and `listFamilies`, which dedupes `listAvailableFontsAsync()` to
  sorted family names. It deliberately does **not** catch — the caller owns the failure mode. Shim-tested
  via `apps/plugin/test-list-fonts.ts` (dedupe, sort, empty-list, rejection stays a rejection).
- ✅ **Pushed on boot** — `main.ts` sends the new `{ type: 'font-list'; families }` message on `ui-ready`,
  wrapped in a try/catch that stays silent: if the list cannot be read the UI simply keeps its free-text
  input. Forwarded to the shared UI through the `figmaCommit` seam in `apps/studio/src/write-adapter.ts`, which
  filters the array to strings at the boundary.
- ✅ **A native `<datalist>`, chosen over a custom combobox** — the browser's own keyboard and
  screen-reader behavior instead of a hand-rolled `role="combobox"` + `aria-activedescendant`. **Cost taken
  knowingly:** the dropdown is browser chrome and cannot be themed to match the dashboard. Names travel as
  `option.value`, never `innerHTML` — they are external input.
- ✅ **A hint, never a constraint** — an unlisted, free-typed name still commits. `BrandInput` is a portable
  specification and may legitimately name a face this machine lacks, so there is deliberately **no
  validation on commit**; rejecting unlisted names would break the feature, not tighten it. `hostFonts`
  never enters `BrandInput` and is never persisted — it is an environment fact about one machine.
- ✅ **Host-conditional guidance copy** — the "find the name in Font Book" advice is correct on web and
  *wrong* in Figma, where the authoritative list is in the field. Both notes branch on `hostFonts.length`,
  never on a runtime host check.
- ⏭ **Per-style/weight validation** (which would retire the hardcoded weight map), the web-side
  `queryLocalFonts()` arm, and per-mode family override selects are deferred; #113 stays open.

## Scope (#1554 — file setup: the page-per-component scaffold)

The plugin's **first page-creation code** — until this, every write path hard-coded `figma.currentPage`
and `figma.createPage` appeared nowhere. Two pieces:

- ✅ **A `file-setup` action** (`file-setup` message → `main.ts` `fileSetup`) — scaffolds the file's PAGE
  structure and builds the two template assets. Its own action, not a flag on `apply-theme`/`build-components`
  (the #652 one-action-per-canvas-write rule). Idempotent: a re-run finds pages by name and never duplicates.
- ✅ **Page-aware `build-components`** — a built set now lands on ITS section page
  (`resolveComponentPage` finds-or-creates the `↳ <family>` page in the right slot) instead of
  `figma.currentPage`. Threaded through `applyComponentPlan`'s new `targetPage` option; absent still means
  `currentPage` (the pre-#1554 default, and what every shim test exercises).

### The layout rules (the taxonomy)

The structure is **config, not hardcoded logic** — `src/file-taxonomy.ts` holds it as data so the page
list + section mapping edit in one place. `src/file-setup.ts` reads it; it hardcodes none of it.

```
Cover
───                    (native Figma divider page — figma.createPageDivider)
Foundations            (empty section-header page — left-rail label only)
  ↳ Primitive tokens   (empty placeholder — file-setup creates it)
  ↳ Semantic tokens    (empty placeholder)
  ↳ Icons & assets     (icon def — created on demand by the build)
  ↳ Grids & layouts    (empty placeholder)
───
Components
  ↳ Buttons            (button, button-destructive, button-neutral)
  ↳ Icon button        (icon-button + destructive + neutral)
  ↳ Checkbox           (checkbox control/row/group)
  ↳ Radio              (radio control/row/group)
  ↳ Switch             (switch control/row)
  ↳ Select · ↳ Text field · ↳ Textarea · ↳ Veil
───
Subcomponents
  ↳ Image Placeholder · ↳ Focus Ring · ↳ Field Label · ↳ Field Message
───
Sandbox
  ↳ File Components     (holds _Section-header, _Headings — plugin-only template assets)
```

Rules, all enforced in the config + `test-file-setup.ts`:
- **One component FAMILY per page** — all Button variants under one `↳ Buttons` page.
- **Section-header pages are EMPTY** — `Foundations`/`Components`/`Subcomponents`/`Sandbox` are left-rail
  labels only, no content.
- **Dividers are native** — `figma.createPageDivider()` (default name `---`, `isPageDivider` true), matched
  back by the flag, not the name (so a repeated `---` is not an idempotency hazard). One before each section.
- **`↳ ` prefix** (U+21B3 + space) on every component page; `Cover` and the section headers have none.
- **The split that decides ownership:** a leaf with NO defs (the Foundations placeholders, `File Components`)
  is pre-created by `file-setup`; a leaf WITH defs is created ON DEMAND by the page-aware build, so an unbuilt
  component leaves no empty page. `Icons & assets` (the `icon` def) is the one Foundations leaf on the build's side.
- **Coverage is asserted, not restated:** `assertCoverage` reads the real `componentDefs` registry and fails
  by name if a def is neither mapped to a leaf nor in `EXCLUDED_DEFS` (empty today — all 23 map). A def added
  to the engine and forgotten here is caught, not silently dropped onto the designer's current page.

### The two file components

`_Section-header` and `_Headings` are **plugin-only template assets** (owner-confirmed), NOT engine defs —
they never touch `packages/engine/components/`, `index.ts`, or the component gates. Built by a targeted
constructor (`src/file-components.ts`, direct Plugin-API node building), placed on `↳ File Components`. Fonts
(Inter Regular/Bold/Semi Bold) load up front; an unavailable face is reported, never substituted silently.
Their exact per-variant typography is host-verified, not shim-verified — the same posture as
`createNodeFromSvg` (a Node shim modelling the numbers back would check the file against itself).

**Not yet wired:** a UI trigger for `file-setup` (the shared-UI button) is a follow-up — the owner deferred UI
placement, and the message contract + main-thread handler are complete and ready for it.

## Scope (#111 / #1553 — the same writes with the plugin closed, over the Figma MCP)

An agent can apply a theme and build components through the Figma MCP's `use_figma` tool (plain Plugin
API JavaScript, at most 50,000 characters per call) without this plugin open. The paste path REUSES the
executors rather than restating them:

- `src/apply-theme.ts` — Apply Theme's write sequence (fonts, pre-flight, the six executors, persist),
  lifted out of `main.ts` unchanged so a second driver can run it; `main.ts` keeps the report.
- `src/theme-ports.ts` — the host → port adapters both drivers bind through.
- `src/mcp-steps.ts` — the runtime inside each script: one step per executor, the shared-plugin-data
  probe with its ledger fallback, and the `figma` adapter that lets the engine's component payloads run
  where `loadAllPagesAsync` is not implemented. Typechecked under `tsconfig.main.json`.
- `mcp-paste.ts` — the Node generator: slices every plan to a 45,000-character script, bundles the step's
  executors with esbuild, orders components by `build-deps.ts`, and compares a read-back with the plan.
- `test-mcp-paste.ts` — the gate: the paste scripts and `runApplyTheme` against one file model, compared
  projection by projection (variables, values, aliases, scopes, modes, the four style kinds, the #1581
  stamps, the #131 brand), plus a size check on every script for every example brand.

The CLIs and the runbook are in `tools/figma-mcp/`.

## Scope (the agent link — an agent drives the running plugin by command)

"The plugin does the writing; the agent does the triggering and reading of the output." With the owner's
**Agent link** switched on (a temporary dashed chip, bottom-left of the panel — its placement and name are
open owner decisions), an agent sends a command and reads back a structured result. One protocol, two
transports: A, the file mailbox, and B, the local desktop bridge.

- ✅ **One protocol** — `src/agent-protocol.ts`, context-neutral like `messages.ts` (compiles under both
  tsconfigs): the command envelope `{v, id, cmd, args, issuedAt}`, the result envelope
  `{v, id, cmd, ok, startedAt, finishedAt, engineVersion, transport, result|error, progress?}`, the six
  commands (`status`, `apply-theme`, `build-components`, `file-setup`, `prune`, `readback`) and the
  validation both transports share. Unknown command, wrong version and malformed args are failed results,
  never silence.
- ✅ **No parallel path** — `main.ts`'s handlers report to an `ActionSink`; the panel passes one that posts
  exactly what it posted before, and the dispatcher (`src/agent-dispatch.ts`) passes one that captures the
  verdict plus the structured `data` each handler now exposes. Both callers reach the handlers through ONE
  `ACTIONS` table, and `test-agent-link.ts` fails by name if either stops doing so.
- ✅ **Transport A, the file mailbox** — `src/agent-link.ts`: while the link is on, the main thread polls
  `figma.root`'s `prism3agent` shared plugin data about once a second, claims one command before running
  it, runs commands in send order, one at a time, writes the result (chunked past 90 kB), keeps the last 20
  and publishes its own state to the `link` key. Commands queued before the link was switched on are
  answered `stale`, not run. The agent side is `agent-snippets.ts`, printed by
  `tools/figma-mcp/agent-link.ts` (runbook: `tools/figma-mcp/README.md` §5).
- ✅ **Off by default, never persisted**; the panel shows whether it is listening and the last command's
  headline. Commands are data mapped to handlers by name — nothing in a command is evaluated.
- ✅ **Tested through the real `main.ts`** — `test-agent-link.ts` installs a host model as the global
  `figma` and imports `main.ts` itself, then drives the mailbox with the exact scripts the CLI prints.
- ⏭ **Not verified live:** whether a `use_figma` write reaches an open plugin through multiplayer, and how
  fast. The mailbox polls so either route works; the first live run confirms it.
- ✅ **Transport B, the local desktop bridge** — `tools/figma-bridge/server.ts` (a stdio MCP server plus a
  hand-rolled RFC 6455 WebSocket server on `ws://localhost:17331`) and `src/agent-bridge-relay.ts`: while
  the link is on, the UI iframe holds the socket (the main thread has no network) and relays each command
  to the same dispatcher the mailbox uses. It streams progress and console lines back. The manifest adds
  that one origin under `networkAccess.devAllowedDomains` only; `allowedDomains: ["none"]` is unchanged.
  Gate: `test-agent-bridge.ts`.
- ⏭ **No `cleanup` command** — no panel action removes components, and the link routes only to those.

The iframe entry is now `src/ui/entry.ts`: it imports `apps/studio/src/main.ts` whole and unchanged (one UI,
no fork) and mounts the agent-link chip beside it, so the web build carries none of it.

## Run

```bash
npm install          # from the repo root (workspaces) — installs @figma/plugin-typings
npm run build -w @prism3/plugin      # → apps/plugin/dist/main.js + apps/plugin/dist/ui.html (shared UI inlined)
npm run watch -w @prism3/plugin      # rebuild on change (watches apps/plugin/src + apps/studio/src)
npm run typecheck -w @prism3/plugin  # both contexts (main + ui)
npm test -w @prism3/plugin           # write + read + persist + float + styles + typography executors + the MCP paste parity (in-memory shims)
```

Then in Figma: **Plugins → Development → Import plugin from manifest…** → pick `apps/plugin/manifest.json`.
The UI iframe is a single self-contained HTML file (the bundled shared UI is inlined) — required because
the iframe has no server to fetch from and ships with no network access. Tune the brand with the knobs,
then open the brand menu → **↳ Apply to Figma variables** to materialise the whole generated
system — `core-palette` + `color`, the ten FLOAT collections (`core-dimension`, `space`, `radius`,
`size`, `icon`, `control`, `border-width`, `focus`, `opacity`, `layout`), shadow/gradient Styles, and font variables +
Text Styles (#237, see above) — into the current file; the panel reports any existing Prism3 theme
found on boot.

## ⚠️ The plugin does NOT auto-update when the web UI changes

The iframe UI is **built, not referenced** — `build.mjs` bundles + inlines `apps/studio/src/main.ts` into
`dist/ui.html` at build time (it must: the iframe has no server and ships zero network access). So
`dist/` is a **gitignored build artifact** that only reflects `apps/studio/src` as of the last build. **Editing
`apps/studio/src` — or pulling web-lane changes on `main` — does nothing to the plugin until you rebuild.** This
is the #1 way the plugin drifts stale (it silently shows a week-old UI).

**Keep it in sync, pick one:**
- **During a plugin session:** run `npm run watch -w @prism3/plugin` — esbuild auto-rebuilds `dist/` on
  every `apps/studio/src` *and* `apps/plugin/src` change. (Reload the plugin in Figma to see the rebuilt UI; Figma
  re-reads `dist/ui.html` on each launch — no re-import needed.)
- **One-shot before testing:** `npm run fresh -w @prism3/plugin` — a clean rebuild that reminds you to
  reload in Figma. Use this after pulling `main` if you're not running `watch`.

### The inlining is `String.replace`, and the replacement MUST stay a function (#496)

The bundle is spliced into the HTML template with `String.replace`. A replacement **string** interprets
`$` patterns — and ~530 KB of bundled UI legitimately contains `'\\$&'` (the standard regex-escape
idiom). As a string, that `$&` expands to the *matched text*, injecting a literal `</script>` mid-bundle
and truncating the inlined script: the panel renders **blank**, from a build that exits 0 with both
typechecks clean. Passing a replacer **function** suppresses `$` interpretation.

So `() => \`<script>${js}</script>\`` is load-bearing — **do not collapse it back to a template
string**; it looks identical and is not. The build asserts exactly one `</script>` and that the dev-only
module tag did not survive, because `dist/` is a gitignored artifact no other gate reads back: without
that assertion, this is invisible until you open Figma.

## Which build is running (#836)

Every checkout of this repo builds a `dist/` under the **same plugin id** (`prism3-theming-plugin`), so
Figma lists them all as one dev plugin and gives you no way to tell which one it launched. With worktrees
in normal use, that regularly means several importable entries and no visible difference between them.

`build.mjs` stamps `<ISO seconds> <absolute source tree>` into **both** bundles, and it shows up in three
places — **listed in the order they actually detect a mismatch, which is not the order you would guess:**

| Where | Reads | What it catches |
|---|---|---|
| **The plugin console, once at load** | `[prism3 #836] Built from /private/tmp/p3-buildid at …` | **Everything, including the clean run.** The only channel that reports before you suspect anything |
| Every theme-write and component-build verdict | `… 4 misses. Built from /private/tmp/p3-buildid at 2026-08-26T21:55:28Z.` | A **failing** run, where the detail row is open. Also travels with a copied bug report |
| The rail chip, beside the engine version | `p3-buildid 08-26 21:55Z` — hover for the full path and the reason | Confirmation, once you already suspect a mismatch and scroll to it |

**Measured at the plugin's own default window** (1280×900, `main.ts`'s `DEFAULT_SIZE`): the chip's bottom
edge is at 978px — **78px below the fold**, last of 13 rail children in a document with 3191px hidden. And
on a clean run the verdict row renders no box at all: `#apply-detail` is in the DOM with `textContent`
empty, because `openDetail = m.ok ? null : 'apply'`. So in #836's own motivating scenario — a run that
reports success while emitting from the wrong bundle — **both panel surfaces are unreachable and the
console line is the whole mechanism.** Neither of the other two is a substitute for it, and the chip is
not the thing to optimize on the assumption that it is doing the detecting (#1107).

**Read the tree before diagnosing anything else.** On 2026-08-26 an afternoon went into a wrong emission
that was blamed on the emitter: the manifest path was checked and came back **correct**, and four
rebuilds and a three-way byte differential proved the bundle at that path was correct too. Figma was
running a *third* checkout's `dist/`, built two days earlier. The path is stamped as the resolved
realpath (`/private/tmp/…` on macOS), which is the form Figma itself reports — so it compares directly
against the manifest path without the `/tmp` vs `/private/tmp` detour that made that check look clean.

Two fields rather than one, because they catch different failures. The tree catches the wrong checkout;
the **build time** catches the right checkout never rebuilt, which the tree cannot see — `dist/` is
gitignored, so no `git pull` or branch switch touches what Figma runs. That is the failure mode the
section above is about, now visible from inside the panel instead of only in this README.

Not a commit SHA: two worktrees on the same commit is a normal state here and a SHA cannot separate
them. The path makes the commit derivable (`git -C <tree> log -1`); the commit does not make the path
derivable, and the path is the half you can act on.
