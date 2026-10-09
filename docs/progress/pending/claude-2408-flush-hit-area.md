## (2026-10-09) — A flush text button's hit area is 44×44 in code, stated and gated (#2408)

Owner decision Q154 A (2026-10-09), a follow-up to #2350's flush text buttons: a flush button has no visual minimum
width, since its box stays label-width so alignment holds, but its hit area is at least 44×44 in code, through an
invisible extension. Figma is unchanged, because it has no hit areas.

**What changed:**
- `components/button.ts`: the shared `makeButton` body, so Button, Destructive and Neutral all carry it. The
  `touch-target-expansion` `codeOnly` entry and the `inset=flush` line in `docs.do` state the 44×44 hit area and the
  technique (a transparent `::before` inset outward and centered on the label). The old line said "at least its
  default sibling's size", which was wider than the owner's rule and named no number.
- Regenerated: `out/components/button*.md`, `components.ai.json` (the `docs.do` line; `codeOnly` does not reach the
  `.ai.json`, so `docs.do` is what carries the rule to agents) and `schema/component-maintainer.json`.
- `schema/component-surface.json`, by `lint-component-surface --accept`: the projected plan carries `codeOnly`, so
  all 30 button plan digests move with no member, geometry or binding change.
- `skills/prism3-consume`: a paragraph after "Size is for size", with a CSS sketch whose inset is
  `min(0px, (100% - 44px) / 2)`, so it extends only on an axis under 44px.
- `test.ts`, arm `#2408`: per def, the `codeOnly` entry, the `docs.do` line and the emitted `components.ai.json` line
  each carry `at least 44×44`, `::before inset outward` and `centered on the label`; the skill has a paragraph that does
  too. Literals throughout.

**`lint-hit-target` was passing flush members on their height alone.** The walk reads each control's height token,
and a flush member keeps its height, so it cleared the floor while its width, now label-width, was read by nothing.
No emitted token can carry a code-side hit area, so the gate cannot measure it; the new FLUSH MEMBERS arm requires
the def to state it instead. `FLUSH_MEMBERS` is authored in the gate and compared both ways with the defs' `flush`
fields, so a new flush def cannot arrive with only its height read. The phrases (`flush`, `44×44`, `::before`) must sit
in one `codeOnly` entry; a self-check drives the predicate, including phrases split across two entries.

**The first draft of both witnesses passed the mutation it was written for.** It matched bare `44×44` and `::before`,
and the same `codeOnly` entry already says "Apple HIG 44×44" and "(::before / absolute overlay)" in its opening clause.
With the flush sentence deleted, `test.ts` still failed (on `inset outward`), but `lint-hit-target` stayed green. Both
now match phrases of the rule itself (`at least 44×44`, `::before inset outward`). Mutations, each run on a committed
tree: the flush sentence deleted from `codeOnly` fails `lint-hit-target`'s `<def>/inset=flush: no codeOnly entry
states the code-side hit area` (3) and `test.ts`'s `#2408 <def>: codeOnly states …` (3); the old `docs.do` line
restored and regenerated, with the skill paragraph removed, fails `#2408 <def>: docs.do …` (3), `#2408 <def>:
components.ai.json carries …` (3) and `#2408 prism3-consume: …` (1).

**Trap for whoever re-verifies:** the rule applies at every size, including small, which is otherwise a permanent
below-floor exception. The exception is about the visual box; the code-side extension is the reconciliation the
`touch-target-expansion` entry already describes.
