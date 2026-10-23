## (2026-10-22) — Slider: one control for a value or a range in three sizes, its thumb a nested component (#2669)

Built to the proposal on #2669 as the owner approved it on 2026-10-16, every numbered call at its recommendation (A):
one `Slider`, range from a two-value `value`; `type` [single, range] × five states = 10 members; one size; the value
as header text; a 2px rail and a 4px fill; a 24px filled thumb with a 2px page-colored ring; paired inputs behind an
`inputs` boolean; thumbs that stop at each other; the names and wording as listed. Cites the knowledge base's
`components/slider.md` (category Form), read for this build.

### Owner decision Q550 (2026-10-22): the look rebuilt

After owner QA (Q536), a wireframe of options and A on every item: (a) one track thickness in `field.border.rest`, the
selected part and the thumb in neutral ink (`interactive.neutral.border.*`), because with one thickness only color
tells the selected part apart and the primary fill is 1.15:1 against the track where ink is 4.23:1; (b) the thumb sits on
the track, no page-colored ring; (c) a 0px header gap, the 44px control row kept; (d) labeled milestones in place of the
end labels, off by default, no ticks; (e) a `size` axis, small / medium / large, thumb 18 / 24 / 30px and track 2 / 4 /
6px, medium first, which needed a new `border-width.x-heavy` (6px) and a CONTRACT minor (14.9.0, after Progress took 14.8.0); (f) a halo in
`border.primary`, 4px at hover and 8px pressed, the shared focus ring, and disabled dimming the thumb and the selected
part together (`disabled.icon`). Slider 10 → 30 members, Slider.Thumb 5 → 15. Calls 3 A, 5 A and 6 A of the first
approval are superseded; the rest stand.

How it is built: the thumb's frame is exactly the disc's size, so the track segments never move with state; the halo is
two boxes around the disc, larger than the frame and unclipped, so it overflows like a box-shadow. The inner band is a
4px `border` stroke at hover and pressed, the outer band a `fill` padded `space.050` and painted only pressed. The bar
is square-ended so it meets the ink disc with no visible gap. The header, the control row and the milestones sit in a
`field` column at `space.0`; the inputs and the message keep `space.100` below it. Figma draws three milestones (the
ends and one between, evenly spaced); code draws one per value in `milestones`.

`lint-rung-names` learned a stroke family: a size-keyed `border-width.*` step has no `sm/md/lg` rung, so it is ranked on
a literal ladder (none, hairline, thick, heavy, x-heavy) the way a `space.*` step is ranked by its number, and the
Slider is admitted by name as a ladder its default cannot place on a tier.

### Why the thumb is its own component, `_slider-thumb`

Call 2 A puts the state on the maximum thumb while the minimum thumb of a range stays at rest. `paintOf` is
part-blind: two boxes in one def that take the same paint slot bind the same variable at a coordinate, so two thumbs
in the Slider could never differ. So the thumb is a nested component, Slider.Thumb, and each of the Slider's thumbs
nests it `nest-fixed` at rest with `variantWhen` moving it: the maximum thumb at hover, pressed, focus-visible and
disabled, the minimum thumb at disabled only. The focus ring lives inside the Thumb, so it lands on the thumb and never
on the track. It takes the `_` prefix by the Q349 rule (used only inside its parent).

The first build's Thumb had no variant, only its states, and the schema was widened to admit an empty `variantAxes`.
With Q550's size axis the Thumb has a variant again, so that carve-out was removed rather than kept unused.

### Why the track is flow, not offsets

Figma auto layout has no per-child main-axis offset, and `positionWhen` is three positions only. A first try put two
rail segments in the control row, which the validator refuses (two parts claiming one slot bind one variable, and it
cannot know that is wanted). What shipped: the control row (the `size.md.min-height` target) holds one `track` box,
2px tall, painted as the rail; inside it, growing unpainted spacers and the selected bar (4px, `indicator`) sit around
fixed thumbs, all taller than the track and overflowing it, which an auto-layout frame allows with clipping off. Single
is [bar, thumb, spaceEnd], range [spaceStart, thumbMin, bar, thumb, spaceEnd]. The thumbs land at the middle, and near
a third and two thirds; the placeholder text says "50" and "30 – 70" to match. Code draws one rail and positions the
bar and thumbs by value (`codeOnly`).

### Paint and contrast (the first build, before Q550)

Rail `color.field.border.rest` (slot `fill`), bar `color.interactive.primary.fill.rest` (slot `indicator`), value text
`color.text.primary` (slot `label`), end labels `color.text.secondary` (slot `body`); none moves with the state. Thumb:
an inner disc (slot `indicator`) in the primary fill at rest, hover and pressed, inside an outer disc in
`color.background.primary` (slot `fill`) padded `space.025`: that padding is the 2px ring. Disabled:
`color.disabled.fill` on rail, bar and inner disc, `color.disabled.text` on text; the ring keeps the page color.

The ring was first a 2px stroke in `color.background.primary`. The Q346 arm of `lint-paint` (#2749), which landed on
`main` while this PR was open, refuses it: a stroke must bind a variable scoped `STROKE_COLOR`, and the page color is a
surface role. No border role is the page color, so the ring became structure: the same 24px thumb and 20px disc, no
stroke. Measured in all 20 cells (five brands × four modes), lowest: rail 3.51, bar and thumb at rest 4.05, hover
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
- Q550 contrast, measured with an independent script over the committed emission (20 cells, lowest): track 3.51,
  selected part and thumb at rest 15.98, selected part against the track 4.23, thumb at hover 13.20 and pressed 9.76,
  thumb at hover inside its halo 3.28, focus ring 4.56, readout 15.98, milestones 5.00, halo against the page 1.38.
  The pressed thumb inside its 8px halo is 2.52 in the high-contrast modes, held for the owner on the PR.
- No error members: Q354 puts an invalid control on `status`, and the approved 10 members have none, because a
  slider's own value is always in range. Held for the owner.
- Owner QA item 1 (2026-10-19): the readout sat outside the 320 box because the nested label is built at its own 320 and
  hugged, filling the header. The label now grows, so the readout sits at the header's end; `test.ts` measures it. The
  state mapping moved from `atState` to `variantWhen` with main's fold (#2427). Item 2 (state styling) was answered by Q550 f.
