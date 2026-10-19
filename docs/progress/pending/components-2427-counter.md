## (2026-10-15) — Counter: a quantity between a minus and a plus button, nesting the flush icon button (#2427, owner decisions Q283, Q286 A, Q287 A)

**Status:** one new def, `counter` (Counter), plus a small schema field, `variantWhen` on nest relations, and gates. ENGINE minor (change note). CONTRACT unchanged: no new token. No executor change (the plan carries the resolved nested coordinate, as it always has), so `EXECUTOR_REVISION` stays where main has it. One new docs page, so the artifact count moves by one in `verify.ts` and `ci.yml` together.

**What it is.** `appearance` [outline, ghost] × `size` [medium, small, large] × `state` [rest, focus-visible, disabled] = 18 members, on its own page under Components (Q283.14 A), alphabetical between Checkbox and Divider.
- The row is the Counter's height, `size.sm` / `md` / `lg.height` (36 / 44 / 56), which is the round flush icon button's diameter (Q287 A).
- Outline: the field's fill and edge (`color.field.fill`, `color.field.border.rest`, `radius.sm`), insets 12 / 12 / 16 (Q283.13 A). Ghost: no box paint, inset 0.
- The minus and plus: two nested FlushIconButton.Neutral instances, each `nest-exposed` with `state`, following `size`.
- The value: a text node in `type.body.{sm,md,lg}.default`, centered in a box at least 32 wide (Q283.13 A), text property `value`, default "1".
- The label (FieldLabel) is hidden by default (Q283.9 B); the message (FieldMessage) is off by default.
- The focus ring wraps the whole row: the field offset on outline, the control offset (2px) on ghost (Q283.10 A).
- Accessibility (Q283.8 A, Q286 A): the value is one element with `role="spinbutton"` and the only Tab stop (it is displayed, not typed, so not an `<input>`); the buttons are `tabindex="-1"` with `aria-controls`, and `aria-disabled` at a limit; a press announces through the app's shared polite live region.

**The open shape question, answered without a new question.** The wireframe comment asked how B's round buttons map onto #2457's flush button. #2457 settled it after that comment, by Q287 A: one component with `shape: flush | round`, "the Counter's outlined appearance nests flush, its ghost appearance round". So the mapping is one-to-one and needed no owner question.

**Why a schema field.** `follow` passes a value through by NAME, and the Counter's `appearance=ghost` must nest `shape=round`, a different axis with different values. Two other routes existed:
- Two nests per side, each gated by `presentWhen` on `appearance`. That is four nest parts, and the disabled member (below) would double it to eight.
- A flat `appearance` → `shape` rename. That contradicts Q283.4 A, which named the axis.

So `variantWhen` maps a host value to a partial child coordinate, merged between the fixed `variant` and `follow`. The same field fixes a second gap: **the disabled Counter starts both nested buttons at `state=disabled` and dims the nested FieldLabel.** Text field, Select and Password field still record the label's dimming as a projection limit ("the nested label reads at its rest configuration regardless"); with `variantWhen` that limit can now be lifted, filed as #2738 rather than widened into this PR. On a `nest-exposed` part the mapped axis may be an exposed one: the mapping sets the value the instance starts at on that member, and the designer still drives it.

The validator refuses six shapes, each a way to validate and never fire or fire and be overwritten:
- an unprojected host axis;
- an undeclared host value;
- an empty map;
- a child axis also in `follow` (follow runs after, so the mapping would read as working and never land);
- one child axis set from two host axes (declaration order would decide).
- a child axis the fixed `variant` does not name (the moved coordinate must still name every axis of one member; this rule came over from `atState`).

**One field, not two (merge with #2317).** The Password field landed `NestingRelation.atState` while this PR was in review: a host state value → a nested coordinate, applied after `follow`, refusing an axis that is followed or exposed. That is `variantWhen` keyed on `state`, with two rules that disagreed with this PR's. Keeping both would have left one type with two mapping fields and one `nestVariantOf` with two merge orders. `variantWhen` is the general form, so `atState` is gone and the Password field says `variantWhen: { state: { disabled: { state: 'disabled' } } }`. The Password field's projected plan digest is unchanged (`lint-component-surface` accepts only the Counter as moved), and its three refusal cases in `test.ts` now drive `variantWhen` on the Password field.
- **Order** is moot: the validator keeps a mapped child axis out of `follow`, so the two are disjoint and land the same either way.
- **Exposed axes** stay allowed, where `atState` refused them. A followed axis is the host's to drive at every member, so a mapping onto it is overwritten. An exposed axis is the consumer's after the instance is placed: the plan only picks the member it is placed at, which `variant` already does for every exposed axis, and the exposed property overrides it from there. Nothing is driven two ways at once.

**Counts on the merged tree.** This PR and #2317 each moved `EXPECTED_ARTIFACTS` 199 → 200 and the canvas-furniture count to 39 from different bases, and git took both lines cleanly. The merged tree emits both `counter.md` and `password-field.md`, so the artifact count was **201** (in `verify.ts` and `ci.yml` together) and the canvas furniture covers **40** sets. Main then moved it twice more: #2685 stopped committing `out/tokens.html` (main 199, this PR 200), and #2701 added `docs/public/reference/figma-conventions.json` (main 200, this PR **201** again, and that file now lists the Counter). Trap: a count both sides bump by one from different bases merges silently to the wrong number. The same merge produced a second silent collision: #2317 added its own `FLUSH_NESTS` to `lint-hit-target.ts`, a `Set` of hosts of a nested flush *Button* (they state the code-side rule in `codeOnly`), while this PR's `FLUSH_NESTS` is a `Record` of hosts of code-side *icon-button* targets (their center spacing is measured). Git merged both declarations cleanly and the gate failed to compile. They are different rules, so #2317's is renamed `FLUSH_BUTTON_HOSTS`, with its two messages; the Password field's pending fragment still says `FLUSH_NESTS` for it, and is left as written.

The projector change is three lines in `nestVariantOf`. No executor reads `variantWhen`: both read the plan's `nestVariant`, as before.

**The hit area.** There was no rule for a host that nests code-side targets. `lint-hit-target.ts` gains `FLUSH_NESTS`. #2457 had the nest arm treat a code-side target as needing an `INNER_TARGETS` entry, but that loop measures a part's side against the 44 floor and skips any part that nests a non-INTERACTIVE def. So an entry there would have been demanded and then measured by nothing. `FLUSH_NESTS` does three things:
- It lists each host's code-side nest parts, both ways against the anatomy.
- It measures each listed pair's center-to-center spacing off the projected plans on the comfortable build, against Q296 A's 44px literal. The measure is a lower bound: half of each nested box, plus each frame between at its minimum width and inline padding, plus the row's gaps. The Counter reads 60px at its tightest member (outline, small and medium: 10 + 4 + 32 + 4 + 10).
- A self-check drives the representation function both ways.

The Counter's row itself is INTERACTIVE on `size.{size}.height` (44 at medium on comfortable and spacious). `test-roundtrip.ts` measures the same spacing on the host shim's layout model, so the claim has a host-side ACTUAL too (closest 54px over the 18 members).

**A name collision, recorded for the owner.** The KB's badge brief lists "Counter" as an alias for a count badge, a number shown on another element. `test.ts`'s no-brief arm matched the Counter to that brief by alias and failed it. The name is owner-approved with the quantity meaning, so the arm admits that one collision by name (`ALIAS_COLLISIONS`), and the Counter's `ai.avoidWhen` and `docs.dont` send a count badge to Badge. An agent asked for "a counter" can still mean either; the trigger keywords lean on quantity.

**The glyphs, now that #2683 is on main.** The minus and plus are the nested buttons' icon swap, written as a per-instance override on each part: `overrides: { swaps: { icon: 'minus' } }` and `'plus'`. The first host to swap a glyph on a NEST-EXPOSED child surfaced a gap in `test.ts`'s `#1392` paste-payload harness: it gave nested instances their text properties (#2317) but no swap properties, so both overrides read as misses. The harness now declares each nested def's own swaps (from the nested def, never from the host's `overrides`), and provisions the glyph components the overrides name, as the real build does.

**Three more places that missed a swap override's glyph.** (Superseded on main by #2808, which taught the same three readers for Dialog's `icon/close`; the merge with `74056387` takes main's code for all three.) The first verify run after the merge found two more readers that walked `nestTarget` and `swapTarget` but not #2645's override glyphs, which `build-deps.ts`'s `planTargets` already counts:
- the studio's component catalog (`catalogOf`), whose `nests` for the Counter left out `icon`, so `test-component-catalog` disagreed with the plugin's pre-build. The walk now reads INSTANCE_SWAP overrides too, and the catalog data is regenerated.
- `test-update-apply.ts`'s `planComps`, so the corpus world held no `icon/minus` and the Counter's re-applied members never read back as current. List carries text overrides only, which is why it had not come up.
- `test-canvas-furniture.ts`'s `planComps`, the same gap: its `rollout/counter` dry run reported "components the plan swaps to are not in this file: icon/minus, icon/plus".

**`EXECUTOR_REVISION`: main's value since the merge with `74056387`.** This PR moves no executor file, so it takes main's 32 and raises nothing. The paragraph below is the history. **It was 28, raised on the orchestrator's instruction, not because the gate asks for it.** Against main `039a65c3` (27, #2744), `lint-executor-revision` reads "the executor's code is unchanged since the merge base": `variantWhen` is projector-only, and the Counter's `file-taxonomy.ts` page entry is not on the executor's import graph. The failure it printed during the first merge was against the old merge base, before the merge commit existed. The raise costs one dry run that marks members built at 27 as "to update" with no field difference. Dropping it back to 27 is a one-line revert, and the gate would still pass.

**Gates (each mutation-proven by name, see the PR):**
- `test.ts`, the Counter's decisions against literals:
  - `#2427 counter/axes`
  - `/nests`: outline → flush, ghost → round, disabled only on the disabled members
  - `/row`: 36 / 44 / 56; insets 12 / 12 / 16 and 0; value 32 wide
  - `/paint`: ghost paints no box; the outline disabled edge
  - `/ring`: the ghost ring at the control offset
  - `/label`: hidden by default
  - `/api`: min 0, `tabindex="-1"`, no remove prop
- `test.ts` `#2427 variantWhen`: each of the eight refusals fires on its own case (the follow-overlap fixture states its own `follow`; the no-values and empty-coordinate cases came in the second delta check), and the Counter validates clean.
- `test.ts` `#2427 counter/label-dims`: the nested FieldLabel's coordinate on every member, disabled only on the Counter's disabled members (added in review; it was held only by the roundtrip and the surface digest).
- `test-roundtrip.ts` `#2427 counter`: built over its really built nested sets with 0 misses. In every member both instances are exposed instances of the decided FlushIconButton.Neutral member. The FieldLabel dims on the 6 disabled members. The spacing is read off the host layout. Two arms added in the second delta check: each button's swap property reads back as `icon/minus` / `icon/plus`; and the Counter's members carry no reaction while the nested FlushIconButton.Neutral set carries exactly what `reactionMap` plans for it. That arm reads the chain from `reactions.ts` on purpose, so it holds under #2703's chain and under Q344's restored one (#2744) with no edit. The chain's literal stays in `reactions read-back`.
- `lint-hit-target.ts`: `FLUSH_NESTS` and the INTERACTIVE row.
- `test-file-setup.ts`: the page's alphabetical place.
- `lint-absolute-inset.ts` now fills any `{axis}` in an inset key from the member's coordinate, where it filled only `{size}`. The Counter keys its ring offset by `{appearance}`. `counter.focusRing` is in `MUST_COVER` and `MUST_CLEAR_STROKE`. `ZERO_OK` admits the outline members' field offset; the ghost offset is held in `test.ts`, because a ghost member rebound to the field offset would be admitted there.
- List entries:
  - `lint-rung-names` (`MUST_COVER`, and `DEFAULT_FIRST` for medium first, Q283.6 B)
  - `lint-axis-values` (the medium-first size set; a new `appearance` set, `overlapping`)
  - `lint-paint-placement` (`EXPECT_ANATOMY`, `EXPECT_PAINTERS`)
  - `CANVAS_FURNITURE`, and `test-canvas-furniture.ts` at 40 sets (on the tree merged with Dialog, #2652, and Password field, #2317)
  - the studio's `used-by.ts` and component catalog
  - both baselines accepted
- `lint-nesting.ts` gains `nest-coordinate-resolves`: every nested instance a projected member asks for names exactly one member of the nested def's own projected set, matched with the executors' `nestVariantMatch`. It covers the whole corpus (1,410 coordinates), and it is where a `variantWhen` mapping onto a value the child lacks fails, per member. It has no per-def list, so the Counter needed no entry beyond being registered.

**Trap for whoever extends `variantWhen`:** the projector applies the mapping from `paintCoord`, which carries the grid axes, `state` and `size`. A mapping keyed on an axis the def does not project would never fire, which is why the validator holds it to `variantAxes` ∪ `state`, as `follow` is held.

**The merge with main `74056387` (27 commits).** 21 files conflicted. The semantic ones:
- **`atState` came back on main with a new reader.** #2660's items-slot check in `anatomy-figma.ts` refused a nested item carrying `atState`. It now refuses `variantWhen`, with the same reason. `component-schema.ts` takes main's new validators (`prefersWhenBuilt`, `nestItemPrefers`, `directionWhen`) and drops only the `atState` block.
- **The Password field's Show button** takes main's nesting (#2804, Q380: small at every size, no `follow: ['size']`) plus `variantWhen.state`. The followed-axis refusal case supplies its own `follow: ['size']`, as main's does.
- **Size order.** #2752 (Q1 B) made medium-first every ladder's rule, so the Counter leaves `SIZE_EXCEPTIONS` and joins `lint-axis-values`' canonical list and `lint-rung-names`' Q1 B block.
- **`lint-hit-target`.** The nest arm sees INTERACTIVE alone (code-side nests are `FLUSH_NESTS`' to list), and keeps main's `CODE_SIDE_NESTED` stale check. Main's new reads of the old Set are renamed to `FLUSH_BUTTON_HOSTS`. Dialog's close nests FlushIconButton.Neutral since #2808 (Q385 A), so `FLUSH_NESTS` lists it, with no pair to measure: `pair` is now optional.
- **`#2695 reach`.** The Counter's outline binds `color.field.fill`, which the Field style arm assumed only the field family binds. The arm names the Counter as a borrower, and the lever leaves the Counter unchanged, which the identity arm holds. Whether the Counter follows the field style is an owner question on #2693.
- **Silent collisions.** #2819 moved `EXPECTED_ARTIFACTS` to 201 with `button-group.md`, the same line this PR had, so git saw one edit. The merged tree needs **202** (`regen --check` reads 202), in `verify.ts` and `ci.yml` together. `CANVAS_FURNITURE` takes both `button-group` and `counter`.

