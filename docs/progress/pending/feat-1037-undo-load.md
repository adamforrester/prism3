## (2026-11-17) — Undo load: a load that replaced unsaved edits can be taken back (#1037)

**Status:** Studio only (web and plugin panel). ENGINE unchanged (no change note: no engine code moved). CONTRACT unchanged.

### What changed

- **Owner decision Q319.2 (2026-10-18), built as decided:** "add an Undo load that restores the previous input until the
  next edit". After a load replaces a brand with unsaved edits, the bar shows **Undo load** beside the brand switcher.
  It puts the replaced brand back with its edits and its origin (`store.restoreInput`), so the edits are still unsaved
  and the next load still asks first. The first edit to the loaded brand ends the offer, and so does the next load. It
  is kept in memory only (`state/undo-load.ts`), so it works the same on the web and in the plugin with no storage path.
- **Offered only when edits were lost:** the same rule the overwrite confirm uses (`needsOverwriteConfirm`). A load
  over an untouched brand loses nothing and offers nothing.
- **Which loads:** an example, a design.md import and a start-window path, which are all loads the designer chose. Not
  the file's own brand arriving (Replace brand on a held restore, #3697 R9).

### Owner decisions (Q-BK2 A, 2026-11-17: APPROVED as built)

1. **Button or toast:** a button in the bar that stays until the next edit, not a timed toast. A toast's timer would
   end the offer before "the next edit" does, and a control that disappears on a timer is hard to reach by keyboard.
2. **Wording:** the button reads "Undo load" (the decision's own words). Its hint and accessible name add "Back to
   <brand>, with your edits". APPROVED.
3. **Scope:** issue question 3 asked whether this generalizes beyond examples. It is built for every load the designer
   chooses from the brand menu or the start window, because they share one door (`loadReplacing`).

### Verification

`apps/studio/test-store.ts` holds the store and the stash rules (7 `#1037` assertions). `test-smoke.mjs` §5 D drives the
built web bundle (7 assertions): offered after Replace brand, the edit back on Undo, offered once, a next load still
asks, and an edit ends a new offer. On `main`'s build the smoke arm fails `Undo load is offered after Replace brand`
by name. Five `wip:` mutations each fail by name: a fresh provenance on restore (store and smoke), a stash kept over an
untouched brand, an offer that survives edits, and the `identity` subscription dropped (the rename).
`apps/plugin/test-start-screen.mjs` holds the scope's exclusion: right after `#3697 R9 confirm-replace` (the file's
own brand arriving over unsaved edits), `#1037 the file's own brand arriving offers no Undo load`. Mutation, failing
it by name: `loadReplacing` for every origin (`undo-load drawn: 1`).
`test-smoke.mjs` §5 D also holds the scope's inclusion for the start window (review of 48e5a430): an edit, then **New
brand** and an example picked in the start window, through its guard, draws Undo load, and Undo puts the edit back.
Mutation, failing it by name: the start window's `load` calling `loadBrand` in place of `loadReplacing` (`main.ts`) →
`#1037 Undo load is offered after a start-window load (New brand › aurora) — got undefined`.
`test-smoke.mjs` §5 D also ends an offer with a lever edit (review of f78d64b0): after Replace brand over edits, a
click on the Control shape option the loaded brand does not hold. It holds main.ts's `brand` subscription, which the
rename case does not. Mutation, failing it by name: `subscribe('brand', endUndoOnEdit)` dropped → `#1037 a lever edit
to the loaded brand ends the Undo load offer (… undo-load drawn 1)`.
