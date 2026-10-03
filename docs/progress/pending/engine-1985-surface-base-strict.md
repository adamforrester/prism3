## (2026-10-03) — surfaces base and inverseBase refuse unknown keywords and off-ramp steps (#1985)

**Status:** ENGINE `{{ENGINE_VERSION}}` (`engine: minor` change note), CONTRACT unchanged. `regen` moves no
committed artifact. Engine only: `apps/studio` and `apps/plugin` untouched.

### What changed

Owner decision 2026-10-03, option A. `surfaces.<mode>.base` and `inverseBase` refuse an unknown keyword
(`'grey'`, `'300'` as a string) and a step that isn't on the palette's ramp (`333`, `1234`, or
`{ palette: 'primary', step: 901 }`). The error names the key and, for an off-ramp number, the nearest real
step: `333` → 350, `1234` → 950, `901` on primary → 900. `'white'`, `'black'` and real steps are accepted as
before. The four tier inputs got this check in #1972. It's now one loop over all six surface anchors in
`brandTheme`, so the tier messages name the nearest step as well. The tests only ever asserted the key and
"ramp", so they're unaffected.

**Why `brandTheme` and not the schema.** `json-schema-lite` skips `allOf`/`oneOf`, so the schema route means
teaching the validator those keywords. That would tighten every other `allOf` field in the schema at once,
which is a separate change with its own blast radius. The tiers already set the `brandTheme` precedent, and
it covers inputs that never go through the schema (the Studio and the MCP build themes directly). Left as is.

### Measured before changing behavior

A temporary recorder in the validation loop, never committed, logged every `base`/`inverseBase` that
`brandTheme` resolved while these ran:
- `regen --check`, `test.ts`, `lint-ratio-truth`, `mcp-test`, `token-contract --check`, `nb-regression` and
  `lint-lever-sweep`;
- the Studio unit suites `test-fills-input`, `test-store`, `test-brand-input`, `test-provenance` and
  `test-export-settings`.

That was **1,688 resolutions, 33 distinct values, 0 off the ramp or unknown**. Every value was `white`,
`black`, a neutral step from 25 to 950, or a `{ palette, step }` band on a real step. The Studio's surface
pickers are built from the theme's own ramp steps, so they can't produce an off-ramp value.

### Version class: minor

ENGINE major is refused while below 1.0 (`changes/README.md`; going to 1.0 is the owner's call). The values
now refused were already resolving to a color nobody chose, so this turns a silent mis-resolution into a
named error rather than removing a working capability. No measured input relied on it. CONTRACT versions
token names, and none moves.

### Mutations

| Mutation | Fails |
|---|---|
| `base` and `inverseBase` dropped from the check | 18 `#1985` arms, e.g. `#1985: surfaces.dark.base = 333 is refused by name, naming the nearest step 350 (got: "")` |
| the nearest step always the ramp's first | 10 `#1985` arms, e.g. `… naming the nearest step 350 (got: "… the nearest step is 25 …")` |

### Found, not fixed

`surfaces.<mode>.floorStep` snaps the same way (`333` becomes `neutral.350`, silently). The decision covers
`base` and `inverseBase` only, so it is filed as its own issue (#2033).
