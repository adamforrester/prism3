## (2026-11-06) — Accordion and Dialog nest Divider at emphasis=subtle (#3476)

**Status:** Accordion and Dialog nest variants + a projected-plan arm + an as-built arm. ENGINE minor (change note).
CONTRACT unchanged: no token name moves. No executor code moves, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q72 B (2026-11-06, on #3476):** Accordion and Dialog nest their dividers at `emphasis: subtle`, on
  `color.border.primary`, for every brand. #3382 had them name `bold`, the color they drew before the axis existed; on
  the reference brand's master a hand edit had kept them light, and once that edit was overwritten the separators went
  darker than the owner designs with. The lighter separator is now the plan, so no hand edit is needed.
- **Divider's own default stays `bold`.** Bold still leads for a placed divider; that was not part of the decision.
- **Contrast.** Neither strength is a 3:1 boundary. `border.secondary` is the decorative rung (#2569) and
  `border.primary` is a decorative hairline with no contract of its own (its sidecar and `avoid_when` say "not a 3:1
  target"). Both hosts' dividers are decorative in Figma; a rule that marks a real break in code is `decorative=false`,
  which paints `border.tertiary` either way. No gate claims 3:1 for these separators.
- `component-surface.json` accepted after reading the diff: only the Accordion and Dialog plan digests move; member
  counts (48, 24) and every Figma property are unchanged.
- Stale prose that said "every nesting host keeps its color" is corrected in `divider.ts` (header and a new decision
  note) and in `lint-axis-values.ts`'s register reason.

### Update file

A file's next Update rewrites every Accordion member (48) and every Dialog member (24) in place: each nested divider
instance swaps from the `emphasis=bold` member of the Divider set to the `emphasis=subtle` one. Member names and ids do
not change, and the Divider set itself does not change, so consumer instances of Accordion and Dialog still resolve.

### Verification

- New `#3476 nested divider` arm in `test.ts`: every divider nested in every projected Accordion and Dialog member (90:
  48 + 24 header + 18 footer) names `{ orientation: horizontal, inset: none, labeled: false, emphasis: subtle }`,
  typed literally.
- New `#3476 nested divider as built` arm in `test-roundtrip.ts`: both hosts built into one shim file after their
  dependencies; each of the 90 instances is read back off the host as the built Divider member at `emphasis=subtle`,
  whose rule strokes `color/border/primary`.
- Mutation: either host's nest back to `emphasis: 'bold'` fails both arms by name.
