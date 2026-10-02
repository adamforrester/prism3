## (2026-10-02) — the background tiers are inputs, not overrides (#1972)

**Status:** ENGINE `{{ENGINE_VERSION}}` (`engine: minor` change note), CONTRACT unchanged; no token path
moves. Engine only: the Studio rows for these four come from the UI lane after this lands.

### What changed

`surfaces.<light|dark>` takes four optional keys: `secondary` and `tertiary` (the page's second and
third tiers, neutral-only like `base`), and `inverseSecondary` and `inverseTertiary` (the same forms as
`inverseBase`, including a `{ palette, step }` band). Each is read in `modeConfigs`, where derivation can
still see it, so every role measured against the tier re-derives against it. Unset, a tier is the
ladder's own step and every artifact is byte-identical. `GROUND_INPUT` gains the four rows, so an
`overrides` entry on any of them is refused, naming the input.

### The diagnosis that shaped it: the page floor is not the tier

The inverse side was simple: the inverse contrast floor IS `inverse.background.secondary`, so 34 roles
per mode follow a declared `inverseSecondary` by construction. The page side was not. Measured on the
example brands, light mode: **3** roles name `background.secondary` as their ground, and **46** name the
contrast floor, a palette step (`neutral.050`; `neutral.100` on harbor). The floor comes from
`floorStep`, whose default is one step past `base`, which is always the same step as the second tier.
So the 46 descriptions ("clears 4.5:1 on background.secondary") were true by coincidence. A `secondary`
that moved only the tier would have re-derived 3 roles and left 46 claiming a surface they no longer
sit on: the defect #1972 exists to remove.

**Owner decision (option A):** with `floorStep` unset, the floor follows a declared `secondary`. An
explicit `floorStep` still wins and may differ from the tier, as it may today. High-contrast modes
follow the standard floor, as they already did for `base`.

### Two premises that did not hold, and what was done

- **A test overrode one of the four.** `test.ts`'s override-purity probe (#979) used
  `inverse.background.secondary`. Owner-approved: it now probes `disabled.fill` (a ground with no
  input; `field.fill` was suggested but is no longer a ground since the transparent-fill change), and
  the old role is covered from the refusal side.
- **"Validate like `base`" would have meant no validation.** `json-schema-lite` skips `allOf`/`oneOf`,
  so `base: 'grey'` passes the schema today and resolves to `neutral.025`. The four new keys are checked
  in `brandTheme` instead (white, black, or a step on the palette's ramp). `base`/`inverseBase` were
  left alone: filed as #1985.

### The gate and its mutations

`test.ts` (a5b), `bg-tiers:` arms. Expectations come from the ramp step's hex and the emitted hexes of
each role and its ground; which roles count as dependents is read off the UNSET tree. Each mutation
was run on its own `wip:` commit.

| Mutation | Fails |
|---|---|
| (a) ignore the input | 25 `bg-tiers` arms, e.g. `prism3 surfaces.light.secondary=200 — background.secondary resolves to neutral.200` |
| (b) `secondary` set, floor not moved | 7: the six floor-gated arms (`the 46 floor-gated role(s) … re-measure against the declared tier: foreground.brand reports 6.44, measures 4.34`) and the HC arm |
| (c) accept an override on `background.secondary` | 2: `overrides refused — overrides.light['background.secondary'] … (it was ACCEPTED)`, and dark |
| (d) drop the `brandTheme` tier check | 6 `validation` arms |

**The trap for whoever re-verifies this:** under (b), nothing else in the suite fails, including
`lint-ratio-truth`. That gate `continue`s past any role whose ground is a palette step, so the 1,640
floor-gated ratios across the corpus are never recomputed there. Filed as #1986. Until it lands, the
`bg-tiers` floor arms are the only check on the floor following `secondary`.
