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

**Owner decision Q170 (2026-10-09): the wording is approved, and the rule covers medium and large only (B).** The
first draft applied the 44×44 hit area "at every size". The owner scoped it to medium and large flush buttons; a small
button stays the permanent below-floor exception it already is (`SMALL_SIZE`), with no code-side extension owed. The
qualifier is the only new wording: the `codeOnly` sentence says "at least 44×44 at medium and large sizes", the
`docs.do` line says "and, at medium and large sizes, extend its hit area", and the skill paragraph's lead and its
second sentence name medium and large. `lint-hit-target`'s FLUSH arm and `test.ts`'s `#2408` arm both require the
literal scope ("at medium and large sizes") and refuse an entry that names small, every size or all sizes. The gate
also checks each flush def's `size` axis against its literal `FLUSH_SIZES` (medium, large) plus `FLUSH_EXEMPT_SIZES`
(small), so a new size fails until someone decides its hit area. Mutations, each on a committed tree: the qualifier
back to "at every size", small re-added ("at small, medium and large sizes"), and medium dropped ("at large sizes")
each fail `lint-hit-target`'s `<def>/inset=flush: no codeOnly entry states the code-side hit area at medium and large
only` and `test.ts`'s `#2408 <def>: codeOnly states a medium or large flush button's hit area …`.

**Owner decision Q174 B (2026-10-09): a small flush button's hit area is at least 24×24 in code**, the WCAG 2.2 AA
2.5.8 floor; medium and large keep 44×44. This replaces Q170 B's "not small": a small flush button keeps its height,
but its width is the label's, so a short label could fall under 24px wide with nothing owed. One clause per surface,
every approved word kept: `codeOnly` adds "and at least 24×24 at small", `docs.do` adds "; extend it the same way to
at least 24×24px at small", the skill adds "Extend it the same way to at least 24×24px at small." (and its CSS
comment notes 24px). `lint-hit-target`'s FLUSH arm and `test.ts`'s `#2408` arm now require the literal "at least
24×24 at small" and refuse 44×44 at small; `FLUSH_EXEMPT_SIZES` became `FLUSH_SMALL_SIZES`. **#2443 closed here:**
`FLUSH_SIZES` fed only the size-axis check, which reads the union, so widening it to small passed. Both constants
are now held to literals, in the gate's self-check and in `test.ts` (`#2443 lint-hit-target: …`, read from the gate's
source). Mutations, each on a committed tree: the small clause removed, small at 44×44, medium dropped, and
`FLUSH_SIZES` widened each fail by name (lines in the PR's Ready comment).

**Trap for whoever re-verifies:** the per-size scope is held only as prose plus these two witnesses. Nothing in Figma or in
the tokens distinguishes a flush button's hit area by size, so the scopes cannot be measured, only stated.
