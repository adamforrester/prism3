## (2026-10-05) — Studio: the dead legacy color-page CSS is removed (#2116, 1 of 3)

**Status:** `apps/studio/src/styles.css` only. No ENGINE bump (no emitted artifact moves). CONTRACT unchanged. No visible change.

### What changed

#2116's 77 Color classes leave `styles.css`, from the legacy Palettes, Surfaces & fills, Interactive, Backgrounds and gradients. In all, 102 rules go, plus the `@media`/`@container` blocks left holding only them (`@container(max-width:352px)` · `@media(max-width:1208px)`). The comments that described only those rules go with them.

- **Removed with their rules**, because each explained only rules that go here: the `.porigin` gap note, the neutral-row readout note, `.pramp-wrap`'s container note (#334), both Backgrounds card notes, the Surfaces & fills section head, the 1208px collapse note, and the 480px hex-drop note.
- **Trimmed where this PR made them false:** `.lab`'s min-width note no longer cites `.labs` or `.lab-hex`. The `@container` tier note no longer claims a hex tier. It still names `.pramp-wrap`, which is filed in #2165.

The classes: `bg-derived` `bg-floor` `bg-floor-lab` · `cb-lab` `cb-mark` `cb-ratio` · `cbadge` · `cs-ctl-stack` · `fg-row` `fg-sw` · `gr-cell` `gr-ed-add` `gr-ed-addstop` `gr-ed-card` `gr-ed-ctrls` `gr-ed-field` `gr-ed-head` `gr-ed-lab` `gr-ed-list` `gr-ed-name` `gr-ed-nameinput` `gr-ed-num` `gr-ed-range` `gr-ed-stop` `gr-ed-stoprm` `gr-ed-stops` `gr-ed-stopsh` `gr-ed-stopsw` `gr-ed-sw` `gr-lab` `gr-list` `gr-sw` · `gradient-spec` · `ic-add` `ic-addbtn` `ic-addhint` `ic-modenote` · `lab-hex` `lab-step` · `labs` · `np-note` · `panel-head` · `phead` · `phex` · `pidcol` · `pident` · `plock` · `pname` `pname-input` · `porigin` · `pramp` `pramp-wrap` · `prm` · `prole` `prole-dot` · `prow` · `psl-top` `psl-val` · `psub` · `pswatch` · `pswrap` · `sf-ctl` `sf-ctlblock` `sf-derived` `sf-desc` `sf-ex` `sf-ex-fill` `sf-ex-surface` `sf-ex-text` `sf-id` `sf-name` `sf-railnote` `sf-right` `sf-row` `sf-sw` · `slider-top` · `tok-shadow`.

### How "dead" was established, not assumed

The proof covers all three PRs at once, over the 226 classes, on `main` at `cd86e86e`.

- **Source, tests and bundles.** The search is word-bounded on both sides, `(^|[^a-zA-Z0-9_-])<class>([^a-zA-Z0-9_-]|$)`, so `ts-row` cannot match `components-row`. It runs over every `.ts`, `.mjs`, `.js`, `.html`, `.css`, `.json` and `.md` file in `git ls-files apps packages tools skills` except `styles.css` itself, and finds none of the 226. The issue scanned comment text as definitions, so nine of its 241 had already gone from every selector. `.phead`'s three hits are a `chrome.css` grid-area name, not a class. After each PR's rebuild, `apps/studio/dist/main.js`, `apps/plugin/dist/main.js` and `apps/plugin/dist/ui.html` carry none of its classes outside surviving comment text.
- **Run-time names.** Every hyphen prefix and suffix of every candidate was searched for in a building position (`` `te-${…}` ``, `'te-' +`, `` `${…}-row` ``). The 32 hits are element ids, `data-p3` hooks, names, log text, comments, and TokenPress's own exported CSS; none can produce a removed class. The same goes for every class-setting call with a computed argument. Every class-parameter helper (`tinted`, `shapeSample`, `tcHead`, `tcCell`, `specimenRoot`, `tabButton`) is called with literals. One construction does build styled classes: `` `sg-grid sg-g${cols}` `` in `preview/sections/kit.ts:305` produces `sg-g3` and `sg-g5`. **Those two stay.**
- **The rendered DOM: zero matching nodes.** A scratch Playwright preload (not committed) wraps `chromium.launch` and puts a MutationObserver into every frame of every context the suites open. It reports any node wearing one of the 226, on insertion or on a class change. **The probe was proved first:** on a planted page it reported `te-c` (parsed), `pramp` (inserted later) and `sf-row` (set by a class change). It did not report `te-cat-wrapper` or `xte-c`, and the positive control (`[data-p3]`) fired.

  | sweep, with all three PRs applied | result | pages | matching nodes | control seen |
  |---|---|---|---|---|
  | `test:chrome` | 16322/16322 | 273 | **0** | 273 |
  | `test:smoke` | ALL PASS, 6603 assertions | 82 | **0** | 82 |

- **Screenshots, against a noise baseline.** `test:chrome` saves 261 screenshots, and the preload saves each `test:smoke` page just before it closes (82). Unmodified `main` ran twice and the removal once, in the order main, removal, main.
  - Between the two runs of identical code, 25 of 261 `test:chrome` shots and 17 of 82 `test:smoke` shots differ.
  - So a shot counts as a real difference only if it was byte-identical in both main runs and differs after the change, or if it differs after the change by more than main differed from itself.
  - **No real difference.**
    - **`test:chrome`:** 238 of 261 shots are byte-identical to a main run. 13 differ by antialiasing: Δ1–2 along rounded corners, plus three isolated pixels at Δ6 and Δ11 in a spot that also differs between the main runs. The other 10 are the plugin's Activity drawer, which differs between main runs by the same amount, in the same boxes.
    - **`test:smoke`:** 67 of 82 are byte-identical to a main run, and 4 differ by at most 29 px at Δ≤2. The other 11 are the preview pane. Every one is pixel-identical to *both* main runs once shifted vertically (by 2–155 px), so it is a scroll position, not a style.

### The split, and why it merges in any order

#2116 lands as three PRs:
- **Color:** Palettes, Surfaces & fills, Interactive, Backgrounds, gradients.
- **Type:** Typography, plus Heading sizes and the category-styles table.
- **The rest:** Shape, Depth & motion, Layout, the primitive scales, and loose ends.

Areas interleave line by line in `styles.css`, so a split by class family alone conflicted in seven places. So each rule has exactly one owner: the PR of its first dead class. Three rules are overridden by selector so each deletion run belongs to one PR: `.sf-ctlblock .chips-legend`, `.sf-ctlblock .chips-row` (Type) and `.pswatch.ao-chk` (the rest). Only `pswatch` and `sf-ctlblock` therefore have rules in two PRs.

Checked with `git merge-file`:
- **All six merge orders** are conflict-free, and each yields the same file.
- **Against #2124:** each PR merges cleanly with #2124's `styles.css`, replayed onto this `main`, and so do all four together.
- **The browser's own CSS parser** confirms 843 rules before, and 320 removed across the three (Color 102, Type 176, the rest 42), disjoint. Every removed rule requires one of the 226, and every survivor is unchanged and in order.

### Held, not removed

- `.sg-g3` and `.sg-g5`: built at run time (above).
- `.bm-field`, `.bm-lab`, `.bm-in`, `.bm-hint`: inside the block #2124 deletes. That PR removes them, and touching them here would conflict.
- Comments that name a removed class but survive here:
  - #2124's "A TEXT-ENTRY CONTROL PAIRS…" block, which names `.pname-input`, `.gr-ed-nameinput` and `.te-font` (#2124 deletes it).
  - The `@container` comment that still names `.pramp-wrap` as its container.
  - "Top clearance as PADDING, matching .prow's…", which was already orphaned.

  The last two are filed in #2165, with the classes the word-bounded scan keeps alive only because prose names them (`.lab`, `.psl-range`, `.panel`).

### A trap for whoever re-verifies this

The screenshot noise is not small. The `test:smoke` preview pane is captured mid-scroll, so two runs of identical code differ by up to ~380k pixels there, with hundreds of thousands of "strong" deltas. Those collapse to **0 differing pixels** under a pure vertical offset, which is how to tell them from a styling change. Comparing shots without that, or without a second baseline run, reads as a regression that is not there.

### Mutation (it was truly dead)

Put `.pramp{display:flex;flex-direction:column}` back, at its original place (L391 of `main`'s `styles.css`), after a `wip:` commit:

- `apps/studio/dist/main.js` and `apps/plugin/dist/ui.html` each carry `.pramp{` again (1 hit each), so the bundle check above can see a rule when it is there.
- studio `build` (including `installStyles`' scope law) and `test` pass. `test:smoke` passes (ALL PASS, 6603 assertions), and so does `test:chrome` (16322/16322).

Nothing fails with the rule back, so nothing depended on it. Restored with `git checkout -- apps/studio/src/styles.css` from the committed state.
