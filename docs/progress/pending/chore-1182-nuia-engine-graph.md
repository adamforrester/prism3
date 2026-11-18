## (2026-11-17) — noUncheckedIndexedAccess, stage 2: modes.ts and ramp.ts clean, and a tint that read past its ladder (#1182)

The second PR of the #1182 lane. It fixes all 84 errors `modes.ts` (60) and `ramp.ts` (24) report under the flag, and turns one of them into a real bug fix. The flag is still off. The engine tsconfig's graph has 96 errors left after this, spread across eleven smaller files, and the next PR takes those.

### The bug the flag found

`settleSolidTint` puts pressed and selected "at least one step above hover", as `Math.max(indexOf(nominal), h + 1)`. Hover's visibility climb can end on the top step (`opacity.100`): it gets there whenever the wash stays invisible against its ground below that, and the clearest case is a fill overridden to its own page step. Then `h + 1` is past the end of the 11-step ladder. `steps[11]` is `undefined`, and that value reached the role: `alpha: NaN`, `tint.opacity: undefined`, and a description reading "the primary fill at opacity.undefined". No corpus brand reaches it, so `regen --check` never saw it. A new `test.ts` case builds the brand and failed by name before the fix (684,871 passed, 1 failed). The fix clamps pressed to the top step, the same `Math.min(…, steps.length - 1)` the opaque-fill branch in this file already uses for the same case.

### How the rest was fixed

Each file gets a three-line local `must(x, what)`. It returns `x`, or throws a named error when `x` is `undefined`. It covers lists whose bounds the caller has established, and `roleAt(key)` uses it for roles the same resolve has just `put`. Every one of those sites would otherwise have thrown a bare `TypeError` a line later, so the only change is the message. Other fixes: `Object.entries` where a key came from `Object.keys`, a destructuring default for `split('.')[0]` (always present), `charAt(0)` for a first letter, and `TINT_NOMINAL` typed by its three keys. No `!`, no casts.

### Proof

`regen --check` is in sync (230 artifacts). The plan diff (every exported single-argument function of `component-schema.ts`, `anatomy-figma.ts`, `tree.ts` and `modes.ts`, over every registered def) is identical over 3,038 digests.

### Held from here

`modes.ts` and `ramp.ts` join `NUIA_CLEAN` in `typecheck-components.ts`, the clean list stage 1 (#3893) added, so both are held clean from this merge rather than from the flag flip. Measured: one guard removed from `ramp.ts` (`must(STEP_NUMS[0], …)` read back as `STEP_NUMS[0]`) passes the gate before the files are listed, where only the "elsewhere" count moves, and fails it by name once they are listed (`packages/engine/ramp.ts(…): error TS2322`).
