## (2026-10-04) — radius.hairline is always emitted, and the radiusHairline switch is retired (#2053)

**Status:** ENGINE `{{ENGINE_VERSION}}` (`engine: minor` change note). CONTRACT 14.1.0 → **14.2.0** (MINOR,
`radius.hairline` joins the guaranteed surface; baseline accepted with `token-contract --accept` after the
bump). `regen` gives every emitted brand one radius token and one Figma variable. `modes.ts` untouched (Lane 1
is on #2034 there). `apps/studio` untouched; one test literal added in `apps/plugin` (below).

### What changed

Owner decision 2026-10-04. `radius.hairline` → `{core.dimension.1}` (1px) used to be opt-in: it existed only
with `radiusHairline: true` or under `controlShape: 'hairline'`. The Studio's "Hairline radius" switch could
therefore read Off while a control shape used the 1px corner. Now:

- **`radiusScale` pushes the rung for every brand.** The `hairline` parameter is gone from `radiusScale` and
  `buildDims`. That's deliberate: the NB legacy fixture builds its dims through `buildDims` directly, not
  `brandTheme`, and NB is a contract-corpus member. Flipping a flag inside `brandTheme` alone would have left
  NB without the rung, and the contract would have classed it brand-dependent, not guaranteed.
- **`radiusHairline` is still ACCEPTED** (schema unchanged in type, with `"deprecated": true` and a retirement
  description), so existing brand files load. It changes nothing, and a brand that sets it gets a note saying
  so.
- **The lever manifest marks it deprecated** through a new optional `Lever.deprecated` field. That's
  additive, and readers that ignore it see the lever as before.
- **`controlShape: 'hairline'` still binds `radius.hairline`**, now by construction, as `boxed` always had
  `radius.none`.

### Keep it in the manifest, or drop it? Kept, for now

docs/30 versions the token-name surface, not the input schema. Removing an input field is a schema change:
with `additionalProperties: false`, a brand file still carrying `radiusHairline` would fail validation. So the
schema keeps accepting it, the safe default the brief named. The **manifest** is presentation, and dropping
the lever there is the Studio's move, not the engine's:
- `apps/studio/src/shell/pages.ts` still places `radiusHairline` (Shape › Corner base);
- `test-pages.ts` fails a manifest lever with no home.

So it stays, marked deprecated, until S7 (Shape) removes the switch and drops it in the same change.

### `lint-ramp-steps`: one declared omission, not a Studio edit

The gate holds that every radius rung the engine emits is drawn by the Studio's `RADIUS_STEPS`, or declared as
omitted with a reason. Once the hairline was always emitted, it failed, as it should. The Studio ramp never
drew the hairline, even while it was opt-in, and S7 redraws the radius controls. So the gate's `omits` gains
`hairline`, the same mechanism the #1852 container rungs use (deferred to #1881, UI lane), and S7 removes the
entry when it renders the rung.

### Not a one-line Studio removal

The legacy toggle is drawn in two places, `main.ts:1700` (`csLeverStack([…, 'radiusHairline'])`) and
`pages.ts:242`, and test-pages ties them to the manifest. Left for S7, as routed. The legacy page's sub-copy
("the opt-in 1px hairline") is now stale; S7's page replaces it.

### Tests that had to change, and why

- **L-03 and #1852's "scaled ladder"** picked out the ladder with `!r.pill`. The hairline is a sentinel that
  isn't a pill, so it now has to be excluded by name, as the pills are by `pill`.
- **#1852's per-brand Figma radius list** gains `hairline`: one new variable per brand, which is what this
  change emits.
- **#1812's tree-blind pairs** gain `controlShape: 'hairline'`. It now moves only the materialized defs, as
  `boxed` and `pill` do. The plugin test's cover literal gains the same pair: one entry in
  `apps/plugin/test-write-components.ts`, which the engine arm reads and refuses if it's missing.
  `radiusHairline` itself is held by a new arm instead: every value of a deprecated lever must leave the tree
  unmoved, and the retired set is the literal `[radiusHairline]`.
- **The MCP summary exemplar** moved from `radiusHairline` to `strictInteractiveContrast`. The retired
  description no longer opens with a tag-only sentence, so it stopped exercising the tag-carry case.

### Mutations

| Mutation | Fails |
|---|---|
| back to opt-in (`main`'s `scale.ts` and `theme.ts`) | 24, including `L-03b (#2053): a brand with radiusHairline: false still emits radius.hairline …`, `L-03b: radius.hairline is present at every scale …` (×5), `#2053: the retired lever radiusHairline changes nothing — … (MOVED by true)`, `#1296/#1718 prism3 emits every guaranteed contract path (567/568; missing radius.hairline)`, and the 11 per-brand Figma lists |
| the rung deleted from committed `out/prism3.tokens.json` | `L-03b (#2053): prism3.tokens.json emits radius.hairline = 1px aliasing {pds3.core.dimension.1} (got nothing)` |
| `controlShape: hairline` bound to `radius.sm` | 7, e.g. `controlShape: button@medium hairline binds radius/hairline … (radius/sm)` |
