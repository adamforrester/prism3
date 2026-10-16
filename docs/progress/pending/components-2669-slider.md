## (2026-10-16) — Slider: one control for a value or a range, its thumb a nested state-only component (#2669)

Built to the proposal on #2669 as the owner approved it on 2026-10-16, every numbered call at its recommendation (A):
one `Slider`, range from a two-value `value`; `type` [single, range] × five states = 10 members; one size; the value
as header text; a 2px rail and a 4px fill; a 24px filled thumb with a 2px page-colored ring; paired inputs behind an
`inputs` boolean; thumbs that stop at each other; the names and wording as listed. Cites the knowledge base's
`components/slider.md` (category Form), read for this build.

### Why the thumb is its own component, `_slider-thumb`

Call 2 A puts the state on the maximum thumb while the minimum thumb of a range stays at rest. `paintOf` is
part-blind: two boxes in one def that take the same paint slot bind the same variable at a coordinate, so two thumbs
in the Slider could never differ. So the thumb is a nested component, Slider.Thumb, and each of the Slider's thumbs
nests it `nest-fixed` at rest with `atState` moving it: the maximum thumb at hover, pressed, focus-visible and
disabled, the minimum thumb at disabled only. The focus ring lives inside the Thumb, so it lands on the thumb and never
on the track. It takes the `_` prefix by the Q349 rule (used only inside its parent).

The Thumb has no variant at all, only its five states, and the schema refused a set with an empty `variantAxes`. The
validator now admits one exactly when the def declares no variants and has a state axis; `test.ts` holds both sides
(Slider.Thumb passes, the same def with its state axis removed fails). The plan and both executors needed nothing
new: a member is named `state=rest`, and the set combines on that one property.

### Why the track is flow, not offsets

Figma auto layout has no per-child main-axis offset, and `positionWhen` is three positions only. A first try put two
rail segments in the control row, which the validator refuses (two parts claiming one slot bind one variable, and it
cannot know that is wanted). What shipped: the control row (the `size.md.min-height` target) holds one `track` box,
2px tall, painted as the rail; inside it, growing unpainted spacers and the selected bar (4px, `indicator`) sit around
fixed thumbs, all taller than the track and overflowing it, which an auto-layout frame allows with clipping off. Single
is [bar, thumb, spaceEnd], range [spaceStart, thumbMin, bar, thumb, spaceEnd]. The thumbs land at the middle, and near
a third and two thirds; the placeholder text says "50" and "30 – 70" to match. Code draws one rail and positions the
bar and thumbs by value (`codeOnly`).

### Paint and contrast

Rail `color.field.border.rest` (slot `fill`), bar `color.interactive.primary.fill.rest` (slot `indicator`), value text
`color.text.primary` (slot `label`), end labels `color.text.secondary` (slot `body`); none moves with the state. Thumb:
the primary fill at rest, hover and pressed, the ring `color.background.primary`. Disabled: `color.disabled.fill` on
rail, bar and thumb, `color.disabled.text` on text, and the ring `color.disabled.border` (Q346: every disabled border
binds it). Measured in all 20 cells (five brands × four modes), lowest: rail 3.51, bar and thumb at rest 4.05, hover
5.80, pressed 7.95, focus ring 4.56, value text 15.98, end labels 5.00. Each is a literal floor in `test.ts`, measured
on the role the plan binds. The fill against the rail stays under 3:1 everywhere, as the proposal said; the thickness
and the thumbs carry it.

### Gates

- `lint-hit-target`: the Slider is INTERACTIVE `single` on its control row (`size.md.min-height`, 44px). The Thumb is
  a CODE_SIDE_TARGET, which needed two small widenings: a `single` entry for a def with no size axis (refused if the
  def grows one), and `centered on the (glyph|thumb)` in the rule's third phrase. The Slider's two thumbs and three
  nested TextFields are INNER_TARGETS; a single-size host's nested targets are measured at the size they nest.
- `NO_SIZE_AXIS` (both), `EXPECT_ANATOMY` / `EXPECT_PAINTERS`, `MUST_COVER` / `MUST_CLEAR_STROKE` (the thumb's ring),
  `UNREACHED_EXPLAINED` (the thumb's ring nomination), `GATED_EXPECTED` (the Slider's type-gated parts), the reaction
  map (10 / 4 / 6 and 5 / 2 / 3), the canvas-furniture count (41) and shared pages (11), the round-trip reaction
  read-back, the studio catalog and used-by index, and the artifact count, 200 → 202.

### Traps for whoever comes next

- A texts key must be a declared prop, and a set holds one default per text property, so the two readouts are two
  properties keyed by the props they read (`value` → "value text", `defaultValue` → "range text").
- The nested inputs show TextField's own label ("Label") and its message in Figma: a host can override a nested
  instance's text and swap properties, not a boolean or a property two levels down. Filed as #2781.
- No error members: Q354 puts an invalid control on `status`, and the approved 10 members have none, because a
  slider's own value is always in range. Held for the owner.
