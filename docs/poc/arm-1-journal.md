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
- **Q141 / Q-HT1 A, the hit target.** Small already read `space.300`, so nothing moved there. **Medium and large
  stay on `size.md.min-height` (44px), pending `space.550`.** `space.550` isn't on `main` (`main` at `9dd8b6e5` has
  `space.{0,025,050,075,100,150,200,250,300,400,…}`), and no open PR adds it yet. Once it lands, the change is one
  line of `HIT` in `generate.ts` plus the browser check's floor token.

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

- **`space.550`** (Q-HT1 A): then medium and large hit targets move to it.
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
