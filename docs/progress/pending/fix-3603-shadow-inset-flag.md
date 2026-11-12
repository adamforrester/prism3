## (2026-11-12) — `shadow.inset` says it is an inner shadow (#3603)

Engine {{ENGINE_VERSION}}. Owner decision A on #3603: the inner shadow's emitted value gains `inset: true`, in every
mode. `CONTRACT_VERSION` does not move: the name stays and only the value changes.

### What was wrong
`tree.ts`'s `shadowLeaf` wrote the same four dimensions and a color for every step, the inset step included. Nothing in the
DTCG said the layer was inner, so the stock Style Dictionary build behind `@prism3/tokens` wrote
`--pds3-shadow-inset: 0px 2px 4px 0px #0a122814` and `box-shadow: var(--pds3-shadow-inset)` drew a drop shadow. The Figma
emission never had the bug: `emit-figma-styles.ts` keys INNER_SHADOW on the step name, so the two projections disagreed and
neither gate could see it. `check:package`'s `[VALUE]` arm reads the engine as its oracle, and the exporter comparison's
shadow normalization (`tools/exporter-comparison/compare.ts`) dropped the field, so TokenPress's correct `inset: true`
compared equal to prism3's missing one.

### What changed
- `shadowLayerValue` takes an `inset` flag and writes `inset: true` for the inset step only. All three call sites pass it
  (light, derived dark, per-mode overrides), so every mode carries it. Drop shadows omit the field, which is DTCG's default.
- `test.ts` D-shadow(c2), on the per-mode brand (light, dark, marketing): every inset layer in every mode carries
  `inset: true`, no drop shadow carries the field, and every Figma `*/inset` effect style is INNER_SHADOW, one per DTCG
  mode. Mutation: dropping the flag in `shadowLayerValue` fails `[#3603] shadow.inset carries inset: true on every layer in
  every mode … — MISSING in light, dark, marketing`.
- `compare.ts` counts `inset` as a shadow channel. Under the same mutation the VALUES report now lists `shadow.inset`
  against TokenPress's export. That report is a tool, not a gate: `gate.ts` asserts no value arm, and this PR does not add one.

### Not changed
The Figma effect styles (byte-identical), the drop shadows, and `CONTRACT_VERSION`.
