## (2026-10-07) — Studio: the plugin's Pages menu and the old Style guide page go, and the legacy page path with them (#2289, H12)

**Status:** UI only (`apps/studio/src`, `apps/plugin/src/messages.ts`'s one comment, and the browser suites). No engine
change, no emitted artifact moves, no ENGINE bump, CONTRACT unchanged. Owner decisions: H12 A (the cleanup), PG1 A
(remove the Pages button and the old Style guide page; "Build style guides…" in the Figma menu is the one way in), and
Q107 A (the four differences the old page had are accepted: REM keeps the new page's default, off; comma lists and key
matching in the Tables filter go; an agent's run shows in Activity, not on the page; P8 stands).

### The one visible change

The plugin's top bar loses its "Pages ▾" button. At 1280 the Figma menu moves left beside Export; at the narrow tier the
second row reads Figma ▾ · Apply Theme. The web never drew the menu (G19 A). Screenshots of the real bar at 1280 and
380, before and after, are on #2289 for the owner.

### What went, and why it was dead

`styleGuide` was the last legacy page: every tab's `legacy` list was already empty (S8.2), and `MENU_LEGACY` held only
it. Removing it emptied the legacy page path, so everything that existed only to draw a legacy page went too:

- **`main.ts`:** the Pages menu (`renderPagesMenu`, `renderNavMenu`), the rail data (`NAV`, `railNav`, `isFirstView`),
  the old page (`renderStyleGuidePage`, its Customize fold and its row, `syncStyleGuideRow`, `styleGuideOptions`), the
  row status pill (`renderApplyStatus`, with the pending-pill sets that only it filled), `PAGE_RENDERERS` and
  `PAGE_COPY`, the legacy workspace (`renderWorkspace`'s legacy half, `chromedWorkspace`, the region reconcile, the
  volatile painter `setVolatile`/`paintVolatile`, the mode badges), the old mode strip (`renderModeStrip`,
  `renderModeContext`, its sticky shadow and its `mode-strip` chrome surface), and the legacy settings search.
  `styleGuidePendingText` stays: the Activity drawer reads it.
- **`shell/pages.ts`:** the `legacy` lists, `LegacyPageKey`, `legacyOf`, `MENU_LEGACY`. `placeOfPage` and `pageOfTab`
  lose their host and keep-place arguments, which only a legacy page needed. `status` stays, `new` on every page, as the
  field `NewPageKey` is derived from.
- **`shell/frame.ts`:** the legacy frame and its `legacy` layout. The levers pane is the tabs' panel on every page.
- **`shell/bar.ts`:** the `pages` slot.
- **CSS:** the `styles.css` rules only those drew, dropped through `lint:live-css --accept` with no `--allow`, each key
  named below; and `chrome.css`'s legacy-layout rules, which `lint:live-css` does not cover (the frame never sets
  `data-layout="legacy"` and nothing mints `.p3-legacy`).

**Proof it was dead, three ways.**
- `tsc --noUnusedLocals` against a baseline taken before the first edit: every declaration it flagged as newly unused
  was removed, round by round, until the list matched the baseline.
- The esbuild metafile of both bundles, before and after: no module left either bundle (the dead code sat inside live
  modules), and `main.ts` shrank by 25,139 bytes in each.
- `lint:live-css`'s sweep, riding the four browser suites, decided which CSS rules nothing draws any more.

### Tests

- **New: `test-removed-legacy.ts`** (in the studio `test` script). A literal list of the removed identifiers and hooks;
  every `.ts` file under `apps/studio/src` and `apps/plugin/src` is parsed and any identifier or string literal naming
  one fails, by file, line and name. Comments do not count, so the history notes stay. Non-vacuous: a planted fixture
  must report every name, and the scan must read the files that held them.
- **#1031 moved, not deleted** (test:chrome §4, as Q107 A asks): from the old page's Customize selects to the Build style
  guides page's own fields, in the plugin's dark theme. The rule is read from each field's own ground: a field on a
  dark ground resolves a dark color-scheme, and every value inks at 4.5:1. The disabled Mode select is exempt (F1 A).
- **The plugin's start-moment sweep** (test:start) measures Build style guides in place of the old page.
- **The row verdict that opens Activity on its row, expanded,** moved to `test-style-guides-page.mjs`, on the new page's
  own pill.
- **#1890's drawer arm** moved to Build style guides. No layout scrolls the document under the sticky head any more (the
  panes and the menu page scroll on their own), so the drawer's pin is read as geometry and the scrolled reads went.
- **Retired with reasons in place:** test:verdict's #259/#1785/Q19/#1778 arm (the old page's options, agent run and
  Tables field; Q107 A) and the S11 page-row arm; test:chrome's G19 Pages-menu row and C3 Pages-menu stamp checks.
  test:chrome §26 holds the Pages menu's absence on both hosts by its accessible name.
- **test:smoke** asserts the app view's chrome roster is exactly `brand-bar` and `error` (it was three, with the legacy
  `mode-strip` the web never mounted), every declared surface mounted, and no legacy frame.

Mutations, each from a `wip:` commit and restored with `git checkout --`:

| Arm | ✗ line |
|---|---|
| `MENU_LEGACY` re-added to `shell/pages.ts` | `✗ no file names a removed name or hook — apps/studio/src/shell/pages.ts:420 MENU_LEGACY` |
| the `'pages-menu'` hook string re-added to `shell/bar.ts` | `✗ no file names a removed name or hook — apps/studio/src/shell/bar.ts:204 'pages-menu'` |
| the new page's selects forced to `color-scheme: light` in the dark chrome (#1031's own defect) | `✗ figma dark / Build style guides: every field resolves its own ground's color-scheme and inks its value at 4.5:1 — sg-collection "" light on a dark ground 18.13:1 \| sg-opt-value-format "hex" light on a dark ground …` (test:chrome, the only failure of 36638) |


### The CSS that went

**59 `styles.css` rules that were live before and are drawn by no page now.** The first `lint:live-css --accept` sweep
moved them from live to dead with no `--allow`. They were then removed by key:
`.hit-min #1`, `.hit-min::before #1`, `.modebar #1`, `.modebar.stuck #1`, `.barmenu-wrap #1`, `.applystat #1`, `.applystat.ok #1`, `.applystat.bad #1`, `.applystat .caret #1`, `.cw-note #1`, `.fs-row #1`, `.brandmenu #1`, `.bm-cap #1`, `.bm-div #1`, `.shell #1`, `.stage-t #1`, `.stage-t b #1`, `.stage-t small #1`, `.rail-note #1`, `.hero #1`, `.hero h1 #1`, `.lede #1`, `.knob #1`, `.knob:last-child #1`, `.knob-label #1`, `.knob-body #1`, `input.toggle #1`, `input.toggle::after #1`, `input.toggle:checked #1`, `input.toggle:checked::after #1`, `.knob .select #1`, `.knob-val #1`, `.knob-desc #1`, `.modectx #1`, `.mctx-modes #1`, `.mctx-cap #1`, `.mctx-b #1`, `.mctx-b:hover #1`, `.mctx-b.on #1`, `.mctx-vo #1`, `.contracts #1`, `.contracts-sum #1`, `.contracts-sum::-webkit-details-marker #1`, `.contracts-sum::before #1`, `.contracts[open] .contracts-sum::before #1`, `.contracts-t #1`, `.contracts-hint #1`, `.tf-in #1`, `@media (max-width: 640px) » .shell #1`, `@media (max-width: 640px) » .barmenu-wrap #1`, `@media (max-width: 640px) » .brandmenu #1`, `@media (max-width: 640px) » .hero h1 #1`, `@media (max-width: 640px) » .lede #1`, `.navmenu #1`, `.nav-item #1`, `.nav-item:hover #1`, `.navmenu .rail-note #1`, `@media (max-width: 480px) » .shell #1`, `@media (max-width: 480px) » .hero h1 #1`.

**11 companions of the same families**, already undrawn in the old baseline, were removed with them:
`@media(prefers-reduced-motion:reduce) » .modebar`, `.cw-note b`, `.knob > .knob-body`, `.knob input[type=range]`,
`input.toggle:disabled`, `.knob input:disabled`, `.knob-val.ro`, `.mctx-modes>*`, `.nav-item.cur` and
`.nav-item.cur .stage-t b`. So were the comments they left with nothing under them. A second `--accept` rewrote the
baseline over the result.

### Traps for whoever re-verifies this

`test-hooks` fails a suite that names a `data-p3` hook no page renders, so a check that something is ABSENT cannot use
the removed hook's literal. Absence here is read by class (`.p3-legacy`) or by accessible name ("Pages").

`lint:live-css --accept --dry-run` names only the rules an accept would FORGET, meaning live rules already gone from
the CSS. It cannot list rules that went undrawn while still in the CSS. So the order is: change the app, `--accept`
for real, diff the old baseline's `live` keys against the new one's, remove those rules, then `--accept` again. The
first sweep of this change also failed once on a click timeout (`#1984 web light 380`, under load) and passed on the
rerun: `--accept` refuses a partial sweep, so it is safe to rerun.
