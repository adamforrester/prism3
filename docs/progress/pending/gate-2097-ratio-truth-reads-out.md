## (2026-10-05) — lint-ratio-truth reads a palette step's color from the emission, not the emitter's input (#2097 item 4)

**STATUS: branch `gate/2097-ratio-truth-reads-out`.** Gate only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. **Item 4 of #2097.**

### The gap, measured

Since #1986, arm A recomputes every ratio measured on a palette-step ground (the contrast floor). It read the step's color from `theme.palettes`, which is the emitter's **input**. Its lookup was independent of the engine's ground lookup, but its data was not. So an emitter that wrote a step's primitive wrong agreed with itself here. Measured: with `primitiveLeaf` in `tree.ts` emitting every `050` step at 90% of its color (rounded, so it is a valid color), the gate as it was reported **clean**: exit 0, all 49432 ratios "matching".

### The fix

The step's color now comes from the emission:
- **Corpus brands with a committed tree** (`COMMITTED_TREES`: `nb`, `aurora`, `harbor`, `wendys`, named literally) read `out/<brand>.tokens.json`.
- **Every other case** (the `minimal-*` corpus fixtures, the declared-surface sweep and the override sweep, none of which has a committed tree) reads its own `buildTree` output.
- `theme.palettes` still names WHICH ramps exist, and never supplies a value.
- Each `$value` is parsed as `#rrggbb` or `rgb(r, g, b)`. nb's `colorFormat` is `rgb`, so all 121 of its steps use the second form. Anything else fails by name.
- **A new floor (6):** every `COMMITTED_TREES` name must be read, and must contribute at least one checked row. A renamed corpus id or a moved file fails by name instead of quietly falling back to an in-memory build (docs/34 shape 9).

Same coverage as before: 49432 ratios, 9184 on a step ground, 1640 of those in the corpus. 656 rows are now read from the four committed trees. The run takes 2.1s, up from 1.8s.

### Mutations

- **L1, the emitter writes a step wrong** (`tree.ts`, every `050` step at 90%, rounded). Old gate: clean. New gate: `❌ 6157 ratio-truth failure(s)`, for example `corpus:minimal (required fields only)/light: 'foreground.brand' records ratio 4.10 against 'neutral.050', but the emitted colors measure 3.29`.
- **L2, a committed tree is wrong** (`out/aurora.tokens.json`'s `neutral.050` set to `#c9c9ca`). Old gate: clean. New gate: `❌ 142 ratio-truth failure(s)`, for example `corpus:aurora (engine-native brief)/light: 'foreground.brand' records ratio 5.29 against 'neutral.050', but the emitted colors measure 3.88`. A committed tree drifting from the live emitter is also `regen --check`'s subject, so L2 shows what this gate now reads, not a hole only it closes.
- **L3, a `COMMITTED_TREES` name drifts** (`harbor` → `harbour`). `❌ COMMITTED_TREES names 'harbour', but no corpus brand read out/harbour.tokens.json`.
- **First L1 attempt, unrounded.** It produced non-integer channels, which `colorValue` rendered as malformed hex. It failed by name, but on the new parse guard (`the emitted tree has no readable color at prism.core.palette.neutral.050`) rather than on the ratio. Kept as evidence for the guard, and redone rounded to test the ratio.

**Not covered, unchanged:** a ROLE ground's color still comes from `resolveAllModes`, not from the emission. #2097 scoped this item to steps.
