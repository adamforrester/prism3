## (2026-11-13) — One contrast-ratio formatter, from the engine (#3697 L3)

**Status:** engine `patch` (`packages/engine/changes/fix-3697-contrast-ratio-format.md`): an added export, and no
committed artifact moves (`regen --check` clean). No token-name change, so no `CONTRACT_VERSION` move. The executor is
untouched, so `EXECUTOR_REVISION` stays.

### What was wrong

Contrast ratios were formatted by hand in several places, and the copies drifted. The plugin's `style-guide.ts` and
the studio's `step-picker.ts` floored, as the engine's own descriptions do (`tree.ts`). The studio preview's tooltip
(`kit.ts`) used `toFixed(2)`, which rounds, so a 4.496 pair read "4.50:1 (min 4.5)" there and 4.49 everywhere else.
Building the fix turned up a fourth copy that rounded too: the plugin's override lines (`set-override.ts`), where a ratio
just below its minimum could read as the minimum. Review turned up a fifth: the studio preview's contrast-contracts table (`main.ts`), which printed `toFixed(2)` beside
its pass/fail dot.

### What changed

`packages/engine/color.ts` exports `formatRatio`: two places, floored, then `:1`, or the number alone with
`{ bare: true }`. `style-guide.ts` re-exports it under its existing name, `step-picker.ts`'s `fmtRatio` is it, and
`kit.ts`, `set-override.ts` and `main.ts` call it. The contracts table keeps its bare cell, so it changes only by the
flooring. The override lines needed one more step: `set-override.ts` rounded every ratio to two places before the
line was printed, so a floored print of a rounded 2.4077 still read "2.41:1". The refusal and Activity lines now print
the unrounded ratio. The `ratio` fields in the agent's `data` stay rounded; whether they should floor is held for the
owner. Two engine copies are left as they are, because moving either moves every brand's emission: `tree.ts`'s
`floor2` prints a bare number into emitted descriptions ("4.8:1", not "4.80:1"), and `emit-dtcg.ts` rounds the
contract-report markdown's contrast column (filed as #3759).

### The test

`packages/engine/test.ts` checks `formatRatio` against literals: 4.496 → 4.49:1, 4.5 → 4.50:1, 4.4999 → 4.49:1,
21 → 21.00:1, 3.0049 → 3.00:1, 1 → 1.00:1, and 4.496 bare → 4.49. Mutation: the formatter rounding, committed as `wip:`
and reverted, fails the 4.496 and 4.4999 arms by name.

The same file holds the call sites (docs/34: the formatter's literals cannot see a surface that stopped calling it). Boundary
arms drive the real surfaces at pairs where rounding and flooring disagree: `planOverride` → `overrideVerdict` on the
prism3 example brand, for a refusal line (2.4077 → `2.40:1`) and an Activity line (5.5099 → `5.50:1`), and the studio's
exported `fmtRatio` at 4.496 and 4.4999 (→ `4.49:1`). `apps/plugin/test-agent-link.ts`'s override literals move with
them (6.6487 → `6.64:1`, 2.3997 → `2.39:1`, checked against an independent WCAG calculation of the hexes). A source scan finds no
hand-rolled `toFixed` on a contrast ratio under `apps/*/src`, and checks each of the five call sites is in the scan and
names the formatter. Mutations, each reverted: the refusal line printed from the rounded ratio, the Activity line
printed from the rounded `data` ratio, and `step-picker.ts`'s `fmtRatio` as `x.toFixed(2) + ":1"` each fail their arm by
name; `set-override.ts` back to `r.toFixed(2)` fails the scan; `kit.ts`'s tooltip back to `r.ratio.toFixed(2)` and `main.ts`'s table back to `r.ratio.toFixed(2)` each fail the
scan, naming the file and line.
