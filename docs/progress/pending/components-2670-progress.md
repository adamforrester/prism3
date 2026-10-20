## (2026-10-16) — Progress: the progress bar and ring, to the approved wireframe (#2670, every call A)

Built to the proposal on #2670, which the owner approved on 2026-10-16 with every numbered call at its
recommendation. One `Progress` (category `feedback`, aliases `progress-bar`, `progress-indicator`, `linear-progress`,
`circular-progress`; `loader` stays with Spinner), on its own `↳ Progress` page under Components. Cites the knowledge
base's `components/progress.md`, read for this build.

**10 members.** `shape` [linear, circular] × `type` [determinate, indeterminate] × `status` [active, complete, error] ×
`size` [medium, small]. Three `excludeCoordinates` rows make the sparse grid: a linear bar has one thickness (no small),
a ring always has a value (no indeterminate ring; that is the Spinner), and an indeterminate bar has no end state.
Each axis lists its code default first (owner Q347), so the first member is the default bar: the code `type` default is determinate.

### How the still members show an amount

Figma has no percentage width, so a member cannot say "45%". The fill and the empty rest of the track each `grow`, so
they split the track evenly: 50% at active and error, and at complete the rest is absent and the fill runs the whole
track. The indeterminate frame is a lead, the segment and the rest, a third each. The value text reads 50% (100% at
complete) to match. A literal fill width was the alternative and was discarded: it would freeze when an instance is
stretched, where the grow split keeps its proportion.

### After the first host build: every member read "50%"

The owner's QA asked for the complete example to read 100%, and the first plugin build reported the reason it did
not: one `valueText` TEXT property drove every member's value, with "100%" at complete as a per-member default
(`byVariant`). A set-level TEXT property holds one default that every member bound to it shows (#1567), so every
member read "50%" and the plugin reported the bound parts as COLLAPSED. "100%" now has its own text parts,
`valueComplete` and `ringValueComplete`, present at complete only and bound to a second TEXT property, `complete value
text`. "50%" is present at active and error only. The `value` boolean hides all four.

The second property has no code prop, because code renders both values from `valueText`. So the engine now accepts a
`figmaOnly` TEXT property, held to the Figma-only boolean's rules (#2344): it must not be a declared prop, and it must
state its `figmaName`. The alternative, a code prop for the complete text that code does not need, is held for the
owner on the PR. `test.ts` now types each member's caption and checks that no TEXT property in the set is behind two.

### The ring: two glyphs on one square, because a stroke may not carry the track (Q346)

The Spinner draws its track as a layer of its own glyph at 20% of its own ink. Progress's ring track is a different
role (`color.background.tertiary`, call 5), so it cannot be a layer of the arc's glyph: one glyph takes one ink. The
first build drew the track as the ring box's inside stroke. Main then landed Q346's gate (a stroke binds only a
`STROKE_COLOR`-scoped role), and measured, no border role clears 3:1 against the fills (best case 1.01:1), so a
stroke could keep neither rule. The ring is now two component-owned glyphs on one square: the track, a full annulus in
the flow (`progress-ring-{size}`, ink `fill`), and the arc over it (`progress-arc-{size}`, or the full annulus again at
complete). Two small engine additions carry it, with no executor change: a `vector` may name its paint slot
(`paintSlot`, read as the text branch reads it), and may be drawn centered over its parent's in-flow child
(`stackCentered`, projected as the overlay's existing `absoluteCenter`). The band's outer edge is the artboard's edge
and its width is band px × 24 / ring px (2 units small, 2.4 medium). `lint-glyph-geometry.ts` gained a `RING_GLYPH`
arm that measures this against numbers typed in the gate, including that the arc is lifted over the track and the
track is not.

### The stop dot is a glyph because two boxes cannot share a paint slot

The first draft made the stop dot a box painting `indicator`, beside the fill box that also paints `indicator`. The
schema refuses that (#933: `paintOf` resolves a slot once). The dot became a component-owned disc glyph
(`progress-stop`), which takes `{status}.icon`, the same role as the fill in every status.

### The end state is a nested FieldMessage

Complete nests FieldMessage at `success` and error at `error`, so the glyph, ink and caption are FieldMessage's own:
an error on a progress bar looks like an error under a field (owner Q352/Q354). The cost, recorded as an owner item:
the error glyph is FieldMessage's triangle, where the proposal text named `error-circle`. The ring members carry the
message too (call 4 says never color alone), which the proposal's circular anatomy did not list.

### Motion tokens: a sweep pair beside the spin (CONTRACT 14.8.0)

`motion.duration.sweep` (1600ms) and `motion.duration-reduced.sweep` (2600ms), outside the tempo-scaled ramp exactly
as the spin is, plus the primitive `motion.duration-ms.1600`: three guaranteed adds, MINOR, accepted with
`token-contract.ts --accept`. `LOOP_ROLES` in `theme.ts` names both loop periods; the studio's duration table leaves
both out of its steps. Showing the sweep beside the spin in the studio needs new copy, filed as its own issue.

### Gates the def joined, and two it widened

The usual lists (hit target excluded, rung names, axis values, standalone floor, paint placement, paint provenance,
glyph geometry, taxonomy, canvas furniture). Two needed more than an entry:

- `lint-rung-names.ts`: the ring's medium default is 40px, `icon.size.xl`, two rungs above `md`. The proposal set it
  and the owner approved it, so it is a new admission, `RING_OFFSET_UP_TWO_DEFS`, checked both directions.
- `emit-analysis-reports.ts` threw on a glyph name templated inside a word (`progress-arc-{size}`); it now expands the
  template before deciding the glyph's source.

The furniture rollout test builds with the shim's `scaleConstrained` on (Progress is the first set to draw inline
glyphs; the host scales them on resize) and declares FieldMessage's `message` text property for the stub, which the
#2645 override needs.

### The default `type` and the linear footprint (owner QA, #2791)

The approved set leads with the determinate bar, so Figma inserts `type=determinate`; code used to treat a bar with no
`value` as indeterminate, so the two defaults disagreed and the first build recorded a named exception in the #2752
arm. The exception is gone. Code now has a `type` prop, `determinate` by default, and `value` is a plain number
(omitted, the bar rests at `min`); an indeterminate bar is chosen with `type`, not by leaving the value out. The
`shape=circular` + indeterminate refusal moves onto `type`. This is the recommendation put to the owner as a question
on the PR.

The two linear types measured different heights at the same size because the header held the label alone when
indeterminate, and the label and value together (baseline-aligned, the value on a taller line) when determinate. The
header now centers its row and carries a token-bound floor, `icon.size.md`, which the value line fits under, so both
types measure the same. Two named arms in `test.ts` hold both.

### Trap

Gate every part on the shape it belongs to, even when its parent is gated. `#910`'s presence test reads a single-axis
gate at a pinned coordinate for the second size, which for Progress is a ring: a `rest` or `stop` gated only on
`status` or `type` read as absent there and failed as a dead branch.
