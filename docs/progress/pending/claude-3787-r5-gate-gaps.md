## (2026-11-15) — The R5 refactor gates close the gaps their reviews found (#3787)

**STATUS: PR open, not merged.** ENGINE stands (no output moves, no validator refusal added, so no change note), CONTRACT stands. Follow-ups from the independent reviews of #3776 (facade), #3777 (theme split) and #3785 (style as data). None of the gaps was exploited by a tracked file. Each gate change was proved with a mutation the old gate let through and the new gate fails by name. Files: `packages/engine/lint-engine-facade.ts`, `lint-theme-split.ts`, `lint-projector-def-ids.ts`, `component-schema.ts` (a comment), `test.ts` (one assertion), two studio comments, and `docs/public/ecosystem/ecosystem.json`.

**`lint-engine-facade`.**
- It now reads `require('…')`, so `require('@prism3/engine/<deep>')` and a `require` of a relative path into the engine fail DEEP IMPORT.
- It scans untracked files that are not ignored (`git ls-files --others --exclude-standard`) as well as tracked ones, so a new deep import fails locally before it is committed. CI's checkout is clean and its build output is ignored, so CI scans the same set. An ignored file under `apps/plugin/dist/` is still skipped (checked).

**`lint-theme-split`.**
- `importsOf` reads double-quoted specifiers, static and dynamic. A double-quoted `./theme` import in an axis module now fails CYCLE, and a double-quoted value loop fails ACYCLIC.
- `MODULE` takes kebab-case names with digits (`/^theme(?:-[a-z0-9]+)+\.ts$/`), and the barrel's re-export pattern takes the same names. Orphans like `theme-foo2.ts` and `theme-foo-bar.ts` now fail REPRESENTED. A hyphenated module the barrel does re-export passes. The self-check plants names on both sides of the rule.

**Stale pointers.** The `bpNames` comment in `layout-input.ts` now names `theme-layout.ts`, and the `gamutNote` comment in `engine-warnings.ts` names `theme-brand.ts`. The ecosystem engine node cites the eight `theme-*.ts` axis modules in place of the barrel.

**`lint-projector-def-ids`, against the #3785 review's §5 list:**
- Closed, all as LOOKUP:
  - (1) an index or membership test on any receiver's `.id` (`X[d.id]`, `.includes(d.id)`). A write, `X[d.id] = …`, builds output and is not a lookup: `component-defs-export.ts` builds its record that way.
  - (2) `switch (def.id)`.
  - (3) a destructured bare `id` compared to a literal. Only a literal that is a registered def id counts, because a bare `id` is also a row key (`id !== ''`) or a node id.
  - (4) `def.id in X`.
  - (5) a string method or regex test on the id.
- Closed as TABLE: (6) a `new Map([['tag', …]])` entry key counts as a key, so a one-entry Map is a table.
- Partly closed: (8) LOOKUP now also scans the three files that restate the materializer chain: `component-specs.ts`, `component-defs-export.ts` and the plugin's `brand-def.ts`. TABLE stays on `anatomy-figma.ts`, because an emitter's own keys can match a def id (`leversOf` has a `button` field).
- Left open, with the reason in the gate's header:
  - (7) a lookup keyed on another carrier (`X.has(plan.component)`). The carriers are open-ended and mostly not ids. The TABLE rule still sees the table such a lookup reads.
  - (8) any other file, for the TABLE reason above.
- `lint-lever-sweep.ts` restates the chain too, but it is a gate whose lists name defs on purpose, so it is not scanned.

**`levers.controlShape.squares`: why the check is in `test.ts` and not in the validator.**
- Measured: after Boxed, every shipped def's `squares` refs are unbound on the materialized def; after Underline, the fields' refs are. `test.ts` validates materialized defs (the Underline text field and tag), and nothing on a def tells authored from materialized. So a binding refusal in `leverErrors` would refuse those defs.
- `test.ts` now holds the binding over `componentDefs`, the registry as authored, before any materializer. The validator's comment says why.
- Mutation: select's `squares` gains `'radius.smm'` beside `'radius.sm'`. The output does not change, so no behavior test can see it, and the validator reports 0 errors. `test.ts` fails exactly once: `❌ #3787 levers: … (6 defs; unbound: select: radius.smm)`.
- A def that arrives as data, and never enters `componentDefs`, still meets only the syntax check.
