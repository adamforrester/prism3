## (2026-10-11) — Accordion: one expand and collapse section, built on a nested indicator, a native slot and the Divider (#2417)

Built to the owner's decisions on #2417: Q180 as revised by Q182, then Q183, the title type revised on 2026-10-11, the review answers Q241 to Q243, and the owner's QA of the live build (2026-10-12). It lands after #2529, the native-slot engine feature, which it merges in.

- **`accordion`, 24 members:** `expansion` [collapsed, expanded] × `iconPosition` [leading, trailing] × `size` [small, medium, large] × state [rest, focus-visible].
  - No hover (Q182), and no disabled or pressed member (Q183).
  - The header row is the button, with a 44px floor at every size.
  - The title is in `type.label.*.emphasis`.
  - The panel, present only when expanded, is a NATIVE SLOT holding placeholder text in page ink, with no top inset and a bottom one.
  - A nested Divider is stretched under the section.
  - The header row is top-aligned, and the glyph centers on the title's first line (Q262 A).
  - Q266 A accepts that construction as built: the indicator box is the row's height with its glyph at the top, and the title is padded down `space.025`. Label line-box tokens with the offset derived from the type follow in #2586, before any label line-height lever.
  - The shared focus ring is drawn inside the header's edge (Q257 A).
- **`_accordion-indicator`, 12 members:** `indicator` [chevron, plus-minus] × `expansion` × `size`. It's the building block Q183 chose. Each member shows one glyph. The Accordion nests it on the leading or the trailing side, with `indicator` exposed and `expansion` and `size` followed.
- **Engine:**
  - two new variant axes, `expansion` and `iconPosition` (values `leading | trailing`, Q242; the name from the owner's QA);
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
- **Two indicator parts.** Node order is fixed per set, so `leadingIndicator` and `trailingIndicator` are two parts, each gated by `iconPosition`. A designer's chevron or plus-minus choice survives an expansion switch (measured) but is expected to reset on a position switch, since it then sits on another nested instance.
- **`iconPosition` is `leading | trailing`** (values Q242, name from the owner's QA), as Button names its leading and trailing visuals and Switch row its `labelPosition`, following text direction. The indicator parts are named for the values too: `leadingIndicator`, `leadingGlyph`, `trailingIndicator`, `trailingGlyph`. A bare `position` read as if it could be the label's.
  - **Figma shows "icon position"** (#2571, closed here). Variant axes had no display name: the axis key was written straight into member names. A new `FigmaProperties.variantAxisNames` gives one, as `slotAxes[].figmaName` does for Button's "leading icon". The plan carries it only when set (`axisFigmaNames`), so no other def's plan moves.
    - The display name is written by `planComponentName`, and read by every key that parses a member name: the grid axes, the cohort `group`, the `footprintVaries` handed to the chunked paste, `gridAxis`, and the axis-parity domain.
    - The validator refuses a name for an axis the def doesn't have, and one that clashes with another panel name.
    - A def that another def NESTS can't carry one yet, because a nest names its coordinate by code name and the projection can't see the nested def. `#2571 nesting` fails by name the day one is nested.
  - The docs schema's axis-key pattern admits camelCase for the code name (`^[a-z][a-zA-Z0-9-]*$`).
- **The live build and the owner's QA (2026-10-12).** Built on the NB master copy at `tree-5e5df81f`: the padding was approved, and four changes followed.
  - **The header row is top-aligned, and the glyph centers on the title's first line** (owner Q262 A, revising the QA's center-left, which floated the glyph mid-block on a wrapped title, #1009). This is Prism2's construction:
    - the indicator box is as tall as the row, with its glyph at the top;
    - the title sits in its own column (`titleBox`), padded 2px down (`space.025`).
    - Prism2 padded its icon 2px down because its icon was shorter than the line. Here every brand's title line (label type at the snug line height) is shorter than the glyph, so the 2px goes on the title instead.
    - Line one's center is within 1px of the glyph's at every size in all five brands, and at medium it's within 0.05px. `#2417 accordion header (Q262)` measures that on a two-line title, from the plan's own alignments and each brand's emitted tokens.
    - The body `line-box` binding is gone from both indicator boxes.
  - **The glyphs are one rung smaller:** `icon.size.xs`, `sm`, `md` (16/20/24px), superseding Q241.3's 20/24/32. `lint-rung-names` admits the medium default's `sm` through `ICON_OFFSET_DEFS`, the owner-sanctioned offset Button already uses.
  - **The focus ring is drawn inside the header's edge** (Q257 A, superseding Q243). Built live, Q243's ring still compensated its own 2px stroke outward, so it covered the Divider by 2px.
    - Now: offset 0, no `strokeInset`, and a new `PartDef.drawnInside: true` stating that the uncompensated stroke is intended.
    - The schema's #801 rule accepts `drawnInside` in place of `strokeInset`, and refuses the pair together or `drawnInside` on a non-absolute part.
    - `lint-absolute-inset` requires a part drawn inside to sit at a gap of exactly 0 in every brand, with a `MUST_DRAW_INSIDE` floor. Accordion leaves `ZERO_OK` and `MUST_CLEAR_STROKE`.
- **Approved in Q241 and the QA:** the padding steps (inline 12/16/24, block 8/12/16, gap 8/12/16), the panel insets (no top, then 12/16/24 below), the inks, the Figma copy ("Section title", and the panel placeholder), the property names, the display name `Accordion.Indicator`, both defs on one "Accordion" page under Components after Divider, and the prose.

### Gates and tests

- Joined:
  - `lint-hit-target` (Accordion's header floor; the indicator excluded);
  - `lint-rung-names`;
  - `lint-axis-values` (`expansion`, `iconPosition` and `indicator` as sole sets; size canonical);
  - `lint-standalone-floor`, `lint-paint-placement`, `lint-glyph-geometry`, `lint-absolute-inset`;
  - `test.ts`'s brief category, gated-parts, type-grid and spacing tables;
  - the file taxonomy.
- A `wrap: true` text under a column projects the cross-axis stretch, not the grow (measured above).
- **Canvas furniture on both sets** (owner decision Q212 A, every def that builds a set): `_accordion-indicator` and `accordion` join `CANVAS_FURNITURE`, which #2538's `rollout/switch` holds to the def registry. The Accordion page joins the `clearance/pages` register as the seventh page holding more than one set; its two sets clear each other by 141px.
- `#910` now handles a part gated on several axes (AND-composed), asked over the whole projected set.
- Both baselines are accepted under the change note. The docs schema allows a `_` id. `regen` expects 180 artifacts.
- The `#2417 accordion …` arms in `test.ts` hold each decision against a literal. The mutations and their failing lines are in the Ready comment.
