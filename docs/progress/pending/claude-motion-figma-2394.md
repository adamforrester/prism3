## (2026-10-09) — Motion reaches Figma as a FLOAT-millisecond collection, round-tripped to DTCG durations (#2394)

Owner decision Q146 A. Every brand's Figma emission was missing motion: an earlier deferral (docs/10 §5,
2026-07-04) waited on a `TIME` variable scope. ENGINE {{ENGINE_VERSION}}; CONTRACT unchanged, because the DTCG
did not move.

**Step 0: the scope still isn't there.** `VariableScope` in `@figma/plugin-typings` 1.131.0 (the plugin's
pin) has 22 members, and the live reference (developers.figma.com/docs/plugins/api/VariableScope, read
2026-10-09) has 23. The one addition is `COLOR_OPACITY`. Neither has a time or duration member, so the
collection is plain FLOAT milliseconds, per the owner's direction.

**What shipped.**
- `out/figma/<brand>/motion.json`, written by `buildFigmaMotion` (`emit-figma-dims.ts`, node-free): the
  `motion/duration-ms/*` primitives (hidden from publishing), then `motion/duration/*`,
  `motion/duration-reduced/*` and `motion/stagger` aliasing them, on the DTCG's own paths.
- Apply Theme writes it as one more `buildFloatWritePlan` entry, and the MCP paste path probes the same stem.
- A per-mode tempo becomes a mode (`motion.Default.json` + `motion.<mode>.json`), the radius precedent. No
  committed brand uses it; `test.ts` builds one.

**Decisions worth keeping.**
- **`scopes: []`, not `ALL_SCOPES`.** No Figma property binds a duration. An empty list hides the variables
  from every property picker; `ALL_SCOPES` would offer 200 as a width or a gap.
- **The primitives come along.** The semantics alias them, so the export carries
  `{nbds.motion.duration-ms.200}`, the same reference the DTCG holds, rather than a baked 200.
- **No `motion-styles.json`.** Easing, spring and transition have no Figma variable type, and the style
  guide's motion table (#2353) reads the DTCG. A companion file nobody reads would be one more artifact to
  classify and keep.
- **TokenPress: one predicate arm.** It already typed `motion` + `duration` FLOATs as `duration` by name
  (2.3.0), which covers `duration-ms`, `duration` and `duration-reduced`. `motion/stagger` matched none of
  its MOTION patterns and exported as a number. A FLOAT under a `motion` segment whose last segment is
  `stagger` is now a duration. Its transition-composite pass leaves this tree alone, because it fuses only
  leaves *named* duration/delay/easing, and here those names are groups.

**The round-trip gate.** `test:readback-parity` gained a motion arm. Every motion leaf in the export of
Apply Theme's file, and in the export of the committed emission (nb included, which has no brief to
apply), is held to `out/<brand>.tokens.json`: same path set, `$type` `duration`, and the same alias or the
same milliseconds. TokenPress's `{ value: 200, unit: "ms" }` and the engine's `"200ms"` are two spellings
of one duration, so the comparison is in ms with no tolerance.
- **Independence:** the expected side is the engine's DTCG, which runs no Figma emitter, plan or executor.
- **Mutations, each failing by name:** drop stagger from the emitter, emit 41 for the 40ms primitive,
  re-point stagger at the 50ms primitive, drop motion from the float plan, lose the TokenPress stagger arm,
  and hand-edit nb's committed `motion.json`. Each was caught by `test.ts`, read-back parity, the TokenPress
  suite or `gate.ts` as applicable.
- **Trap:** the shim-vs-emission comparison above it cannot see an emitter value change. Both sides come
  from the same builder, so they move together. The motion arm is the one that catches it.
