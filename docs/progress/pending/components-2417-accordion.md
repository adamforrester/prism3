## (2026-10-11) — Accordion: one expand and collapse section, built on a nested indicator, a native slot and the Divider (#2417)

Built to the owner's decisions on #2417: Q180 as revised by Q182, then Q183, the title type revised on 2026-10-11, and the review answers Q241 to Q243. It lands after #2529, the native-slot engine feature, which it merges in.

- **`accordion`, 24 members:** `expansion` [collapsed, expanded] × `position` [leading, trailing] × `size` [small, medium, large] × state [rest, focus-visible].
  - No hover (Q182), and no disabled or pressed member (Q183).
  - The header row is the button, with a 44px floor at every size.
  - The title is in `type.label.*.emphasis`.
  - The panel, present only when expanded, is a NATIVE SLOT holding placeholder text in page ink, with no top inset and a bottom one.
  - A nested Divider is stretched under the section.
  - The shared focus ring sits around the header, on its edge (`focus.ring.offset-field`, Q243).
- **`_accordion-indicator`, 12 members:** `indicator` [chevron, plus-minus] × `expansion` × `size`. It's the building block Q183 chose. Each member shows one glyph. The Accordion nests it at each `position`, with `indicator` exposed and `expansion` and `size` followed.
- **Engine:**
  - two new variant axes, `expansion` and `position` (values `leading | trailing`, Q242);
  - a def id may lead with `_` for a building block, which Figma leaves out of a published library;
  - `PaddingDef.blockEnd` pads a box's bottom apart from its top;
  - a new `body` paint slot, for page text inside a control.

### Measured before it was built (a real host, the scratch file, every probe removed after)

- **The premise of Q183's shape:**
  - An exposed nested `indicator=plus-minus` held across the host's expansion switch both ways, Figma swapping the nested instance to the matching member.
  - Native slots fit the content better than an instance-swap (Q182 asked to check): a designer's content survives an expansion switch, even through the collapsed member that has no slot.
- **The Divider under a stretch:** in a 400px column, a stretched Divider instance becomes FILL at 400px, follows its parent, and drops its 720px width binding. So the plan carries no width on the nested instance, and the read-back expects none.

### Measured after it was built (the same file, the real paste payload, the probe page removed after)

- The Divider (5 members), then `_accordion-indicator` (12) and two Accordion members built with no misses. The panel is a SLOT holding the placeholder, the set carries one `content` SLOT property and the `title` TEXT property, and the nested Divider is FILL at 320px with no width binding.
- On a placed instance, plus-minus picked on the exposed indicator held across expansion switches both ways (plus, minus, plus, minus).
- **One defect, fixed here:** the placeholder ran one line 578px wide out of the 320px panel. `wrap: true` projected `layoutGrow`, which in a column grows the height. Under a column it now projects `layoutAlign: STRETCH`; written live, the text filled 288px and wrapped to two lines, on the member and on the instance. Accordion is the first def with a wrapping text under a column (all defs scanned), so no other plan moves.

### Choices made on the way, for the owner

- **The title type is `type.label.*.emphasis`, not Q182's `type.body.*.strong`** (owner, 2026-10-11). A brand emits body strong only if it adds that weight, and nb-redesign does not, so `#1601` failed for it.
- **Two indicator parts.** Node order is fixed per set, so `leadingIndicator` and `trailingIndicator` are two parts, each gated by `position`. A designer's chevron or plus-minus choice survives an expansion switch (measured) but is expected to reset on a position switch, since it then sits on another nested instance.
- **`position` is `leading | trailing`** (owner Q242), as Button names its leading and trailing visuals and Switch row its `labelPosition`, following text direction. The indicator parts are named for the values too: `leadingIndicator`, `leadingGlyph`, `trailingIndicator`, `trailingGlyph`.
- **The header's ring sits on its edge** (owner Q243): `focus.ring.offset-field`, 0, not the control offset, because a full-width header's outset ring would be clipped by an overflow-hidden container and overlap the nested Divider. `lint-absolute-inset` admits the 0 in `ZERO_OK` with that reason. The ring still compensates its own 2px stroke, as a field's does, so the stroke sits just outside the header's edge.
- **Pending the owner's visual QA (Q241):** the padding steps (inline 12/16/24, block 8/12/16, gap 8/12/16), the panel insets (no top, then 12/16/24 below) and the glyph sizes (20/24/32px).
- **Approved in Q241:** the inks, the Figma copy ("Section title", and the panel placeholder), the property names, the display name `Accordion.Indicator`, both defs on one "Accordion" page under Components after Divider, and the prose.

### Gates and tests

- Joined:
  - `lint-hit-target` (Accordion's header floor; the indicator excluded);
  - `lint-rung-names`;
  - `lint-axis-values` (`expansion`, `position` and `indicator` as sole sets; size canonical);
  - `lint-standalone-floor`, `lint-paint-placement`, `lint-glyph-geometry`, `lint-absolute-inset`;
  - `test.ts`'s brief category, gated-parts, type-grid and spacing tables;
  - the file taxonomy.
- A `wrap: true` text under a column projects the cross-axis stretch, not the grow (measured above).
- `#910` now handles a part gated on several axes (AND-composed), asked over the whole projected set.
- Both baselines are accepted under the change note. The docs schema allows a `_` id. `regen` expects 180 artifacts.
- The `#2417 accordion …` arms in `test.ts` hold each decision against a literal. The mutations and their failing lines are in the Ready comment.
