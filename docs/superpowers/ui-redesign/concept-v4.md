# Prism3 — Concept v4: Workbench, revised

Prototype: `concept-v4.html` (self-contained, offline, 853 KB). It is generated from the hand-written `concept-v4.src.html` plus the real engine, by `build-v4.mjs`. It is a design direction for owner review, not product code.

Harness bar (outside the product): **Host** Studio / Plugin · **Frame** Fill / 1280×900 / 380×420 · **State** First run, Apply running, Build with errors, Agent working, Refused edit, Reset · **Plugin file** Empty / Empty with a saved brand / Has a theme (drives the plugin start and Read-back outcomes). The divider drags between 28% and 62% and takes arrow keys, Home and End; the split is remembered in browser storage.

## Build

```
node docs/superpowers/ui-redesign/build-v4.mjs
```

The script runs `npx -y esbuild@0.24.0` from the npm cache (nothing is installed into `node_modules`), resolves `@prism3/engine/*` to `packages/engine` by alias, and bundles `concept-v4.entry.ts`, which puts the engine on `window.P3`. It reads `ENGINE_VERSION` and `CONTRACT_VERSION` from `version.ts` at build time and fails if the output contains a `<link>`, a remote `src`, a remote `url()`, `@import` or `@font-face`.

### Coverage self-check (oracle: the manifest)

The levers panel renders from one `HOMES` block in the source. The build checks that block against `packages/engine/schema/lever-manifest.json`, not against itself, and exits 1 on a miss, a duplicate, an unknown key, or a lever whose advanced tier disagrees with the manifest flag (Layout excepted, per Q4). Output at this commit:

```
Coverage self-check (oracle: packages/engine/schema/lever-manifest.json)
  manifest levers: 49 (26 flagged advanced)
  Brand             4 levers  (1 behind "Show advanced")
  Color            17 levers  (8 behind "Show advanced")
  Type             12 levers  (10 behind "Show advanced")
  Shape             5 levers  (2 behind "Show advanced")
  Depth & motion    3 levers  (1 behind "Show advanced")
  Layout            4 levers  (0 behind "Show advanced")
  Components        4 levers  (0 behind "Show advanced")
  total placed: 49  missing: 0  duplicated: 0  unknown: 0  tier mismatches: 0
  schema-only inputs also placed (not manifest levers): id, personality, modes, customModes, root,
  overrides, modeAnchors, typography.typefaceLibrary, motionPersonality.easingRoles, layout.columnOverrides
```

Mutation-tested: emptying `disabledMin`'s home fails with "manifest keys with no home: disabledMin"; adding `density` to Components fails with "more than one home: density → Shape › Density + Components › Density"; moving Surfaces out of the advanced tier fails with the tier message; adding a Google Fonts `<link>` fails the offline check. A second, independent recount runs over the rendered DOM in Chromium (every domain, advanced open): 0 missing, 0 duplicated.

## Direction

Concept C's frame holds: levers on the left grouped by domain (Brand · Color · Type · Shape · Depth & motion · Layout · Components), one large preview on the right, Foundations → Decisions → Results inside each domain. v4 changes what the audit found broken and applies the 14 decisions. The biggest shift is modes: the preview owns which mode you look at, and the levers always edit the base value, with per-mode values in a disclosure under the lever they override.

## How each decision shows up

| # | Decision | In the mockup |
|---|---|---|
| 1 | Mode model B | Mode control in the preview header: segmented, fixed order, derived modes hatched, a contrast dot with the fail count on each segment; a select under 760px of preview width. It edits nothing. **Compare** splits the view into two modes (disabled at narrow sizes, and on views that already show every mode, with the reason as visible text). **Per mode** disclosures on radiusScale, density, tempo, families, weightRoles, softness, tint and surfaces (light and dark rows only, with "Surfaces are set for light and dark only."). Collapsed: "Per mode · follows base" or "Per mode · 1 override". Customizable rows default to "Auto: follows light (‹value›)" with "Reset to light"; derived rows read "Follows dark. No settings of its own." plus that mode's verdict. Density's disclosure carries the decided sentence verbatim. **Color › Roles** is a role × mode matrix: families collapse, derived columns are hatched and disabled, the previewed mode's column is outlined, and each cell shows step, ratio and state (Auto / Override / Derived / Anchored). A customizable cell opens a step picker that shows every step's ratio and a below-floor mark before you choose. Under 700px of panel width it becomes a one-mode list with a mode select. Per-column anchors (`modeAnchors`) use the same Per mode pattern. |
| 2 | Activity drawer | Bottom of the preview pane: hidden until the first operation, a 32px bar when collapsed, opens on any operation. One row per operation with verdict and time, expanding to detail; a failure opens itself. Progress shows the phase, "x of N" and a bar; Build shows dependencies as their own lines, then *Building members*, *Wiring references*, *Retrying property links*. Final counts (built, skipped as already present, stale, missing) each open their list. Errors group by cause with the fix for all ten causes. Earlier results stay under "Earlier results". Agent work carries an **Agent** tag, queues behind a panel write as "Queued", and an agent prune preview is a passive notice. The Agent link switch lives in the drawer header. |
| 3 | Preview follows on change or commit | Commit of any lever switches to its view after a 250ms debounce and outlines what it drives; focus never switches views; **Keep this view** holds the view; "Showing Elevation" goes to a polite live region. Sliders preview while dragging (re-resolving at most every 120ms) and commit on release. |
| 4 | Advanced tier from the manifest flag | "Show N advanced" at the end of each domain, counting rows; Layout shows all four levers. The build check enforces it. |
| 5 | `typography.responsive` in Type › Scale | Toggle, min and max viewport fields, and a "Depends on Layout: breakpoints" link (it sits under Type's advanced disclosure, because the manifest flags it advanced). |
| 6 | Italics merged | One row per category: *Upright* / *Upright + italic* / *Italic only*, writing both `italics` and `italicDefault`. |
| 7 | Narrow mode | One 36px row: brand select (truncating), verdict dot, Settings | Preview, ⋯ (Export, Apply Theme, the Figma actions, Health). Domain tabs become a select; nothing is sticky; a 24px activity strip shows while an operation runs and opens the drawer as a full-pane sheet; dialogs fill the pane with a sticky action row. |
| 8 | Contrast and Decisions log are views | Both are in the view select. The top-bar verdict opens Health, which links to the Contrast view. |
| 9 | `root` in Brand › Advanced | Editing shows "Renames every token path: `pds3.color…` becomes `‹new›.color…`. Consumers referencing the old names stop resolving." A "Rename namespace" confirm names the outcome ("Rename every token path"). |
| 10 | #1802 shown | Type view banner in the scale's context and a Health warning, both from `resolvePreview().unresolvedType`. Set Display size ceiling to md to see it. |
| 11 | Style guide options, no Pixels | In the drawer, marked **Pending #1784/#1788**: tables filter (collections, types), value format, header dark/light, alias chips, descriptions, color / dimension / font specimens, paragraph spacing and decoration columns, Name column, "REM is always added beside px". |
| 12 | Architecture | Not a UI decision. The mockup itself is vanilla JS over the engine with one state object and region renderers, which is the shape the audit proposes. |
| 13 | Labels | "verdict" (in accessible names), "Decisions log", "Build set", "Read-back", "Keep the Figma window in front". |
| 14 | Start screens | Studio first run: From a color, An example (prism3 marked default, aurora, harbor), Blank, Import a brand brief (paste or file; errors name the line and the fix, and the import is validated through the engine before it replaces anything). Plugin: the same, plus "From this Figma file" when the file has a saved brand; a themed file opens with Read-back in the drawer. The replace guard appears only with unsaved edits and names the loss ("Discard 3 edits"). |

Other spec items: the lever controls follow audit §1.3 (chip groups are native radio groups in a `fieldset`, selected = soft fill + ink border + ✓, focus = a separate 2px blue ring); every description is behind an "i" toggletip button named "About ‹label›"; the five inline state lines stay visible; destructive edits preview their loss and name the outcome (gradients off, a mode off, a brand color removed); a refused edit shows a banner naming the engine's rule, marks the field, and keeps the preview on the last valid theme.

## Live vs precomputed

**Live (the real engine, re-run on every edit in the page):** every palette, ramp, hex and anchor; all 268 roles per mode and their ratios; the verdict counts; per-mode lever and role overrides; type composites, `clamp()` values, ladders, weights and mobile merges; size heights (28/36/44/56/68, moving with density), spacing, radius, borders, icons; shadows per mode; motion; layout; the token table (`buildTree`, with per-mode values); the Decisions log (`theme.notes`); #1802; component defs with variant counts (`figmaVariantCount`), nesting, and per-size spacing (`densitySpacingStep`); button minimum widths (`buttonMinWidth`); the Export brief (`toDesignMd`) and Import (`parseDesignMd`); the Set up file page list (the plugin's `TAXONOMY`); versions from `version.ts`.

**Verdict definition used:** a pair is a role with a contrast floor measured against its ground, per mode. prism3 in its four modes gives 221 × 4 = **884**. The engine clamps derived roles to their floors, so the verdict turns red only through overrides, which is exactly what the Roles matrix lets you do.

**Simulated:** every Figma operation (timers), including the 10-cause build error report, the prune item names, the plugin build stamp, the "In this Figma" font list, the saved brand in the file, Read-back outcomes, the Agent link and its transport, and Export (no file is written). Apply's counts come from the emitted tree (variables, text styles, effect styles), not from the plugin's write plan.

## Stubbed

Gradient stop editing (the list shows the real gradients); per-breakpoint gutter and margin overrides; the typography ladder, nudge and pinned-cut editors; typeScale's disable-on-clash (no pinned-sizes editor exists here); per-mode leading, tracking and easing re-points; operation history across sessions (kept in memory only); the plugin wire.

## Accessibility, measured

Measured in Chromium over 29 states (every domain with advanced open, every view, Health, the Figma menu, build errors, the build picker, style guide options, both dialogs, narrow settings, narrow preview, the activity strip), excluding brand specimens:

| Check | Result |
|---|---|
| Lowest chrome text contrast | **6.14:1** (`--c-ink-3` #5f5f5b on the matrix family header, #fafaf9). Placeholders included. |
| Lowest control-boundary contrast | **3.35:1** (the verdict pill's green border on white). The shared control edge `--c-ctl` #84847f is 3.76:1 on white and 3.48:1 on the app background. Concept C's was 1.75:1. |
| Smallest hit target | **24×24** (the "i" buttons). None under 24; the divider is 24px wide; table checkboxes sit in 28px labels. |
| Levers visible at 380×420 in Brand | **3 fully visible** (Brand name, Primary brand color, Neutral hue) under a 36px top row; the activity strip is 24px. Target met. |
| Focus vs selected | Focus is a 2px #1d5bd6 ring (5.97:1 on white); selected is fill + ink border + ✓. |

Keyboard: arrows within chip groups (native radios), arrows/Home/End on the domain tabs and the Export tabs (real `tablist`), arrows/Home/End on the divider, Esc closes toggletips, menus and the step picker. Dialogs use `showModal()` and return focus to their trigger by id after the page re-renders. No information lives only in a `title`. Under reduced motion the curves are static and Play says "Reduced motion is on: playing once on request."

## Screenshots

Taken at 1280×900 and 380×420 in `…/scratchpad/v4-shots/` (not committed): first run (studio, plugin with a saved brand), Color › Roles matrix with an override below floor, Per mode open on Shape, Activity with a Build with errors (summary and grouped errors), Health, Contrast filtered to failures, Compare light/dark, Agent working with a queued command, Refused edit, Build set picker, Style guide options, and five narrow states.

## Open design questions (for the owner; not decided here)

1. **The matrix is a list at the default split.** The spec's 700px threshold means the 2/5 default (about 510px at 1280) always shows the one-mode list; the matrix appears from about 55%. Options: widen the panel while on Roles, lower the threshold, or open the editable matrix in the preview pane.
2. **What the verdict counts.** v4 counts gated role checks (884 for prism3). The spec's "384" matched neither that nor the preview's 34 contracts × modes. Which set is the verdict's denominator?
3. **hc-dark without dark.** The engine accepts hc-dark with dark off. The row still says "Follows dark". Should turning dark off also turn hc-dark off, or say what it follows?
4. **Light column in the Roles matrix is editable.** The engine accepts light overrides; a light override is a base-role edit. Confirm light cells should open the picker.
5. **Type's everyday page is thin under Q4.** Only typeScale and families are everyday; eight rows sit behind "Show 8 advanced", and Color › Surfaces is entirely advanced. Keep, or revisit those manifest flags?
6. **Engine notes in the Decisions log are engine-voiced** (capitals such as "CONFIRM", issue numbers). Should the log rewrite them to the voice standard, or should the notes generator change?
7. **Status rows offer "Use ‹palette›"**, which writes `roleColors`, not a manifest lever. Keep that option in the status row?
8. **Compare repeats the surface switch and font markers per column.** Should Compare share one surface switch?
9. **Studio font warnings.** Health warns about faces not installed on the device in the studio; only the plugin's "In this Figma" decides whether a style applies. Should the studio warn at all?
10. **Style guide values** (value format Hex / RGB, specimen choices) are placeholders until #1784/#1788 settle.

## Findings outside this mockup (not fixed here)

- `packages/engine/vocabulary.ts` trait citations name a client brief, and `resolveVocabulary` copies each citation into `theme.notes` when a personality word is on, so it would reach any surface that shows the notes. The mockup replaces the citation text at load (`concept-v4.entry.ts`); the bundled engine source still contains it. Worth its own issue.
