## (2026-10-08) — Flush text buttons: `inset: default | flush` on the text appearance (#2350 part 1)

**Status:** engine `{{ENGINE_VERSION}}` (minor, change note); CONTRACT unchanged (no token name moves: flush binds
`space.0`, which every brand already emits). Owner decisions built: Q143 items 1 and 2, the correction to item 3 (icon
buttons get no flush), and **Q145 A**, which replaced the plan's axis: one value, `flush`, removing the inline padding
on **both** sides. Part 2 (the quantity stepper) is not in scope. The name, the values and every new string are DRAFT
for the owner.

### What it is

- **Button, Destructive and Neutral** (the one `makeButton` factory) gain an authoring axis, `inset: default | flush`,
  with a matching prop that defaults to `default`.
- **Text appearance only.** `figmaProperties.excludeCoordinates` removes `filled|outline × flush`, so each set grows
  from 432 to 576 members: 144 flush text members.
- **The mechanism** is one new box field, `PartDef.flush: { axis, value, key }`. At a flush coordinate the projector:
  - binds both inline paddings to `key` (`space.0`);
  - drops the root's literal `minWidth` (#1667), so the button hugs its label;
  - pins both "Locked to edges" icons at the edge, each side's reserve less the inset;
  - paints no `overlay`, so a flush button hovers by color only, even under "Text button hover: Fill" (Q143 item 2).
- **Validation.** `anatomyErrors` refuses: a non-box part, an axis that isn't declared or projected, a value not on the
  axis, a value that is the axis's first (the default member would be flush), and an unbound key.
- **The axis name.** `inset` is the twenty-first name in `VARIANT_AXES`, argued in its header. `lint-axis-values`
  carries it as a `sole` set.

### Decisions made here, for the owner to check

- **A flush member has no minimum width; it hugs its label.** This is forced by Q145 A, not chosen freely. The plan
  kept #1667's floor and moved the content to the flush side. With one value covering start, end and centered rows,
  there is no side to move it to: a 104px floor around a 40px label leaves slack on one side or both, and the label
  doesn't line up.
  - **The height is unchanged**, so the hit target keeps its floor and `lint-hit-target` holds as before.
  - The floor exists so a short label can't make a stubby button. A flush text button has no visible box, so there's
    nothing to look stubby.
  - **In code**, the hit area extends past the label into the gutter (the existing `::before` expansion), to at least
    the default sibling's size. `codeOnly` and `docs.do` say so; Figma can't show it.
  - The alternative is to keep the floor on flush members and accept that short labels don't align. Not built.
- **The no-wash rule lives on the `flush` field, not in `applyButtonLayout`.** The earlier build tried and discarded
  routing it through the paint grammar: `{appearance}.{inset}.{slot}.{state}` needed a raw-def key matching the
  template, and made every partial coordinate without `inset` throw under "Fill". The field is one line in the box's
  paint loop.

### The NB master (#2265's in-place update)

The dry run on a set built before #2350 reads:
- 432 renames, each the old name with `inset=default` after `surface`, so nodes and component keys are kept;
- 144 adds;
- 0 drops, no collapse, no blocker;
- the set's axes gain `inset`.

`test-update-components.ts` holds this by building the pre-#2350 set from the def with the axis taken off. A variant
axis is reported under `axes`, not `properties`. `update-apply.ts` is untouched.

### How this got here

An earlier session built `inset: default | flush-start | flush-end` (432 → 720) on this branch, and was stopped before
its PR when the owner decided Q145. This rework replaces it on the same branch. What moved:
- the field went from `{ axis, start, end, key }` to `{ axis, value, key }`;
- the per-side distribution (MIN/MAX) is gone: the row keeps its def's `center`, which is moot once the box hugs;
- the floor is dropped instead of kept (above).

### Traps for whoever re-verifies this

- **`apps/studio/gen-component-catalog.ts --write` is not in `regen.ts`.** A member-count change leaves
  `component-catalog-data.ts` stale until it runs; `test-component-catalog.ts` names it.
- **`schema/component-axes.json` is not in `regen.ts` either**: `lint-component-renames.ts --accept` rewrites it.
- **`schema/paint-census.json` is `lint-paint.ts --accept`, not regen.** Read the diff before accepting: from
  `main` each family's set goes 432 → 576 members and 1218 → 1512 paint assignments, about 2 per flush member (the
  label and icon inks, no wash).
- **Commit the change note before `lint-emission-version`.** It compares commits, and fails until the note is
  committed.
- **Three sweeps skip flush members on purpose.** #1387's quiet-hover sweep, the plugin's #1646/#1608 solid-tint and
  none arms, and #1667's "attached" arm (every member carries the floor) filter to `inset=default`. The #2350 arm
  holds the flush half of each, against the member's own `inset=default` sibling.

### Tests and mutations

The `#2350` arm in `test.ts` covers each family × size:
- both sides bind `space/0` where the `inset=default` sibling binds neither;
- the height and distribution are the sibling's, and the sibling's `minWidth` is gone;
- under "Fill", no flush member is filled, while the sibling takes the family's overlay and the ink matches;
- "Locked to edges" pins both icons at 0, with reserves written out per size;
- 576 members and 144 flush, all text, from literals;
- the schema's four refusals;
- no icon-button declares the axis.

Each mutation was committed first and failed by name:

| Mutation | Failing arm |
|---|---|
| flush padding back on | `#2350 <family> flush <size>: both sides bind space/0 …` (9) |
| a flush member painting a wash under "Fill" | `#2350 <family>: under "Fill" no flush member is filled …` (3) |
| the exclusion removed (flush on filled and outline) | `#2350 <family>: flush is the text appearance's alone — 576 members …` (3), among 32 (the count, per-size, hover and #2324 underline arms) |
| the floor kept on flush members | `#2350 <family> flush <size>: … hugs its label with no minimum width …` (9), and `#1667 attached: <family> … on all 432 inset=default members` (3) |
| a pinned icon keeping its inset | `#2350 <family>: under "Locked to edges" both icons …` (3) |
