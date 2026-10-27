## (2026-10-27) — Divider: the labeled variant, a rule broken by a short centered label (#3051)

**Status:** Divider def, a schema admission (`paintGroup`), tests and baselines. ENGINE minor (change note). CONTRACT
unchanged: every binding is an existing token name. No executor change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision (2026-10-27, on #3051): build the labeled divider on the proposal's recommendations**, all seven
  held in the PR as a Q-block for confirmation: Q3051.1 A a `labeled: false | true` axis plus a `label` text property
  and string prop; Q3051.2 A no role on the wrapper, both lines `aria-hidden`, the label read as plain text; Q3051.3 A
  center only; Q3051.4 A `type.label.md.default` with `space.300` between the label and each line; Q3051.5 A
  `color.text.secondary`; Q3051.6 A horizontal, inset `none` only; Q3051.7 A "Or", sentence case.
- The set goes from five members to six. The plain members keep their pixels: the root is still a fixed row with the
  rule filling it, now `align: center` (which a stretched rule ignores) and binding `space.300` as its gap, which lays nothing out
  around one child. The labeled member draws
  `leadingRule` (grows), `label` (hugs) and `trailingRule` (grows), and its root is one label line box tall
  (`type.label.md.line-box`, the baked px the checkbox row's #1201 construction uses), so the hairlines sit on the
  middle of the label's line. The gap follows density (20 / 24 / 32).
- Plugin: `test-canvas-furniture.ts`'s thin-row case (Q258 A) built the whole divider set and found its 1px row. The
  labeled member is 16px and shares the horizontal row, so no row of the real set is thin any more; the case now builds
  the five plain members only, so the rule it holds still has a row to hold it on.
- In code there is no `labeled` prop: a non-empty `label` is the labeled divider. `#2752`'s BRIDGE says so.
- Accordion and Dialog nest the divider at `labeled: false` (their nested coordinate must name one member).

### The trap: one surface in pieces

`anatomyErrors` refuses two boxes claiming one paint slot (#933): `paintOf` is blind to which part asked, so they bind
one variable. The plain rule and the two lines are one rule split by the label, so binding one variable is the intent.
Rather than route a line through another slot (an `overlay` that only happens to land on `fills`), the schema gains
`paintGroup`: claimants of a shared slot are admitted only when every one names the same group, and the validator
refuses a group off a box, on a box that paints nothing, of one member, or whose members' `paintSlots` differ. Flagged
in the PR as an engine-mechanics call the owner may want to see.

### Gates

`test.ts` `#3051 divider labeled` holds each owner call against typed literals: the label and both lines present only
at `labeled=true` (and the plain rule only at `false`), lines that grow in flow on either side of a hugging label, the
label's `color/text/secondary` ink and `label/md/default` style, the `type/label/md/line-box` root and `space/300` gap,
the "Or" text property, the code API, the a11y contract, and `text.secondary` at 4.5:1 or better against
`background.primary` and `background.secondary` in every mode of every example brand, recomputed from the roles' hex.
Each arm was mutated from a `wip:` commit and failed by name (table in the PR).
