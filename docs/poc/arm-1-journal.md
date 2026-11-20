# Code POC, arm 1 — the journal (#3408)

Arm 1 delivers Prism3 to code as packages in this monorepo: `@prism3/css` (plain HTML/CSS) and
`@prism3/web-components`, generated from the engine's component definitions. Each phase PR into `poc/arm-1`
adds an entry here: what was built, the decisions with their Q references, what was checked and how, surprises,
plan changes suggested, and the effort spent. The effort figures are raw material for KPI 1 and the scorecard,
so they're recorded as they happened, errors included.

Phases (from the arm 1 scope on #3408): S0 docs · S1 shippable token CSS · **S2 `@prism3/css` button** ·
S3 text-field and password-field · S4 the web-component behavior layer · S5 Storybook · S6 the parity gate,
ejection and the measurements.

---

## S0 — the docs land before any code (#3500, merged 2026-11-07)

Summarized from the merged PR and #3408. This journal didn't exist yet, so S0's effort wasn't recorded here.

**What was built.** No code. Six `Decided (2026-11-07, #3408)` headings in the docs that own them, each indexed
in `docs/42` and `decisions-index.json`: the two packages (`docs/35` §9.1), the `p3-` prefix (§9.2), the
shippable token output (§9.3), native HTML plus a small script (`docs/41` §7.1), generation from the defs export
with a parity gate (`docs/19` §10.1), and `password-field` as a third component (§10.2). The
`prism3-build-component` skill stopped claiming that code, Storybook and Code Connect projections exist.

**Decisions.** Q83 A, Q86 A, Q87 A, Q96 A, Q97 A, Q99 A, Q100 A, Q101 A (docs first).

**Checked.** `lint-decisions-index`, `lint-guide-claims`, `lint-skills`, `lint-layout-claims`, `lint-doc-gates`,
`lint-progress-order`, `lint-tool-neutral-prose`, then CI green.

**Surprises.** None recorded. Q95 (custom elements or Lit 3) and Q98 (the CSS prefix) were left open.

---

## S1 — the shippable token CSS (#3503, with the scorer change #3502; both merged 2026-11-07)

Summarized from the merged PRs and #3408. Effort wasn't recorded here.

**What was built.** `packages/tokens/sd.ship.mjs`: stock Style Dictionary v5, one run per mode over the house
brand's base + overlay projection, `:root` for the light defaults and `[data-theme="<mode>"]` for each other mode,
joined into `dist/prism3.css`. `npm pack -w @prism3/tokens` makes a tarball with only the CSS and the README. A new
gate, `check:package`, installs that tarball outside the repo and checks every guaranteed contract name under
`--pds3-` in every mode block. #3502 taught the agent-adherence scorer the `--pds3-` names.

**Decisions.** Q98 A (keep stock Style Dictionary's `--pds3-` names), Q99 A (`packages/tokens` builds the
shippable output), Q84 A (a tarball, no registry).

**Checked.** `check:consumability`, `check:package`, `regen --check`, `token-contract --check`, the layout,
doc-gate, progress and decisions-index gates; four mutations each failing by name (a dropped mode, a `prefix`
option, an extra file in the tarball, a custom format).

**Surprises.** The three `motion.spring.*` contract names can't reach the CSS: `spring` isn't a DTCG type, so the
projection never carries it (#642). The gate excludes them and prints that on every run.

---

## S2 — the `@prism3/css` button (this PR)

Started 19:34 UTC on 2026-11-07, from `poc/arm-1` at `bc0d41e7`.

### What was built

`packages/css`, the `@prism3/css` workspace (Q87 A):

- **`generate.ts`**, the generator (Q96 A). It reads `out/components/specs.json` (every color per part and state,
  every padding, gap, height and icon size per size and visual slot, every label style) and `component-defs.json`
  (the props and their defaults), and writes `button.css`: 244 rules in one cascade layer, `p3`. It also writes
  `demo.html`. Both are committed, so a client needs no build; `--check` fails when either is stale.
- **`button.css`.** The native `<button>` (or `<a href>`), light DOM, with the prefix `p3-` (Q97 A) and the
  `--pds3-…` token names (Q98 A), modes through `@prism3/tokens`' `[data-theme]` blocks. Its nested parts: the
  leading and trailing icon slots, the pending spinner (it takes the first visual cell; with none it centers over
  the label, which keeps its width at zero opacity) and the focus ring (an `outline` on `:focus-visible`, its color
  following `surface`). States come only from native and ARIA attributes: `:hover`, `:active`, `:focus-visible`,
  `:disabled`, `[aria-disabled="true"]` (inactive) and `[aria-busy="true"]` (pending). Hover and pressed never
  apply to a disabled, inactive or pending button.
- **The markup contract** (the package README). Each visual prop is a `data-prop-<name>` attribute, the mark the
  adherence scorer already reads, so the attribute that styles the button is the one that declares its API; an
  absent attribute is the def's default. Every prop of the def has a row, `label` and `onClick` included.
- **`codeOnly` entries CSS can carry:** the flush button's hit target (an invisible `::before`, 44×44 at medium
  and large, 24×24 at small), the focus ring, the min-width floor, the wrapping label (the height is a floor), RTL
  through logical properties, the spinner's rotation, its reduced-motion speed and its enter fade. The rest is
  listed in the README for S4: click suppression while pending or inactive, the busy live region, the spinner's
  anti-flash delay, form status, the `edges` icon placement, per-icon mirroring, and the 44px target outside flush.
- **`demo.html`**: every appearance (and the flush text button) at every size, at rest, pending, disabled and
  inactive, with and without icons, on light and dark, plus an inverse band and an `<a href>` button. Hover,
  pressed and focus are live.

### Decisions

Followed: Q87 A, Q96 A, Q97 A, Q98 A, Q86 A (no script in S2), light DOM, one named layer, states from attributes.

Taken as technical calls inside the brief (documented in the README, reversible):

- Prop mapping through `data-prop-*` attributes, not modifier classes.
- Part classes named from the def's part names: `p3-button__label`, `__leading-visual`, `__trailing-visual`,
  `__spinner`.
- `inactive` takes the disabled paint: the def's `codeOnly` entry says that's its intended visual at the token tier
  (docs/03 item 3), and `specs.json` has no row for it.

**Owner decisions needed** (also in the PR body):

1. **The layer name.** `@layer p3`. Clients override by layer name, so it's public API.
2. **The class names for parts** (above), and the `data-prop-*` attributes as the styling hook. Both are the markup
   API S4's elements will wrap.
3. **The min-width floor.** The CSS writes the px `specs.json` states as derived (88, 104 and 128px), the one raw-px
   exception. The alternative is a live `round(up, height × multiplier, 8px)`, but the multiplier isn't a token
   and the Figma side is frozen too.
4. **The small flush hit target.** No token names a 24px target, so it reads `space.300` (24px). Medium and large
   read `size.md.min-height`, which is described as the target-size floor. Should the engine mint a target token?
5. **The emission gap (#3506).** `specs.json` has no radius, stroke width, focus-ring width, offset or style, and
   no motion tokens, so the generator reads those from the TypeScript defs, and the parity check can't cover them
   from the emission (the browser check holds them instead).
6. **The lost typography fields (#3507).** The token CSS's `font` shorthand drops `textDecoration` and
   `letterSpacing`. The generator reads the text button's underline from the DTCG; tracking isn't applied.
7. **`@axe-core/playwright` isn't a dependency.** The browser check does an ARIA-tree and focus pass instead. Add it?
8. **Button siblings.** Only `button` (primary) is built. `Button.Destructive` and `Button.Neutral` share the
   anatomy and differ only in their color family, so the generator could write them in minutes, but their class
   names (`p3-button-destructive`?) are a naming call.
9. **Motion the def describes but doesn't bind:** the ~100–150ms state transition and the 0.98 press scale. No
   token is bound, so S2 adds neither.

### What was checked, and how

Four new CI steps, mirrored in `verify.ts`, CONTRIBUTING §3, CLAUDE.md §4 and the PR template
(`lint-doc-gates` clean). `packages/css/` joined the layout regions in the root README, CLAUDE.md and `docs/09`
§3 (`lint-layout-claims` clean).

- **`check:generated`**: `button.css` and `demo.html` equal a fresh generation.
- **`check:raw-values`**: the agent-adherence scorer's own `scoreR2` and `scoreR1`, imported, not copied, over
  `button.css` and the demo's styles and marks. No hex, `rgb()`, non-zero px, primitive or invented token; 182 demo
  marks are real props and values. The one exception (the derived min-width px) must match a `specs.json` value
  and must still be in use. Six planted mutants are each reported by name.
- **`check:parity`** (the first slice of S6). EXPECTED is `specs.json` and `components.ai.json` only. ACTUAL is
  what Chromium computes for markup written from the check's own copy of the contract. Every color, dimension and
  typography token is defined as a unique sentinel, so each computed value decodes back to one token name: 564
  bindings across 48 color rows, 24 redline rows, 9 type rows, the focus ring per surface, and `inactive` held to
  the disabled row. Pseudo-states are forced through the DevTools protocol. Every prop and value has a markup
  mapping and a README row. Four in-memory mutants fail by name: a swapped token (filled hover fill → pressed), a
  dropped state (every `:active` rule), a dropped prop value in the CSS (`size=large`), and in the contract
  (`appearance=text`).
- **`test:browser`**: `demo.html` with the real token CSS on light and dark. 67 checks: computed colors and sizes
  for a sample of states (rest, hover, pressed, disabled, inactive, pending, flush, inverse, the focus ring's
  color, width and offset) equal the value the scorer's oracle resolves from the DTCG, so the Style Dictionary
  build is checked too, not trusted. Tab shows the ring; a mouse click focuses with no ring. Pending keeps the
  accessible name and the spinner is hidden from it; inactive and pending stay focusable. Two mutants fail by name.
- **Hand mutations on disk**, each after a `wip:` commit and restored with `git show HEAD:<path> > <path>`:

  | Mutation | Fails by name |
  |---|---|
  | `button.css`: the outline pressed border rebound to `border.hover` | parity: `appearance=outline … state=pressed …: container border-top-color binds color.interactive.primary.border.hover, the spec names …border.pressed`; `check:generated` also fails |
  | `button.css`: `[aria-busy="true"]` renamed | parity: 28 bindings, `state=pending … binds color.disabled.fill` |
  | README: the `isInactive` row deleted | parity: `prop isInactive is not in the README's markup contract table` |
  | `generate.ts`: hover wired to `:focus` | parity: 24 bindings, `state=hover … binds …fill.rest, the spec names …fill.hover` |
  | `button.css`: a hex border color | raw values: `hex #1e1eff in border-color (button.css)` |

### Surprises and learnings

- **The emission is nearly enough, and the gap is specific** (#3506). Everything per state, size and slot is in
  `specs.json`; what's missing is everything that doesn't vary (radius, stroke, ring geometry) and motion.
- **The token CSS loses typography fields** (#3507). Style Dictionary's `font` shorthand has no place for
  decoration or tracking, so a text button's underline lives only in the DTCG.
- **Equal values hide swaps.** The outline border, label and icon all resolve to the same color at rest. A
  screenshot or a value comparison can't see a swap between them; the sentinel decoding can. That's why the parity
  check doesn't load the real token CSS.
- **`specs.json` is per brand configuration.** Lever-dependent bindings (`buttonContentSize`, `buttonLabelWeight`,
  `buttonTextHover: fill`, `buttonIcons: edges`) are resolved into the house brand's rows, so `button.css` is the
  house brand's button. Another brand with moved levers needs its own generation.
- **Chromium clamps `font-size` at 10000px**, which silently collapsed the first typography sentinels.
- **tsx's `keepNames` breaks `page.evaluate`**: a named arrow inside the page function is wrapped in `__name`,
  which the page doesn't define. Keep page-side code free of named helpers.
- **The demo's table squeezed labels into wrapping**, which is the localization rule working: the height is a
  floor, so the button grows.

### Plan changes suggested

- **Fold the parity check into S6 as is**, then extend it per component. It needs no Storybook and runs in about
  15 seconds.
- **Before S3, decide #3506.** The text field has more fixed geometry than the button, so the TypeScript-def reads
  would grow.
- **S4 should treat the README contract as its input.** The elements wrap this markup; the parity check already
  holds the contract.
- **Add `@axe-core/playwright` in S5** at the latest, where the brief puts the accessibility tests.

### Effort

- **Wall clock:** 19:34 to 19:52 UTC to build the package, its four checks and the hand mutations (about 18
  minutes); 19:52 to 20:41 for the full gate list, run locally in foreground chunks (about 49 minutes, almost all of
  it the existing engine, studio and plugin suites); then the PR and CI.
- **Steps:** about 60 tool calls before the gate run: reading (the issue, docs, def, emission, tokens, scorer, CI
  and doc gates) about 30, writing 8 files, running and fixing about 20. Then 9 gate chunks.
- **Hand edits:** none to generated output. The generator, demo builder, three checks, README, `package.json`, four
  doc checklists, `ci.yml`, `verify.ts`, three layout regions, this journal and the progress entry were written by
  hand. The lockfile change (one workspace entry) came from `npm install --package-lock-only --ignore-scripts`,
  validated by `npm ci`.
- **Errors hit:** 7.
  1. `specs.json`'s `components` is an object keyed by id, not an array.
  2. `component-defs.json`'s `def` has no `anatomy` or `tokens`: the source of the #3506 finding.
  3. The parity check's first run: 21 failures, all in the check, not the CSS. The font-size clamp (9), and
     `min-width: auto` computing as `0px` outside flex (12).
  4. A self-test arm read the global contract instead of the mutant's, so it named the wrong failure.
  5. `__name is not defined` in `page.evaluate`.
  6. **An operator slip:** a stray `git checkout origin/poc/arm-1 --` in a diagnostic command detached HEAD. Nothing
     was lost, because every change had been committed as `wip:` two minutes earlier; switching back restored the
     branch. The CLAUDE.md rule (commit before every mutation) is what made it harmless.
  7. `lint-release-notes` can't run in a shallow clone; `git fetch --unshallow` fixed it.
- **First-try success:** the generator's CSS passed the parity check on its first real comparison. Every failure
  above was in the instruments or the operator.

**Local gate record** (`npm run verify`'s 101 gates, in 7 chunks): 98 PASS, 0 FAIL, 3 SKIP. `lint-release-notes`
failed once, unable to run in the shallow clone, and passed after unshallowing. The SKIPs are suites the diff
doesn't touch, left to CI: `plugin-test` (cut at the 10-minute chunk limit with no failure printed), and `chrome`
and `chrome-shards` (not started locally, for the same limit).

---

## Refresh — `main` merged into `poc/arm-1` (a Q55 data point: what breaks when an update arrives)

Started 20:19 UTC on 2026-11-16, from `poc/arm-1` at `bf7d72eb`, merging `main` at `513a95a4`: 205 commits, one
MAJOR contract bump (CONTRACT_VERSION 14.14.0 → 15.0.0). Merged with a merge commit, never rebased.

### What arrived

Measured on `out/prism3.tokens.json`, before and after:

- **18 tokens changed type:** every `core.font.letter-spacing.*` step and `letter-spacing-role.*` alias went from
  `dimension` (`"0.01em"`) to `number` (`0.01`, a fraction of the font size). In the token CSS that reads
  `--pds3-core-font-letter-spacing-10: 0.01`, with no unit.
- **1 token removed:** `container.fluid`. **2 added:** `type.caption.{md,lg}.line-box`. **1 changed value:**
  `shadow.inset` gained `inset: true`.
- **The engine stopped committing three component exports** (#3698 R3): `out/components/specs.json`,
  `component-defs.json` and `component-defs.specs.json`. They're now generated on demand
  (`UNCOMMITTED_OUT` in `regen.ts`). The merge deleted them from the tree; a local `regen` still writes them, so a
  developer's checkout hides the change.

### What broke

- **Not the contract change.** None of the 71 tokens `button.css` reads changed name or value, and the generator
  reads neither the letter-spacing tokens nor `container.fluid`. `button.css` and `demo.html` regenerated
  byte-identical.
- **The file move broke all four `@prism3/css` checks on a clean checkout.** `generate.ts`, `check-parity.ts` and
  `check-raw-values.ts` read `specs.json` (and the generator `component-defs.json`) from `out/`. Locally, after
  `regen`, everything passed. With the three files moved away, as CI's checkout has them, the generator crashed on
  a missing file. CI would have caught it; a local run after `regen` couldn't.

### The fix

`packages/css/emission.ts` runs `emit-component-docs.ts --uncommitted --out <temp>` as a process and the three
scripts read from there, the pattern `packages/tokens/check-specs.mjs` already uses. Running it as a process,
not importing the engine, keeps the parity check's EXPECTED an emitted file (docs/34).

Checked with the three files absent from `out/`: `check:generated`, `check:raw-values`, `check:parity` and
`test:browser` all pass. Two mutations, each after a commit:

| Mutation | Result |
|---|---|
| `emission.ts` points at a misspelled emitter | `FAIL emission: emit-component-docs.ts --uncommitted exited 1` |
| A stale `out/components/specs.json` planted with the primary hover fill swapped to pressed | ignored: `check:generated` and `check:parity` still pass, so `out/` is no longer read |

The letter-spacing type change becomes live in the next PR, when the text button's tracking is bound to the token
(Q143 A): a unitless number needs `calc(var(--…) * 1em)`, not the bare variable.

### Effort

- **Wall clock:** 20:19 to about 20:35 UTC for the merge, the regen, the four checks, the fix and its mutations.
  The full gate run is extra.
- **Conflicts:** one, in `CONTRIBUTING.md` §3. Both sides added lines after the same `check:package` comment;
  kept both. No conflict in `out/`, `schema/` or `docs/public/`; `regen` changed nothing after the merge.
- **Hand edits:** `emission.ts` (new, 30 lines), three one-line reads, one README sentence, this entry and the
  progress entry.
- **Errors hit:** one, the missing-file crash above. It was found by moving the files away on purpose, because the
  merge's own diff showed the three files deleted.

**Lesson for Q55.** The breaking change the contract announced didn't break this consumer; an unversioned change to
which files the engine commits did. A consumer that reads the engine's build output, not just its token
contract, needs that file list treated as an interface too.

### Second update (2026-11-17)

`main` merged in again, at `8a014b5c`, carrying the gate fix this refresh needed (#3836). Three new commits on `main`
since the last merge (`a9ccfe0b`): #3835 `space.550`, #3836 and #3832.

- **What arrived:** CONTRACT_VERSION 15.0.0 → 15.1.0, a MINOR. `space.550` joins the spacing scale, and Button's
  hit-target floors bind spacing tokens.
- **What broke in `@prism3/css`:** nothing. No conflict, `regen` changed nothing, and with the three exports absent
  from `out/`, `check:generated`, `check:raw-values`, `check:parity` and `test:browser` all pass. `button.css` is
  byte-identical, because it doesn't read `space.550` yet (Q141, in the next PR).
- **What #3836 fixed:** with base `poc/arm-1`, `lint-emission-version` now reads from the newest `main` this
  branch carries, `8a014b5c`, and passes. So do the other base-relative gates.
- **What #3836 broke:** its own `test.ts` arm, the "#3833 replay", runs the real `fold.ts` on a commit of this
  tree. Here that fold refuses: `poc/arm-1`'s own pending entry landed 2026-11-08, older than `main`'s newest
  folded entry, and an integration branch's entries stay pending. On `main` the tree always folds, so the arm
  only fails on the kind of branch it was written for. Filed for `main`, not patched here. **Closed:** #3848
  (for #3842) fixed it on `main`: the replay now builds its clone on the `main` the tree carries. This branch
  carries the fix (`27d67654`).

**Lesson for Q55.** A fix to the gates an update is judged by is itself part of the update, and it can fail in the
consumer's tree in a way the upstream tree can't show.

---

## S2 follow-ups — the owner's button decisions (Q139–Q146)

Started 21:21 UTC on 2026-11-16, stacked on the refresh (`poc/arm-1-refresh`).

### What was built

- **Q143 A, tracking from the tokens.** Every label style the spec names now binds `letter-spacing` to the token
  its own `letterSpacing` aliases: `calc(var(--pds3-core-font-letter-spacing-role-normal) * 1em)`, 9 declarations,
  one per type row. This mirrors how the underline is read from the style's `textDecoration`. Since CONTRACT_VERSION
  15.0.0 the token is a `number` (a fraction of the font size), hence the `* 1em`. The generator refuses a
  dimension or a literal, so a type change fails generation by name instead of shipping a wrong unit.
- **Q139 A and Q140 A, kept and documented.** The part classes, the `data-prop-*` hooks and the 88/104/128px
  minimum widths are unchanged. The README gains an "Owner decisions this follows" section that names each one.
- **Q141 / Q-HT1 A, the hit target (done in review).** `space.550` arrived with #3835 through the refresh, and #3835
  bound the def: `size.{small,medium,large}.hit-target` → `space.300` / `space.550` / `space.550`. The first cut of
  this PR still kept a hard-coded `HIT` table in `generate.ts`, with medium and large on `size.md.min-height`, and
  the browser check took its floor from that same token. Review caught it (see "Review fixes" below). The generator
  now reads each floor from the def's own binding, so medium and large read `--pds3-space-550`.

### Not built: Q145 needs an owner call

**Q145 A says Destructive and Neutral are one `p3-button` with a `data-prop-tone` value. The engine has no `tone`
prop to follow.** `button`, `button-destructive` and `button-neutral` are three defs with identical props
(`appearance`, `size`, `surface`, `inset`, …); "tone is the component" (`button.ts`, #1223). The instruction was to
follow the def's own prop and values and invent none, so a `tone` attribute can't be built without inventing one.
The scorer would also flag it today: `data-component="button" data-prop-tone="destructive"` scores as R1
`button has no prop "tone"`, which `check-raw-values` runs over the demo.

OWNER DECISION (Q145 follow-up): how should the tone reach markup?

- **A. The engine gains a `tone` prop on `button`** (values from the sibling defs, e.g. `primary | destructive |
  neutral`), in an engine PR to `main`. `data-prop-tone` then follows the def, and the scorer accepts it. It's a
  component API change that reverses #1223, and it touches Figma's three component sets.
- **B. One `p3-button` class, with the tone selected by the scorer's existing mark,
  `data-component="button-destructive"`.** No engine change and no invented prop. "Not separate classes" holds, but
  the attribute is `data-component`, not `data-prop-tone`.
- **C. `data-prop-tone` in the CSS only,** with the scorer taught to map it to the sibling defs. The CSS would carry
  a prop the def doesn't have, which is the thing R1 exists to catch.

**Recommendation: B for the POC.** It needs no engine change, matches what the defs say today, and keeps the
scorer honest. Take A later if the owner wants the tone in the def's own API. Whichever is chosen, `specs.json`
already carries `button-destructive` and `button-neutral` rows, so generating them is mechanical.

### Next (pending on separate engine PRs to `main`, not done here)

- **Q142 A / #3506:** the emission carries radius, stroke width, focus-ring geometry and motion bindings, so the
  generator stops reading the TypeScript defs.
- **Q146 A:** the state transition and the 0.98 press scale bound to motion tokens in the def; the CSS picks them up
  from the emission.

### What was checked, and how

- **`check:parity`:** 573 bindings (was 564). Number tokens now get a sentinel `i/1000`, and the computed
  `letter-spacing ÷ font-size × 1000` decodes back to one token name. EXPECTED is the label style's own
  `letterSpacing` alias in the DTCG, not the generator. A fifth in-memory mutant (every `letter-spacing` dropped)
  must fail by name.
- **`check:raw-values`:** a second documented exception, `letter-spacing`. It excuses a `core.*` read only inside
  `letter-spacing`, and only for a token a label style `specs.json` names aliases. Two new mutants must be reported:
  a role no label style names (`role-wide`), and the same token outside `letter-spacing` (`word-spacing`).
- **`test:browser`:** 69 checks (was 67). The text button's label tracking equals the oracle's resolved number ×
  the computed font size, on light and dark. A third mutant (the label rebound to `role-wide`) must fail by name.
- **Hand mutations on disk**, after the commit `571c3163`, each restored with `git show HEAD:<path> > <path>`:

  | Mutation | Fails by name |
  |---|---|
  | `button.css`: the medium filled label's tracking rebound to `role-wide` | parity: `size=medium appearance=filled …: container/label letterSpacing binds core.font.letter-spacing-role.wide, the spec names core.font.letter-spacing-role.normal` |
  | `generate.ts`: the `letter-spacing` declaration dropped, then regenerated | parity: 9 bindings, `letterSpacing binds (no token: ls:NaN)` |
  | `prism3.tokens.json`: the letter-spacing roles typed `dimension` again (pre-15.0.0) | generate: `type.label.md.emphasis: letterSpacing core.font.letter-spacing-role.normal is a dimension, not a number` |

### Review fixes (2026-11-17, VERDICT: CHANGES at `577868cc`)

- **Q-HT1 A wasn't applied, and nothing would notice.** `generate.ts` restated the floors in a `HIT` table, not
  reading the def, so the reviewer set the def's `size.medium.hit-target` to `space.300` (24px) and
  `check:generated`, `check:parity` and `test:browser` all still passed.
  - **Fix, generator:** the `HIT` table is gone. Each size reads `button.tokens['size.<size>.hit-target']`, and
    generation fails by name if a size has none. `button.css` regenerated: medium and large move from
    `--pds3-size-md-min-height` to `--pds3-space-550`, the same 44px.
  - **Fix, check:** `test:browser` holds the flush `::before` at every size, not only medium, to its own literals
    (24 / 44 / 44 px) and to no token. A floor taken from the def or the generator would move with the mutation
    and couldn't fail (`docs/34`). 73 checks (was 69). There's a new in-memory mutant: medium shrunk to
    `space.300`.
  - **The reviewer's mutation, re-run** on disk after a commit, restored with `git show HEAD:<path> > <path>`. With
    the def's `size.medium.hit-target` set to `space.300`:
    - Not regenerated: `check:generated` fails, `button.css is not what generate.ts writes from the emission`.
    - Regenerated: `test:browser` fails by name, `light flush medium hit target is 93.8281×42, under 44×44`, and
      the same for dark. The flush label is wider than 44px, but the 24px floor no longer lifts the 42px height.
- **Before the fix,** `poc/arm-1` moved: #3833 was squash-merged as `a96bdd6a`. Merged into this branch with a merge
  commit. The squash's tree equals #3833's head `5e487c33`, which this branch already carried. The only conflict was
  the journal, where this branch's side was kept, so the merged tree equals `577868cc`.
- **Non-blocking, also done:** `generate.ts`'s header and `button.css`'s banner no longer name `out/components/…`
  for the uncommitted exports. The header now says `prism3.tokens.json` supplies two facts: decoration and tracking.

### Surprises

- **Chromium serializes a computed `letter-spacing` of 0 as `normal`.** At the house brand's tracking (0), a real
  value check can't tell bound from unset. The browser check normalizes the expected value the same way. The
  parity check's non-zero sentinels are what hold the binding.
- **Every label style aliases `letter-spacing-role.normal`.** Q143 changes no pixel for this brand. It matters for a
  brand whose label tracking isn't 0.
- **Q145 assumed a prop the engine doesn't have.** The decision record and the defs disagree; see above.

### Effort

- **Wall clock:** about 21:21 to 21:40 UTC for the generator change, the three checks, the mutations, the README and
  this entry; then the gate run.
- **Steps:** about 30 tool calls: reading the defs, the specs, the token CSS, the scorer and the three checks about
  12; writing about 8; running and fixing about 10.
- **Hand edits:** `generate.ts` (one helper, one declaration), the three checks, the README section, this entry and
  the progress entry. `button.css` was regenerated, not hand-edited.
- **Errors hit:** 3.
  - The first cut of the #3946 fix still raced the upgrade (above). `verify.ts`'s run caught it. The first `$type` lookup ignored a group-inherited type, so it was rewritten as a walk. The
  first browser check failed on Chromium's `normal`, as described above.

---

## S3 — the text field and the password field (this PR)

Started 12:19 UTC on 2026-11-17, from `poc/arm-1` at `9280cd53`.

### What was built

- **Four generated stylesheets** (Q96 A), written by `packages/css/fields.ts` through `generate.ts` from
  `specs.json` and `component-defs.json`:
  - `field-label.css` (26 rules) and `field-message.css` (28 rules): the nested parts, usable on their own.
  - `text-field.css` (166 rules) and `password-field.css` (155 rules): the fields. Both come from one function, as
    both defs come from one factory (`makeTextField`).

  Each stylesheet is in the `p3` layer, with `p3-` classes and `data-prop-*` variants (Q97 A, Q139 A). `button.css`
  regenerated byte-identical: the shared token helpers moved into `tokens.ts`, and nothing else changed.
- **Light DOM around native elements.** A `<label for>`, an `<input>` and a `<p>` message share one tree, so the
  label names the input and `aria-describedby` reaches the message with no script. Error also sets `aria-invalid`.
  - States come from the input: `:disabled`, `[readonly]`, `:focus-visible` and `[aria-busy="true"]`, plus the box's
    `:hover`. The five code states are mutually exclusive.
  - The seven design states fold to five: `filled` and `focus-visible-filled` differ from `rest` and `focus-visible`
    only in which text shows. The code paints both at once, the value as `color` and the placeholder as
    `::placeholder` (codeOnly `empty`). The generator asserts that the folded rows agree on every shared paint.
- **The nested parts follow the field,** as the emission's `nesting` says. The field's size sizes its label
  (`follows: ["size"]`). Its validation sets the message's status, ink and glyph (`follows: ["status"]`). Its disabled
  input disables the label's ink (`when.state.disabled`). Its `required` input shows the label's marker. An author
  sets each one once, on the field.
- **The focus edge** (#3399): an inset `outline` at `border-width.focus-visible`, in the border's own paint. A status
  field keeps its status color while focused, nothing moves, and the edge survives forced colors.
- **The message's first line** (#3360, Q-FM1 A): the redline's computed paddings become
  `max(0px, calc((var(--pds3-icon-size-xs) - 1lh) / 2))` and its mirror. The message carries the caption's type, so
  each cell's `1lh` is one caption line.
- **Pending:** `aria-busy="true"` on the input shows a spinner in the box's trailing cell, replacing the trailing
  glyph. It turns on `motion.duration.spin` and is slowed under reduced motion, as on the button.
- **The Show/Hide button** is the nested `p3-button` (text, small, flush, from the nesting's variant). It sits in the
  label row and is selected by that variant, so its overrides outrank Button's flush rules by specificity, not by
  stylesheet order.
  - It sets `min-block-size: 0` and the def's zero block padding (`toggle.pad-block`).
  - Its hit area reads the button def's `size.<field size>.hit-target` (Q-HT1 A): `space.300` centered at small,
    `space.550` at medium and large. The larger one is anchored to the row's bottom, so it never reaches into the box
    (codeOnly `hit-target`, Q380 A).
- **`password-field.js`** (Q86 A), about 70 lines, hand-written. It reveals the `hidden` button and switches `type`.
  It keeps the caret and focus, renames the button "Show"/"Hide" (with " password" visually hidden), and announces
  the change in a polite live region. It never sets `aria-pressed`, and returns the field to hidden when its form
  submits (Q301.4 A, Q301.5 A, Q301.7 A). Every string can be overridden per button.
- **The demo** (`demo.html`, generated) shows both fields at every size × status, at rest, filled, disabled,
  read-only, pending and with icons, on light and dark. It also shows a plain field, a required field and a
  secondary bold label, and a form with a submit button.
- **The README** documents the fields' markup contract, one table per component (text-field, password-field,
  field-label, field-message), and the fields' codeOnly table: what S3 carries and what's left for S4.

### Decisions

Followed: Q96 A, Q97 A, Q98 A, Q100 A, Q86 A (a script, not an element; Lit 3, Q95 B, waits for S4), Q-HT1 A,
Q139 A, Q140 A (extended to the fields' minimum width, see 4 below), Q142 A (not yet possible, see Surprises).

**#3839 (emission bindings) isn't on `main`.** So the generator reads from the TypeScript defs, as S2 did:
- the box's radius and its per-state border widths;
- the focus ring's style;
- the spinner's motion tokens;
- the pending spinner's size and ink;
- the toggle's hit floors.

Every one is read from the def's own key, and generation fails by name if a key moves.

Technical calls (documented, reversible):
- **Hover excludes read-only,** as well as disabled and focused. The spec has no hover × read-only coordinate, and a
  read-only field isn't editable.
- **A disabled field with a value takes the disabled ink.** `specs.json`'s disabled rows show only the placeholder.
  The def's one entry-text slot, `disabled.label.on-fill`, covers the value too. The generator asserts it equals the
  placeholder's disabled ink, then binds it.
- **The glyph cell carries all three status glyphs,** and the CSS shows the one the status names. A status that
  changes live (S4) then changes one attribute.
- **The axis → prop mapping** (`status` → `validation`) is found by matching values against the def's props, not
  restated.

**OWNER DECISIONS (built as recommended, flagged):**

1. **The Show/Hide button before the script runs.**
   - **A (rec, built):** written `hidden`; the script reveals it. With no script, the field is a plain password
     input.
   - B: visible but inert until the script runs.
   - C: a no-script fallback, such as a native checkbox.
2. **Tab order: the def contradicts itself.** password-field's `accessibility.keyboard` says "Tab reaches the input,
   then the Show/Hide button", but its anatomy (Q301.2 B) puts the button in the label row, before the box, so DOM
   order reaches the button first.
   - **A (rec, built):** the anatomy's order, button then input. It matches the visual reading order, which the same
     note also asks for. Fix the keyboard sentence in the def.
   - B: input then button. The DOM has to move the button after the input and place it with CSS grid, which breaks
     the `labelRow` part the anatomy names.
3. **The pending spinner's place.** The defs say only "a spinner replaces an adornment"; no row binds one.
   - **A (rec, built):** the box's trailing cell, replacing the trailing glyph, at the def's `icon-size` and `icon`
     ink.
   - B: no spinner, only `aria-busy`.
4. **The fields' 120px minimum width.** `specs.json` states it as a literal px, not a token.
   - **A (rec, built):** keep it as raw px, documented like Q140, and excused in `check-raw-values` only where the
     spec states it.
   - B: drop it.
5. **The message shows only when written.** The def's `showMessage` defaults to off.
   - **A (rec, built):** `true` writes the `<p>` and names it in `aria-describedby`; `false` writes neither.
   - B: always write it, hiding it with `hidden`.
6. **Script API names** (public once shipped):
   - **A (rec, built):** `data-p3-announcer` marks a page's own live region, and `data-p3-show`, `-hide`, `-shown`
     and `-hidden` override the strings.
   - B: one JSON attribute.
7. **The copy** "Show", "Hide", " password", "Your password is shown" and "Your password is hidden" is the def's,
   marked DRAFT (Q301.5). It's used as written; confirming it is the owner's call.

### What was checked, and how

The four `@prism3/css` CI steps cover the new files. No new CI step: `check:parity` and `test:browser` each run a
second script, so `ci.yml`, `verify.ts` and the doc checklists are unchanged.

- **`check:generated`:** all six outputs (five stylesheets and the demo) equal a fresh generation.
- **`check:raw-values`:** the scorer's own R2 and R1 over all five stylesheets and the demo. 1226 demo marks are real
  props and values (`data-prop-validation`, `data-prop-emphasis` and the rest). Two exceptions grew:
  - `min-width` now also excuses the fields' 120px, read from `specs.json`.
  - `visually-hidden`, a new one, excuses `1px`, but only in password-field.css, only inside the one rule that hides
    the suffix and the live region, and only that rule's two declarations.

  Three new planted mutants are each reported by name: 11 in all.
- **`check:parity`**, plus `check-parity-fields.ts` (new). It is the button check's sibling, not an import of it.
  - EXPECTED is `specs.json` and `components.ai.json`. ACTUAL is Chromium's computed style for markup written from
    the check's own copy of the contract, with every token a unique sentinel.
  - **579 bindings in 139 probes:** every color row of both fields, with focus by real `focus()` and hover forced
    through the DevTools protocol. Also every redline row, every type row (the placeholder through `::placeholder`),
    and the focus edge's outline in each focused row's stroke.
  - The nested label at each field size and weight and at disabled; the nested message's ink and glyph at each
    validation (written at `default` on purpose, so the field's status must reach it); the required marker.
  - The Show/Hide button: Button's paint at rest and disabled, and never the status.
  - The standalone label and message on their own props.
  - Every prop of all four components has a markup mapping and a row in its README table. `prefix`, `suffix` and
    `clearable` are listed as deferred on every run, as are the native caret, the build widths and the computed
    paddings.
  - **Seven in-memory mutants fail by name:** a swapped token, a dropped state, a dropped prop value in the CSS and
    in the contract, the label not following size, the message not following status, and the focus edge dropped.
- **`test:browser`**, plus `check-browser-fields.ts` (new), on the real token CSS and the real script. **130 checks:**
  - 41 samples per theme against the oracle's resolved values: fill, border, radius, padding and heights; hover and
    focus; the focus edge's color, width and negative offset; error and warning; disabled, including a disabled value;
    read-only; label, message and glyph ink; the toggle.
  - Pending shows the spinner.
  - Tab order and Button's ring on the toggle.
  - The accessibility tree through CDP: the input's name is its label, its description is its message, `invalid` at
    error, `required`, `disabled`; every error field in the demo carries `aria-invalid`.
  - The toggle: hidden with JS off. With the script it's named "Show password"; click, Enter and Space switch it,
    focus and the caret stay, the announcement reads, there's no `aria-pressed`, a form submit hides it, and a
    disabled field's button does nothing.
  - Geometry, against this file's own px: the toggle's hit area is at least 24/44/44 and never reaches into the box;
    the box is at least 44px tall; the status glyph sits within 0.5px of the caption's first-line center.
  - **Seven mutants fail by name.**
- **Hand mutations on disk**, each after a `wip:` commit and restored with `git show HEAD:<path> > <path>`:

  | Mutation | Fails by name |
  |---|---|
  | `text-field.css`: the error focus edge's outline-color rebound to `border.focus` | parity: `text-field status=error state=focus-visible: focus edge outline-color … binds color.border.focus, the spec names color.border.danger` (and the filled row); `check:generated` also fails |
  | `fields.ts`: hover wired to `:focus-within`, regenerated | parity: `text-field status=default state=hover … binds color.field.border.rest, the spec names color.field.border.hover`, and the same for password-field |
  | README: the password-field `showMessage` row deleted | parity: `password-field prop showMessage is not in the README's password-field markup contract table` |
  | `password-field.js`: the submit listener never attached | **passed at first** (see Surprises). After the fix: `Show/Hide: submitting the form returns the field to hidden (text → text)` |
  | `button.ts` (the def): `size.medium.hit-target` → `space.300` | not regenerated: `check:generated` fails on `button.css` and `password-field.css`. Regenerated: `light password medium: the Show/Hide hit area is 31.9688×23.9844, under 44×44`, and dark |

### Surprises and learnings

- **A mutation found a vacuous check.** The first submit check passed with the script's submit handler removed. The
  demo form's GET submit reloaded the page, and a reloaded page is masked anyway. The check now cancels the
  navigation after the script's capture listener runs, and a seventh mutant (`addEventListener('submit')` on
  `document` dropped) holds it.
- **The focus-ring part isn't in the fields.** The scope listed it, but #3399 replaced the field's ring with a focus
  edge, so no `nesting` entry names `focus-ring`. The only ring is the nested Show/Hide button's own, Button's.
- **The def's keyboard sentence and its anatomy disagree** on the password field's Tab order (owner decision 2).
- **No coordinate covers a disabled value.** The spec's disabled rows have no value part; the def's paint slot
  settles it (above).
- **`specs.json` gives the small field the medium height** (`size.md.min-height`), so every size keeps a 44px box.
  That's the def's stated intent. The browser check holds 44px at all three sizes.
- **The field-message glyph names look swapped, but aren't.** The `errorGlyph` is `icon/warning-triangle` and the
  `warningGlyph` is `icon/error-circle`. The def's own prose agrees: an exclamation in a triangle for error, in a
  circle for warning.
- **Two instrument traps.** First, a `getClientRects()` box of an inline span is its content area, not the line box,
  which put the glyph 0.7px off. Second, Chromium's 1/64px layout unit reads a met 24px floor as 23.98. Both were
  fixed in the check, with the reason written beside the fix.
- **Playwright's `addStyleTag` never settles in a context with JavaScript disabled.** It waits on a load event, so
  the first full browser run hung for about 10 minutes before it was stopped. Now a `<style>` is inserted by
  `evaluate`, and actions time out at 5 seconds.
- **The parity check passed on its first real comparison.** Its first 53 failures were all README rows not yet
  written, because the check was written before the README.

### Plan changes suggested

- **Land #3839, then delete the TypeScript-def reads** from `fields.ts` and `generate.ts` together. The fields need
  three more keys than the button did.
- **Fix password-field's keyboard sentence** (owner decision 2) in an engine PR to `main`.
- **S4's elements take the README contracts as their input,** as S2 suggested. The script's behavior is already pinned
  by the browser check, so the Lit element can be held to the same checks.
- **The thin Storybook (Q-POC1)** can render `demo-fields.ts`'s markup per state directly.

### Effort

- **Wall clock:** 12:19 to 12:44 UTC to build the generator, demo, script, the three new checks and the hand
  mutations. About 10 minutes of that were the hung browser run. Then the gate run (below) and the PR.
- **Steps:** about 90 tool calls before the gate run:
  - reading (the issue, the journal, the S2 package, the two defs, the emission) about 25;
  - writing 9 files (`fields.ts`, `tokens.ts`, `demo-fields.ts`, `password-field.js`, two checks, the README, this
    entry, the progress entry);
  - running and fixing about 40;
  - mutations 10.
- **Hand edits:** none to generated output. Everything else was hand-written: the generator, demo and checks, the
  script, the README, this entry, the progress entry, `package.json` (exports, files, two scripts) and
  `check-raw-values.ts`.
- **Errors hit:** 8.
  1. The parity check's Button row lookup matched the nesting variant's own `state` key and found no row.
  2. 53 first-run parity failures, all README rows not yet written.
  3. The hung browser run (`addStyleTag` with JS off).
  4. Three instrument failures in the first browser pass: the layout unit, the glyph's line box, and a required field
     blocking the submit.
  5. The vacuous submit check, found by mutation.
  6. Tidying a failure message broke three mutant regexes, caught by the self-test itself.
  7. A command combining a build with a heredoc was refused by a safety check, and was re-run split.
  8. A scratch script needed `.mts` for top-level await.
- **First-try success:** the generated CSS matched the spec on the parity check's first real comparison, and every
  real-browser failure was in the instrument, not the CSS.

**Local gate record** (`npm run verify`'s 109 gates, in 9 foreground chunks of under 10 minutes, with
`GITHUB_BASE_REF=poc/arm-1`, from 12:47 to about 13:45 UTC): 106 PASS, 0 FAIL. Three weren't run locally and are
left to CI, because each alone exceeds the 10-minute chunk: `plugin-test`, and `chrome` with `chrome-shards`. These
are the same three S2 left to CI. `regen` changed nothing. The clone was unshallowed first, for `lint-release-notes`.

## S4 — `@prism3/web-components`: the button as `<p3-button>`, in Lit 3

Started about 12:50 UTC on 2026-11-17, from `poc/arm-1` at `9280cd53`. Built in parallel with S3 (the text and
password fields), which has its own branch; this PR touches no `@prism3/css` file. The thin Storybook (S5, Q-POC1 A)
is a separate PR stacked on this one.

### What was built

`packages/web-components`, the `@prism3/web-components` workspace (`docs/35` §9.1):

- **`generate.ts`, the element generator** (Q96 A). It reads the button def's props from `component-defs.json`
  (generated fresh through `@prism3/css`'s `emission.ts`, never read from `out/`) and writes `p3-button.js`. Each def
  prop becomes one Lit reactive property with the def's name, and each one an attribute can carry reflects to
  `data-prop-<name>`, lowercased. Defaults, value unions and descriptions come from the def. A prop of a type the
  generator has no rule for, or a non-enum prop with no markup mapping, fails generation by name.
- **`p3-button.js`, the element** (Q95 B: Lit 3; Q97 A: `p3-`). It renders into its own light DOM the markup the
  `@prism3/css` README states: a native `<button class="p3-button" data-component="button">` with the four
  `data-prop-*` style hooks, the label, leading and trailing visual spans, the native `type` and `disabled`, and
  `aria-label`. `href` renders an `<a>` instead. No shadow root and no style of its own: `button.css` styles it.
  - **Pending** (per the def): `aria-busy="true"` and `aria-disabled="true"` on the inner button, plus the spinner
    span (hidden from assistive technology), which the CSS swaps into the first visual cell.
  - **Click suppression** (the def's `onClick`: "Suppressed while isPending or isInactive"). A capture listener on
    the host stops a click, Enter or Space while pending or inactive, so no listener or `onClick` runs, no form
    submits and no link navigates. Focus stays.
  - **Slots and label in markup.** Light DOM has no `<slot>`, so on first connect the element moves
    `slot="leadingVisual"` / `slot="trailingVisual"` children into their spans and takes its own text as the label.
- **`custom-elements.json`** from `@custom-elements-manifest/analyzer` (`--litelement`): 12 attributes and 15
  public fields, each with the def's type union, default and description.
- **README**: the prop table (property, attribute, what reaches the inner element) and the behavior.

### Dependencies (all pinned exactly, each release at least two weeks old on 2026-11-17)

| Package | Version | Released | Why |
|---|---|---|---|
| `lit` | 3.3.3 | 2026-05-14 | The element runtime (Q95 B). Brings `lit-html` 3.3.3, `lit-element` 4.2.2, `@lit/reactive-element` 2.1.2. |
| `@custom-elements-manifest/analyzer` | 0.11.0 | 2025-11-04 | Writes `custom-elements.json` (arm 1 architecture item 6). Dev only. |
| `esbuild` | 0.24.2 | 2024-12 | Bundles the element with Lit for the two browser checks. Already in the tree through `tsx`; declared, not added. Dev only. |
| `playwright` | `^1.62.1` | — | As `@prism3/css` declares it. Resolves to the preinstalled 1.62.1. |

**Two transitive pins.** The analyzer pulls in 58 packages. Two resolved to releases under two weeks old:
`@tybys/wasm-util` 0.10.5 (2026-11-16) and `@napi-rs/wasm-runtime` 1.2.7 (2026-11-03). Both are held back with
root `overrides`, to 0.10.4 (2026-09-13) and 1.2.6 (2026-10-25). The root `package.json` says to remove each entry
once the newer release has aged. Every other new package in the lockfile was checked by its publish date.

### Decisions

Followed: Q95 B (Lit 3), Q96 A (generated from the emission, with a parity gate), Q97 A (`p3-button`), Q86 A
(native HTML plus a small script), arm 1 architecture items 1, 2, 6 and 7 (light DOM wrapping a native element;
`@prism3/css` as the single source of truth; `custom-elements.json`; pending as `aria-busy` plus the spinner).

Taken as technical calls (documented in the README, reversible):

- **Unbuilt ES modules.** `p3-button.js` is plain JavaScript with JSDoc types and imports `lit` by name, like the
  CSS package needs no build. A page needs a bundler or an import map. Storybook (Vite) is the first consumer.
- **`aria-label` is the `ariaLabel` property.** The def's name isn't a JS identifier. Declaring it as a Lit property
  shadows the browser's own ARIA reflection on the host, which is wanted: the name belongs on the inner button.
- **The spinner renders only while pending**, not hidden at rest as in `@prism3/css`'s demo. The parity and browser
  checks hold both forms to the same computed styles.

**OWNER DECISIONS** (each built as the recommendation):

1. **OWNER DECISION: the host's attribute names.** Options:
   - **A. `data-prop-<name>` on the host (built).** The same mark `@prism3/css` styles and the adherence scorer
     reads, so `<p3-button data-prop-appearance="outline">` declares its API in the scorer's own terms, and the
     element and CSS forms read alike.
   - B. Plain attributes (`appearance="outline"`, `full-width`, `is-pending`), the common custom-element style.
     Shorter, but a second attribute vocabulary for the same props, and the scorer doesn't read them.
   - C. Both, aliased. Twice the surface to keep in parity.

   **Recommendation: A.** One vocabulary across both delivery forms and the scorer.
2. **OWNER DECISION: slot names in markup.** Options: **A. the def's names, `slot="leadingVisual"` (built)**, or
   B. kebab case, `slot="leading-visual"`, matching the part class `p3-button__leading-visual`. **Recommendation:
   A**, because "props mirror the def exactly".
3. **OWNER DECISION: the host's box.** `<p3-button>` keeps the default `display: inline`. The browser check measured
   one consequence: in a flex row, the host is the flex item, not the inner button, so a flush button's
   `min-inline-size: auto` computes as `0px` where the plain form computes `auto`. (The check compares both forms
   inside an inline wrapper, so it compares like with like.) Options:
   - **A. Leave the host inline for the POC (built).** No CSS change; `fullWidth` still fills its container,
     because an inline box doesn't establish the containing block.
   - B. `p3-button { display: contents }` in `@prism3/css`. The button becomes the flex or grid item directly, but
     the CSS package then names the element, and the change lands in `generate.ts` while S3 is editing it.
   - C. The element sets `display: contents` inline. An author can't override it without `!important`.

   **Recommendation: A now, then B after S3 merges** if the Storybook layouts show a flex or grid case that needs it.
4. **OWNER DECISION: the busy announcement and the spinner delay.** The def asks for a polite live region that
   announces the busy state ("Saving…") and a delayed spinner with a minimum show time. Neither is built. The
   announcement's wording is copy (voice), and the delay is waiting on #3486. Options: **A. defer both to S5 proper,
   with the accessibility pass (built: deferred)**, or B. announce the label plus a fixed word now. **Recommendation:
   A.**
5. **OWNER DECISION: element names beyond `p3-button`.** Q97 A gives the prefix. The rule built is `p3-<def id>`, with
   the class `P3<PascalCase id>` (`P3Button`), so text-field would be `<p3-text-field>`. The tone siblings follow
   whatever the Q145 follow-up settles (the S2 follow-ups entry recommends B, `data-component`). Nothing for tone is
   built here. **Recommendation: `p3-<def id>`.**

### What was checked, and how

Three new CI steps, mirrored in `verify.ts`, CONTRIBUTING §3, CLAUDE.md §4 and the PR template (`lint-doc-gates`
clean). `packages/web-components/` joined the layout regions in the root README, CLAUDE.md and `docs/09` §3
(`lint-layout-claims` clean).

- **`check:generated`**: `p3-button.js` equals a fresh generation, and `custom-elements.json` equals a fresh
  analyzer run over it.
- **`check:parity`**, the element gate (docs/34). EXPECTED is `components.ai.json` and `component-defs.json`, which
  must first agree with each other, plus the check's own hand-written `CONTRACT`: each prop's property name,
  attribute and the inner attributes each value must produce. ACTUAL is read twice: `custom-elements.json` (public
  fields, attributes, reflection, type unions, defaults) and the element live in Chromium (Lit's
  `elementProperties`, a fresh element's values, and the inner markup for 24 prop values, set by attribute and by
  property). Invented and missing props both fail. Six in-memory mutants each fail by name: a dropped prop
  (`inset`), a dropped value in the manifest (`appearance` `text`), pending without `aria-busy`, a changed default
  (`size` small), an invented prop (`tone`) and a renamed attribute (`fullWidth`).
- **`test:browser`**, 107 checks with the real token CSS and `button.css`:
  - **Both delivery forms.** 18 samples (each appearance × size, inverse, flush, pending with and without visuals,
    inactive, disabled, visuals), side by side on light and dark. Every part's 18 computed properties are equal
    between the element and plain HTML written from the `@prism3/css` contract. A filled fill must not be
    transparent, so an unstyled page can't pass.
  - **Behavior.** A rest click runs the listener and `onClick` once; Enter and Space activate. Pending and inactive
    suppress a click, Enter and Space, submit no form, keep focus and keep the name "Save changes". A pending link
    doesn't navigate. Disabled is native and skipped by Tab. The default type submits nothing; `submit` does.
  - **Markup.** A text label and a `slot="leadingVisual"` child land in their spans; a pending toggle adds and
    removes the spinner, `aria-busy` and the reflected attribute; `href` renders a link; `fullWidth` fills a 480px
    box; Tab paints the focus ring.
  - Three mutants fail by name: click suppression removed, a shadow root in place of the light DOM, and the default
    type changed to `submit`.
- **Hand mutations on disk**, after a `wip:` commit, each restored with `git show HEAD:<path> > <path>`:

  | Mutation | Fails by name |
  |---|---|
  | `p3-button.js`: `isInactive`'s attribute renamed `data-prop-inactive` | `check:generated`: `p3-button.js is not what generate.ts writes`; parity: `prop isInactive: isInactive's attribute is data-prop-inactive, the contract says data-prop-isinactive` |
  | `generate.ts`: inactive no longer sets `aria-disabled`, regenerated | parity: `isInactive=true: inner aria-disabled is null, the contract says "true"`; browser: `light inactive: the element's container differs from plain HTML: background-color …` |
  | `generate.ts`: the `isInactive` markup row deleted | generate: `button.isInactive: a flag prop with no markup mapping in generate.ts` |

### Surprises and learnings

- **The parity gate passed on its first real run**, and the browser check's only real-run failures were in the
  instrument (below). The S2 contract was specific enough to write an element against without guessing.
- **The host's box shows up in computed values.** `min-inline-size: auto` serializes as `auto` on a flex item and
  `0px` elsewhere, so the element's inline host changed a computed value with no visual change. That is owner
  decision 3.
- **The spinner's enter fade made the first comparison flaky.** The element's spinner mounts later than the static
  one, so its opacity was mid-fade when read. The check now waits for every finite animation.
- **The analyzer joins `--outdir` onto its cwd.** An absolute temp path landed under the package as
  `tmp/prism3-cem-…/`; it was caught in `git ls-files` and removed before the PR.
- **A generator that edits files beside its output** is a hazard a freshness check can't see: the check compares the
  manifest, not `package.json`. Reading `git status` after a gate run is what caught it.
- **Transitive packages can be days old even when the direct pin is a year old.** The analyzer's 0.11.0 is from
  2025, but two of its dependencies resolved to releases from this month.

### Plan changes suggested

- **S6 can fold `check:parity` in as is** and extend `CONTRACT` per component, as with `@prism3/css`.
- **S3's elements should reuse the generator's rule** (every enum prop is a `data-prop-*` style hook; every other
  prop needs a named mapping), so a text field's `<input>` attributes are declared, not guessed.
- **Decide owner decision 3 before S5's layout stories**, since a flex or grid story is where the host's box shows.

### Effort

- **Wall clock:** about 12:50 to 13:12 UTC for the package, the three checks, the wiring and the hand mutations
  (about 22 minutes), then the full gate run.
- **Steps:** about 45 tool calls before the gate run: reading (the issue, journal, CSS package, scorer, def, CI and
  doc wiring) about 15, writing 8 files, running and fixing about 20.
- **Hand edits:** none to generated output. The generator, the bundling helper, three checks, the README, five
  doc checklists, `ci.yml`, `verify.ts`, three layout regions, the root `overrides`, this entry and the progress
  entry were written by hand. The lockfile came from `npm install --package-lock-only --ignore-scripts`, validated by
  `npm ci`.
- **Errors hit:** 7.
  1. `npm install … esbuild` without `--save-dev` put it in `dependencies`; regenerated the lockfile from the base.
  2. The first `overrides` pass left the lockfile unchanged, and deleting the two entries by hand left it
     inconsistent. Regenerating from the base lockfile with the overrides in place was the fix.
  3. The analyzer's `--outdir` with an absolute path (above).
  4. Playwright's `evaluateAll` with a string expression returned `undefined`; replaced by a scoped role locator.
  5. The spinner fade timing (above).
  6. The shadow-root mutant threw before the behavior section could report; that section now records a thrown
     error as a failure.
  7. **The analyzer rewrites `package.json`.** By default it sets the `customElements` field to wherever it wrote,
     so every `check:generated` run pointed it at a deleted temp dir, and a corrupted value was committed in a `wip:`
     commit. Found in `git status` after the gate run, not by a gate. `custom-elements-manifest.config.mjs` now sets
     `packagejson: false`, `package.json` names the committed manifest by hand, and a rerun of both commands leaves
     it byte-identical.

**Local gate record** (`npm run verify`'s 112 gates, with `GITHUB_BASE_REF=poc/arm-1`, after `regen`, in 5 chunks):
109 PASS, 0 FAIL, 3 not run locally. `lint-schema-classification` failed once inside the 67-gate chunk
(`lint-us-english.ts --files` "listed 0 schema file(s)") and passed when rerun alone, with nothing changed; a flake
under load, not this diff. Not run locally, left to CI: `chrome` and `chrome-shards` (cut at the 10-minute chunk
limit with no failure printed) and `plugin-test` (cut at the same limit in S2). This diff touches none of their
inputs.


---

## S5 (thin) — the arm 1 Storybook: the button in both delivery forms

Started about 13:52 UTC on 2026-11-17. **Stacked on S4** (`poc/arm-1-s4-web-components`), because the element
stories need `<p3-button>`. Q-POC1 A pulled a thin Storybook forward from S5. The accessibility and keyboard pass
(`addon-a11y`, `addon-vitest`, axe, Q144 A) stays in S5 proper.

### What was built

`apps/storybook`, the `@prism3/storybook` workspace. It's a surface that builds and ships nothing, so it sits
beside Studio and the plugin, not under `packages/`.

- **Storybook 10 on `@storybook/web-components-vite`** (arm 1 architecture item 5). `main.js` resolves the framework
  and the addon by path, because npm hoists `storybook` to the root but keeps the framework under the workspace.
  Telemetry is off.
- **`preview.js`** loads the shipped CSS the way a client does (`@prism3/tokens`, then `@prism3/css/button.css`,
  then `@prism3/web-components`), and passes `custom-elements.json` to `setCustomElementsManifest`, so the element's
  controls come from the analyzer. A toolbar global switches `data-theme` between light and dark. An inverse story
  sits on the inverse background.
- **Stories, `stories/button/`.** `cases.js` holds 18 cases shared by both forms:
  - one per def state: rest, hover, pressed, focus-visible, disabled, inactive and pending;
  - each appearance, plus text flush;
  - each size;
  - inverse, filled and outline;
  - with visuals, and full width.

  `button.element.stories.js` (`Components/Button/Element`) sets `<p3-button>`'s properties.
  `button.html.stories.js` (`Components/Button/HTML`) writes `@prism3/css`'s README markup. That's 36 stories.
- **Hover, pressed and focus-visible are forced** by `storybook-addon-pseudo-states` (its `pseudo` parameter). It
  rewrites `button.css`'s rules inside `@layer p3` without trouble.
- **Built for S3 to slot in.** Text-field and password-field each add a `stories/<component>/` folder with the same
  three files, one stylesheet import in `preview.js`, and their rows in `check-build.ts`'s `EXPECTED`. No config
  changes. None are added here.

### Dependencies (pinned exactly, each release at least two weeks old on 2026-11-17)

| Package | Version | Released | Note |
|---|---|---|---|
| `storybook` | 10.6.5 | 2026-10-27 | The scope comment named 10.6.6, which is from 2026-11-05: too new. |
| `@storybook/web-components-vite` | 10.6.5 | 2026-10-27 | Brings `@storybook/web-components` and `@storybook/builder-vite` 10.6.5. |
| `storybook-addon-pseudo-states` | 10.6.5 | 2026-10-27 | Forces the pseudo-class states. |
| `vite` | 8.3.5 | 2026-10-21 | The builder's peer. |
| `rolldown` | 1.2.16 | 2026-10-29 | Vite's bundler, pinned as a devDependency here (below). |
| `postcss` | 8.5.32 | 2026-10-26 | Vite's, the same way. |
| `lit` | 3.3.3 | 2026-05-14 | As in S4; the preview's theme frame is a Lit template. |

**The transitive pins.** Storybook and Vite add 176 packages. Seven resolved to releases from the last two weeks.
- **Root `overrides`** hold back four of them: `ws` 8.22.1, `@babel/runtime` 7.29.10,
  `@testing-library/user-event` 14.6.8 and `@rolldown/pluginutils` 1.0.1.
- **The other three are pinned as exact devDependencies of the workspace:** `rolldown` 1.2.16 (which pulls its
  platform bindings to 1.2.16 with it), `postcss` 8.5.32 and `vite` itself. A root override didn't reach the Vite
  that npm nests under `apps/storybook`, which is why.

After both, every one of the 176 new packages was checked by its publish date. No existing lockfile entry changed
version.

### Decisions

Followed: Q-POC1 A (a thin Storybook first), Q95 B (Lit 3 for the element stories), arm 1 architecture items 5
(Storybook 10, `web-components-vite`, both delivery forms, a story per state) and 6 (controls from
`custom-elements.json`), and Q144 A (axe waits for S5 proper).

**OWNER DECISIONS** (each built as the recommendation):

1. **OWNER DECISION: story organization.** Options:
   - **A. One file per delivery form, `Components/<Component>/Element` and `…/HTML`, with the same story names
     (built).** The sidebar reads component, then form, then state, and the check can pair the forms by name.
   - B. One file per component, with paired stories ("Rest — element", "Rest — HTML").
   - C. One story per state, showing both forms side by side.

   **Recommendation: A.** It keeps each form's source panel clean for a client copying it. C is a good docs page for
   S5 proper.
2. **OWNER DECISION: forcing pseudo-states.** Options: **A. `storybook-addon-pseudo-states` (built)**, Storybook's
   own addon, one more dependency, or B. no forced states: hover, pressed and focus are live only, so a static
   screenshot can't show them. **Recommendation: A**, because the KPI 2 and KPI 3 checks (Q32 A) render from these
   stories.
3. **OWNER DECISION: "each tone".** The brief asks for a story per tone, but only the primary tone exists:
   Destructive and Neutral wait on the Q145 follow-up (S2 follow-ups entry; the recommendation there is B,
   `data-component`). The appearance stories (filled, outline, text, flush) and the inverse surface stand in.
   **Recommendation:** add the tone stories in the PR that builds the tones. It's one case each in `cases.js`.
4. **OWNER DECISION: where it lives.** **A. `apps/storybook` (built)**, a surface that builds, or B. `packages/`.
   **Recommendation: A.**

Not done here, for S5 proper: `addon-a11y` and `addon-vitest` (`@axe-core/playwright` is Q144 A's), the keyboard
tests, and running the US-English and voice scans over the built Storybook (arm 1 architecture, "New gates").

### What was checked, and how

Two new CI steps, mirrored in `verify.ts`, CONTRIBUTING §3, CLAUDE.md §4 and the PR template (`lint-doc-gates`
clean). `apps/storybook/` joined the layout regions in the root README, CLAUDE.md and `docs/09` §3
(`lint-layout-claims` clean).

- **`build`**: `storybook build` writes `storybook-static/` (gitignored) in about 2 seconds.
- **`check:build`**, 144 checks. It serves the static build and opens every story in Chromium.
  - **The index** holds exactly the 36 stories in the check's own hand-written `EXPECTED`
    (component × form × case). Both a missing story and an extra one fail.
  - **Each story renders a `.p3-button`**, inside `<p3-button>` for the element form and not for HTML.
  - **Each forced state shows.** The check waits for the addon's class on the story root, then requires:
    - hover and pressed paint a different fill than rest;
    - focus-visible draws an outline, and rest draws none;
    - pending, disabled and inactive carry their attributes;
    - the three sizes have three heights;
    - inverse paints a different fill than rest;
    - rest's fill isn't transparent.
  - **Both forms agree.** The element and HTML stories of each case compute the same fill, ink, border, outline,
    height and padding.
- **Hand mutations on disk**, after a `wip:` commit, each restored with `git show HEAD:<path> > <path>` and
  rebuilt:

  | Mutation | Fails by name |
  |---|---|
  | The HTML `Hover` export deleted | `index: story components-button-html--hover is missing from the build` |
  | `Pressed` no longer forced (`pseudo` removed) | `components-button-element--pressed: the story root never got pseudo-active-all, so the addon did not force the state`, and the same for HTML |

### A correction to S4, found here

**S4's browser test named two tokens that don't exist.** Its page background read
`--pds3-color-surface-default` and `--pds3-color-inverse-surface-default`, which aren't in the token CSS, so the
background was transparent. The comparisons it makes are unaffected, because both forms sit on the same background.
It was found while choosing the preview frame's tokens here. This PR fixes it to `color.background-primary` and
`color.inverse.background-primary`, the tokens `@prism3/css`'s demo uses, and the test still passes 107 checks. The
fix is carried here, not pushed to the S4 branch, because that branch was already up for review.

**Learning:** a check page's own styling escapes the R1 scan, because `check-raw-values` covers the package's CSS
and demo, not test pages.

### Surprises and learnings

- **The HTML stories rendered as text at first.** The theme frame is a Lit template, and Lit renders a string as
  text. The HTML stories now parse their markup into nodes. The first check run said "did not render a .p3-button"
  for all 18.
- **The pseudo-state addon is asynchronous.** It applies its class after `STORY_RENDERED`, so a read straight after
  render saw rest. The check waits for the class it expects. That also makes "the addon didn't run" a failure by
  name, not a silent rest-colored pass.
- **npm overrides don't reach a nested copy.** Root `overrides` held back four transitive packages but not
  `rolldown` and `postcss`, which belong to the Vite nested under the workspace. Exact devDependencies did.
- **Storybook's core can't find a nested framework by name.** The standard monorepo fix, resolving each package
  to its folder in `main.js`, is in place.

### Effort

- **Wall clock:** about 13:52 to 14:16 UTC for the workspace, the stories, the check, the wiring, the mutations
  and this entry; then the gate run.
- **Steps:** about 35 tool calls: dependency research and pins about 10, writing 9 files, running and fixing about
  15.
- **Hand edits:** all of it. Nothing in this workspace is generated. The lockfile came from
  `npm install --package-lock-only --ignore-scripts`, validated by `npm ci`.
- **Errors hit:** 5.
  1. Root overrides missed the nested Vite's `rolldown` and `postcss` (above).
  2. A shell-quoting slip in an inline `node -e` (an apostrophe in a comment string). Moved to a script file.
  3. `@storybook/web-components-vite` wasn't found by the hoisted core (above).
  4. The HTML stories rendered as text (above).
  5. The first check read the forced stories before the addon applied its class (above). Its 18 timeouts made that
     run take 4 minutes 42 seconds; the fixed check takes about 13 seconds.

**Local gate record** (`npm run verify`'s 114 gates, with `GITHUB_BASE_REF=poc/arm-1`, after `regen`, in 4 chunks):
111 PASS, 0 FAIL, 3 not run locally, left to CI as in S2 and S4: `chrome`, `chrome-shards` and `plugin-test`.
`lint-us-english` and `lint-voice` failed once when run before the Studio and plugin builds existed in this fresh
worktree ("the gate's SCOPE shrank"), which is their ordering rule working. Both passed after the builds.


---

## Refresh 3 — `main`'s emission bindings, and `@prism3/css` reads emitted files only (Q142 A; a Q55 data point)

Started about 17:35 UTC on 2026-11-17, from `poc/arm-1` at `f3e6dc4b`, merging `main` at `77f4ced5`: 15 commits,
merged with a merge commit (`75ea4eed`), never rebased. #3841 (Button's motion bindings, Q146 A) isn't on `main` yet,
so it's not in this refresh.

### What arrived

- **#3839 (#3506, Q142 A):** the emission carries each component's corner, stroke, focus ring and motion bindings.
  `specs.json` went from format 1.0 to 1.1 and `component-defs.json` from 1.3 to 1.4. `radius` and `strokeWidth` are
  new redline keys, `focusRing` lists each part that nests the shared ring (offset, width, style), and `motion` lists
  each `motion.*` binding. The spinner now binds its five motion tokens by key (`motion.turn`, `motion.enter`, …).
- **#3835 (Q-HT1 A):** `space.550` joins the spacing scale. It was already on this branch through the second update.
- **Neither version moved.** ENGINE_VERSION is still 0.238.0 and CONTRACT_VERSION 15.1.0: #3839's change note waits
  for the next fold. The token CSS didn't change.

### What broke

- **The generator, loudly.** `check:generated` crashed on the first new key: `no CSS property for redline "radius" on
  container`. The generator refuses keys it has no rule for, so a new key fails it by name.
- **The fields, quietly (caught by the byte check).** A redline row's key grows where a value moves. The field's
  stroke moves at focus, so its rows went from one per size to one per size and state (3 × 7). Each row had the same
  padding and gaps, and the generator wrote one rule per row, so `text-field.css` grew by 207 duplicate lines. The
  output was still correct CSS, so only `check:generated`'s byte comparison saw it. Without that check, the duplicates
  would have shipped.
- **Both parity checks, by name.** They probe every redline key, so they met `radius` and `strokeWidth` too.
  `check-parity.ts` failed 48 bindings as `container radius binds (no token: )`. It had no CSS property for the key,
  read an empty property, and reported it as a value mismatch, not a missing rule. `check-parity-fields.ts` failed
  126 as `redline container/control.radius has no CSS property in this check`. It also probed every redline row at
  rest, which became wrong once rows carry `state`. `check:parity` runs the two with `&&`, so the fields' failure
  showed only after the button's was fixed.

### The fix (this PR)

- **`generate.ts` and `fields.ts` read the four binding kinds from `specs.json`.** They stop importing the TypeScript
  defs. The new helpers are in `emission.ts`:
  - `uniformRedline` takes the one token a part's corner or stroke binds across the rows the CSS folds together, and
    fails when they bind more than one. The button's container uses one radius and one stroke. The field's box uses
    one radius, one stroke in every code state but focus, and one focus edge.
  - `ringStyle` is the shared ring's own style. Every host's `focusRing` row names it, and they must agree. The fields
    nest no ring, but their focus edge uses the ring's style.
  - `motionBinding` reads the spinner's motion by key.
- **The fields' redlines collapse by state.** Rows that differ only by `state` write one rule. A value other than the
  stroke that differs between two states of one size fails by part.
- **Facts the emission doesn't name, derived from what it does:**
  - **The button's slot axes.** A slot axis's part is the one swap part present in a redline row exactly when the
    axis is `true`. This replaces `figmaProperties.slotAxes`.
  - **The spinner's identity.** It's the nesting's `fixed` components (`spinner/small`, …). This replaces
    `spinner.id`.
  - **The field's pending spinner size and ink.** It takes the leading glyph's width and rest ink. These were the
    def's `icon-size` and `icon` keys, which no row names, and they resolve to the same tokens.
  - **The disabled value's ink.** It's the disabled placeholder's ink. This replaces a cross-check against the def's
    `disabled.label.on-fill`, which resolves to the same token.
- **The parity checks read the new keys.** `radius` is read as `border-top-left-radius` and `strokeWidth` as
  `border-top-width`. In the fields, each redline row is probed in its own state, and a focus row's stroke is the
  focus edge's `outline-width` (#3399). A redline key the button check has no property for is now a named gap, not an
  empty read. The fields now check 1,149 bindings, up from 1,065.
- **The residual, `residual.ts`.** Two facts aren't emitted, so they're still read from the defs, in this one file:
  - Button's hit-target floors (`size.<size>.hit-target`, Q-HT1 A). #3835 bound them after Q142 A was decided.
  - The pending spinner's `replaces` and `overlaysWhenAbsent`. This was #3506's fourth item, which #3839 left out.

  Filed as #3917. `generate.ts --check` now scans every script in the package and fails if anything other than
  `residual.ts` imports the engine, or if `residual.ts` exports anything beyond those two facts.

**OWNER DECISION: the two facts the emission doesn't carry** (#3917). Options:
- **A. Keep the two-fact residual in `residual.ts` until the engine emits them (built).** The import is in one
  file, held there by `check:generated`, and deleted when #3917 lands.
- B. Emit both now, in an engine PR to `main`, before this refresh merges. This keeps Q142 A literally, but adds an
  engine PR and a second refresh to this lane.
- C. Restate both in `@prism3/css` as literals, with the parity check holding them. This drops the import but
  restates def data, which Q96 A rules out.

**Recommendation: A**, with #3917 as the follow-up. The residual is two facts, named, and its size is enforced. B is
the right end state, and it doesn't block the fields' elements.

### What was checked, and how

- **Byte identity.** Every generated file was saved before the merge. After the change, `button.css`,
  `field-label.css`, `field-message.css`, `text-field.css`, `password-field.css` and `demo.html` are all `cmp`-equal
  to it, and `check:generated` passes. No binding changed value, so the CSS didn't change.
- `@prism3/css`: `check:raw-values`, `check:parity`, `test:browser`. `@prism3/web-components`: `check:generated`,
  `check:parity`, `test:browser`. All pass.
- **Mutations, each after a `wip:` commit, restored with `git reset --hard`:**

  | Mutation | Fails by name |
  |---|---|
  | `fields.ts` imports `@prism3/engine/components/index` | `FAIL @prism3/css sources: fields.ts imports @prism3/engine/components/index; only residual.ts may (Q142 A)` |
  | `residual.ts` gains a third export | `residual.ts exports hitTargetFloor, pendingReplacement, extra; the residual is … only` |
  | The text field's hover stroke bound to `focus.ring.width` in the def | `text-field container/control.strokeWidth: binds border-width.hairline, focus.ring.width across its rows, not one token` |
  | The spinner def loses `motion.enter-easing` | `spinner has no motion binding "motion.enter-easing" in the emission` |
  | **The emitter alone** (`component-specs.ts`) writes the ring offset token as the ring's width; no def changed | `button.css is not what generate.ts writes from the emission` |
  | The generator binds the button's corner to `radius.sm`, regenerated | `check-parity.ts`: `container radius binds radius.sm, the spec names radius.md` (24 bindings) |
  | The field's focus edge drawn at the rest stroke width, regenerated | `check-parity-fields.ts`: `text-field size=medium state=focus-visible: container/control strokeWidth binds border-width.hairline, the spec names focus.ring.width` (12) |

  The last row is the one that matters for Q142 A. A change made only to the emission reaches the CSS, so the
  generator reads the emission and not the defs. **One known blind spot:** a generator that restated
  `'radius.md'` as a literal, with the same value, still passes `check:generated`, because the output is the same.
  The parity check's own `CONTRACT` and the browser checks catch a wrong value, not a restated right one.
- The full `verify.ts` run, with `GITHUB_BASE_REF=poc/arm-1`, is in the PR body.

### Surprises

- **A redline key can grow under a consumer.** #3839's own note says so ("a row's key grows where they move"), but
  a consumer that keyed rules by row didn't notice: its output stayed valid CSS, just repeated.
- **Two facts the owner thought were covered weren't.** Q142 A was decided before Q-HT1 A bound the hit-target floors,
  so the list the engine PR built from didn't include them.

### Effort

- **Wall clock:** about 17:35 to 18:45 UTC for the merge, the mapping, the change, the guard, the mutations, this
  entry and the gate run (about 30 minutes of it).
- **Conflicts:** none. `npm ci` was clean.
- **Hand edits:** `generate.ts` (about 40 lines), `fields.ts` (about 50), `emission.ts` (+35), `residual.ts` (new,
  34), the two parity checks (about 12 lines), three README sentences, this entry and the progress entry. No generated file changed.
- **Errors hit:** 3, all from the update (above). The parity failure was missed at first: a quick run's `tail -2`
  showed only the self-test lines, and the FAIL line above them was cut off. `verify.ts`'s table caught it. One mutation `sed` matched nothing the first time, because the
  field's stroke tokens are built in a loop. It was redone on the loop.

**Lesson for Q55.** The update was additive, a minor format bump and no version change, yet it broke the consumer
three times. Two breaks were loud: a key the generator had no rule for, and a key the parity checks couldn't read.
One was quiet: a row key that grew. The consumer was
protected by being strict about unknown input and by checking its output byte for byte, not by the version numbers.

### Review fixes (the CHANGES verdict on `90a500bc`)

- **Base merge.** `poc/arm-1` moved to `2a08d9e7` (#3895, S5 thin) after this branched. It was merged in with a merge
  commit. The only conflict was this journal, where both sides appended an entry; both are kept, S5 first, in the
  order they started. `main` was not merged again, so #3841 (Button's motion) is still not in this refresh.
- **The Q142 A guard read spellings, not paths.** `engineImports()` matched only `@prism3/engine…` and the one
  relative spelling that climbs a single level to the engine, so `import '../../packages/engine/components/index'` passed `check:generated`, and `require(…)` was
  never scanned. It now reads every specifier (`import … from`, `export … from`, a bare `import '…'`, `import(…)`,
  `require(…)`), resolves each relative or absolute one against the package, and fails when it lands under
  `packages/engine/` outside `out/`. Each probe below is a new `probe.ts` in the package, which the generator does not
  import, so the guard and not a crash is what fails:

  | Probe | `check:generated` |
  |---|---|
  | `import '../../packages/engine/components/index';` | `FAIL @prism3/css sources: probe.ts imports ../../packages/engine/components/index; only residual.ts may (Q142 A)` (passed before the fix) |
  | `const _e = require('../engine/theme');` | `FAIL … probe.ts imports ../engine/theme; …` (passed before the fix) |
  | `export { button } from './../engine/components/index';` | `FAIL … probe.ts imports ./../engine/components/index; …` |
  | an absolute path to `packages/engine/theme` | `FAIL … probe.ts imports <path>/packages/engine/theme; …` |
  | `await import('@prism3/engine/theme')` | `FAIL … probe.ts imports @prism3/engine/theme; …` |
  | `import '../engine/out/components/specs.json';` (control) | OK: an emitted file is not the engine's code |
  | `import '../../tools/agent-adherence/score-code';` (control) | OK: outside `packages/engine/` |

  **Still not seen:** an engine import reached *through* another module. `check-browser*.ts` and
  `check-raw-values.ts` reach `@prism3/engine/color` through `tools/agent-adherence/score-code.ts`. They are checks,
  not the generator, so Q142 A does not cover them, and the guard reads direct specifiers only.
- **`outline-width` now reads the focus ring's own `width`.** It is carried in the emission's `focusRing`. Before,
  it followed the button's `ring-width`, which the emitter uses only as `strokeInset`. Both are `focus.ring.width`
  today, so the bytes are the same. Rebinding the button's `ring-width` alone no longer moves the CSS, and rebinding the
  focus ring's `width` does. This is the more correct source, because the outline the CSS draws is the ring.

---

## S4 for the fields — `<p3-text-field>` and `<p3-password-field>`, in Lit 3

Started about 18:44 UTC on 2026-11-17, stacked on the "Refresh 3" PR (`poc/arm-1-emission-bindings` at `90a500bc`).
It follows `<p3-button>`'s pattern (S4): generated from the emission, light DOM, styled only by `@prism3/css`.

### What was built

- **`generate-fields.ts`**, called from `generate.ts`, so `check:generated` covers all three elements. It writes
  `p3-text-field.js` and `p3-password-field.js` from each def's props in `component-defs.json`. Each prop is a Lit
  property of the def's name, reflected to `data-prop-<name>`, with the def's default and description. The
  exception is `value` (owner decision 4). A prop of an unknown type, or one with no `MARKUP` row, fails generation
  by name. The Show/Hide button's variant comes from `specs.json`'s `nesting`. The message glyphs come from
  `field-message`'s anatomy `when`. The glyph art comes from `@prism3/css`'s `demo-fields.ts`, now exported, so both
  delivery forms draw the same marks.
- **The markup is `@prism3/css`'s fields contract.** A native `<label for>` and `<input>` sit in one tree with the
  message. The label's `for` names the input's id, which is generated when unset. `aria-describedby` names the
  message when `showMessage` is on, and `aria-invalid` is set at `error`. The spinner span is always written. The
  three status glyphs are in the glyph cell, so a live status change is one attribute.
- **The Show/Hide button, in Lit** (Q301.4 A, Q301.5 A, Q301.7 A). It's `@prism3/css`'s nested Button markup, never
  hidden once the element runs, with `aria-controls` naming the input. Its visible text is "Show" or "Hide" plus a
  visually hidden " password", and it has no `aria-pressed`. A press switches `type` in the same task, keeps the
  caret (below) and focus, and announces once in the page's polite live region. A submit returns the input to masked
  in the capture phase. Disabled disables the button; read-only leaves it live.
- **The markup works before JS runs.** `@prism3/css`'s markup written inside the element is a plain field: the
  button stays hidden, or `password-field.js` runs it. On upgrade the element adopts the markup's props: size,
  validation, label, the input's attributes, the message and its text, the glyphs, a value typed before the upgrade,
  and focus with the caret. Then it renders its own. `password-field.js` now stands aside inside a `:defined`
  `<p3-password-field>`, so a page that loads both toggles once.
- **`value` and `onChange`.** `onChange` is called with each `input` event. Typing updates `value`, and setting
  `value` sets the input.
- `custom-elements.json` covers all three elements. The package's `exports` and `files` list the two new modules,
  and both READMEs document the fields.

### Decisions

Followed: Q95 B (Lit 3), Q96 A (generated from the emission, with a parity gate), Q97 A (`p3-<def id>`, as S4 owner
decision 5 recommended), Q86 A (native HTML plus a small script, here the element), S4 owner decision 1
(`data-prop-*` on the host), S4 owner decision 2 (slot names are the def's: `slot="leadingIcon"`), and
Q301.2 B / Q301.3 B / Q380 A for the Show/Hide button's place and variant.

**Settled by the def, so not an owner decision:** the toggle's accessible name and icon. Q301.4 A and Q301.5 A give
the name ("Show password" / "Hide password", from visible text plus a visually hidden suffix), no `aria-pressed`, and
no icon. The def's "avoid" list names an eye icon inside the field. The wording is DRAFT (Q301.5). The element reads
the same `data-p3-*` overrides as `@prism3/css`'s script.

**OWNER DECISIONS** (each built as the recommendation):

1. **OWNER DECISION: def props named like built-in element members: `id`, `inputMode` and `prefix`.** Mirroring the
   def exactly means Lit properties of those names, which shadow `HTMLElement.id`, `HTMLElement.inputMode` and
   `Element.prefix` on the host. Options:
   - **A. Mirror exactly (built).** `el.id` and `data-prop-id` name the inner input, as `ariaLabel` does on
     `<p3-button>`. The host's own `id` attribute still exists, but `el.id` no longer reads it. A page that writes
     `<p3-text-field id="email">` gives the host that id, not the input, so a `<label for="email">` outside it
     labels nothing.
   - B. Keep the built-ins and rename the props on the element (`inputId`, …). This breaks "props mirror the defs"
     and the parity gate's one-name rule.
   - C. Move a host `id` attribute onto the input at upgrade, as React's `id` does. The host then has no id, and a
     framework that sets `el.id` reaches the input.

   **Recommendation: A** for the POC, with the README naming `data-prop-id`. Revisit if the Storybook stories or the
   ejection scenario set `id` on the host.
2. **OWNER DECISION: events.** The def has one handler, `onChange`, described as "Change handler (also onBlur /
   onFocus)", which reads as React's per-keystroke `onChange`. Options:
   - **A. No custom events (built).** `onChange` is called on each `input` event, and the native `input`, `change`,
     `focus` and `blur` events bubble from the inner input through the host, because the DOM is light.
   - B. Also dispatch a `p3-change` `CustomEvent` from the host, the common custom-element style. That's a second
     event name per prop to keep in parity.
   - C. Call `onChange` on `change` (commit) rather than `input`.

   **Recommendation: A.** One handler that matches the def's React reading, and native events for everyone else.
3. **OWNER DECISION: how markup works before JS runs.** Options:
   - **A. Adopt on upgrade (built).** The `@prism3/css` markup written inside the element works alone, and the
     element reads its props, a typed value and focus from it, then renders its own.
   - B. Lit SSR with hydration (`@lit-labs/ssr`). This adds a server render step and a dependency.
   - C. No pre-JS markup: the element is empty until defined, and pages that need it use `@prism3/css` directly.

   **Recommendation: A.** It is Q86 A's progressive enhancement with no new dependency, and the browser check holds
   all three stages: no script, the CSS script only, then the element.
4. **OWNER DECISION: `value` is a property only, never an attribute.** Every other prop reflects to `data-prop-*`.
   Reflecting `value` would write each keystroke into the DOM, including a password, where page scripts, extensions
   and DOM snapshots read it. Options: **A. property only (built)**, with `defaultValue` as the attribute; or B.
   reflect it like the rest. **Recommendation: A.**
5. **OWNER DECISION: `prefix`, `suffix` and `clearable` are declared but not rendered.** The def's anatomy has no
   part for a text affix (#1699) or a Clear button, so `@prism3/css` has no style for them. Options: **A. declare,
   don't render, and document it (built)**; or B. build a Clear button in the element now, unstyled by any def.
   **Recommendation: A**, until the def's anatomy has the parts.

Taken as technical calls (documented in the README, reversible): the generated id is `p3-<def id>-<n>`; the host
stays `display: inline`, as on `<p3-button>` (S4 owner decision 3, still open); and tab order is the anatomy's
(button, then input), as `@prism3/css` has it (S3 owner decision 2, still open).

### What was checked, and how

The CI steps aren't new: `check:parity` and `test:browser` chain the fields' checks after the button's, and
`check:generated` covers the three elements.

- **`check:generated`**: the three elements equal a fresh generation, and `custom-elements.json` equals a fresh
  analyzer run over all three.
- **`check-parity-fields.ts`**, the fields' element gate (docs/34):
  - **EXPECTED** is `components.ai.json` and `component-defs.json`, which must agree, plus the check's own
    hand-written contract: where each prop lands, by selector inside the host.
  - **ACTUAL** is the manifest and the live elements: 42 text-field and 26 password-field prop values, set by
    attribute and by property. Invented and missing props fail.
  - **The associations, on every element:** the label's `for` is the input's id and its `control` is the input;
    two elements never share a generated id; `aria-describedby` names the message in the same tree; and the button's
    `aria-controls` names the input. Setting `value` sets the input, and it is never written to `data-prop-value`.
  - **Eight mutants fail by name:** error without `aria-invalid`; the message missing from `aria-describedby`; the
    label not naming the input; a dropped prop (`readOnly`); an invented prop (`reveal`); a changed default
    (`size`); the button without `aria-controls`; a value dropped from the manifest's `autoComplete` union.
- **`check-browser-fields.ts`**, 1,304 checks with the real token CSS and all five `@prism3/css` stylesheets:
  - **Both delivery forms.** Each sample is drawn twice: plain, from `@prism3/css`'s own demo markup, and as the
    element. There are 18 samples per field: every size × status, filled, disabled, read-only, pending, icons and
    required. Every part's 23 computed properties are equal, on light and dark, and each box must draw a border.
  - **By role and keyboard.** Inputs are found by their label text. Error sets `aria-invalid`, and the description
    reaches the message. Tab goes button, then input.
  - **The Show/Hide button.** Click, Enter and Space are tested. The caret holds after typing; focus stays on the
    button; the name is "Hide password"; there is no `aria-pressed`; there's one `role="status"` region announcing
    each change; the input is masked at the submit's bubble phase; read-only stays live and disabled is disabled.
  - **The three stages.** With no script, a plain masked field with the button hidden. With `password-field.js`
    only, the button works. When the element then upgrades, it adopts the id, label, size, required and help text,
    keeps the typed value, focus and the 1–4 caret, and one click toggles once.
  - **`onChange` and `value`.** `onChange` is called once per input event, `value` follows, and nothing is written
    to an attribute.
  - **Five mutants fail by name:** the submit handler removed; adoption dropping a typed value; the toggle moving
    focus to the input; the caret put back only once; `password-field.js` no longer standing aside.
- **Hand mutations on disk**, each after a `wip:` commit, restored with `git reset --hard`:

  | Mutation | Fails by name |
  |---|---|
  | The committed `p3-text-field.js` drops `?required` | `check:generated`: `p3-text-field.js is not what generate.ts writes`; parity: `text-field required=true: .p3-text-field__entry required is null, the contract says ""` |
  | `generate-fields.ts` loses its `readOnly` markup row | generate: `text-field.readOnly: a flag prop with no markup mapping in generate-fields.ts` |
  | The engine's text-field def gains an `autoFocus` prop | generate: `text-field.autoFocus: a flag prop with no markup mapping`, so the generator reads the emission |

  A first attempt at the first row edited `aria-invalid`, a parity self-test's anchor. The check refused with
  `self-test "aria-invalid" changed nothing: its anchor is gone`, which is the guard working, but not the failure the
  row was meant to show, so it was redone on `required`.
- `@prism3/css`'s four checks still pass after its two edits: `ICON` and `COPY` exported, and the script standing
  aside. The button's own element checks are unchanged and pass.

### Surprises and learnings

- **Chromium resets the caret of a blurred input whose type changes, one task later, if the input has had focus.**
  Clicking Show blurs the input, so the common case loses the caret: type a password, then press Show. The restore
  in the same task, which `@prism3/css`'s script does, is overwritten. S3's check missed it, because its input was
  never focused. The element puts the caret back again after that task. The script's defect is filed as #3921, not
  fixed here.
- **`getByLabel` reads the label's text with the `aria-hidden` required marker in it**, so an exact "Password" match
  finds nothing. The check anchors the match instead.
- **Restoring focus in `firstUpdated` runs before `updated` writes the adopted value**, which moved the caret to the
  end. Focus is now restored in `updated`, after the value.
- **The parity probe first reported a missing attribute as "no toggle"**: its `??` treated `null` as absent. Caught
  by the `aria-controls` mutant, which failed under the wrong name.
- **The second worktree had no `node_modules`.** `cem` wasn't found until `npm ci` ran there.

### Plan changes suggested

- **Fix #3921 in `@prism3/css` before S5's stories**, so the two delivery forms keep the caret the same way.
- **Settle S4 owner decision 3 (the host's box) and S3 owner decision 2 (tab order)** before the Storybook layouts,
  because the fields are block-level content inside an inline host.
- **When #3917 lands,** the element generator needs nothing: it reads props and nesting only.

### Effort

- **Wall clock:** about 18:44 to 19:05 UTC for the generator, the two checks, the caret diagnosis, the hand
  mutations, the READMEs and this entry. The full gate run is extra.
- **Steps:** about 40 tool calls: reading the button element, its checks, the CSS contract, the defs and S3's
  decisions (about 10); writing 4 files and editing 8; running, debugging and fixing (about 20).
- **Hand edits:** none to generated output. The generator, the two checks, the bundler and manifest wiring, the
  package's exports and scripts, two `@prism3/css` edits (two exports, the script standing aside), the READMEs, this
  entry and the progress entry.
- **Errors hit:** 6: the missing `node_modules`, the probe's `??`, `getByLabel`'s marker, the caret reset, the
  refocus order, and the self-test anchor collision (above).


---

## S5 (thin), continued — the text field and password field in the Storybook, and the #1712 A audit

Started about 01:20 UTC on 2026-11-18, from `poc/arm-1` at `f563a3f1`. It adds the fields to the S5 Storybook the
way the button's stories are built (#3895), and audits both field forms against owner decision #1712 A
(2026-11-18).

### What was built

- **`stories/fields.js`**, the cases and renderers both fields share. Each case is the def's props by their element
  names. The element form sets them as properties on `<p3-text-field>` or `<p3-password-field>`. The HTML form
  writes `@prism3/css`'s README markup from the same props. The copy is `@prism3/css`'s demo copy, so no new wording.
- **15 cases per field:** rest, filled, hover and focus-visible (forced), error, warning, success, disabled,
  read-only, pending, required, small, medium, large, and the visual slots. The password field adds `Shown` and
  `ShownError`, whose `play` presses Show the way a person does. Four story files, `Components/Text Field/…` and
  `Components/Password Field/…`, each `Element` and `HTML`: **64 new stories, 100 in all.**
- **`preview.js`** loads the four field stylesheets, `@prism3/css/password-field.js`, and the two element modules.
- **The HTML password field calls `p3PasswordField.enhance()`** once its markup is in the page. Storybook mounts a
  story after the script's load-time pass, as a page that adds fields after load does.

### The #1712 A audit (field errors: `aria-invalid` + `aria-describedby`, focus to the field or the error summary, no field-level live region)

Both forms were read and then checked in the browser, story by story:

| Requirement | `@prism3/css` markup | `<p3-text-field>` / `<p3-password-field>` |
|---|---|---|
| `aria-invalid="true"` on the input at error, nowhere else | Yes (README contract) | Yes (`render`) |
| `aria-describedby` names the message | Yes, when the message is written | Yes, when `showMessage` is on |
| No field-level live region | None | None |
| Focus to the field or the error summary | The page's job; the input is a native, focusable `<input>` | Same; the element moves no focus on error |

**The one live region is page-level, and isn't about errors.** Show/Hide announces "Your password is shown/hidden"
in one shared polite region (`[data-p3-announcer]`, the def's "app's shared polite live region"), appended to
`<body>`, outside every field. #1712 A doesn't cover it, so it stays.

**Nothing needed fixing.** `check:build` now holds the wiring on all 64 field stories: the label names the input,
`aria-describedby` names the field's own message, `aria-invalid` is `"true"` at error and absent otherwise, and no
element in a field has `aria-live` or a `status`, `alert` or `log` role.

**OWNER DECISIONS** (none built; each is flagged, with a recommendation):

1. **OWNER DECISION: an error with no message.** `validation="error"` with `showMessage` off sets `aria-invalid` but
   writes no message, so nothing is described: a red border and no text (WCAG 3.3.1 wants the error in text). The
   def's guidance says "never hides a message the field needs", but `showMessage` defaults to off. Options:
   - A. Leave it to the guidance (today).
   - B. At a non-default validation, the element writes the message whether or not `showMessage` is on, and the
     `@prism3/css` README says the markup must include it.
   - C. Keep the prop, and warn in the console when error has no message.

   **Recommendation: B.** #1712 A pairs `aria-invalid` with `aria-describedby`, and B makes that pairing
   unbreakable. It changes the def's prop semantics, so it belongs with the main-branch lane updating the def's
   guidance.
2. **OWNER DECISION: what `@prism3/web-components`'s root entry registers.** `import '@prism3/web-components'`
   registers `<p3-button>` only (`exports["."]` is `p3-button.js`, from S4). The fields need their own imports, which
   the preview now makes. Options: **A.** the root registers all three elements; **B.** keep the root as the button,
   with per-element imports (today). **Recommendation: A**, since a client expects the package entry to define the
   package's elements. Either way, `check:build` would have caught it: an unregistered element renders nothing.

Not covered here: the focus move on submit. It is page behavior, so it belongs to the S5-proper keyboard pass, with
a form story and an error summary.

### What was checked, and how

The CI steps aren't new: `build` and `check:build` already run.

- **`check:build`: 868 checks over 100 stories.** `EXPECTED` gains the fields' 64 story ids, written by hand. Per
  field story:
  - it renders a `.p3-text-field` or `.p3-password-field`, inside the element for the element form;
  - the #1712 A wiring (above);
  - each status shows exactly its own glyph, and default shows none;
  - the password field's button is revealed and names the input in `aria-controls`; `Shown`/`ShownError` end with
    `type="text"` and "Hide", and every other story ends masked with "Show".

  Per field and form:
  - hover changes the box's border;
  - focus-visible's box differs from rest's and hover's;
  - rest, error, warning and success draw four border colors;
  - disabled, read-only, pending (with the spinner shown) and required (with the marker shown) carry their state;
  - the visual slots are drawn;
  - the sizes have three input type sizes and rising heights over a 44px floor (small keeps medium's 44px target,
    as the def's `size` prop says).

  The two forms of each case then compute the same box, input, label and message styles (9 properties each).
- **Hand mutations on disk**, each after a `wip:` commit, restored with `git show HEAD:<path> > <path>`, rebuilt:

  | Mutation | Fails by name |
  |---|---|
  | The HTML password field's `ShownError` export deleted | `index: story components-password-field-html--shown-error is missing from the build` |
  | `aria-live="polite"` on the HTML form's message | `components-text-field-html--rest: the field holds a live region, which #1712 A rules out: <p class="p3-field-message" …` (32 stories) |
  | The HTML form drops `aria-invalid` at error | `components-text-field-html--error: aria-invalid is null at error, #1712 A wants "true"` (3 stories) |
  | The HTML password field never calls `enhance` | `components-password-field-html--rest: the Show/Hide button is not revealed and wired (…"hidden":true…)` (17 stories) |

### Surprises and learnings

- **The element stories rendered empty at first.** The root entry registers the button only (owner decision 2).
- **Small and medium fields share a height, 44px.** The check first asked for three heights, the button's rule. The
  def says small keeps the 44px target, so the check now reads the input's type size and a 44px floor instead.
- **A regex in a template string lost its backslash.** `split(/\s+/)` inside the check's page-side template literal
  became `/s+/`, which split ids on the letter "s", so every `aria-describedby` looked unresolved. It's now
  `split(' ')`.
- **`play` alone didn't reveal the HTML Show/Hide button in the forced-state stories.** The reveal moved into the
  render (`requestAnimationFrame`, then `enhance`), and `play` now only presses Show.

### Effort

- **Wall clock:** about 01:20 to 02:00 UTC for the stories, the check, the audit, the mutations and this entry; then
  the gate run.
- **Steps:** about 30 tool calls: reading the button stories, the fields' contract and elements, and the decisions
  (about 10); writing 5 files and editing 4; building, running and fixing (about 12).
- **Hand edits:** all of it. Nothing in the Storybook is generated.
- **Errors hit:** 4: the unregistered elements, the size rule, the lost backslash, and the reveal under forced
  states (above). The first run of the check with the unregistered elements timed out at 500 seconds.

**Local gate record** (`npm run verify`'s 114 gates, with `GITHUB_BASE_REF=poc/arm-1`, after `regen`, in chunks
under 10 minutes): 111 PASS, 0 FAIL, and 3 not run locally, left to CI as before: `chrome`, `chrome-shards` and
`plugin-test`. Two first runs didn't count:
- `engine-test` threw in its #3833 fold replay because this session's clone was shallow ("Could not read
  4b17ddf4"). It passed after `git fetch --unshallow`.
- `exporter-comparison` and `storybook-check` were cut off by the chunk's time limit and showed SKIP. Each passed
  when rerun after its build.


---

## Fix #3921 — `@prism3/css`'s Show/Hide script keeps the caret on an input that has had focus

Started about 02:15 UTC on 2026-11-18, from `poc/arm-1` at `f563a3f1`. It's S4's caret finding, fixed in the
plain-HTML form. S4 fixed it in `<p3-password-field>`; this brings the second delivery form level with it.

### The defect

**Chromium resets a blurred input's caret one task after its `type` changes, once the input has had focus.**
Pressing Show blurs the input. `password-field.js` restored the selection in the same task, and that restore was
then overwritten. So the common case lost the caret: type a password, then press Show.

S3's check missed it because its input was never focused: it set the selection on an untouched field, and Chromium
leaves that caret alone.

### The fix

- **`password-field.js`** puts the selection back again after that task (`setTimeout(…, 0)`), as the element does.
- **`check-browser-fields.ts`** now clicks into the field, selects 2–5, then presses Show. It reads the caret 50 ms
  later, after Chromium's reset task, and again after Hide (Enter). Before the fix both read `0,0`.
- **A new self-test mutant:** "the caret put back only in the same task (#3921)". It drops the script's delayed
  restore by refusing zero-delay timeouts that call `setSelectionRange`. That makes eight mutants.

No user-facing wording changed. No owner decision was needed.

### What was checked, and how

- **The test fails before the fix.** The test was committed first, on the unfixed script. That run failed by name:
  - `Show/Hide: the caret moved to 0,0, not 2,5, after pressing Show on an input that had focus (#3921)`;
  - `Show/Hide: the caret moved to 0,0, not 2,5, after pressing Hide (#3921)`.
- **It passes after the fix:** 132 checks, and all eight mutants fail by name.
- **A hand mutation on disk**, after a `wip:` commit, restored with `git show HEAD:<path> > <path>`:

  | Mutation | Fails by name |
  |---|---|
  | The `setTimeout` restore line deleted from `password-field.js` | `Show/Hide: the caret moved to 0,0, not 2,5, after pressing Show on an input that had focus (#3921)`, and the same for Hide |

- **The checks that load the script still pass:**
  - `css-parity`, `css-browser`, `css-raw-values` and `css-generated`;
  - `wc-parity` and `wc-browser`, whose second stage runs the script before the element upgrades;
  - `storybook-build` and `storybook-check`.

### Surprises and learnings

- **A check's input should be touched the way a person touches it.** S3's caret check set the selection on a field
  nothing had focused. That is the one state where Chromium keeps the caret, so the defect was invisible. It's the
  same lesson as S4's.

### Effort

- **Wall clock:** about 02:15 to 02:35 UTC for the test, the fix, the mutants and this entry; then the gate run.
- **Steps:** about 12 tool calls: reading the issue, the element's fix and the check (3); writing the test, fix and
  mutant (3); running, mutating and restoring (6).
- **Hand edits:** 2 files plus this entry and the progress entry. Nothing generated changed.
- **Errors hit:** 0.

**Local gate record** (`npm run verify`'s 114 gates, with `GITHUB_BASE_REF=poc/arm-1`, after `regen`, in 5 chunks
under 10 minutes): 111 PASS, 0 FAIL, and 3 not run locally, left to CI as before: `chrome`, `chrome-shards` and
`plugin-test`.

### The CI hold, and the fix to the fix (#3945)

**Correction.** The entry above says `wc-browser` passes. It didn't: CI's `studio` job failed it on this head, and
it fails here too (3 of 3 runs). The upgrade check reported `upgrade: focus and the caret did not carry over: … sel:[0,0]`.
On `poc/arm-1`'s script, the same check passed 3 of 3. It wasn't a flake. The new delayed restore caused it.

**The cause.** The restore ran unconditionally, with the caret captured at the press. In the upgrade check, the
script toggles an empty input twice, so the second press captures `0,0`. Its delayed restore then ran late, after
Playwright's `fill` and `setSelectionRange(1, 4)`. A probe that logged each timer showed that order. So the caret
went back to `0,0`, and the element adopted that on upgrade. A zero-delay timeout is not guaranteed to run before
the page's next task.

**The fix.** The delayed restore only undoes Chromium's reset, which leaves the caret at `0,0`, measured on a
focused input after Show and after Hide. A caret anywhere else was set since, so the restore leaves it alone.

**The test.** `packages/css/check-browser-fields.ts` presses the button and, in the same task, writes a caret.
First it writes a value and `1,4` after Show, then `3,6` after Hide. On the unconditional restore, both fail by name:
- `Show/Hide: a value and caret 1,4 set after pressing Show were overwritten (type text, caret 2,5) (#3945)`;
- `Show/Hide: a caret 3,6 set after pressing Hide was overwritten (type password, caret 2,5) (#3945)`.

Unlike the upgrade check, this one doesn't depend on timing: the caret is written before the delayed restore can
run.

**Runs.** After the fix, `wc-browser`'s fields check passed 5 of 5, and the css fields check passed 4 of 4 with all
eight mutants failing by name. A hand mutation that makes the guard always true (`|| true`) fails both new checks by
name, and the wc upgrade check, after a commit, restored with `git show`.

**Learning.** A deferred fix-up must check that what it undoes is still there. "One task later" is the earliest it
runs, not the latest.

**Not fixed here:** `<p3-password-field>`'s own toggle (`p3-password-field.js`) has the same unconditional delayed
restore. It is filed separately rather than fixed in this PR.

---

## Q-POC2 A — a field at a validation status always writes and names its message

Started about 13:15 UTC on 2026-11-18, from `poc/arm-1` at `62a34be3`. It builds the owner's answer to the #1712 A
audit's first flag (Q-POC2 → A, 2026-11-18, on #3408): at `error`, `warning` or `success`, the field always writes
and shows its message, so `aria-invalid` never stands without an `aria-describedby` target. It applies to both
delivery forms.

### What was built

- **`<p3-text-field>` and `<p3-password-field>`** (`generate-fields.ts`, regenerated): at any status but `default`,
  the element writes the `<p class="p3-field-message">` and names it in `aria-describedby`, whatever `showMessage`
  says. Its text is `validationMessage`, or `helpText` when that's unset, as before. `showMessage` now decides only
  at the default status. A status set live writes the message; back at default with `showMessage` off, it's gone.
- **Adoption on upgrade** reads a pre-rendered message as `showMessage` only at the default status. At a status the
  message was required, not chosen, so taking it as `showMessage` would keep an empty message once the status
  clears. A technical call, the fallout of the rule.
- **`@prism3/css`:** the README's fields contract says it in prose and in the `validation` and `showMessage` rows of
  both tables. `demo-fields.ts`, the code that writes the contract's markup, follows it. The demo's output doesn't
  change, because every demo field at a status already had its message.
- **The Storybook's HTML renderer** (`stories/fields.js`) follows the same rule. Its stories don't change: every
  status story already sets `showMessage`.

`password-field.js`, `@prism3/css`'s only script, writes no message and no `aria-describedby`; the markup carries
both. So the script had nothing to change (OWNER DECISION 2 below).

### Decisions

Followed: Q-POC2 A and #1712 A. The def's `showMessage` description ("never hides a message the field needs") is
unchanged; the engine def lives on `main`.

**OWNER DECISIONS** (none built beyond today's behavior; each is flagged, with a recommendation):

1. **OWNER DECISION: a status with no text.** At `error` with neither `validationMessage` nor `helpText`, the field
   writes an empty message: the glyph shows, but the description is empty. Options:
   - **A. Write it empty (built).** The link holds; the text is the page's job.
   - B. Warn in the console when a status has no text.
   - C. Fall back to a default string. That's new copy, the owner's.

   **Recommendation: B** in the element, as a developer aid, with A's markup.
2. **OWNER DECISION: a runtime repair in `@prism3/css`.** The HTML form relies on the author writing the message.
   Options: **A. the contract only (built)**, held by the README and the checks; or B. a script that links an
   unlinked message, or reveals a hidden one, at a status. A script can't write missing text.
   **Recommendation: A.** B adds a script to every text field for a markup error the checks already catch.

**Owner answers (2026-11-18, on #3968):** decision 1 is **B**, and decision 2 is **A** (no change). At `error`,
`warning` or `success` with neither `validationMessage` nor `helpText`, each element still writes A's empty, linked
message and also logs one console warning, once per status it enters. The text is DRAFT:
`<p3-text-field> has validation="error" and no validationMessage or helpText, so its message is empty. Set
validationMessage to say why the field is at this status.` (with the element's tag and status). `wc-browser`'s
section 6d holds it: one warning per empty-status field naming the element and status, none with either text or at
default, and one, not one per render, for a status set live. Its self-test mutant removes the warning and must fail
by name.

### What was checked, and how

- **`wc-browser` (`check-browser-fields.ts`), new section 6.** For each element at error, warning and success with
  `showMessage` off, the message is written, shown (displayed, with a box) and named in `aria-describedby`, and its
  text is `validationMessage`. A live status change writes it; back at default, it's gone. Section 1 gains a sample
  at error with `showMessage` off, so the plain and element forms are compared there too.
- **`css-browser` (`check-browser-fields.ts`), new section 6.** Every demo field at a status (at least 36) has its
  message written, shown and named.
- **`wc-parity`'s contract** now says `validation` at a status sets `aria-describedby` to the message, with
  `showMessage` off. **A weakness fixed:** `@message` resolved to `null` when no message was written, so a missing
  link compared equal to "absent". It now needs a message.
- **New self-test mutants, each failing by name:**
  - wc: "the message written only when showMessage is on (Q-POC2 A)" →
    `Q-POC2: <p3-text-field> at error with showMessage off renders no linked, shown message (aria-describedby null, message absent)`;
  - css: "the message left out of an error field" → `Q-POC2: light/text-field/medium/error/filled at error renders no linked, shown message (aria-describedby "…", message absent)`;
  - css: "the message hidden at warning" → `Q-POC2: light/password-field/medium/warning/filled at warning renders no linked, shown message (…message not shown)`.
- **Hand mutations on disk**, each after a commit, restored with `git show HEAD:<path> > <path>`:

  | Mutation | Fails by name |
  |---|---|
  | `generate-fields.ts`: `writeMessage = this.showMessage`, regenerated | `wc-browser`: 13 failures, e.g. `Q-POC2: <p3-password-field> at success with showMessage off renders no linked, shown message`; `wc-parity`: `text-field validation=error: .p3-text-field__entry aria-describedby is null, the contract says "(no message written)"`, for all three statuses, both fields |
  | `demo-fields.ts`: `withMessage = o.message` | `wc-browser`: `light text-field-error-no-showmessage: .p3-field-message is in the element only` |

- **A second weakness fixed:** `wc-browser` built its mutants while loading, so a hand mutation that moved a
  mutant's anchor crashed the check before the real run reported anything. Mutants are now built after the real
  run, and a moved anchor fails its own self-test by name.
- `storybook-build` and `storybook-check` still pass (100 stories, 868 checks). `css-generated`, `css-parity`,
  `wc-generated` and `custom-elements.json` agree.

**Not covered:** no Storybook story sets a status without `showMessage`, so `storybook-check` doesn't hold the
renderer's new branch. The S5 lane is editing the Storybook in parallel; a story can follow.

### Surprises and learnings

- **"Absent equals absent" is a pass that proves nothing.** The parity contract's `@message` placeholder resolved to
  the message's id, or `null` with no message, so a field that dropped both the message and the link passed. A
  placeholder for a link must require the thing it links to.
- **A self-test that builds its mutants at load hides the real run.** That's the order to check whenever a hand
  mutation crashes a check instead of failing it.

### Effort

- **Wall clock:** about 13:15 to 13:40 UTC for the change, the checks, the mutations and this entry; then the gate
  run.
- **Steps:** about 40 tool calls: reading the decision, journal and code (about 12); editing 9 files (about 10);
  running, mutating and restoring (about 18).
- **Hand edits:** the generator, two markup writers, two READMEs and three checks. The two elements were
  regenerated.
- **Errors hit:** 3: a mutant that removed every error message crashed an earlier geometry step (retargeted to one
  field), and the two check weaknesses above.

**Local gate record** (`npm run verify`'s 114 gates, with `GITHUB_BASE_REF=poc/arm-1`, after `regen`, in 5 chunks
under 10 minutes): 111 PASS, 0 FAIL, and 3 not run locally, left to CI as before: `chrome`, `chrome-shards` and
`plugin-test`.

---

## Q-POC3 B — one entry per element; the package root registers nothing

Started about 14:00 UTC on 2026-11-18, from `poc/arm-1` at `62a34be3`. It builds the owner's answer to the #1712 A
audit's second flag (Q-POC3 → B, 2026-11-18, on #3408). `import '@prism3/web-components'` registers nothing, and
each element registers from its own entry, the button included.

### What was built

- **`package.json`'s exports:**

  | Entry | File | Registers |
  |---|---|---|
  | `@prism3/web-components` | `index.js` (new) | nothing |
  | `@prism3/web-components/button` | `p3-button.js` | `<p3-button>` |
  | `@prism3/web-components/text-field` | `p3-text-field.js` | `<p3-text-field>` |
  | `@prism3/web-components/password-field` | `p3-password-field.js` | `<p3-password-field>` |

  `main` and `module` name `index.js`, and `files` ships it. The old `./p3-*.js` subpaths are gone, so each element
  has one entry name. `custom-elements.json` and `package.json` stay as data entries.
- **`index.js`** is hand-written and exports nothing. Its comment points at the three entries.
- **The elements and `custom-elements.json` don't change.** The analyzer reads the same three files, and their module
  paths are the files, not the entry names.
- **The Storybook preview** imports the three entries. The element README's examples import the entry they use, and it
  has a table of the entries. `CONTRIBUTING.md`'s note on `test:browser` names the new check.

### Decisions

Followed: Q-POC3 B.

Taken as technical calls (reversible): the root's file name, `index.js`; and dropping the `./p3-*.js` subpaths rather
than keeping them as second names. The package is private and unpublished, and the Storybook preview was their only
consumer.

**OWNER DECISION: what the root exports.** It registers nothing, as decided. Options:
- **A. Nothing (built).** It's an empty module, so importing it does nothing.
- B. The element classes, without registering them. Each element file would then split into a class module and a
  registering entry, a change to the generator.
- C. A `define()` helper that registers on request.

**Recommendation: A** for the POC. B or C only if a client needs to register under another tag name or extend a
class.

### What was checked, and how

- **`check-entries.ts`** (new, chained into `test:browser`, so `wc-browser` runs it). Its expected entries and tags are
  written by hand from the owner decision, not read from the package:
  1. **The exports map.** The script entries are exactly the root, `/button`, `/text-field` and `/password-field`.
     `main` and `module` name the root's file, and every entry's file is in `files`.
  2. **A consumer resolves them.** From `apps/storybook`, Node resolves each entry to the file the map names.
  3. **What each entry registers.** Each entry is bundled alone through the map (esbuild) and loaded into a fresh
     Chromium page whose `customElements.define` is recorded. The calls must be exactly the expected tags, and
     `customElements.get` must answer for those only.

  29 checks. **Four self-test mutants fail by name:**
  - the root importing the button: `root (@prism3/web-components): registered <p3-button>, expected nothing`;
  - the text field's entry also registering the button: `./text-field: registered <p3-button>, <p3-text-field>, expected exactly <p3-text-field>`;
  - the button's entry pointing at the text field: `./button: registered <p3-text-field>, expected exactly <p3-button>`;
  - an old `p3-button.js` subpath entry kept: the exports-map line naming it "not an expected entry".
- **Hand mutations on disk**, each after a commit, restored with `git show HEAD:<path> > <path>`:

  | Mutation | Result |
  |---|---|
  | `package.json` put back to `poc/arm-1`'s | Fails by name, 11 failures, among them `root (@prism3/web-components): registered <p3-button>, expected nothing` and `resolve: "@prism3/web-components/button" from apps/storybook resolves to unresolved (Package subpath './button' is not defined by "exports" …)` |
  | The preview's `import '@prism3/web-components/button'` deleted | `storybook-check` hadn't reported after 280 s, when the run was stopped. Each element story waits 15 s for its element, so the failure comes late if at all. The S5 field-stories entry saw the same. Filed as #3969. |

- `storybook-build` and `storybook-check` pass on the new preview (100 stories, 868 checks). `wc-generated` passes,
  so the manifest is unchanged.

### Surprises and learnings

- **Playwright's `setContent` runs no init scripts,** so the `customElements.define` recorder is evaluated after the
  page is set and before the entry's script.
- **A missing registration shows up in the Storybook as a 15 s wait per story, not a name** (#3969). `check-entries.ts` now names it
  first, in seconds.

### Effort

- **Wall clock:** about 14:00 to 14:15 UTC for the entries, the check, the mutations and this entry; then the gate
  run.
- **Steps:** about 20 tool calls: finding every entry reference (3); writing `index.js`, the check and the edits
  (6); running, mutating and restoring (about 11).
- **Hand edits:** `package.json`, `index.js`, the check, the preview, two READMEs' worth of prose and `CONTRIBUTING.md`.
  Nothing generated changed.
- **Errors hit:** 3: the recorder installed with `addInitScript` never ran; the Storybook mutation's wait; and
  `lint-layout-claims` read this entry's dot-slash entry names as paths relative to `docs/poc/`, so they're
  written as full specifiers.

**Local gate record** (`npm run verify`'s 114 gates, with `GITHUB_BASE_REF=poc/arm-1`, after `regen`, in 5 chunks
under 10 minutes): 111 PASS, 0 FAIL after that fix, and 3 not run locally, left to CI as before: `chrome`,
`chrome-shards` and `plugin-test`.

---

## S5 proper — axe, the ARIA snapshots and the keyboard suite, over the Storybook

Started about 13:05 UTC on 2026-11-18, from `poc/arm-1` at `62a34be3`. This is the accessibility and keyboard pass
the plan keeps in S5 (arm 1 architecture item 8; Q144 A: axe-core in phase 5). The Storybook it runs over is
#3895 and #3942.

### The audit: what S5 lacked

| Plan item | Before this PR | Now |
|---|---|---|
| Storybook, every component in every state, both forms | Done (#3895, #3942): 100 stories | Unchanged |
| axe (`@axe-core/playwright`) | **Missing.** The brief for this lane said "axe checks exist in the css/wc browser checks". They don't: `packages/css/check-browser.ts` says `@axe-core/playwright` is not a dependency and the pass was held for S5 | `check-axe.ts`, every story, light and dark |
| Playwright ARIA snapshots, both forms the same tree | Missing. `check-build.ts` checks the #1712 A wiring attribute by attribute, not the computed tree | `check-aria.ts` |
| Scripted keyboard: Tab order, Space/Enter, Show/Hide, focus-visible on keyboard only | Partly. `@prism3/css`'s and `@prism3/web-components`' browser checks press Enter on Show/Hide on their own demo pages. Tab order and keyboard-only focus-visible were checked nowhere | `check-keyboard.ts`, over the Storybook, both forms |
| No closed shadow roots | Held by design (light DOM), asserted nowhere | `check-aria.ts` fails any shadow root in a story |

### What was built

All of it is in `apps/storybook`, run by one script, `check:a11y`, after `build`. Shared setup is in
`a11y-harness.ts`: the static server, the story list from `index.json` (which `check-build.ts` already holds to its
hand-written list), and `open`, which loads a story and waits until it has settled.

- **`check-axe.ts`:** axe on every story's root, in light and dark (200 runs).
  - The rules are axe's WCAG 2.0, 2.1 and 2.2 A and AA tags. The `best-practice` rules are left out: they judge a
    whole page (landmarks, a main heading), and a story root is one component.
  - **"Needs review" fails.** axe leaves a node it can't decide as `incomplete`. That counts as a failure here, so a
    contrast axe can't read can't pass by silence. The allowance list for it is empty.
  - **One accepted violation, by rule, owner decision #1456.** See Surprises.
- **`check-aria.ts`:** each case's two forms build the same accessibility tree, and it's the accepted one.
  - **The snapshot.** It is Playwright's ARIA snapshot of the story root. Added to it, from Chromium's own tree
    (CDP), are each control's description and states (focusable, disabled, invalid, required, read-only, busy). The
    ARIA snapshot leaves those out, and `aria-describedby` is how #1712 A ties a message to its field. A story that
    presses Show adds the live region's text.
  - **Three comparisons, three failure names:**
    1. the two forms against each other;
    2. both against `aria-snapshots.json`, the reviewed record, which only `--accept` writes (`accept:aria`);
    3. a `HAS` table written by hand from the defs and the demo copy. `--accept` refuses to write while a row fails.
  - The second comparison catches a defect both forms share. They come from one contract, so they would agree on it.
  - **No shadow roots.** The harness records every `attachShadow` before the page's scripts run, because a closed
    root can't be seen afterwards. Any root inside a story fails.
- **`check-keyboard.ts`:** real key presses in Chromium, both forms.
  1. **Tab order in every story.** The expected order is written from each def's keyboard line and prop
     descriptions. A disabled control is no stop. An inactive or pending button is one. Read-only and pending fields
     are stops. The glyphs never are. Both forms of a case must give the same order.
  2. **Space and Enter on the button.** Each press runs the action once. On an inactive or pending `<p3-button>`,
     neither runs it, and focus stays.
  3. **Show/Hide by keyboard.** Space shows and renames the button "Hide password"; Enter hides it again. Focus
     stays on the button.
  4. **Focus-visible on keyboard only.** Reached by Tab, the button and the Show/Hide button draw their ring, and the
     field's box draws its focus edge. Focused by a click, the two buttons draw no ring.
- **Wiring:** one CI step in the `studio` job, after `check:build`, with a 15-minute limit. It's mirrored in
  `verify.ts` (`storybook-a11y`), CONTRIBUTING §3, CLAUDE.md §4 and the PR template. `lint-doc-gates` is clean.

### Dependencies (pinned exactly, each release at least two weeks old on 2026-11-18)

| Package | Version | Released | Note |
|---|---|---|---|
| `@axe-core/playwright` | 4.14.0 | 2026-10-15 | A devDependency of `@prism3/storybook`. |
| `axe-core` | 4.14.0 | 2026-10-05 | Held by a root `overrides` entry: `@axe-core/playwright` asks for `~4.14.0`, which resolved to 4.14.1, released 2026-11-16. |

Two packages were added. No existing lockfile entry changed.

### Decisions

Followed: Q144 A (axe in phase 5), arm 1 architecture item 8 (ARIA snapshots, `@axe-core/playwright`, scripted
keyboard, no closed shadow roots), owner decision #1456 (hover and pressed are exempt from the on-fill ink contract)
and #1712 A (the error wiring the snapshots hold).

**OWNER DECISION: the password field's Tab order (#3967, filed here).** The def says "Tab reaches the input, then
the Show/Hide button", and also "Tab order follows the visual order". Q301.2 B put the button on the label row,
above the box. Both forms follow that layout, so Tab reaches the button first. The def contradicts itself once the
button sits above the box. Options are in #3967:
- A. Change the keyboard contract to "button, then input", which follows the visual order.
- B. Move the button after the input in the DOM and keep it on the label row with CSS. That risks the DOM order no
  longer matching the visual order.
- C. Move the button into the box's trailing slot, reversing Q301.2 B.

**Recommendation: A**, since it is the order the eye reads. The check holds today's order as a named exception: it
asserts the current order and fails by name once the order changes (a mutant proves it). So deciding #3967 means
deleting `KNOWN`.

**Not built here, and still open with the owner (from #3942):** an error with no message, and what the root entry
registers.

**Technical calls (mine):**
- **Playwright over the static build, not `addon-a11y` and `addon-vitest`.** The plan names both addons for
  Storybook (item 5) and Playwright for the tests (item 8). Running from Playwright keeps one browser stack with the
  existing checks and needs no Vitest. The addons would add axe inside Storybook's UI. They are listed as still
  missing below.
- **Light and dark only.** The token CSS also has `hc-light` and `hc-dark`, but the Storybook's toolbar offers two
  themes, so axe runs on the two it can show.

### What was checked, and how

- **`check:a11y`: 3 minutes 25 seconds locally.** The three checks run first, then each one's planted mutants.
  - **axe:** 400 checks, 6 mutants.
  - **aria:** 736 checks, 7 mutants.
  - **keyboard:** 194 checks, 8 mutants.
- **The mutants, each failing by name:**

  | Check | Mutant | Fails by name |
  |---|---|---|
  | axe | the password label's `for` removed | `components-password-field-html--rest (light): axe label — …` |
  | axe | a rest button's label at 1.9:1 | `components-button-element--rest (light): axe color-contrast — …` |
  | axe | a hover label under #1456's 2.0:1 floor | `components-button-html--hover (dark): axe color-contrast — …` |
  | axe | `aria-describedby` naming a missing id | `components-password-field-element--error (light): axe aria-valid-attr-value needs review, which is not a pass` |
  | aria | a closed shadow root on `<p3-button>` | `components-button-element--rest: the component attached a shadow root on <p3-button>` |
  | aria | the HTML form drops `aria-invalid` at error | `text-field--error: the two forms differ` |
  | aria | `aria-describedby` dropped from both forms | `password-field--rest (element): differs from the accepted snapshot` |
  | aria | the toggle's hidden " password" removed | `…--rest: the accessibility tree lacks «- button "Show password"»` |
  | aria | an inactive button loses `aria-disabled` | `…--inactive: the accessibility tree lacks «- button "Save changes" [disabled]»` |
  | keyboard | Show/Hide given `tabindex="-1"` | `…password-field-…--rest: Tab stops are textbox "Password"; the def wants …` |
  | keyboard | Space swallowed on every button | `…button-…--rest: Space on the button ran the action 0 times in all, want 1` |
  | keyboard | the ring drawn on any focus | `…button-…--rest: a mouse click drew the focus ring on the button` |
  | keyboard | Show/Hide moving focus to the input | `…--rest: after Space, focus left the Show/Hide button` |
  | keyboard | the field reordered to the def | `…--rest: Tab stops now match the def …, so the known exception #3967 no longer holds` |
  | keyboard | a disabled button left focusable | `…button-…--disabled: Tab stops are button "Save changes"; the def wants (none)` |
  | each of the three | a story dropped from the suite's enumeration | `components-text-field-html--error: not checked by <check>` |
  | each of the three | the same, read as a case left in one form | `text-field--error: only the element form was checked by <check>` |

- **Hand mutations on disk**, each after a `wip:` commit, restored with `git show HEAD:<path> > <path>`, with the
  Storybook rebuilt:

  | Mutation | Fails by name |
  |---|---|
  | `stories/fields.js`: the HTML form writes no `aria-invalid` | 15 failures: `HAS` rows (`lacks «- textbox "Password" [invalid]»`), `password-field--error: the two forms differ`, and `differs from the accepted snapshot` |
  | `packages/css/password-field.js`: Show/Hide focuses the input | `components-password-field-html--rest: after Space, focus left the Show/Hide button …`, plus the Tab order and the ring on a mouse click |
  | `a11y-harness.ts` `stories()` skips `components-text-field-html--error` (review of this PR) | axe and keyboard: `components-text-field-html--error: not checked by …` and `text-field--error: only the element form was checked by …`. Before the represented check, both passed with only their counts moving |
  | `a11y-harness.ts` `main` no longer calls `represented`, and `check-axe.ts` skips `components-button-element--disabled` (delta review of this PR, R2) | `mutant "a story dropped from the suite" was not caught by name` and the same for `"a case left in one form only"`, exit 1. Before one `held` run, this passed with `OK axe: 396 checks`, exit 0 |
  | `a11y-harness.ts` `main`: the real run calls `run` directly, past `held` | `FAIL axe: 1 check(s) failed` → `the real axe run's coverage was not held by represented` |

- **Every story is represented, not counted (review of this PR).** `stories()` only checked that each component and
  form had one story, so a story dropped from the enumeration passed axe and keyboard silently. A case missing from one
  form passed too, because the form comparisons skip a pair with a side missing. Now each check records the ids it
  checked, and `a11y-harness.ts` `represented` holds them, on every run (mutants included), to the hand-written
  `EXPECTED`. That list moved from `check-build.ts` into `expected-stories.ts` so both read one list. The subject here
  is the iteration, not the list, so the comparison stays independent (`docs/34`).
- **The real run is held by the same call the mutants prove (delta review of this PR).** The `DROPPED` mutants called
  `represented` on their own line, so they proved `represented` worked, not that the real run went through it. Now
  `main` runs the real check and every mutant through one function, `held`, which runs and then applies
  `represented`. Deleting that call fails the `DROPPED` mutants by name, and a real run that skips `held` fails by
  name too.

### Surprises and learnings

- **The brief said axe checks existed. They didn't.** `check-browser.ts`'s header holds the axe pass for S5. Checking
  the claim against the code first saved building on it.
- **axe flags the dark theme's hover and pressed button labels, by design.** The white label measures 3.25:1 on the
  hover fill and 2.36:1 on pressed. Owner decision #1456 makes the on-fill ink contract rest-only, and `modes.ts` says
  so. The check accepts exactly that: color-contrast, the button's label, the hover and pressed stories, at or above
  #1456's 2.0:1 floor. Each acceptance prints its ratio. A mutant under the floor still fails.
- **axe accepts a placeholder as a field's name.** With its label unbound, the text field still passed axe's `label`
  rule through its placeholder. Only the password field, which has none, failed. `check-build.ts`'s "the label names
  the input" and the ARIA snapshot's `textbox "Email address"` cover what axe doesn't.
- **Playwright's ARIA snapshot leaves out descriptions and some states.** The snapshot showed no `aria-describedby`
  message and no required, read-only or busy states. So required, read-only, pending and rest fields looked the same.
  They come from Chromium's tree now. CDP spells them three ways: `true`, `"true"` and `1` for busy.
- **Storybook's preview forces every shadow root open.** It wraps `attachShadow` for its pseudo-states addon, on top
  of the harness's recorder. A closed root therefore can't be told from an open one inside Storybook. The check fails
  on any root, which is the stronger rule for light-DOM components.
- **Read after a key press only once the page has settled.** The mutant that moves focus in a zero-delay timeout
  passed at first, because focus was read in the same task as the press. The suite now waits two frames after each
  press. It's the same lesson as #3945: "one task later" is the earliest a deferred effect runs.
- **A Tab walk must start from the top.** The second hand mutation showed a `Shown` story starting its walk with focus
  already on the input, so it found no stops. The walk now blurs first.

### Effort

- **Wall clock:** about 13:05 to 13:55 UTC for the audit, the three checks, the wiring, the mutations and this
  entry; then the gate run.
- **Steps:** about 45 tool calls:
  - reading the plan, the journal, the existing checks and the defs: about 10;
  - probes: 6;
  - writing 4 files and wiring 6: about 10;
  - running, fixing and mutating: about 20.
- **Hand edits:** all of it. `aria-snapshots.json` is written by `--accept` and reviewed.
- **Errors hit:** 7.
  1. axe wants `browser.newContext()`, not `browser.newPage()`.
  2. Three first mutants named the wrong thing: the placeholder fallback, a 1:1 contrast that axe leaves for review,
     and a broken idref that axe also leaves for review.
  3. CDP's `"true"` and `1` (above).
  4. The read-after-press timing (above).
  5. The Tab walk's start (above).
  6. Storybook's forced-open shadow roots (above).
  7. A probe script run as CommonJS, which rejects top-level await.

**Local gate record** (`npm run verify`'s 115 gates, with `GITHUB_BASE_REF=poc/arm-1`, after `regen`, in chunks under
10 minutes):
- 110 PASS, 0 FAIL, and 3 not run locally, left to CI as before: `chrome`, `chrome-shards` and `plugin-test`.
- The 2 derived rows, `drift-coverage` and `plugin-no-node-builtins`, are read from gates that passed.
- `build-plugin-release` refuses locally ("the checkout is 39 commits behind origin/main"). `poc/arm-1` is never at
  `main`'s tip, and the check is strict only outside CI, so it was run with `CI=true`, as CI runs it. It passed.
- `storybook-a11y` took 220 seconds.

### S5: complete and still missing

**Complete:**
- Storybook with every component in every state, in both forms (#3895, #3942).
- axe over every story, in light and dark.
- ARIA snapshots for each component and state, in both forms: the two forms agree with each other and with the
  accepted record.
- The scripted keyboard suite: Tab order, Space and Enter, the Show/Hide toggle, and focus-visible on keyboard only.
- No shadow roots, closed or open.
- Every check self-tests with mutants that fail by name, and runs in CI.

**Still missing:**
- **#3967 (OWNER DECISION):** the password field's Tab order against its def. It is held as a named exception.
- **The two #3942 owner decisions:** an error with no message, and what the root entry registers. Neither is built.
- **`addon-a11y` and `addon-vitest`** (item 5): axe inside Storybook's UI. The checks run from Playwright instead.
- **A form-level focus move on submit, to the field or an error summary (#1712 A).** It is page behavior, and no
  story has a form or an error summary.
- **The HTML button's click suppression while inactive or pending.** The `@prism3/css` README leaves it to the page,
  so only the element is held to it. That's documented, not a defect, but a client copying the HTML gets no
  suppression.
- **Right-to-left Tab order.** The password field's def asks for it, and there is no RTL story.
- **Non-text contrast:** the focus ring, and the hover and pressed fills against the page. axe checks text contrast
  only.
- **The `hc-light` and `hc-dark` themes.** The toolbar shows light and dark only.
- **Other browsers and real assistive tech.** Every check is Chromium. No WebKit or Firefox runs here, and no screen
  reader pass (VoiceOver, NVDA).

## S5 right to left — every story under `dir="rtl"`, in both forms (#3986 part 2)

Owner decision Q-RTL1 A on #3986: part 2 is RTL tests in the POC. This adds them to S5's suites for the button,
the text field and the password field, in both forms.

### Where the expectations come from

**#4030's structured `mirror` field is not on `poc/arm-1`.** It's an open PR against `main`. So every expectation is
written by hand from the defs' right-to-left prose, as `check-aria.ts`'s `HAS` rows are:
- **Button** (`codeOnly` `right-to-left`): logical properties mirror the whole row, so the leading and trailing
  visuals swap sides. Only directional glyphs flip, per icon, never a blanket `scaleX(-1)` on the slot.
- **Password field** (`codeOnly` `right-to-left`): the label row mirrors, so the button sits at the row's left end.
  Its keyboard line says Tab follows the visual order in both directions.
- **Text field, field label, field message:** none. #4005 already files that. Their rows come from #4005's audit:
  the leading and trailing icons swap edges, the required indicator follows the label at the inline end, and the
  status glyph leads the caption at the inline start.

### What was built

- **A direction toolbar** in `.storybook/preview.js` (the issue's "Storybook gets an RTL toggle"): a `dir` global
  that puts `dir` on the story frame. Every part inherits it. Its wording is owner decision A (Decisions, below).
- **`a11y-harness.ts`:** `open` takes a direction and refuses a frame whose `dir` isn't the one asked for.
  `represented` now holds both directions, so a story left out of the right-to-left run fails by id, with "(rtl)".
  Every check carries a third represented mutant for it.
- **`check-axe.ts`:** every story in light and dark, in both directions (400 axe runs).
- **`check-aria.ts`:** every story in both directions. The right-to-left tree must equal the left-to-right tree of
  the same form, and also pass the form comparison, the accepted snapshot and `HAS` on its own. `--accept` writes
  the left-to-right tree only, and refuses while a right-to-left one differs.
- **`check-keyboard.ts`:** all four sections run again right to left, against the same expectations. The Tab
  stops are the same list, #3967's exception included.
- **`check-rtl.ts`** (new), the layout, measured from the boxes in Chromium:
  1. the component computes `direction` equal to the story's;
  2. each start/end pair swaps sides: the button's and the fields' leading and trailing visuals, the required
     indicator, the status glyph, and the label cell before the Show/Hide button. A part that should be drawn and
     isn't fails too;
  3. the Show/Hide button sits at the label row's right end left to right, its left end right to left;
  4. no button slot is transformed, and the add glyph is never flipped.

**No arrow keys.** None of the three defs names one (the text field's line is "native text editing"), and the
suite held none before. So "the arrow expectations still hold" has nothing to hold.

### Found, filed, held as named exceptions

- **#4052: directional glyphs don't flip.** The `WithVisuals` button's right arrow stays pointing right under
  `dir="rtl"`, in both forms. `@prism3/css`'s README already lists per-icon `autoMirror` as "left for S4 or later",
  but no issue tracked it.
- **#4051: the text field's input has no `dir="auto"`,** which its def's aria line asks for. Neither form writes it.

Each is held as `KNOWN` in `check-rtl.ts`: the check asserts today's state and fails by name once it changes, so a
fix means deleting the exception.

### What was checked, and how

All four checks pass, with every mutant failing by name:

| Check | Checks | Mutants (new) | Time |
|---|---|---|---|
| axe | 800 | 8 (2) | 3m40s |
| aria | 1,522 | 10 (3) | 46s |
| keyboard | 388 | 12 (4) | 1m18s |
| rtl | 438 | 15 (15) | 46s |

`check:a11y` now takes about 6.5 minutes locally, inside the CI step's 15-minute limit.

**Two hand mutations on disk,** each after a `wip:` commit and restored with `git show`:
- `preview.js` ignoring the toolbar (`dir=ltr`): `check-rtl` fails 200 checks, each right-to-left story by name
  ("did not settle: the story frame's dir is ltr, not rtl") and then as not checked.
- `password-field.css` with `.p3-password-field__label-row { direction: ltr; }`: `check-rtl` fails 70 checks, each
  password field story by name ("the Show/Hide button is not at the label row's left end").

### Surprises and learnings

- Every part already mirrors. The POC CSS uses logical properties and flex rows throughout, so nothing failed on
  layout. The two gaps are the two things logical properties can't do: flip a glyph, and set an input's own
  direction.
- The ARIA tree is identical in both directions, as expected: `dir` moves boxes, not DOM order.

### Decisions

**The direction toolbar's wording: owner decision A (2026-11-18, on #4059).** Title "Direction", items "Left to
right" and "Right to left", approved as built. (B was "LTR" and "RTL".)

### S5: still missing, after this

Removed from the list: **right-to-left Tab order.** Added: #4051 and #4052, held as exceptions. Still open:
- the snapshots are Chromium's only;
- RTL text (an Arabic or Hebrew label) isn't in any story, so bidi inside the label isn't exercised;
- the "visual snapshots" the issue names. The layout is measured by boxes, not compared as images. Filed as #4079,
  with the owner's choice between building image snapshots and accepting box measurement.

---

## Refresh 4 — `main` merged into `poc/arm-1` (a Q55 data point: what breaks when an update arrives)

Started 04:23 UTC on 2026-11-20, from `poc/arm-1` at `be0a380b`, merging `main` at `0d7d289f`: 124 commits since
the last refresh (`77f4ced5`, 2026-11-17). Merged with a merge commit (`eb87f6b2`), never squashed or rebased.

### What arrived

- **Neither version moved.** ENGINE_VERSION is still 0.238.0 and CONTRACT_VERSION 15.1.0. The change notes since
  then wait for the next fold.
- **Token values, not names.** In `out/prism3.tokens.json` the disabled control borders moved to clear 3:1, and
  4.5:1 in high contrast. Examples: `neutral.200` → `neutral.450`, and on the inverse surface `neutral.800` →
  `neutral.550`. Every name `@prism3/css` reads is unchanged, and the CSS reads values only through `var(--pds3-…)`.
- **The token CSS (#4140, #4255, #3877).** Where no `data-theme` is set, the dark values now apply under
  `@media (prefers-color-scheme: dark)`. `[data-theme="light"]` carries the light defaults too. Each mode is also
  built as its own file (`dist/prism3/<mode>.css`).
- **Button's motion bindings (#3841, Q146 A).** `specs.json` → `button.motion` holds `motion.state`,
  `motion.state-easing`, `motion.state-reduced`, `motion.press` and `motion.press-easing`.
- **Engine-side component changes** that reach the emission: one outline border weight (#4074, #4319), outline and
  text button hover colors (#4249), the right-to-left mirror field (#4030), no field-level live region (#3944), and
  the component contracts export (#3992).

### What broke

- **Nothing loud.** After `npm ci`, every POC check passed on the first run: `@prism3/css` (`check:generated`,
  `check:raw-values`, `check:parity` with 621 + 1,149 bindings, `test:browser`), `@prism3/web-components` (`check:generated`,
  `check:parity`, `test:browser` with 107 + 1,411 + 29 checks), and `@prism3/storybook` (`build`, `check:build` with
  868 checks, axe 800, ARIA 1,522, keyboard 388, RTL 438). Every generated file regenerated byte-identical.
- **One quiet break, the demo on a dark OS (#4140).** `demo.html`'s light section set no `data-theme`, because light
  used to be the default everywhere. Now an unthemed region follows the OS, so on a dark OS the "light" section
  showed dark tokens. Every check ran Chromium at its default light scheme, so none could see it. It was found by
  reading #4140's diff, not by a check. The Storybook frame and the element checks' pages already name their theme,
  so they're unaffected.
- **One unused arrival, Button's motion (#4375).** The generator reads motion by key, only the spinner's. It refuses an
  unknown redline key by name, but not an unknown motion key, so five new bindings arrived and nothing failed.
  `button.css` still has no transition and no press scale. Filed as #4375, not built here: consuming it is the
  rest of Q146 A, not a repair, and the 0.98 press magnitude is prose, not a token.

### The fix (this PR)

- **`check-browser.ts` runs the whole check again on a dark OS** (`colorScheme: 'dark'`). Its failures are prefixed
  `on a dark OS:`. Before the fix it failed 17 checks:
  `on a dark OS: light/default/filled/default/medium/rest background-color is rgb(61, 104, 252),
  color.interactive.primary.fill.rest resolves to rgb(30, 30, 255) in light`. After it, 146 pass (was 73).
- **`demo.ts` writes `data-theme` on every section, light included.** `demo.html` was regenerated. The `@prism3/css`
  README says a region that must stay light sets `data-theme="light"`.
- **Mutation, after the commit:** `data-theme="light"` deleted from `demo.html` alone. `test:browser` fails by
  name with the 17 lines above, and `check:generated` fails with `demo.html is not what generate.ts writes from the
  emission`. Restored with `git show HEAD:<path> > <path>`.

### Effort

- **Wall clock:** 04:23 to about 04:40 UTC for the merge, `npm ci`, every POC check, the reading of what arrived,
  the fix, its mutation, the issue and this entry. The full gate run is extra.
- **Conflicts:** one, in `CONTRIBUTING.md` §3. Both sides added lines after the same `check:package` comment
  (main's per-mode `[OWN FILE]` arm, and this branch's POC package lines). Kept both. `npm ci` was clean, and
  `regen` changed nothing after the merge.
- **Hand edits:** `check-browser.ts` (about 10 lines), `demo.ts` (one line and a comment), one README sentence, this
  entry and the progress entry. `demo.html` was regenerated.
- **Errors hit:** 0 from the checks. The one break was found by reading the token CSS diff.

**Lesson for Q55.** The largest update so far (124 commits) broke nothing a check could see. The two things that
mattered sat in a gap each: a new default (the OS's color scheme) the checks never varied, and a new binding the
generator wasn't strict about. Both were found by reading what arrived, not by running anything. A consumer's
checks need to vary the environment the update changes, not only the inputs it already reads.

---

## Fix #3947 and #3946 — `<p3-password-field>`'s caret restore, and the upgrade check that passed by timing

Started 06:11 UTC on 2026-11-20, stacked on refresh 4 (`poc/arm-1-refresh-4`, #4379).

### #3947: the element's delayed restore

**The defect.** `<p3-password-field>`'s Show/Hide handler puts the caret back twice: once at the press, and again one
task later, because Chromium resets a blurred input's caret a task after its type changes. The second restore was
unconditional, so a caret written since the press was overwritten. `@prism3/css`'s script had the same line until
#3945 guarded it. Until now the two delivery forms differed by that one guard.

**The fix.** `generate-fields.ts` writes the same guard: the delayed restore runs only while the caret sits at
Chromium's reset, `0,0`. `p3-password-field.js` and `custom-elements.json` are regenerated.

**The test.** This is #3945's test, applied to the element (`check-browser-fields.ts`, stage 3). Press the button
and, in the same task, write a value and `1,4`. Then press again and write `3,6`. Read each 50 ms later. It doesn't
depend on timing, because both writes land before the delayed restore can run.
- Before the fix: `toggle: a value and caret 1,4 set after pressing Hide were overwritten (type password, caret
  2,5) (#3947)`, and the same for `3,6` after Show.
- After the fix: 1,413 checks pass, up from 1,411.

**Mutations.**
- **Self-test mutant**, run on every check: the guard dropped. It fails by name on the line above.
- **Hand mutation, after the commit:** the guard dropped in `generate-fields.ts`, then regenerated. Both new checks
  fail by name. The mutant's anchor is gone, so it fails its own self-test as designed. Restored with
  `git show HEAD:<path> > <path>`.

### #3946: the upgrade check

**What the issue reported.** On #3945's head (`b8af7e3b`), the upgrade check failed:
`upgrade: focus and the caret did not carry over … sel:[0,0]`. The issue suspected the element's single synchronous
restore in `updated()` and called the failure intermittent.

**What it was.** The S5 journal's "The CI hold" had already traced it: `@prism3/css`'s script, unguarded on that head,
restored a caret captured on the empty input (`0,0`) after the check's later fill and selection. #3945's fix-to-the-fix
guarded the script. So the failure was a real defect, not the element and not a flake. I reproduced it here,
against `b8af7e3b`'s script:

| Script | The check as it was | Stage 4 alone, as written (20 runs, CPU ×6) | Stage 4 alone, one task (10 runs) |
|---|---|---|---|
| `b8af7e3b`'s (unguarded) | fails, 4 of 4 full runs | **0 of 20** lose the caret | 10 of 10 lose the caret |
| current (guarded) | passes | 0 of 20 | 0 of 10 |

**What was wrong with the check.** Run alone, it never saw the defect. The press, the `fill` and the selection were
separate Playwright steps, so the zero-delay timer almost always ran first. In the full check it was caught, because
the earlier stages loaded the runner. Whether the check saw the defect depended on how busy the page was. That's the
"intermittent" the issue saw from the other side.

**The fix.** Stage 4 writes the press, the value and the caret in one task, so the script's delayed restore always
runs after them, which is the order the slow runner hit. The evaluate then waits on a zero-delay timer of its own,
queued after the script's, so that restore has run before the upgrade starts. The read waits 50 ms after the upgrade,
so a restore or reset that lands a task later shows too.

The timer wait came second. The first cut had only the one task, and under `verify.ts`'s load the new mutant went
uncaught once (`was not reported by name (nothing)`). The script's timer had run after the upgrade, so it touched the
replaced input, and the check passed by timing again. With the wait, 12 of 12 runs, six side by side, pass the real
check and fail the mutant by name. With that wait, the element's own restore holds `1,4`, so the issue's
suspect (a Chromium reset after the adopted input is focused) isn't seen.

**Mutation.** A new self-test mutant drops `@prism3/css`'s #3945 guard and must fail as
`upgrade: focus and the caret did not carry over`. It does, on every run. With `b8af7e3b`'s script on disk, the new
check failed 4 of 4 runs by that name. Restored with `git show`.

### Effort

- **Wall clock:** 06:11 to about 06:25 UTC, including the reproduction. The gate run is extra.
- **Hand edits:** `generate-fields.ts` (the guard and a comment), `check-browser-fields.ts` (one new arm, stage 4
  rewritten, two mutants), this entry and the progress entry. `p3-password-field.js` and `custom-elements.json`
  were regenerated.
- **Errors hit:** 3.
  - The first cut of the #3946 fix still raced the upgrade (above). `verify.ts`'s run caught it.
  - The manifest analyzer cut a JSDoc description at `@prism3`, reading it as a tag. I reworded the comment.
  - My first reproduction script crashed: tsx compiled it as CommonJS, and importing `run-suites.ts` runs its main.

**Learning.** A check that passes on a defect when run alone, and fails on it only under load, is a timing test. The
fix is to write the hostile order in, not to retry or wait longer.

---

## S6 — the parity gate: token parity and geometry, all three components, both delivery forms (KPI 2, Q32 A)

Started about 06:45 UTC on 2026-11-20, stacked on #4391 (which is stacked on refresh 4, #4379).

### Where S6 started

S2's `check:parity` slice was token parity for the HTML form: the button, then the fields (S3). Everything else in
KPI 2 was missing:
- **Token parity in the element form.** `check-browser*.ts` held the element equal to the HTML form, but with real token
  values, which can't tell two tokens of equal value apart.
- **Geometry.** Nothing measured boxes against Figma, in either form.
- **API parity.** `check-parity*.ts` in `@prism3/web-components` already does this: props, values, defaults and markup
  per value, against `components.ai.json`.

### What was built

- **Token parity, element form** (`packages/web-components/check-token-parity.ts`, in `check:parity`). The two
  `@prism3/css` parity runners now take a delivery form. The default writes the contract's markup, as before. The
  element form writes each probe as `<p3-button>`, `<p3-text-field>` or `<p3-password-field>` from its props, lets
  Lit render it, and makes the rendered root the probe. Same probes, same EXPECTED (`specs.json`,
  `components.ai.json`), same sentinel decoding. 1,666 bindings: button 621, text field 524, password field 521.
  - **Named, not checked:** `field-label` and `field-message` on their own, which have no element. Also the nested
    label at an emphasis or weight other than the def's defaults. The fields' nesting `exposes` both, but the
    elements have no prop for them (OWNER DECISION below).
  - **A real difference the HTML form hid:** `<p3-button>` renders its spinner only while pending, and the HTML
    contract writes it always and hides it. A button redline row has no state key, so a row that sizes the spinner
    is measured while pending in the element form. That's named on every run.
- **Geometry, code side** (`apps/storybook/check-geometry.ts`, in `check:build`). It runs on every story, in both
  forms and both directions. It measures the root's extent, padding, border widths and corner radii, and each
  anatomy part's box relative to the root, from `getBoundingClientRect`. Parts are keyed by the def's part path
  (`container/control/content`), the key Figma's layers carry. The button's focus ring is an outline, so its box is
  derived from the root, the offset and the width. **The element form must equal the HTML form to 0.01px** (KPI 3's
  "same checks"), and 300 checks pass. It writes the left-to-right HTML record, `storybook-static/geometry.code.json`
  (50 cases), with each case's full variant: props from the emission's defaults where the story writes none, which
  slots are drawn, and the button's label text.
- **Geometry, Figma side** (`apps/storybook/figma-geometry.js`, `figma-geometry.md`). This is a read-only script for
  the Mac's Desktop Bridge. For every member of the three component sets, it records the variant, the boolean
  properties' defaults, the extent, padding, stroke weights, radii, and every visible layer's box from
  `absoluteBoundingBox`, with node id, type and horizontal sizing.
- **The comparison** (`apps/storybook/compare-figma-geometry.ts`). It matches each code case to its member by
  variant and boolean properties. A code-only case is named, not compared: `inactive`, `fullWidth`, and Show/Hide
  shown. A KPI 2 member that no case reaches fails by name. Then the arithmetic, to 0.01px:
  - root padding, border, radii and height are equal;
  - every part's y and height are equal;
  - a FILL part keeps both insets;
  - in a root of another width (a field's build width), a part keeps the inset on the side Figma anchors it to, and
    its width;
  - a text run's width is cancelled: parts after it, and a hugging root, are offset by the text's width difference.
    So a 1px drift in a padding or a gap still fails, however the two renderers set the type. A button at its
    minimum width whose label text differs is named and not compared, because its content is centered.
  - Without `figma-geometry.json`, it fails and names the Mac job.
- **Pixel diff:** not built. Q32 A keeps it as a backstop only, and the boxes are what's compared.

### Decisions (technical, the lane's)

- **The text-width rule.** Figma and Chromium set the same string at different widths, so comparing a hugging width
  raw would fail every case, and a tolerance would hide the 1px drift Q32 A exists to catch. Cancelling the measured
  text difference keeps 0.01px everywhere else.
- **Geometry renders from the Storybook.** Q32 A's comment says the geometry checks render from it, and it already
  has every case in both forms.
- **The Figma comparison is not in CI yet.** It would fail with no record. The self-test is in CI, so the arithmetic
  is held. Once the Mac job commits a record, `compare-figma-geometry.ts` joins `check:build`.

### What was checked, and how

| Check | Real run | Mutants, each fails by name |
|---|---|---|
| `check-token-parity.ts` | 1,666 bindings OK | `<p3-button>` drops its size (126), `<p3-text-field>` drops its validation (36), `<p3-password-field>` drops its size (43), `<p3-text-field>` never defined (524, "no probe root") |
| `check-geometry.ts` | 300 OK | element-only: button padding +1px, field label 1px lower, Show/Hide hidden, focus ring offset +1px; the 3 represented-story mutants |
| `compare-figma-geometry.ts --self-test` | a planted record differing only in text width (7.3px narrower) agrees, 1,487 comparisons | Figma padding +1px, a label 1px lower, a gap +1px after the text, a control 1px narrower in a field of another width, a missing layer |

The planted record is derived from the code's own, so it proves the arithmetic, not the agreement (`docs/34`). Only the
Mac record can show agreement.

**Hand mutations on disk**, each after a commit, restored with `git show HEAD:<path> > <path>`:
- `p3-password-field.js` writes `data-prop-validation="default"`. `check-token-parity.ts` fails with 36, starting
  `password-field status=error state=rest: container/control border-top-color binds color.field.border.rest, the
  spec names color.border.danger`.
- `p3-button.js` stops writing `data-prop-size`, then Storybook is rebuilt. `check-geometry.ts` fails 38, starting
  `button--small: container width is 127.83 in the element form, 114.42 in the HTML form`.

### OWNER DECISIONS (posted on #3408)

1. **Which Figma file is KPI 2's reference.** A (recommended): a scratch file where the plugin builds the three sets at
   the measured commit, as `tools/component-roundtrip` does, so the record matches the code it's compared with.
   B: the owner's published library file, which may lag the commit.
2. **The fields expose the nested label's emphasis and weight in Figma, but the elements have no prop for them.** The
   HTML form can set them on the label; the element can't. A (recommended for the POC): record it as a KPI 2 API
   parity mismatch and change nothing. B: add the two props to the fields' API (a component API change). C: stop
   exposing them in Figma.

### Blocked, and what's needed

- **Figma's geometry record:** one Mac job (`figma-geometry.md`) in the file decision 1 names, then a PR into
  `poc/arm-1` with `figma-geometry.json`. No cloud session can reach Figma.
- **The scored comparison against arm 2:** read access to the contributor's components repo. Arm 2's side then needs
  the same three measurements:
  - its Storybook built, with stories for the same cases;
  - a part map from the anatomy's part paths to arm 2's markup (`PARTS` in `check-geometry.ts` is arm 1's);
  - for token parity, its CSS custom property names, or a map from them to token paths, so the sentinel decoding can
    name each value.

  Then `check-geometry.ts` and `compare-figma-geometry.ts` run on its record unchanged, and the scorecard compares
  the two arms' failures, counts and named gaps.

### Effort

- **Wall clock:** about 06:45 to 07:15 UTC for the build and mutations, plus the gate run.
- **Hand edits:** the two `@prism3/css` parity runners (a form parameter, about 30 lines),
  `check-token-parity.ts` (new, about 130), `check-geometry.ts` (new, about 200), `compare-figma-geometry.ts` (new,
  about 230), `figma-geometry.js` (new, about 60), `figma-geometry.md`, two package scripts, two READMEs, CONTRIBUTING
  §3, this entry and the progress entry.
- **Errors hit:** 6, all mine, all caught by the checks themselves.
  - Spinner checks found no element: the element renders it only while pending (above).
  - A mutant regex left a dangling `if`.
  - tsx's `keepNames` broke the page function, as S2 warned. It's now a string.
  - The focus-ring mutant's selector reached both forms.
  - The comparator matched code-only cases (full width, Show/Hide shown, a field's icons) to the plain member. Width,
    and the fields' icons and message, are axes or boolean properties the match had to name.
  - A fixed part in a root of another width needs its anchored side, not both insets.

**Learning.** The element-form token parity found, on its first run, the one structural difference between the forms
that the HTML-only parity and the real-value comparison both hid: the spinner exists only while pending. Equal
computed styles don't mean equal structure.
