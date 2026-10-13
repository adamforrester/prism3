## (2026-10-13) — Segmented control: one option nested five times in a track, equal widths from a growing nested instance (#2418)

**Status:** engine (two new defs and one validator/projector change), both executors, the plugin taxonomy. ENGINE minor
(change note): two new projected surfaces, `segmented-control-segment` (30 members) and `segmented-control` (3).
CONTRACT unchanged: every binding is an existing role. `EXECUTOR_REVISION` 13 → 16 (#2548 holds 14 and #2574 holds 15).
Built from the proposal branch's draft (`claude/segmented-control-proposal`, `74af810`) with the owner's decisions Q269
1–8 A applied.

### What changed

- **`SegmentedControl.Segment`.** selection × size × five states. A cell on Button's height rung (the hit target) with
  an indicator inset 4px inside it. Selected: the `interactive.primary.subtle-fill.selected` tint, a 2px
  `interactive.primary.border.*` outline stepping at hover and pressed, and the label in the emphasis weight, held at
  its bold width by Tab's clipped reserve (`labelBox` / `reserve` / `labelReserve`, `texts.also`). Unselected: clear at
  rest, the neutral overlay wash at hover and pressed. The selected label keeps the NEUTRAL ink (Q269 QA note).
  Disabled selected keeps a 2px `color.disabled.border` outline and loses the tint (the disabled branch does not carry
  the overlay slot); disabled unselected shows nothing (0px edge).
- **`SegmentedControl`.** size only. An optional nested FieldLabel (`Label`, on) above a 1px
  `interactive.neutral.border.rest` track at `radius.md`, holding five nested options `nest-exposed` (`selection`,
  `state`), following `size`, option 1 selected, `Segment 3` on and `Segment 4` / `Segment 5` off. `behavior`
  (`view` default, `form`) is a code prop only, as Tabs' `activation` is.
- **`grow` on a `nest` (Q269.6).** The validator refused it ("only a box grows"). Now a `nest` grows under the same
  precondition as a box (a bounded parent main axis). `fillsAxis` treats it as a filled main axis, so the plan carries
  `layoutGrow: 1` and `instanceSizing.primaryAxisSizingMode: FIXED`, and both executors write `layoutGrow` on the
  instance from the PARENT's pass, beside `layoutAlign`, because the child neutralizer never reaches an instance.
- **Tab, Tabs and the rest of the corpus** name the segmented control instead of "not built yet". `component-refs`
  forced the move out of `planned` in Radio.Row, Radio.Group, Switch.Row and Select; those files' "not built yet" prose
  went with it, and Tabs' avoidWhen sentence also stopped calling Accordion unbuilt.

### The diagnosis that shaped it

Equal widths needed two fills, not one. The options growing along the track only widens each option's **cell**; the
indicator inside it hugged its label, so the tint and outline would have sat label-wide in the middle of a wider cell.
A box can only grow into a parent that bounds its main axis, and the option's root hugged. So the option's root is
**built at a placement width** (`placementWidth: 120`, DRAFT, the #1757 mechanism the fields use) and the indicator
`grow`s across it; inside the control, the host's FIXED share replaces the 120. That is why the standalone option set
reads 120 wide.

### Traps for whoever re-verifies this

- **The shim binds placeholder values** (`space/0` reads 20 in `fullFor`), so the host equal-width arm sums the
  track's padding and gaps as the host holds them rather than assuming zero.
- **The primary ink on the tint** measures 3.01–4.75:1 over the 16 committed brand × mode cells (the skill quotes
  2.70:1 from an earlier corpus). One brand clears 4.5:1, so the contrast arm fails the mutation on the others, not on
  every cell.
- **The outline against the tint inside it** is 3.01:1 at its tightest. It is not the cue on its own (the outline
  against the track is 4.56:1 minimum, and the bold label carries the selection too), but it has no margin.
- **Reactions (#2466).** #2574 was open at build time. Its reaction map derives scope from the `state` axis, so the
  Segment set will be in scope once both land; its `map/` arm lists the 11 defs literally, and whichever PR merges
  second updates that list (Segment: 30 members, 12 sources, 18 reactions).
- **The page sorts alphabetically** (#2568, Q260 A), so "after Tabs" holds in the taxonomy list but the file shows
  `↳ Segmented control` between Radio and Select. Held for the owner.
- **The paste executor writes an instance's `layoutGrow` twice** (review BLOCK on 1946897c). The generic build line
  (`if(n.layoutGrow)node.layoutGrow=n.layoutGrow;`) runs for every node the payload creates, instances included,
  and the parent's pass writes it again. Remove either line alone and the paste host still reads grow 1, so no gate can
  fail on one of them by itself. `test.ts`'s #1751 parity floor now has a segmented-control row: every `segment1`–`segment5`
  instance must read `p:FIXED` and `grow:1` on the paste host, a literal. Remove both lines and that row and the parity line
  fail by name for segmented-control and nothing else. The plugin side has no generic write (its `claimDefaults` returns
  early on an instance), so its parent-side line is load-bearing and test-write-components' equal-widths arm holds it.
