## (2026-11-17) — "Add button set" no longer offers a palette whose name a column already carries (#3608)

**Status:** Studio only. ENGINE unchanged (no change note: no engine code moved). CONTRACT unchanged.

### What changed

- **The add row's list** moves out of `color-interactive.ts`'s render into `promotablePalettes` in
  `apps/studio/src/state/interactive-input.ts` (with `RESERVED_COLUMNS`), so a test can read it without a browser. The
  extraction is its own commit and changes nothing.
- **The fix:** the list leaves out any palette whose name equals a column's explicit `name`. `addAccent` adds an unnamed
  column, the engine names it after its palette, and the engine refuses a duplicate column name, so offering it led to a
  refused brand. A brand reaches that state through a rename `#3545` allows on purpose (`acc-o → own-n`, no unnamed
  column on `acc-o`) or by import.
- **Behavior choice held for the owner.** The colliding palette is hidden, as the issue suggests. Disabling it with a
  reason, or adding it under a generated column name, are the alternatives; both need new copy or a naming rule. When
  the colliding palette was the only candidate, the row shows the existing hint ("Add a brand color on Palettes to use
  it for another button set."), which is no longer quite the reason. No copy was changed.

### Verification

`apps/studio/test-interactive-input.ts` §14 builds the issue's repro and asserts the list leaves out `own-n`, still
offers a free brand color, and that every offered palette adds a button set the engine takes (the engine is the oracle).
On the extraction commit (main's behavior) the first and third fail by name (`refused: ["own-n"]`). A `wip:` mutation
dropping the new filter fails the same two by name.
