## (2026-10-05) — an override's unresolved-ground warning names its ground in its own field (#2097 item 3)

**STATUS: branch `engine/2097-unresolved-ground-field`.** No emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. **Item 3 of #2097.**

### What was wrong

#2034 made `overrideGroundRgb` warn when an override's ground is neither a role nor a ramp step. The warning carried that ground in `against`, plus `unresolved: true`. But `against` on an `OverrideWarning` already meant something else: a SECOND ground the miss is on (the `background.tertiary` tier, #1773, or an `alsoAgainst` partner, #1745). `lint-ratio-truth` keys any warning carrying `against` as a second-pair confession (`<role> @ <against>`), so it would have read this one as a confession for a pair that doesn't exist.

### The fix

`unresolved` now holds the ground's name (`unresolved: 'nowhere.999'`), and the warning carries no `against`. So it is keyed with the role's own pair, the ground it is about, and `against` means one thing again. `lint-ratio-truth` needs no logic change, only a comment saying how it reads this warning. Arm C still reports the row itself, since the role's `against` resolves to nothing.

**Why no change note.** `ModeResult.warnings` is read only by `lint-ratio-truth` and `test.ts` (swept: no emitter, MCP, studio or plugin reader). This warning fires only on a fallback no input reaches: 0 hits in 5,726 corpus override cases (#2056). So no value, artifact or consumer-visible output moves.

### Mutations, each failing FO-02 by name

All 3125 assertion sites ran under each mutation, the same as unmutated.

- **w1**, push the ground as `against` as well: `❌ FO-02: the unresolved warning carries no \`against\`, which lint-ratio-truth would read as a second-pair confession for a pair that does not exist`
- **w2**, restore the pre-fix shape (`against, unresolved: true`): that arm, plus `❌ FO-02: an override whose ground is neither a role nor a ramp step falls back to the page AND warns, naming the role and the ground`
