## (2026-11-02) — The plugin's controlShape read is pinned to the rung each shape names (#1761)

**Status:** test only (`apps/plugin/test-write-components.ts`), plus one corrected sentence in the header of
`packages/engine/lint-lever-sweep.ts`. No engine behavior, emission or component surface moves, so no change note.

### The gap

`materializeForBrand` (`apps/plugin/src/brand-def.ts`) reads `controlShape` off the raw input. The comment on #1761 found
that the #1812 arms already fail when that read is dropped: each shape must MOVE the materialized defs. But nothing on
the plugin side checked WHERE it moves them, which is the issue's "Done when".

### The arm

`#1761 plugin controlShape` runs `materializeForBrand(button, …)` on nb-redesign with `controlShape` unset,
`rounded`, `pill`, `boxed` and `hairline`. It reads the medium filled button's four root corner bindings off the plan
and compares them to variable names typed in the test: `radius/md`, `radius/md`, `radius/capsule`, `radius/none` and
`radius/hairline`. The expected side never reads `CONTROL_SHAPE_RUNG` or `applyControlShape` (docs/34). The sweep
header no longer says the read has no plugin-side arm.

Mutations, from a `wip:` commit, each failing by name:
- `applyControlShape(def, 'rounded')` in `brand-def.ts`, so the read is dropped → the `'pill'`, `'boxed'` and
  `'hairline'` lines.
- `?? 'pill'` as the default → the `unset` line.
