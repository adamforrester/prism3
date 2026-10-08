## (2026-10-08) — Flush text buttons: `inset: default | flush-start | flush-end` on the text appearance (#2350 part 1)

**Status:** engine `{{ENGINE_VERSION}}` (minor, change note); CONTRACT unchanged (no token name moves: the flush side
binds `space.0`, which every brand already emits). Plan: #2350, comment of 2026-10-08. It replaces nothing: the
stopped session that also covered icon buttons left no plan or branch. Owner decisions built: Q143 items 1 and 2, and
the correction to item 3 (icon buttons get no flush). Part 2 (the quantity stepper) is not in scope. The name, the
values and every new string are DRAFT for the owner.

### What it is

- **Button, Destructive and Neutral** (the one `makeButton` factory) gain an authoring axis, `inset`, with a matching
  prop that defaults to `default`.
- **Text appearance only.** `figmaProperties.excludeCoordinates` removes `filled|outline × flush-start|flush-end`, so
  each set grows from 432 to 720 members: 288 flush text members.
- **The mechanism** is one new box field, `PartDef.flush: { axis, start, end, key }`. At a flush coordinate the
  projector does four things:
  - binds that side's padding to `key` (`space.0`);
  - distributes the row toward that side;
  - pins a "Locked to edges" icon on that side at the edge, with its reserve less the inset;
  - paints no `overlay`, so a flush button hovers by color only, even under "Text button hover: Fill" (Q143 item 2).
- **Validation.** `anatomyErrors` refuses: a non-box part, an axis that isn't declared or projected, values not on
  the axis, and an unbound key.
- **The axis name.** `inset` is the twenty-first name in `VARIANT_AXES`, argued in its header. `lint-axis-values`
  carries it as a `sole` set.

### Decisions made here, for the owner to check

- **The minimum width stays on flush members, with the content moved to the flush side.** Without the move, #1667's
  floor (104px at medium) centers a short label away from the edge, and flush wouldn't line up at all.
  - Keeping the floor keeps the hit box: height and width match the default sibling's. The slack falls on the side
    away from the edge.
  - The alternative is to drop the floor on flush members, so they hug the label. That gives a narrower target.
    Flagged in the plan, not built.
- **The no-wash rule lives on the `flush` field, not in `applyButtonLayout`.** I tried and discarded routing it
  through the paint grammar: `{appearance}.{inset}.{slot}.{state}` with "Fill" writing only `text.default.overlay.*`.
  - It needs a raw-def key matching the template, or `paintKeyErrors` refuses it.
  - It makes every partial coordinate that gives `appearance` without `inset` throw ("a partial paint coordinate")
    under "Fill".
  - The field is one line in the box's paint loop, and a box with no padding on a side has no surface for a wash
    to read on anyway.

### The NB master (#2265's in-place update)

The dry run on a set built before #2350 reads:
- 432 renames, each the old name with `inset=default` after `surface`, so nodes and component keys are kept;
- 288 adds;
- 0 drops, no collapse, no blocker;
- the set's axes gain `inset`.

`test-update-components.ts` holds this by building the pre-#2350 set from the def with the axis taken off.
- **A variant axis is reported under `axes`, not `properties`.** The plan comment said "properties to add", which
  is wrong; the axes line is where it shows.
- **`update-apply.ts` is untouched.** Another lane owns it.

### Traps for whoever re-verifies this

- **`apps/studio/gen-component-catalog.ts --write` is not in `regen.ts`.** A member-count change leaves
  `component-catalog-data.ts` stale until it runs; `test-component-catalog.ts` names it.
- **Commit the change note before `lint-emission-version`.** It compares commits, and fails until the note is
  committed.
- **Two sweeps now skip flush members on purpose.** #1387's quiet-hover sweep and the plugin's #1646/#1608
  solid-tint and none arms assert that every outline/text hover member fills (or doesn't) by method. Flush
  members never fill, so both sweeps filter to `inset=default`. The #2350 arm holds the flush half.

### Tests and mutations

The new `#2350` arm in `test.ts` covers each family × side × size:
- the flush side binds `space/0`;
- the other side, the height and the minimum width equal the `inset=default` sibling's;
- MIN or MAX distribution;
- no flush member filled under "Fill", where the sibling takes the family's overlay and the ink matches;
- "Locked to edges" reserves, written out per size;
- the schema's three refusals;
- no icon-button declares the axis.

Each mutation was committed first, and each failed by name:

| Mutation | Failing arm |
|---|---|
| padding back on | `#2350 <family> <side> <size>: the flush side binds space/0 …` (18) |
| a flush button filling on hover under "Fill" | `#2350 <family>: under "Fill" no flush member is filled …` (3) |
| the exclusion removed | `#2350 <family>: flush is the text appearance's alone …` (+ the count arms) |
| the distribution left centered | the per-side arms (18) |
| a pinned icon keeping its inset | `#2350 <family>: under "Locked to edges" …` (3) |
