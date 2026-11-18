## (2026-11-18) — Studio: a value put back to Auto leaves no empty group behind (#3878)

Closes #3878 (quality scan #3868). Trying a value and going back to Auto left the brand reading as edited, and the replace guard asked to "Discard 0 edits".

### The diagnosis

`setPath` (`apps/studio/src/state/store.ts`) created every missing parent on the way down, including for an `undefined` value, so a clear on a brand without that group left `typography: { titleFloor: undefined }`. The two readers of "is this brand edited?" then disagreed: `isDirty` serializes, which drops the `undefined` key and keeps the `{}`, so it said dirty; `editCount` walked the entries and counted 0. One fix in `setPath` covers every writer that clears through it: an `undefined` write now deletes the key, creates nothing, and prunes each parent object it empties. It never prunes an array or the root, and `null` stays a value (the code category's "no code styles").

Two clear paths did not go through a `setPath(undefined)` and are fixed at the writer, as the issue's comments found: `removeLibraryFace` wrote back an empty list (now `undefined` when empty, as `setItalics` already did), and `setOverride` in `layout-input.ts` deleted the emptied map but not the `layout` object it emptied (it now clears through `setPath`).

### Tests

- `test-store.ts` gains a `#3878` sweep: for each writer the issue lists (title and caption floors, Light shadow softness and tempo, the contrast floor, the inverse band's palette on the prism3 example, the typeface library, a column override), set a value, clear it, and assert the brand is byte-identical to its baseline, `isDirty` is false and `editCount` is 0. Two arms hold `setPath` itself. On main 9 of the 10 fail; on the fix all pass.
- Mutations, each failing by name: drop the prune loop from `setPath` (8 arms fail), and put `removeLibraryFace`'s unconditional write back (its arm fails).
- Five existing assertions pinned the old leftovers as "the legacy bytes" (`typefaceLibrary: []` in `test-type-input.ts` and in the chrome suite's Type section, `leadingShift: {}`, `layout: {}` twice). They now assert the clean state, with `#3878` in each label. One more moves only in key order: a cleared `italics` is deleted, so the next write appends it. `isDirty` ignores key order.
- `test-store.ts`'s floor rises from 45 to 55.
