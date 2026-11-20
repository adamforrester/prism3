## (2026-11-18) — The code input cell's radius repeat is decided (#3551)

**What.** The code input cell binds `radius.sm` at small, medium and large and `radius.lg` at x-large, skipping `md`.
`lint-rung-names` arm D refuses a repeat that skips an emitted rung unless a register names it, and #3544 held this one
in `RUNG_REPEATS_OPEN` against #3551 because no decision was on record. The owner answered A (2026-11-18): intended as
built. The three smaller cells follow the brand's control corner, so they match a same-size text field, and the display
cell is the deliberate exception at `radius.lg`. The entry moves to `RUNG_REPEATS` citing #3551, the open register is
empty, and the def's comment cites the decision.

**No behavior change.** No binding moved; every committed artifact regenerates unchanged, so there is no change note.

**Measured.** `test.ts` #3551 reads the two registers from the gate's source (the gate runs at import and exports
nothing): on main both arms fail (no decided entry, the open entry still present); with the move they pass.
Mutation: deleting the new `RUNG_REPEATS` entry fails `lint-rung-names` by name (`code-input-cell: in tier family
'radius.*' …`) and `test.ts` "#3551 RUNG_REPEATS admits code-input-cell's radius.* repeat".
