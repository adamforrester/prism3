## (2026-10-25) — Accordion: the indicator pair is a property on the Accordion (#2878)

**Status:** Accordion def, its indicator's notes, `lint-axis-values.ts`, tests, regenerated artifacts. ENGINE minor
(change note). CONTRACT unchanged: no token is added or renamed. `EXECUTOR_REVISION` unchanged: no executor code moved.

### What changed

- **The ask (#2878, owner go Q695 A):** on a published library, a designer switching an accordion to + / − had to find
  the nested `_accordion-indicator` inside each instance. Accordion now carries an `indicator` variant axis
  (`chevron | plus-minus`, chevron first), and the nested indicator **follows** it per member, as it already followed
  `expansion` and `size`. This is Button's `surface` → focus-ring mechanism, not a new one. Figma has no other enum
  property: a boolean or text property cannot pick a nested instance's member, and an instance-swap property swaps
  between components where the indicator is one set.
- **Q-block A on the issue (posted, built as recommended):** the axis replaces Q183's exposed nested property, so there is
  one control, not two that can disagree (option B kept both through a `variantWhen` start value). The set doubles to 48
  members, which Q183 had avoided. The choice now also survives an icon-position switch, which the exposed override was
  expected not to (two parts, two nested instances); that `unverified` note is gone.
- **Additive for library consumers (#2839):** `chevron` leads, so Update gives the 24 existing members
  `indicator=chevron` in place (`update-plan.ts` §2, as Link's `selection` landed in #2872) and builds the 24 plus-minus
  members. Nothing is dropped or replaced and no component property is removed or retyped, so "Breaks library consumers"
  stays empty. Each header's nested indicator keeps its node id, so a consumer's earlier plus-minus override on it stays.
- **Code:** Accordion already had an `indicator` prop (default `chevron`); it is unchanged.
- Accepted through their gates: `component-surface.json`, `component-axes.json` (the new axis, 24 → 48, no property
  removed), `paint-census.json`; the studio's component catalog regenerated.

### Gates

- `#2878 accordion indicator` (`test-roundtrip.ts`): the indicator set and the Accordion built into one file by the
  real executor; on all 48 members the header's nested instance is the indicator member at the Accordion's own
  indicator, expansion and size, drawing the glyph typed in the arm. Mutation: `indicator` dropped from the nests'
  `follow` → this arm fails by name (48 off: every plus-minus member on a chevron).
- `published/accordion indicator additive` and `… in place` (`test-update-apply.ts`): a published 24-member Accordion,
  projected from the pre-#2878 def shape, updated to 48.
- `#2417 accordion` and `#2417 accordion indicator` (`test.ts`) moved to 48 members and to `follow` on `indicator`; the
  accordion arms in `test-update-apply.ts` and the header measurements moved to the doubled counts.
