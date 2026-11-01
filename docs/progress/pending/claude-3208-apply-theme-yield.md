## (2026-11-01) — Apply Theme hands the thread back inside every stage (#3208)

The owner's Update run froze in "Writing color variables": the strip's timer stopped for long stretches and Stop could
not be clicked. #3170 gave Apply Theme a hand-back before each of its seven stages and one every 200 color variables,
and nothing else.

### Where the time went

Measured first, over the file shim, which now counts every host call (`FileShim.calls`: each method called on the
file, a collection, a variable or a style, and each property written). The longest run of calls with no chance to hand
back, per stage, on the example brands into an empty file: float 1,042–1,068 (it never handed back), color 1,571–1,591
(the 200-variable tick, but a color variable writes a value per mode, and the alias pass alone was 2,165 calls when its
tick was dropped), type variables 338–429, motion 215–223, text styles 54–83, styles 64–76, grid 21–25. A whole apply
is about 6,500–7,700 calls. The shim cannot say how long a call takes in Figma, so the fix does not try to guess which
stage is slow: it puts every stage on the same clock.

### The fix

Every Apply Theme executor (`applyFloatPlan`, `applyWritePlan`, `applyStylesPlan`, `applyGridStylePlan`,
`applyVarCollectionPlan` for type variables and motion, `applyTextStylePlan`) takes an optional `tick` and offers it after
each variable or style written, and after each collection rename on the way in. `main.ts`'s `themePace.tick` hands the
thread back only once about `PACE_MS` (50 ms) has run since the last hand-back, which is what `paced` does for a
component write, so the strip ticks and Stop answers whatever a stage writes. `COLOR_YIELD_EVERY` is gone. A caller with
no tick (the paste harness, every other test) writes in one turn, as before.

`write-styles.ts` is reached by the component executor (`bindGradientStops`), so `EXECUTOR_REVISION` rises to 45. No set
draws differently, so `executor-reach.json`'s entry for 45 names none and no file is told a set is due.

### The gate

`test-run-progress.ts`: `apply/cadence <stage>` runs every example brand's apply into an empty file and again over its
own, reads `FileShim.calls` at each stage and tick, and fails a stage whose worst gap is over 32 calls (the heaviest row
is a `layout` variable across its breakpoint modes, 25). Through `main.ts`, with the component shim given a file shim's
variable and style surface for two runs: `apply/inside`, the panel hears a stage again inside it once about 50 ms has run
on the test's stepping clock; `apply/paced`, with a clock that stands still each stage is heard from once. Mutations,
each failing by name: the float pass-A tick, the color alias tick, the text-style tick, the float stage passed no tick
(`apply/cadence float|color|text-styles`); `themePace.tick` never handing back (`apply/inside`); the `PACE_MS` test
dropped (`apply/paced`).

The trap: the budget counts calls, not milliseconds. A single Figma call that is slow on its own (a `getLocalVariablesAsync`
over a very large file) is still one turn, and no tick can split it.
