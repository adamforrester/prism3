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
- **Errors hit:** 2. The first `$type` lookup ignored a group-inherited type, so it was rewritten as a walk. The
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
