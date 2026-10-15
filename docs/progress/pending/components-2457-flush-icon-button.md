## (2026-10-14) — Flush icon button: a glyph-only action with no padding or fill, made to be nested (#2457, owner decision Q283.3 A)

**Status:** three new defs, `flush-icon-button` (FlushIconButton, primary), `flush-icon-button-destructive` and `flush-icon-button-neutral` (Q295.2 B, on IconButton's family pattern), plus gates. ENGINE minor (change note). CONTRACT unchanged: no new token. No executor change, so `EXECUTOR_REVISION` stays at main's 15. Three new docs pages, so the artifact count is **187** in `verify.ts` and `ci.yml` together, on the tree merged with main at `ba094cb1` (which brought Segmented control, #2418, at 184).

**Current shape, in one line:** three families, each `shape` [flush, round] × `size` × `state` = 30 members (90 in all), 18 reactions each, a 36-set furniture rollout, 38 defs in `used-by.ts` (on the tree merged with Segmented control), a paint census of 51 assignments per family. The first two sections below record the neutral-only pushes, when the bare id was neutral; where a figure there was later changed it is marked *superseded*, and the last section has the current one.

**What it is (Q283.3 A, on #2427):** "its own small def, ghost only, no padding, color-only hover, code-side 44x44 hit area." The three IconButton sets are untouched.
- `size` [small, medium, large] × `state` [rest, hover, pressed, focus-visible, disabled] = 15 members (*superseded*: 30 once the `shape` axis landed, below). No `appearance` axis.
- The box is the glyph square: `size.{size}.side` (*superseded*: renamed `size.{size}.flush`, below) → `icon.size.sm` / `sm` / `md` (20 / 20 / 24, Q283.13 A), and the swap slot binds the same key. No padding is bound, because none exists.
- The box declares no `paintSlots`, so it paints nothing at any state (*superseded*: it now declares `overlay` and `border` for the round shape, and flush still paints nothing; see "How flush stays unpainted" below). The glyph walks IconButton.Neutral's ghost ink (`color.interactive.neutral.icon.{rest,hover,pressed}`; neutral reflects inward since #2324, so hover does move), and `color.disabled.icon` at disabled.
- Focus: the shared focus ring, `nest-fixed`, at `focus.ring.offset`, as on IconButton.
- Reactions: nothing authored. `reactions.ts` derives scope from member names, and the set has rest, hover and pressed (#2574, Q238 A). `test-reactions.ts` `map/scope` now lists 12 defs, the new one at 15 members, 6 sources, 9 reactions (3 sizes × rest → hover, rest → pressed, hover → pressed). *Superseded:* 30 members, 12 sources, 18 reactions with both shapes.
- Canvas furniture: on, like every set (`CANVAS_FURNITURE`, Q212 A); `test-canvas-furniture.ts` counted 30 sets (*superseded*: 32 on the tree merged with List).
- Page: `↳ Flush Icon Button` under Subcomponents (Q283.14 A), alphabetical between Field Message and Focus Ring.

**The hit area is a stated rule, not a measurement.** No emitted token is its target: the box is 20 or 24px by design. `lint-hit-target.ts` gains a third classification beside INTERACTIVE and EXCLUDED, `CODE_SIDE_TARGETS`. A listed def is measured *below* 44 at every size on comfortable (so a box grown to 44 makes the entry stale by name), and must state the 44×44 rule twice, as literals the gate holds: in `codeOnly` (the maintainer record) and in the shipped `docs.do`. The second is the one that matters to an implementer, since `codeOnly` never ships. The nest arm now also sees code-side targets, so the Counter nesting two of these will have to list them in `INNER_TARGETS`.

**Nesting (for the Counter):** `test-roundtrip.ts` builds a fixture host, never registered, that nests the button twice (`decrement`, `increment`), both `nest-exposed` with `expose: ['state']` and `follow: ['size']`, against the button's own set. It validates clean, and on the shim both instances in all 3 members are marked exposed, are instances of the right set, and read back with no `nestExpose` or `nestTarget` divergence. **So two nests exposing the same axis coexist on the shim.** A real host is not measured: Figma lists each exposed instance's properties under its own layer name, which the shim does not model.

**Gates (each mutation-proven by name):**
- `test.ts` `#2457 flush-icon-button` (*superseded* by the rewrite below, 30 members): 15 members (scope floor); no padding; box and glyph on the literal 20 / 20 / 24 rung; the box paints nothing at any state; the glyph walks the literal neutral ink.
- `lint-hit-target.ts` `CODE_SIDE_TARGETS`: below 44 at every size; the `codeOnly` rule; the shipped `docs.do` rule. A self-check drives `ruleGap` both ways.
- `test-roundtrip.ts` `#2457 two-nest`: the fixture above, plus the nested set offering the five owner-decided states as literals.
- `test-file-setup.ts` 3c: the page lands at its literal alphabetical place.
- Recorded counts that moved with the new def: the studio's `used-by.ts` index (`gen-used-by.ts --write`, 32 defs; *superseded*: 34 on the tree merged with List) and component catalog (`gen-component-catalog.ts --write`, which `test:chrome` reads for its count of sets) and the axis baseline `component-axes.json` (`lint-component-renames.ts --accept`, an addition with no rename).
- List entries: `lint-rung-names` (`MUST_COVER`, and `ICON_OFFSET_DEFS`, because the medium default is the `sm` rung per Q283.13 A), `lint-axis-values` (the canonical size set), `lint-paint-placement` (`EXPECT_ANATOMY`), and both baselines accepted.

**Mutations** (each on a committed tree, restored with `git reset --hard`):
- Hover adds a fill (an `overlay` paint slot and an `overlay.hover` key): `test.ts` fails `#2457 flush-icon-button's box paints nothing at any state` (all three hover members), and `#1608 the wash binders` names the new binder.
- Padding not zero (a `space.100` padding on the box): `test.ts` fails `#2457 flush-icon-button binds no padding at any member` (all 15 of the flush-only build).
- The hit-area sentence deleted from `docs.do`: `lint-hit-target.ts` fails `flush-icon-button: the shipped docs.do does not tell the implementer to extend the hit area`.
- The hit-area entry deleted from `codeOnly`: `lint-hit-target.ts` fails `flush-icon-button: no codeOnly entry states the code-side hit area`.
- The fixture's `state` unexposed (`nest-exposed` → `nest-fixed`): `test-roundtrip.ts` fails `#2457 two-nest: both flush icon buttons … marked exposed` (6 instances, `isExposedInstance=false`).
- `disabled` dropped from the button's projected state axis: `test-roundtrip.ts` fails `#2457 two-nest: the nested set offers the owner-decided states`.

**Owner items (*resolved*, Q295 2026-10-14: 1, 3 and 4 A; 2 B, see the last section):**
1. Name and id: `FlushIconButton` / `flush-icon-button`. Alternatives: `IconButton.Flush` / `icon-button-flush`, which reads as a fourth IconButton family sibling (it has no appearance axis and a different box); `_flush-icon-button`, which hides it from a published library (a card close may place it directly).
2. Color family: neutral only, IconButton.Neutral's ghost glyph, as the stepper proposal drafted. No primary or destructive flush icon button.
3. Small's hit area: 44×44, as Q283.3 A states it, where the flush text button puts small at 24×24 (Q174 B). Small and medium are the same 20px box here.
4. Size order: small, medium, large (the #2509 rule), so Figma's inserted default is small and code's is medium. Q283.6 B put the stepper itself in the field exception; this def is not a field.

**A trap for whoever re-verifies the hover arm:** the paint the arm reads is the box's *own* paint, children excluded (`planPaintVars({ ...root, children: [] })`). Reading the whole member would see the glyph's ink at every state and could never pass; reading only the glyph would miss a wash on the box.

### The round shape (owner decision Q287 A on #2457, a follow-up push on the same PR)

**What it is:** "one component with two shapes." The Counter's outlined appearance nests `flush` and its ghost appearance (the wireframe's treatment B) nests `round`. No new def, no new token, and no executor change, so `EXECUTOR_REVISION` stays at main's 15.
- `shape` [flush, round] × `size` [small, medium, large] × `state` = 30 members. `shape` is an existing `VARIANT_AXES` name (IconButton's), placed first in `variantAxes`; flush leads its values because it is the code default and the shape built first. Size and state keep the #2509 order.
- **Flush is unchanged in every pixel.** Its box key was renamed (`size.{size}.side` → `size.{size}.flush`, the same `icon.size.*` rung), and because the shape axis now keys the corner and the stroke weight, a flush member also binds `radius.none` (a 0 corner) and `border-width.hairline` with no stroke paint, as a ghost IconButton does. The glyph's key is now `size.{size}.icon`, the name IconButton uses.
- **Round** is a circle the Counter's height across: `size.sm.height` / `md` / `lg` = 36 / 44 / 56, `radius.round`. The glyph inside stays 20 / 20 / 24 (Q283.13 A).
- **The edge is decorative:** `color.border.secondary`, the decorative rung of the edge ladder (#2569, Q259 C; about 2:1 against the page, no floor). The glyph identifies the control and carries the 3:1, as it does on flush. At disabled the edge takes `color.disabled.border`.
- **Hover and pressed:** IconButton.Neutral's ghost wash, `color.interactive.neutral.overlay.{hover,pressed}`, over the glyph's ink walk. Rest paints no fill.
- **How flush stays unpainted:** the box now declares `paintSlots: ['overlay', 'border']`, but the grammar leads with `{shape}` and every box key is `round.*`. The cross-cutting `disabled.border` applies only where the shape has an edge at rest (`restKey`), so a disabled flush member still paints nothing.

**Why the diameter equals the Counter's height, not the wireframe's 8px inset.** The wireframe drew the circle at height − 8 (28 / 36 / 48). That puts medium on `size.sm.height`, a default one rung below `md`, which `lint-rung-names` refuses without a new owner exception, and 48 has no rung. The Counter's own heights are rungs (36 / 44 / 56), so the circle is the row: a ghost Counter needs no height of its own, and the medium circle clears 44px on its own box. Held as an owner item.

**Gates (each mutation-proven by name):**
- `test.ts` `#2457 flush-icon-button`, rewritten against literals for both shapes: 30 members; the axis is [flush, round]; no padding; the glyph 20 / 20 / 24 and the flush box on the same rung; the flush box paints nothing; the glyph ink walk on both shapes; the round box 36 / 44 / 56 and full-round; the round edge at every state; the round wash at hover and pressed only.
- `lint-hit-target.ts` `CODE_SIDE_TARGETS`: the flush key re-pointed, and a new `atFloor` list measures the round circle at medium and large (literal sizes) against the 44px floor over comfortable and spacious. Small round (36) stays under the code-side rule the def states "at every size". The `atFloor.sizes` list is itself asserted against the literal `medium,large` in the self-check (Q287 A), as `FLUSH_SIZES` is: without it, narrowing the list to `['large']` let the medium circle drop to 36 with every gate green (the #2443 shape, found in independent review).
- `lint-axis-values.ts`: a second `shape` set, `[flush, round]`, `disjoint`, and IconButton's `[square, circular]` moves from `sole` to `canonical`. The reason names the near-overlap (`round` draws IconButton's `circular` corner).

**Owner items, the round shape (*resolved*, Q295 2026-10-14: 5–8 all A):**
5. Axis name and values: `shape: flush | round`, flush first. Alternative value `circular`, IconButton's word for the same full-round corner.
6. Sizes: the circle is the Counter's height, 36 / 44 / 56 (`size.sm` / `md` / `lg.height`). Alternative: the wireframe's 8px inset, 28 / 36 / 48, which needs a default-rung exception and a rung for 48.
7. Glyph: 20 / 20 / 24 on both shapes, per Q283.13 A (the wireframe drew 16 at small).
8. Roles: the edge `color.border.secondary` (decorative), `color.disabled.border` at disabled; hover and pressed `color.interactive.neutral.overlay.hover` / `.pressed`; the glyph on IconButton.Neutral's ghost ink, as on flush.


**Round-shape mutations** (each on a committed tree, restored with `git reset --hard`):
- Round loses its edge (`round.border` deleted): `test.ts` fails `#2457 flush-icon-button's round shape keeps its decorative edge at every state` (every round member, disabled included, since the disabled edge needs a rest edge).
- Round's hover drops its fill (`round.overlay.hover` deleted): `test.ts` fails `#2457 flush-icon-button's round shape fills with the neutral overlay at hover and pressed, and at no other state` (the three round hover members).
- Flush gains a fill (a `flush.overlay.hover` key): `test.ts` fails `#2457 flush-icon-button's flush box paints nothing at any state` (the three flush hover members).
- `atFloor.sizes` narrowed to `['large']`: `lint-hit-target.ts` fails `flush-icon-button atFloor.sizes is [large], but the round circle is held to the 44px floor at medium and large (owner Q287 A).`

**A trap:** a brand whose `outlineInteraction` is `none` drops the round shape's hover and pressed wash, as it does for every neutral wash (`applyOutlineInteraction`; `#1608` now names this def among the binders). On such a brand the round shape's hover moves the glyph ink only. The `test.ts` arm reads the default projection, where the wash is present.

### Three color families and center-to-center spacing (owner decisions Q295.2 B and Q296 A on #2457)

**Q295.2 B:** "also primary and destructive, not neutral only", built on IconButton's own family pattern, on both shapes. IconButton's pattern (#1225) is that the family is the *component*, not an axis: one factory, three defs, byte-identical but for the `color.interactive.<family>.*` paint and the selection fields. So `flush-icon-button.ts` now exports `makeFlushIconButton` and three defs, with IconButton's naming: **the bare id is primary**, so `flush-icon-button` (FlushIconButton) now means the primary family, and the neutral build this PR started with is `flush-icon-button-neutral` (FlushIconButton.Neutral). The Counter fixture in `test-roundtrip.ts` nests the neutral one.
- Per family: the glyph ink `interactive.<family>.icon.{rest,hover,pressed}` on both shapes, and the round wash `interactive.<family>.overlay.{hover,pressed}`, IconButton's ghost roles. 8 family bindings per def.
- The round edge stays `color.border.secondary` on all three, `color.disabled.border` at disabled; the glyph carries the family color. IconButton's ghost draws no edge, so its precedent had no family edge to follow, and whether a destructive circle should go red went to the owner: **Q305.1 A (2026-10-14)**, the decorative edge on all three families as built. It is recorded in `notes.evolution`; the draft `notes.contested` entry is gone.
- Shipped prose that named IconButton.Neutral now says "the IconButton of the same color" where it is shared, and each sibling names its own IconButton in `avoidWhen` and `composition.alternativeTo`. The neutral summary and description are the approved wording, unchanged; primary and destructive each have their own first sentence and share the rest. The destructive sibling carries the confirmation rule in `docs.do`.
- Counts that moved, on the tree merged with Segmented control (#2418): `test-reactions.ts` 15 defs; `test-canvas-furniture.ts` 36 sets, and its `clearance/pages` list gains `Flush Icon Button` as the tenth page holding more than one set (three sets, clear of each other); `used-by.ts` 38 defs; the catalog; `component-axes.json`, `component-surface.json` and the paint census accepted (an addition, no rename: the bare id has not merged before, so nothing on main moves under it).

**Q296 A:** the 44px between two flush icon buttons is center to center. `docs.do` now reads "Space two flush icon buttons at least 44px apart, center to center, so their tap areas don't overlap", and the `codeOnly` hit-area entry says center to center too.

**Gates:**
- `test.ts` `#2457`, per family, with the expected ink and wash written out as literal paths for each: 30 members, the shape axis, no padding, the glyph and flush box rungs, flush unpainted, the family's ink walk on both shapes, the round box, the decorative edge, and the family's wash at hover and pressed only.
- `test.ts` `#2457 … clears 3:1 against the page`: each family's glyph ink at rest, hover and pressed, measured by `resolveAllModes` in every example brand × mode (the glyph identifies the control). Every one clears 4.5:1 today.
- `test.ts` the factory guard, #1225's repeated: shared fields byte-identical, non-color tokens identical, each def binds only its family (8 bindings), each names its own IconButton, the keywords differ, and the confirmation rule is on destructive only. The Q296 sentence is held literally in all three.
- `lint-hit-target.ts`: all three in `CODE_SIDE_TARGETS`, and the `atFloor.sizes` literal check runs per id.
- List entries: `CANVAS_FURNITURE`, `lint-axis-values` (both sets), `lint-paint-placement` (both lists), `lint-rung-names` (both), the file taxonomy, and `#1608` (the wash binders now name all three).

**Family mutations** (each on a committed tree, restored with `git reset --hard`):
- Destructive drops its round wash at hover (`round.overlay.hover` omitted for that family): `test.ts` fails `#2457 flush-icon-button-destructive's round shape fills with the destructive overlay at hover and pressed, and at no other state` (the three round hover members) and `#2457 flush-icon-button-destructive carries its full interactive.destructive skin — 8 bindings (got 7)`.
- Destructive's flush ink swapped to neutral (`flush.icon` → `interactive.neutral.icon.rest`): `test.ts` fails `#2457 flush-icon-button-destructive's glyph walks the destructive ghost ink …`, `… binds ONLY interactive.destructive — no other family's paint (stray: flush.icon)` and `… 8 bindings (got 7)`.
