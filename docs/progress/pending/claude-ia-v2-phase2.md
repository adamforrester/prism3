## (2026-10-25) — IA v2 phase 2: tiers, one home per lever, the web rail, and what is due (#2909, #2998)

**Status:** plugin panel and shared studio shell. ENGINE patch (change note). CONTRACT unchanged. The executor is
unchanged, so `EXECUTOR_REVISION` stays (`lint-executor-revision.ts`: "unchanged since the merge base").

### What changed

- **Tiers (Q2909.17 A).** Components lists its sections under the four tiers, Components / Subcomponents / Content
  components / Blocks (`TIERS`, `tiersOf` in `state/component-groups.ts`). A set's tier is its page's section in the
  plugin's `file-taxonomy.ts`, the data the catalog already carries: the Components pages are the Components tier, and
  everything else a build places is Subcomponents, Icon included (call 11 A). No definition names Content components or
  Blocks, so both are named in one line ("no component sets yet") and no tier is guessed. A tier is a group named by a
  caption, not a heading: the list's three heading levels (TY2 A) are already its sections, their settings and those
  settings' levers. That placement is held for the owner (Q2909.26 on the PR).
- **The Decisions log is cut (Q2909.7 A).** Inspect holds Contrast and Tokens. The two notes no lever said move onto
  their levers in the engine's own words (`state/engine-warnings.ts`): an anchor outside sRGB under Primary, the brand
  color it names, or the pinned neutral; the danger hue the engine chose under Status colors' Danger. Every note still
  ships in `$extensions.prism3.decisions`.
- **The web gets the rail (Q2909.9 A):** Theme, Components and Export, then Help and Appearance; no Documentation,
  Agent, Update file or Minimize. Its bar is the brand switcher alone; Contrast is in the Theme preview header and Export
  is an area, as in the plugin. The studio's drawer is no longer drawn (no Activity tile, and the web runs no write).
- **One home per lever (Q2909.3 A, .4 A, v2's table).** Control shape writes no token, so its one home is Components' new
  "Shared by every component" block (`domains/shared-options.ts`), with Density's read-only line. Elsewhere a lever is a
  read-only line whose link opens its home and switches the rail's area (`ui/home-line.ts`): Control shape under Shape ›
  Radius and in Field options, Density in the shared block and Button options, the weights under Control label weight,
  Outline hover after Text button hover.
- **What is due (Q2909.8 A).** The plugin keeps an as-built ledger in the file's root plugin data
  (`apps/plugin/src/as-built-ledger.ts`, `prism3:asBuilt`): one entry per set, the hash of its def after the brand's
  levers (`materializeForBrand`, before projection), with `EXECUTOR_REVISION` and `ENGINE_VERSION`. Build records each
  set it lands whole (no stale member); the in-place update records each set it acts on. `file-sets` answers each present
  set's state from one root read (current, due for its definition or for the engine, or not recorded), at load and as the
  checklist opens. After load a background pass reads hand edits a set at a time (`handEditsOf`, `update-plan.ts`), and
  stops when a write starts. Update file's button carries a badge of the due sets; its checklist lists them first,
  ticked, asks the full check (`update-check-request`) for them alone, waits on it, shows what changes, and offers one
  hand-edit choice, Keep by default. The run updates them in place (`update-sets`, the confirmed `update-components`)
  before it adds new sets; an update of fewer sets than were checked checks them again and refuses if any set's hash
  moved. A set built before the ledger reads "Not checked yet", with a way to check it. Components' rows show each set's
  status: Due, Hand-edited (first class), Not checked yet, Checking, Not in file, Up to date.
- **Dead paths (#2998).** `figmaMenu` (`shell/figma.ts`), the bar's `applyTheme` slot and its prune dialog are gone; Clean
  up's prune is held by `test:chrome`'s Clean up arms (`clean-prune-summary`, `clean-prune-confirm`).
- **A fix found on the way.** On the rail, Continue to Components by keyboard left focus on BODY, as Components has no tab
  row. Focus now lands on the area's rail tile (`frame.ts`).

### Gates and mutations

Each mutation was made on a committed tree and failed by name:

| Mutation | Fails |
|---|---|
| `tierOf` puts every section in Components | `test-component-groups.ts`: "Icon, on its Foundations page, lists under Subcomponents" |
| Control shape's chips back under Shape › Radius | `test-pages.ts`: "no manifest lever has two homes … controlShape" |
| The Decisions log back in `INSPECT` | `test-pages.ts`: "Q2909.7 A: Inspect holds Contrast and Tokens" |
| `railAreas` keeps Documentation on the web | `test-pages.ts`: "Q2909.9 A: the web's rail holds Theme, Components and Export only" |
| The gamut matcher reads another word | `test-engine-warnings.ts`: "gamut: the out-of-gamut primary …" |
| `dueCount` returns 0 | `test-update-file.ts`: "Q2909.8 A badge: it counts the due sets …" |
| The hand-edit default Overwrite | `test-update-file.ts`: "Q2909.8 A ticks: … hand edits are kept …" |
| Build records no ledger entry | `test-build-completed.ts`: "ledger/build" |
| The in-place update records no entry | `test-build-completed.ts`: "ledger/update" |
| The scoped check reads every present set | `test-build-completed.ts`: "update-check: the check reads the sets asked for …" |
| `dueOf` ignores the engine's revision | `test-as-built-ledger.ts`: "engine: a revision bump flags every set for the engine" |

### Gaps

- Nothing was run in Figma. The ledger read, the background pass and the scoped check are untimed on a large file;
  `file-sets` still loads every page.
- A set built before the ledger stays "Not checked yet" until an update writes it; a check alone records nothing.
- Any `ENGINE_VERSION` bump flags every set due; the scoped check then says "No member changes" for most.
- With no tiles or mark on either bar, the bar's stepped fit (`fitBar`'s labels, name and rows steps) and the studio's
  drawer paths are dead code: #3010 (the bar's fit), #3011 (the web's Activity drawer).
- Theme's own due state (`isDirty`) is not on the badge: whether Apply resets that baseline is still unverified.
- All new UI words are placeholders (Q2909.10 A; the wording PR follows).
