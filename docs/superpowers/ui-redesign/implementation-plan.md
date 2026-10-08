# UI redesign: implementation plan for concept v6

> How the accepted concept v6 becomes the real Studio and Figma plugin UI, one small PR at a time,
> with a working product after every merge. This is a plan. It changes no product code, and it
> decides no design question. Section 8 lists the questions that belong to the owner, each with a
> recommendation.

**Inputs.** The spec is concept v6 and the four decision files (`decisions-2026-09-30.md` and its
v4, v5 and v6 reviews), read from the v6 branch at `1ee70e4f`. The architecture is `phase1-audit.md`
§2, with F1 to F4 merged. The code is `main` at `34464962`. Line references below are to that commit.

**How the numbers were measured.** Every number below comes from a command run for this plan, in a
worktree populated with `npm ci`:

- line and byte counts: `wc -l`, `wc -c`, `stat -c%s`;
- call-site counts: `grep -o '<pattern>' apps/studio/src/main.ts | wc -l` (occurrences, not lines);
- bundle sizes: `npm run -w @prism3/studio build` and `npm run -w @prism3/plugin build`, then
  `stat -c%s` and `gzip -c | wc -c`;
- font cost: `base64 -w0 <woff2> | wc -c` on the two faces in `style-tiles/fonts/`;
- assertion counts: the suites' own totals from a full run (`test:smoke`, `test:verdict`,
  `test:start`, `test`);
- the v6 audit: `audit-v6.mjs`, run read-only against the v6 worktree, timed with `time`.

---

## 1. Where the code stands

| Fact | Measured | Where |
|---|---|---|
| `main.ts` size | 9,756 lines, 672,721 bytes | `apps/studio/src/main.ts` |
| `el()` calls | 1,053 | `main.ts` |
| Repaint calls, by kind | `apply()` 40 · `applyFull()` 53 · `build()` 14 · `renderBar()` 39 | `main.ts:237`, `:244`, `:9601`, `:9302` |
| Store subscribers | 0 (`subscribe(` does not occur in `main.ts`) | store API at `state/store.ts:95-112` |
| Host repaints | a tag list plus a switch over it | `state/host-session.ts:210-234`, `main.ts:614-680` |
| `data-p3` hooks minted | 129 `hook(` calls | `main.ts:375` |
| Hooks the suites use | smoke 88, verdict 17, start 18 | `test-hooks.mjs` report |
| `styles.css` | 1,591 lines, 138,841 bytes, light only | `apps/studio/src/styles.css` |
| Studio bundle | 1,003,873 bytes (299,478 gzipped) | `apps/studio/dist/main.js` |
| Plugin UI | 1,256,132 bytes (343,539 gzipped) | `apps/plugin/dist/ui.html` |
| `test:smoke` | 3,371 assertions, 3 min 12 s | `apps/studio/test-smoke.mjs` |
| `test:verdict` | 147 assertions | `apps/plugin/test-build-verdict.mjs` |
| `test:start` | 493 passing checks printed | `apps/plugin/test-start-screen.mjs` |
| studio `test` | 10 Node suites, 579 assertions | `apps/studio/package.json:12` |
| `lint:contrast` | 19 pairs, thinnest margin +0.026 (`--ok` on `--paper`) | `apps/studio/lint-contrast.mjs:54` |
| v6 audit | 52 renders in 2 min 17 s; **2 failures today** (below) | `audit-v6.mjs` on the v6 branch |

**The v6 audit is red on the v6 branch as of this plan.** Both failures are the Inspect row the v6
review asked to fix before merge (`Inspect wrapped off the title row`, Surfaces & fills and
Interactive with Roles on, light, 1280). S1 starts from v6 once it merges green.

**What the rendering model is today.** The rail is data (`NAV`, `main.ts:97`). Each destination is a
`PageRenderer` (`PAGE_RENDERERS`, `main.ts:8254`), staged detached and reconciled region by region
(`renderWorkspace`, `main.ts:8437`; `reconcileRegions`, `:8401`). Regions are keyed by section-title
text (`regionKey`, `main.ts:8362`), which is #1820. Each caller picks its own repaint tier. A page's
live painter is registered through `setVolatile` (`main.ts:204`), which exists because a painter can
outlive its nodes. Chrome surfaces are declared in `CHROME_SURFACES` (`main.ts:8000`) and refreshed
by `syncChrome` (`main.ts:8082`).

---

## 2. Slice order

Phase 1 planned the shell, then Brand, Color, Type, Shape, Depth & motion, Layout, Components, and
last the Figma panel with the activity surface. v6 changes three things that move the order:

- **The Activity drawer, Inspect and the agent chip are shell, not a late domain.** The top bar
  holds Activity, the Figma menu and the agent chip on every page (F2, IA-3), and Inspect opens over
  any page's preview (F1, V1). They belong in S1. What stays late is the drawer's *content*: the full
  activity model per operation.
- **Color is three pages, and Color › Palettes is the opening page** (v5 Q2, v6 Q1). It goes first,
  so the first page a user sees is the first one rebuilt.
- **The Roles matrix is the one editable thing in a preview** (V2). It arrives with Surfaces & fills,
  the first page that has one, and Interactive reuses it.

### The order

| # | Slice | PRs | Size | Depends on |
|---|---|---|---|---|
| P1 | Test hardening (#1829, #1830, #1831) | 1 | S | none |
| P2 | Repaint end state (#1845, #1846) | 1 | M | none |
| P3 | Inbound wire types (#1840) | 1 | S | none |
| P4 | Comment sweep (#1837) | 1 | S | none; any time |
| S1 | Shell | 4 (S1.1–S1.4) | L | P1, P2, v6 merged |
| S2 | Color › Palettes | 1 | M | S1 |
| S3 | Brand | 1 | M | S1 |
| S4 | Color › Surfaces & fills, with the Roles matrix | 1–2 | L | S2 |
| S5 | Color › Interactive | 1 | L | S4 |
| S6 | Type | 2 | L | S1 |
| S7 | Shape | 1 | S | S1; #1852 optional |
| S8 | Components | 1 | M | S7 |
| S9 | Depth & motion | 1 | M | S1 |
| S10 | Layout | 1 | S | S1 |
| S11 | Figma panel and activity model (#1788) | 2 | L | S1.4; #1784 and #1788 for the style guide options |
| S12 | Start screens (#506, decision 14) | 1 | M | S1 |
| S13 | Cleanup: the legacy frame, the Pages menu, the legacy repaint tiers | 1 | M | every domain slice |

**Parallel lanes after S1.** S2→S4→S5 share the Color files and run in order. S6, S9 and S10 touch
separate regions and can run beside them. S11 touches only the drawer and host code, so it can run
at any time after S1.4. S7 must precede S8 (below).

**Size key.** S: under about 300 changed lines. M: 300–1,000. L: over 1,000, or one that retires
more than 1,000 legacy lines. Legacy line counts are region spans between `main.ts` section headers.

### Per slice

Every slice runs `npm run verify` green, gets an independent review, carries a progress fragment in
`docs/progress/pending/` (#1807's convention), and titles its PR "DO NOT MERGE — …". UI-only slices
bump no version. Every mutation below runs after a `wip:` commit, with its diff checked non-empty.

**P1. Test hardening.**
- *Ships:* #1830's two assertions (the prune dialog has `role="dialog"` and an accessible name; the
  Export button's accessible name is "Export"). #1831: every hook click goes through `need()`, and
  each check that something is absent first proves the state it tests. #1829: `mode-audit.mjs`
  moves onto hooks through `hookGuard`. It is deleted in S13, when the mode strip it audits goes.
- *Retires:* nothing.
- *Files:* `apps/studio/test-smoke.mjs`, `apps/plugin/test-build-verdict.mjs`,
  `apps/plugin/test-start-screen.mjs`, `apps/studio/test-hooks.mjs`, `apps/studio/mode-audit.mjs`.
- *Gates:* `test:smoke`, `test:verdict` and `test:start` each grow. No new CI step.
- *Mutation:* remove `aria-label="Export"` in `renderBar` → smoke fails
  `the Export button's accessible name is "Export"`.

**P2. Repaint end state: store subscribers.** Section 5 gives the reasons. The PR states the end
state in its first line, as the owner asked.
- *Ships:* `repaintsFor` becomes `topicsFor(msg): Topic[]`, still pure. `Topic` gains host topics
  (`host`, `host:components`, `host:filesetup`, `host:styleguide`, `fonts`). The switch at
  `main.ts:619-680` is replaced by `invalidate` calls, and each legacy surface subscribes once at
  mount. #1845: a `test:verdict` arm sends `file-setup-result` and `style-guide-result` and reads
  each row back. #1846: the refused-edit `syncIdentity` test, and `PageKey` checked against `NAV`
  both ways.
- *Retires:* the `Repaint` tag type and its switch.
- *Files:* `state/store.ts`, `state/host-session.ts`, `main.ts` (the handler and the mounts),
  `test-host-session.ts`, `test-store.ts`, `apps/plugin/test-build-verdict.mjs`.
- *Gates:* studio `test`, `test:verdict`. No new CI step.
- *Mutation:* drop the File setup row's subscription → verdict fails
  `a file-setup verdict re-enables the Set up file button`. Second: point `syncIdentity` back at
  `brandState` → `test-store` fails `a refused edit never reaches storage`.

**P3. Inbound wire types (#1840).** `onHostMessage`'s validator is typed against `MainToUi`.
*Files:* `write-adapter.ts`, `test-write-adapter.ts`. *Mutation:* rename a `MainToUi` field in
`apps/plugin/src/messages.ts` → plugin `typecheck` fails naming the field in `write-adapter.ts`.

**P4. Comment sweep (#1837).** Rewords the about 20 comments the issue lists. Some ship in the
bundle and the PR template, so `lint-us-english`, `lint-voice` and `lint-doc-gates` must stay green.
No mutation beyond the gates it touches; it changes no behavior.

**S1. Shell.** Four PRs, detailed in section 3.

**S2. Color › Palettes.**
- *Ships:* the Palettes levers (Primary, Brand colors with the dashed add, Neutrals; Pinned neutral
  and Status colors under Show advanced) and its preview (containers per group, 56px hero swatch,
  two strips of large squares, anchors, the roles each palette drives). The step picker (V9).
- *Retires:* the `palettes` legacy page (`main.ts:758-1159`, about 400 lines).
- *Files:* new `domains/color-palettes.ts`, `preview/palettes.ts`, `ui/step-picker.ts`; `main.ts`
  (delete the region); `shell/pages.ts` (status `legacy` → `new`).
- *Gates:* `test:chrome` adds the page; smoke's Palettes scenarios move to the new hooks. Adds the
  specimen-ground check (section 9.1).
- *Mutation:* render one palette strip on the chrome card instead of the brand's
  `background.primary` → `test:chrome` fails `specimen ground: palettes … is the chrome card`.

**S3. Brand.**
- *Ships:* Identity (name and namespace side by side, the placeholder-namespace warning, T2),
  Personality, Modes (Q3's dark-off drops high contrast dark, with a preview). Home: Style guide,
  reusing `renderPreviewStyleGuide` (`main.ts:1659`).
- *Retires:* the name and namespace fields in the brand menu (`renderBrandMenu`, `main.ts:8781`) and
  the legacy Preview page (`renderPreviewPage`, `main.ts:4531`), once S1.3's Inspect covers its other
  two views.
- *Files:* `domains/brand.ts`, `main.ts`, `shell/pages.ts`.
- *Mutation:* let the namespace field accept `pds3` without the warning → smoke fails
  `a reserved namespace warns before export`.

**S4. Color › Surfaces & fills, with the Roles matrix.**
- *Ships:* surfaces per mode, one fill row per foreground fill with its ratio, and the gradient
  editor with editable stops. The preview shows live samples and ratio badges. The Roles toggle and
  the editable role × mode matrix: header and role column pinned, light cells editable, derived
  columns hatched (V2, v4 Q4). Families: text, icon, background, foreground, border, scrim, veil and
  inverse, except inverse interactive and inverse links (v6 Q3).
- *Retires:* `main.ts:6414-7069` and the gradient editor `:7725-7909` (about 840 lines).
- *Files:* `domains/color-fills.ts`, `preview/surfaces.ts`, `preview/roles-matrix.ts`, `main.ts`.
- *Size:* L. It can split: the matrix first, then the page.
- *Gates:* `test-pages.ts` asserts every emitted color role belongs to exactly one sub-page (oracle:
  `packages/engine/out/prism3.tokens.json`). `test:chrome` checks the matrix against the literal
  `ROLE_FAMILIES`.
- *Mutation:* drop `veil` from the page's role prefixes → `test-pages` fails
  `color roles in no Color sub-page's Roles matrix: veil…`.

**S5. Color › Interactive.**
- *Ships:* Actions, Interactive palettes, Links, Legibility. The preview shows every column filled
  and outlined at rest, hover and pressed, links in four states, icons and disabled, and the inverse
  band. Roles reuses S4's matrix with its own families.
- *Retires:* `main.ts:2191-3213` (about 1,020 lines).
- *Mutation:* hide `strictInteractiveContrast` behind Show advanced → `test-pages` fails
  `… placed advanced in Color › Interactive … (every lever on this page is shown)`.

**S6. Type.** Two PRs: Faces, then Scale, limits and weights. Includes `typography.responsive`
under Scale with its Layout link (Q5), the italics 3-chip (Q6), and the #1802 unresolved-style
warning (Q10).
- *Retires:* `main.ts:3389-3958` and `:5091-6394` (about 1,870 lines), plus `renderTypePreview`
  (`:4027`) and `renderTypeRamp` (`:7069`).
- *Mutation:* map *Italic only* to `italics: false` → smoke fails the round trip naming the chip.

**S7. Shape.** Density, corners, corner base. Retires the Size and radius blocks of `sizeRadius`
(`main.ts:4368`). **It does not retire the page:** the Buttons block (`main.ts:4378`) belongs to
Components in v6, so the legacy page stays reachable from the Components tab until S8. #1852 is not
a blocker: the preview draws whatever rungs the engine emits.
- *Mutation:* remove `radiusHairline` from the page data → `test-pages` fails
  `manifest keys with no home: radiusHairline`.

**S8. Components.** Button options and the 26 sets (plugin build). Retires the `sizeRadius` page and
`renderComponentsPage` (`main.ts:4666`).
- *Mutation:* swap the Brand and Components homes in `pages.ts` → `test:chrome` fails
  `V1 home: brand shows comps, want guide` (the data test passes; each view still has one home).

**S9. Depth & motion.** One tab, one preview with Elevation and Motion stacked (v5 Q3, V4).
Retires `elevation` and `motion` (`main.ts:4232`, `:4493`, the shadow editor at `:6901`, the
specimens at `:7307` and `:7653`).
- *Mutation:* give the Motion section its own home → `test-pages` fails
  `section declares a home view: Depth & motion › Motion`.

**S10. Layout.** Every lever shown (Q4), the colored breakpoint band and columns (V11). Retires
`renderLayoutPage` (`main.ts:4464`).

**S11. Figma panel and activity model.** Two PRs: the activity model (progress, outcome, errors
grouped by cause with their fixes, history per operation, agent-started operations), then the
Figma actions' options in the drawer, including the style guide set pending #1784 and #1788 (Q11,
v4 Q10). Retires the status pills in the bar (`main.ts:9222-9250`), the apply detail surface
(`:8030`), `renderStyleGuidePage` (`:4928`) and the prune dialog's standalone frame (`:9110`).
- *Gates:* `test:verdict` is rewritten around the drawer. **Its nine literal verdict strings stay the
  copy contract.** New arms cover an agent-started operation opening the drawer (F2).
- *Mutation:* stop the drawer opening for an agent-started operation → verdict fails
  `an agent-started apply opens the Activity drawer`.

**S12. Start screens.** The studio's first-run screen and the plugin's empty-file start (#506,
decision 14), in the new chrome. `test:start` moves to the new hooks. #506's case (c), writing into
a file with foreign content, is a plugin write-path safety question, not UI (section 8, D9).

**S13. Cleanup.** Deletes the legacy frame, the Pages menu, `NAV`, `setVolatile`, `paintVolatile`,
`apply`, `applyFull`, the mode strip, `SECTION_MODE_SCOPE`, `mode-audit.mjs`, and `styles.css`'s
legacy rules. `lint:contrast` drops its 19 legacy pairs. Deleting `mode-audit.mjs` also removes its
CI step (#1897): the `ci.yml` step, its `verify.ts` row, and its lines in `CLAUDE.md` §4,
`CONTRIBUTING.md` §3 and the PR template, or `lint-doc-gates.ts` fails. *Mutation:* leave one `applyFull()` call
→ the S1 guard (section 3.10) fails naming the file.

*Status (2026-10-07, H12 #2289, owner PG1 A and Q107 A).* Done: the legacy frame, the Pages menu and the old Style
guide page it opened (the last legacy page), `NAV`, `setVolatile`, `paintVolatile`, the mode strip and its mode badges
(`SECTION_MODE_SCOPE`), the legacy workspace and its region reconcile, the legacy settings search, `pages.ts`'s
`legacy` lists and `LegacyPageKey`, and the `styles.css` rules only those drew (`lint:live-css --accept`, each named).
`test-removed-legacy.ts` keeps the names out. `mode-audit.mjs` had already gone (S8.3). Left: `apply` and
`applyFull`, which the bar's writers still call (`applyFull` is a bare `rebuild()` now), and `lint:contrast`'s legacy
pairs.

---

## 3. S1, the shell, in detail

S1 is four PRs. Each ships a working product.

| PR | Concern | Size |
|---|---|---|
| S1.1 | Chrome token pipeline and embedded fonts | M |
| S1.2 | The frame: top bar, tabs, two panes, legacy frame, narrow mode, `test:chrome` | L |
| S1.3 | Pages data, the preview pane, the mode control, Inspect | M |
| S1.4 | Activity drawer frame, Figma menu, agent chip | M |

### 3.1 Chrome variables from the default theme (S1.1)

**Where the module goes.** `git mv` `chrome-tokens.mjs` to `apps/studio/chrome/tokens.mjs`, and the
two faces with their OFL licenses to `apps/studio/chrome/fonts/`. The new directory has the same
depth below the repo root as `docs/superpowers/ui-redesign/`, so `ROOT` (`chrome-tokens.mjs:23`)
does not change. Only `FONTS_DIR` (`:24`) moves. The module keeps every export, so it is moved, not
forked.

**The spec lifts out of `build-v6.mjs`.** `V6_VARS`, `PAIRS`, `LAYER_STEP` and `LAYERS`
(`build-v6.mjs:179-315`) move verbatim into `apps/studio/chrome/spec.mjs`, and `build-v6.mjs`,
`build-v5.mjs` and `style-tiles/build-tiles.mjs` import from the new paths. The check that nothing
forked: `concept-v6.html` rebuilds byte-identical except the `builtAt` date. The mockup and the
product then read one spec.

**How the builds call it.** A new `apps/studio/chrome/esbuild-plugin.mjs` exports `chromeCss()`, an
esbuild plugin that resolves the virtual import `p3:chrome-css`. At bundle time it:

1. loads the default theme's light and dark trees (`loadModes`);
2. writes the `--p3-*` blocks for `:root`/`[data-theme="light"]`, `[data-theme="dark"]` and
   `[data-theme="system"]` under `prefers-color-scheme` (the shape `build-v6.mjs:317-340` emits);
3. appends the `@font-face` rules;
4. appends `apps/studio/src/chrome.css`, the hand-written chrome rules, which may only read
   `var(--p3-*)`;
5. fails the build, naming each failure, on the checks from `build-v6.mjs` that concern the CSS it
   produces: the raw-value scan (checks 4), variables used but undefined or defined but unused (6),
   a chrome color through a brand token (7), and a network request (10).

`entry.ts` imports it as text next to `styles.css` (`entry.ts:26`), and `installStyles`
(`main.ts:9678`) receives both, so the class-scope law covers the new sheet too. New classes take a
shell-only scope prefix.

The studio's `build` and `dev` scripts are esbuild CLI calls (`apps/studio/package.json:8-9`), and
the CLI cannot load a plugin. They move into `apps/studio/build.mjs`, which serves `dev` through an
esbuild context. The other three bundlers add the plugin next to their existing `.css` loader:
`apps/plugin/build.mjs:235`, `apps/studio/build-site.mjs:43` and
`apps/studio/vercel-ignore-check.mjs:42`. A bundler that forgets it fails loudly: the virtual import
does not resolve. `prism3-host.d.ts` declares the module for `typecheck`.

**The variable map grows with the shell.** The unused-variable check is on from the first PR, so
S1.1 maps only what it uses (page ground, text, the two fonts). Each later PR adds rows as it adds
rules.

### 3.2 Fonts: embedded, no network

Both faces are embedded as `data:` URIs under chrome-only names (`P3 Chrome UI`, `P3 Chrome Mono`),
the way `build-v6.mjs:218` aliases them. That keeps the studio's font probe honest: a brand that
names Inter is still checked against the device, not satisfied by the chrome's copy (v5 finding, v4
Q9).

| | Raw | As base64 in the bundle | Gzipped |
|---|---|---|---|
| Inter, latin, variable | 48,256 B | 64,344 B | 48,665 B |
| JetBrains Mono, latin, variable | 40,404 B | 53,872 B | 40,763 B |
| **Both** | 88,660 B | **118,216 B** | **89,428 B** |

The studio bundle grows from 1,003,873 to about 1,122,089 bytes (+11.8%), and the plugin UI from
1,256,132 to about 1,374,348 bytes (+9.4%). The generated variable blocks add about 7.5 KB more
(measured from the v6 build output). woff2 is already compressed, so gzip saves almost nothing on
the fonts.

### 3.3 Theme: a studio toggle, Figma's theme in the plugin

- **Studio.** `<html data-theme="system|light|dark">`, default `system` (F3). The toggle sits in the
  top bar. The choice is kept per viewer in `localStorage`, read and written inside `try`/`catch`,
  through `persist-local.ts`, never inside the brand input (it would read as a brand edit, the
  reason export settings stay out of it, `main.ts:8543-8547`).
- **Plugin.** `figma.showUI` already passes `themeColors: true` (`apps/plugin/src/main.ts:83`), so
  Figma puts `figma-light` or `figma-dark` on `<html>` and changes it live. `apps/plugin/src/ui/entry.ts`
  maps that class to `data-theme` with a `MutationObserver`. `index.html`'s `color-scheme: light`
  (`apps/plugin/src/ui/index.html:21`) goes, because the generated blocks set `color-scheme` per
  theme. #1031 is why that line exists: in dark, the UA supplied light field text on a light field.
- **The legacy frame stays light.** `styles.css` is light only. The legacy frame carries
  `data-theme="light"` and `color-scheme: light`, so its fields keep dark UA ink (#1031) while the
  chrome around it is dark. `test:chrome` renders one legacy page in dark and measures its field
  values, which is #1031's exact defect.

### 3.4 Layering

| Surface | Light | Dark | Source |
|---|---|---|---|
| Preview | `background.primary` | `background.primary` (neutral 950) | IA-2 |
| Levers panel | `core.palette.neutral.025` | `background.secondary` (neutral 900) | IA-2 |
| Top bar | `background.secondary` (neutral 050) | `background.tertiary` (neutral 850) | IA-2, v6 Q6 |

Cards and fields on the gray panel are white. Edges take the B1 token per ground (`edge`,
`edge-bar`, `field-edge`), all at 3:1 or better. The dark bar carries no secondary text (v6 Q6).
Radius is `radius.lg` (6px) until #1852 lands (T3).

### 3.5 The top bar

Left to right: brand switcher (moved from `renderBar`, `main.ts:9302`), the verdict, then
Activity, Export, the Figma menu (plugin), the theme toggle (studio), and the Agent chip (plugin).

- **Verdict.** Every role with a floor, in every mode: 884 for prism3, 221 per mode (v4 Q2). It is
  computed by a DOM-free `state/verdict.ts` from `resolveAllModes`, the way the mockup counts it
  (`concept-v6.src.html:1321-1330`). Clicking it opens Inspect › Contrast (Q8). Node test oracle:
  the literal 884 for prism3, from the decision. An engine change that adds gated roles fails it by
  name, which is the point.
- **Export** keeps its accessible name "Export" (#1830, asserted since P1).
- **The Agent chip** (IA-3). The bar renders an empty, stable slot, `data-p3="bar-agent"`, which it
  never clears on re-render. The plugin's `mountAgentLink` (`apps/plugin/src/agent-link-ui.ts:43`)
  mounts into it instead of `position: fixed` at the bottom left (`:56`), and its popover holds the
  switch, one line on what it does, and the transport and last command. Its inline styles
  (`agent-link-ui.ts:56`) become `chrome.css` rules, or the runtime inline-value check fails them.
  The web bundle never renders the slot's contents, as today.

### 3.6 Tabs and the Color sub-navigation

The tab row is Brand · Color · Type · Shape · Depth & motion · Layout · Components (IA-1), a
`tablist` with `aria-selected` on the current tab. Color adds a second row, a segmented `tablist`
of Palettes · Surfaces & fills · Interactive. This folds in #1821: the current tab and sub-page are
exposed to assistive technology, and so is the mode control in S1.3. At 380 the tabs become a
select (Q7).

### 3.7 One home per page, from data (S1.3)

`apps/studio/src/shell/pages.ts` holds v6's `HOMES` block (`concept-v6.src.html`, the `p3-homes`
script) as a typed, DOM-free constant: `views`, `inspect`, and `domains` with their sub-pages,
sections, rows and lever keys. Each page also carries `legacy: PageKey[]` until its slice moves it.

- **The IA is locked as data in S1, before any domain moves.** `test-pages.ts` ports
  `build-v6.mjs`'s checks 1–3 to Node: every manifest lever placed once, the advanced tier from the
  manifest except on the literal `FIRST_CLASS` pages (v6 Q2), one home per page and none per section,
  no home that is an Inspect view, no view that is no page's home, and every emitted color role in
  exactly one Roles family set.
- **The duplicate-key parser is not needed.** `build-v6.mjs` carries a second JSON parser because
  `JSON.parse` keeps the last of two keys. In a TypeScript object literal a duplicate key is a
  compile error (TS1117), so `typecheck` is the independent check.
- **`PageKey` comes from the data** (closes #1846's second item for good): the type is derived from
  `pages.ts`, and `NAV` is deleted in S13.
- **The preview changes only on a tab or sub-page change** (V1). Scroll, focus and lever changes
  never move it, and there is no "Keep this view" (V12). A link to another view opens that tab.
- **The mode control** (Q1, model B) sits in the preview header, with derived modes hatched and
  `aria-checked` on the selected mode. It writes `setCurrentMode` (`state/store.ts:223`), the same
  setter the legacy mode strip uses, so a legacy page and a new page never disagree on the mode.

### 3.8 Inspect

Inspect opens over the current page's preview and closes back to it (F1). Its views, in S1.3:

- **Contrast**, reusing `renderPreviewContracts` (`main.ts:1295`);
- **Tokens**, reusing `renderPreviewTokens` (`main.ts:1423`);
- **Decisions log**, held until the notes generator speaks in the voice standard (section 7, ask 4;
  section 8, D4).

### 3.9 The Activity drawer (S1.4)

The drawer is a frame at the bottom of the preview pane with the F2 behavior: the Activity button's
status dot, opening when an operation starts, collapsing 4 s after a success (`COLLAPSE_MS`, v5
Q9), and staying open on a failure or a warning. At 380 it becomes the strip and the full-pane sheet.

In S1.4 the drawer holds what exists today: the status pills and the apply detail, moved from the bar
with their hooks (`status-pill`, `apply-detail`), so `test:verdict`'s 147 assertions and its nine
literal verdict strings pass unchanged. The Figma menu lists the existing actions and calls the same
functions. The per-operation activity model is S11.

### 3.10 The repaint guard

New shell code subscribes to store topics and never calls the legacy tiers. A Node check,
`test-shell-imports.ts`, reads every file under `apps/studio/src/shell/`, `domains/` and `preview/`
and fails on a reference to `apply`, `applyFull`, `build`, `renderBar` or `setVolatile`, naming the
file and line. The subject is the new source; the oracle is a literal list of the five legacy names.

---

## 4. Coexistence: what the user sees in between

Every PR ships a working product. From S1.2 to S13 the user sees the new shell around a mix of new
and legacy pages.

- **The new frame is always there:** the top bar, the tab row, and Color's sub-row.
- **A moved page** fills the two panes: the gray levers panel on one side, the white preview on the
  other, with the mode control in the preview header.
- **A page not yet moved** shows its legacy page in one full-width **legacy frame** below the tab
  row, light, exactly as it renders today, with its own mode strip. The two-pane split and the
  narrow Settings/Preview toggle are hidden for it.
- **The mapping** from tab to legacy page is data in `pages.ts`:

  | Tab or sub-page | Legacy page until its slice | Retired by |
  |---|---|---|
  | Brand | `preview` (the Style guide view) | S3 |
  | Color › Palettes | `palettes` | S2 |
  | Color › Surfaces & fills | `surfaces` | S4 |
  | Color › Interactive | `interactive` | S5 |
  | Type | `typography` | S6 |
  | Shape | `sizeRadius` | S7 |
  | Depth & motion | `elevation`, then `motion`, behind a two-item switch inside the frame | S9 |
  | Layout | `layout` | S10 |
  | Components | `sizeRadius` (Buttons) on the web; `components` in the plugin | S8 |
  | Figma menu › Style guide | `styleGuide` (plugin) | S11 |

  Depth & motion uses a switch rather than stacking both legacy pages, because each legacy page owns
  the single `paintVolatile` slot (`main.ts:204`); two on screen would orphan one painter.
- **The old rail stays reachable as a Pages menu** in the top bar's overflow. It is the existing
  narrow-width menu (`renderNavMenu`, `main.ts:9473`), fed by `railNav` (`main.ts:130`). Its items
  keep the `rail-page-<key>` and `rail-item-label` hooks and the `.active` state, so `test:smoke`'s
  page sweep (`test-smoke.mjs:555-678`) keeps working unchanged through the transition. Each domain
  slice removes its entries; S13 removes the menu.
- **Regions.** New regions are keyed by their `data-p3` hook. The legacy reconcile keeps its title
  key until S13 deletes it; no legacy title is renamed during the redesign, so #1820's hazard does
  not arise there. #1820 is closed by S1.2 for everything new.
- **Chrome gates skip the legacy frame by a literal list**, never by a marker the page sets.
  `test:chrome` holds `LEGACY_PAGES`, the pages not yet moved, and fails if a listed page renders the
  new layout (`page color/palettes is listed as legacy but renders the new layout`). The list can only
  shrink, and each domain slice shrinks it. `test:smoke` keeps measuring the legacy pages as today.

---

## 5. The repaint model: store subscribers

**End state: store subscribers.** Repaint tags survive only as a pure function from a host message
to the topics it invalidates. P2 lands it for host messages and the legacy chrome; S1 lands it for
the new shell; each domain slice deletes its legacy call sites; S13 deletes the tiers.

Why, from the code:

1. **Half of it is built and unused.** Every store setter already fires its topic
   (`state/store.ts:150`, `:210-224`), and `subscribe` returns its own unsubscribe (`:99-104`). Nothing
   subscribes: 0 occurrences of `subscribe(` in `main.ts`.
2. **Tags need a switch that imports every painter.** Today that switch is `main.ts:619-680`. Once
   the domains move into their own modules (phase1 §2.2), the switch would import all of them, which
   is the coupling the split exists to remove.
3. **The orphaned-painter class goes away.** `setVolatile` (`main.ts:204`) exists because a painter
   closure can outlive its nodes. A region that subscribes on mount and unsubscribes on unmount owns
   its lifecycle.
4. **Callers stop picking a tier.** Today 146 call sites choose among four repaints (`apply` 40,
   `applyFull` 53, `build` 14, `renderBar` 39). With subscribers, a writer calls a setter and the
   readers repaint.
5. **What tags do well is kept.** `repaintsFor` (`state/host-session.ts:220`) is pure and tested in
   Node. `topicsFor` keeps that. What #1845 showed is that the tag list was tested and the mapping from
   tag to repaint was not. With subscribers the mapping is a subscription, and P2's verdict arms test
   it by reading each row back.

**The cost.** Order. `syncLast` exists because the mode strip re-measures `--chrome-h` after the rest
of the pass (`CHROME_SURFACES`, `main.ts:8000-8070`). The new shell lays out with CSS grid and
measures nothing, and the legacy strip keeps its declared order until S13 deletes it.

---

## 6. Gates

### 6.1 Which mockup checks become product gates

| Check | Product home | How it stays independent (docs/34) |
|---|---|---|
| Text contrast, rendered, 4.5:1 | new `test:chrome` (light and dark chrome, 1280 and 380); `test:smoke` keeps its probe over every page, mode and brand | Measures Chromium's computed, composited colors, never the declared pairs. The floor is a literal. |
| Declared pairs and layers | `lint:contrast`, extended to import `chrome/spec.mjs` and resolve it per theme | The declaration's own check. The rendered check above is its independent partner, as `lint-contrast.mjs:16-29` already argues. |
| Edges at 3:1 or better (B1) | `test:chrome`, rendered: each control's drawn edge against what is outside it | The ground is read from the render, not from `PAIRS`. Mutation: give a top-bar control the page edge in CSS → `edge button … "Export" 2.70 < 3`. |
| Fonts drawn | `test:chrome`, CDP `CSS.getPlatformFontsForNode` | Not `document.fonts.check()`, which answers true for an absent face (v5 finding). Oracle: the literal family names. |
| No shadows | build raw scan (CSS text) and `test:chrome` computed styles | The scan reads the source; the render reads every element and pseudo-element, so an inline or runtime shadow is caught too. |
| Controls represented, not counted | `test-pages.ts` (data) and `test:chrome` (rendered coverage) | Oracle: `lever-manifest.json`. Each manifest key must render its `lever-*` hook (`leverHook`, `levers/controls.ts`) once. Every control must be classified: an unknown control fails. Floors are literals: 24 × 24 targets, focus rings 3:1 and 2px. |
| One home per page | `test-pages.ts` (data) and `test:chrome` (rendered) | The rendered side reads a literal `EXPECT_HOME`, so a swap that keeps the data valid still fails (S8's mutation). |
| No following on scroll or focus | `test:chrome` behavior | Scrolls and focuses every section and compares the preview's view id before and after. Mutation: scroll-following back → `V1 scroll: … changed the preview`. |
| Specimens on the brand's page color | `test:chrome`, from S2 | Oracle: the engine's `background.primary` for the previewed mode, resolved in Node. |
| No runtime inline values in the chrome | `test:chrome`, from S1.2 | Every element outside `[data-content]` with a `style` attribute fails unless it sets only a custom property. |

### 6.2 The new CI step and the four places it must appear

`test:chrome` (`apps/studio/test-chrome.mjs`) is a new suite rather than more of `test:smoke`. It
renders theme × width × state (52 renders in the mockup, 2 min 17 s), while smoke sweeps page × mode ×
brand (3 min 12 s); one file doing both would run over 5 minutes and fail as one unit.
It drives the built studio bundle and the built `dist/ui.html` for plugin states, so it runs after
both builds.

It lands in S1.2, and that PR updates, in one change:

1. `.github/workflows/ci.yml`: a step after both builds;
2. `verify.ts`: an entry ordered after both builds;
3. `CLAUDE.md` principle 4, the Web bullet;
4. `CONTRIBUTING.md` §3;
5. `.github/pull_request_template.md`.

`lint-doc-gates.ts` fails if 3–5 disagree with `ci.yml`. The PR's own mutation for this: add the
`ci.yml` step without the `CLAUDE.md` line → `lint-doc-gates` fails naming `test:chrome`.

`test-pages.ts`, `test-shell-imports.ts` and `test-verdict-count.ts` join the studio `test` script,
which CI already runs, so they need no new step. The build-time checks run in the existing build
steps.

---

## 7. Engine asks, through the owner to the support lane

| # | Ask | Bump | UI slice that needs it | Without it |
|---|---|---|---|---|
| 1 | **#1852**: radius rungs above 6px | ENGINE minor, CONTRACT MINOR (new paths) | None blocks. S7's preview shows them when they exist. | The chrome uses `radius.lg`. Adopting a new rung is one row in `chrome/spec.mjs`. |
| 2 | **A neutral 025 panel role** (for example `background.panel`) | ENGINE minor, CONTRACT MINOR | None. S1.1 reads `core.palette.neutral.025` directly. | Works. The brand-leak check passes, because neutral is not a brand palette. The role name is brand-facing, so the owner names it. |
| 3 | **Manifest `advanced` flags against the per-page rule** | None if the UI keeps the literal `FIRST_CLASS` (v6 Q2). Flipping the four flags is ENGINE minor, CONTRACT none. | S4, S5, S10 | Works as decided. Flipping the flags would also change what agents treat as advanced, since the MCP surface reads the manifest. Recommend no ask. |
| 4 | **The notes generator in the voice standard** (v4 Q6). #1824 closed through #1858 and took the client citations out, but the notes are still engine-voiced: "CONFIRM" at `packages/engine/theme.ts:2603`, `:2992`, `:2999`; issue numbers at `:2708`, `:2784`; 73 `notes.push(` sites. The notes reach emitted artifacts under `packages/engine/out/`. | ENGINE minor (emitted text changes), CONTRACT none | S1.3, the Decisions log in Inspect | Inspect ships with Contrast and Tokens only. |
| 5 | **Lever labels.** v6 reads every label from the manifest unchanged (`concept-v6.src.html:1522`), so v6 itself asks for none. The italics 3-chip (Q6) can map onto the two existing fields in the UI. | None needed. Any label or option copy change lives in `packages/engine/levers.ts`: ENGINE minor, CONTRACT none. | S6 | Works. If the owner wants one manifest lever for italics, that is ENGINE minor. |

---

## 8. Design questions for the owner

Each blocks the slice named. Each has a recommendation; none is decided here.

| # | Question | Before | Recommendation |
|---|---|---|---|
| D1 | **The interim look.** Unmoved pages render in one full-width legacy frame under the new tab row, light, with their own mode strip; the old rail survives as a Pages menu in the top bar's overflow. | S1.2 | Accept. The alternative, keeping the old rail beside the new tabs, shows two navigations at once. |
| D2 | **Dark mode during the transition.** In dark, the chrome is dark and the legacy frame stays light. | S1.1 | Ship the toggle in S1, with the legacy frame pinned light. The alternative holds dark until the three Color pages move (S5), so the opening page and its neighbors are dark first. |
| D3 | **Order: Palettes before Brand.** Brand is the first tab, but Palettes is the opening page. | S2 | Palettes first, so the first page a user sees is the first rebuilt. |
| D4 | **The Decisions log** waits on the engine notes (ask 4). | S1.3 | Hold the log until the notes follow the voice standard, rather than ship engine-voiced text in the product. |
| D5 | **Label for the legacy navigation.** | S1.2 | "Pages", the name the narrow-width menu already uses. |
| D6 | **The old agent chip.** The earlier decision put it bottom-left as a dark box (`agent-link-ui.ts:5`). IA-3 moves it to the top bar. | S1.4 | Remove the bottom-left chip, rather than keep both. |
| D7 | **Neutral 025 as an engine role.** v6 Q7 noted it and did not file it. | none | File it after S1.1 lands, so the issue can cite the product's one direct ramp-step read. |
| D8 | **Depth & motion's legacy switch.** Two legacy pages under one tab need a local switch until S9. | S1.2 | Accept, labeled with the two legacy page names. |
| D9 | **#506 case (c), foreign content in a file.** It is a write-path safety floor, not a start screen. | S12 | Route it to the plugin lane as its own issue; S12 covers the empty-file start only. |

---

## 9. Risks and known gaps

### 9.1 The gaps `concept-v6.md` names

| Gap | Closed by | How |
|---|---|---|
| **Brand specimens drawn on the chrome's surfaces.** The v6 audit skips `[data-content]`, so it could not see light outlines vanish on dark chrome. | **S2** | `test:chrome` checks each specimen root's composited ground against the brand's `background.primary` for the previewed mode, resolved in Node from the engine. Mutation in S2. |
| **Runtime inline values.** The raw-value scan reads source text, and `${…}` values escape it. | **S1.2** | The rendered check in §6.1. It fails `agent-link-ui.ts:56` today, which S1.4 fixes. |
| **200% zoom.** | **S1.2, in part** | `test:chrome` adds a 640px-wide render (1280 at 200%) with no horizontal page scroll, alongside the 380 frames. Text-only zoom stays ungated. |
| **RTL.** | **No slice** | The product ships no RTL locale. New CSS uses logical properties, which costs nothing. The gap is recorded in `test:chrome`'s header. |

Two more v5 findings carry over and are checked in `test:chrome`: chrome class names must not
appear inside specimen markup, and font checks use CDP, not `document.fonts.check()`.

### 9.2 Other risks

- **The v6 audit is red today** (2 failures, section 1). S1.1 depends on v6 merging green.
- **`main.ts` takes about a commit a day from other lanes** (phase1 §2.3). New code goes in new files;
  each domain slice deletes a region rather than editing it, which conflicts less.
- **Two stylesheets until S13.** The class-scope law covers both; new classes take a shell prefix.
- **Bundle size.** +118,216 bytes of fonts in each bundle (section 3.2).
- **CI time.** `test:chrome` adds about 2–3 minutes, measured on the mockup's audit.
- **The verdict costs a full `resolveAllModes` per edit.** The mockup does this on every edit. S1.3
  measures edit-to-paint time on the studio before and after, and reports it in the PR.
- **Hook churn.** The Pages menu keeps the `rail-page-*` hooks, so the suites' page sweep does not move
  until S13, when it moves onto the tab hooks in the same PR that deletes the menu.
- **Plugin dark mode brings back #1031's mechanism.** The legacy frame pins light, and `test:chrome`
  measures a legacy field in dark to prove it.

---

## Owner decisions on §8 (2026-09-30)

| # | Decision |
|---|---|
| D1 | **Accepted.** In the interim, the legacy frame sits under the new tab row, and a Pages menu sits in the overflow. |
| D2 | **Ship the dark toggle in S1,** with the legacy frame pinned light until each page moves. |
| D3 | **Accepted.** Palettes (S2) comes before Brand (S3). |
| D4 | **Hold the Decisions log** until the engine notes follow the voice standard. Inspect ships with Contrast and Tokens. |
| D5 | **Accepted.** The legacy navigation is labeled "Pages". |
| D6 | **Accepted.** Remove the bottom-left agent chip. The top-bar chip replaces it (S1.4). |
| D7 | **Accepted.** File the neutral 025 role after S1.1 lands. |
| D8 | **Accepted.** Depth & motion gets a local switch, labeled with the two legacy page names, until S9. |
| D9 | **Accepted.** #506 case (c) goes to the plugin lane as its own issue. S12 covers only the empty-file start. |
