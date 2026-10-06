## (2026-10-05) — Studio: a live styles.css rule cannot be removed under a green verify (#2201)

**Status:** a new gate, `lint:live-css` (`apps/studio/lint-live-css.mjs`), with its sweep
(`apps/studio/live-css-sweep.mjs`) and its baseline (`apps/studio/live-css.json`). It is wired into
`verify.ts`, `ci.yml`, CONTRIBUTING §3, CLAUDE.md §4 and the PR template. No engine file changes, so no
ENGINE bump; CONTRACT is unchanged. `test-chrome.mjs` is not edited: the sweep rides it, and four open
UI-lane PRs are changing that file.

### The defect

The review of #2116 deleted `.sg-g3{grid-template-columns:repeat(3,1fr)}`, a live rule whose class
`kit.ts` builds at run time. The style guide's three-column grid fell to one column, and every suite
stayed green. They assert colors, contrast, targets and words, but nothing reads a grid's track count.

### The design

**Two sides.**
- **EXPECTED** is the set of `styles.css` rules that matched an element a real page drew. A preload records it
  by riding the four browser suites `verify` already runs, so liveness comes from the DOM the app's
  TypeScript draws, never from the stylesheet:
  - `test:chrome`, on both hosts in light and dark;
  - `test:smoke`;
  - the plugin's `test:verdict` and `test:start`.
- **ACTUAL** is the current `styles.css`, parsed by Chromium.

The gate fails, by name, when a live rule is gone or has lost a property. A rule no page drew is not in
EXPECTED, so a true dead-code removal passes.

**Keyed per rule, not per selector.** The key is the context, the selector and an ordinal:
`@media (max-width: 760px) » .sg-g3 #1`. Selector text alone would pass the reviewer's own mutation,
because `.sg-g3` also appears in the 760px rule `.sg-g3,.sg-g5{…}` (docs/34 shape 15). M5 below measures
this. Each selector of a list is its own key.

**Property names, not values.** Dropping `gap` from a live rule fails; changing its value passes. I
considered a computed-style comparison on drawn nodes and didn't build it. Computed style moves with brand,
mode and timing (#2116 measured ~380k-pixel run-to-run noise in one pane), so it would pin every value
on the page rather than the presence of its rules.

**The baseline has memory (shape 6).** The gate never writes it. `-- --accept` re-runs the sweep, testing
every old key's selector against the DOM, including keys already gone from the sheet. It refuses to forget a
rule the DOM still draws unless the rule is named with `--allow '<key>'`. A key no page draws any more drops
out on its own, and is printed. `--dry-run` never writes. `--suites` narrows the sweep, and is refused
without `--dry-run`: a `test:chrome`-only sweep holds 385 live rules against 426, so a partial sweep written as a
baseline would forget 41 live rules.

**A shared parser, checked by a second one.** The check and the accept both read through Chromium. That is
not the DRY trap: what the check compares is the subject at two moments, and the independent side is the
sweep. But a rule the parser drops would be invisible to both moments (shape 15). So a tokenizer of the
gate's own lists every rule prelude in the raw text, and the two lists are aligned. Every dropped rule is
named, and only one reason is accepted: another engine's prefix. Today that is
`input[type=color]::-moz-color-swatch` at L368, which Chromium drops by design and could never draw.

**Did it look (shape 9).** The gate fails on any of these:
- a baseline under 150 live rules;
- a sweep with no frame in any of the four host × scheme corners;
- a parse under 200 rules;
- a self-check that plants a removal in memory and isn't told.

The sweep counts only frames that installed `styles.css`, recognized by the sheet's own fingerprint.

### The first accept caught the sweep's own blind spot

The first `--accept` refused: `test:chrome opened no frame carrying apps/studio/src/styles.css`. The build
installs ONE `<style>` holding `styles.css` followed by `chrome.css` (1083 rules), and the sweep had looked
for a sheet of exactly `styles.css`'s 514. It now matches a prefix. Without that represented-check, the
first baseline would have been empty and every later run green.

### The baseline

On `main` at 9b91eebb: **426 live, 119 drawn by no page**. The sweep counted 457 frames carrying the
sheet: web light 206, web dark 55, figma light 143, figma dark 53. First witnesses: `test:chrome` 398,
`test:smoke` 27, `test:verdict` 1, so the extra suites each vouch for rules `test:chrome` never draws. The
119 are dead code or states no suite reaches, filed as #2224. The gate cannot protect a rule nothing draws,
and that is its stated limit.

### Mutations

Each one ran from a `wip:` commit. The harness asserted the edit applied (`s != o`, an exact anchor, count 1) and
was restored with `git checkout --`.

| # | Mutation | Result |
|---|---|---|
| M1 | delete `.sg-g3{grid-template-columns:repeat(3,1fr)}` (the reviewer's) | exit 1: `✗ live rule removed: .sg-g3 #1 — it matched a drawn element in test:chrome, web light. Restore it; or, if removing it is the intent, run … --accept --allow '.sg-g3 #1'` |
| M2 | delete `.startview{…}`, a rule no page draws (no class-position use in source) | exit 0: `✓ live-css: no live rule … was removed or lost a property.` |
| M3 | drop `gap:14px` from the live `.sg-grid` | exit 1: `✗ live rule lost column-gap, row-gap: .sg-grid #1 — drawn in test:chrome, web light.` |
| M4 | M1, with the gate's removal arm neutralized | `.sg-g3` named 0 times; the gate stays red only through its self-check: `✗ self-check: removing the live rule :root #1 in memory was not reported` |
| M4b | M4, with that self-check also neutralized | exit 0, green: the named failure in M1 comes from that arm alone |
| M5 | M1, read as selector text instead of rule keys | `.sg-g3` present before and after, so a selector-text gate PASSES the mutation; the key `.sg-g3 #1` is gone while `@media (max-width: 760px) » .sg-g3 #1` remains |
| M6 | M1, then `--accept --dry-run --suites test:chrome` | exit 1: `✗ live-css --accept refuses to forget live rules. Each still matches a drawn element: .sg-g3 #1 was removed` |
| M7 | M6 with `--allow '.sg-g3 #1'` | exit 0: `would allow: .sg-g3 #1`, nothing written |
| — | `--accept --suites test:chrome` without `--dry-run` | exit 1: `✗ … --suites narrows the sweep, so it is allowed only with --dry-run.` |

M1 also found a bug in the gate's first draft. Its dead-rule self-check asserted that the planted removal
reported *nothing*, which a real removal elsewhere made false. So every real failure carried a spurious
second line. The self-check now asks only whether its own planted key is reported.

### What it does not see

- A rule live only in a state no suite reaches (#2224 lists today's).
- A live rule's effect removed without removing the rule: a later override, or a value set to its initial value.
- A rule added since the last `--accept`, until the next one. The gate prints that count every run.

### Trap for whoever moves this

**Never add `live-css.json` to `regen.ts`, and never let the check write it.** Regenerated or self-rewritten,
it would agree with a deletion, and the gate would go green with the rule gone. That is shape 6, and
`token-contract.json`'s rule.
