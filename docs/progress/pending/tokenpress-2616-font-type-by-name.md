## (2026-10-15) — TokenPress types unscoped font variables by path (#2616, Q334 step 1)

TokenPress typed a font variable's DTCG `$type` from its Figma scope alone: `FONT_FAMILY` → `fontFamily`,
`FONT_WEIGHT` → `fontWeight`. That is why Q292 A kept `core/font/family/*`, `core/font/weight/*` and
`core/font/weight-role/*` scoped while every other `core` row went unscoped. Unscoped, the exporter
agreement gate fails 69 rows across 4 brands: family as `string`, the numeric weight as `dimension` and
the weight-role alias as `number`. Reproduced on this branch by stripping the three groups' scopes from
the committed `out/figma/*/core.font.json` and running `tools/exporter-comparison/gate.ts`.

**Fix.** `TokenTypeDetector` gains `isFontFamilyVariable` / `isFontWeightVariable`, which match whole path
segments: a `font` segment followed by `family` or `weight` (or `weight-…`, so `weight-role` matches), or a
single `font-family` / `fontWeight` / `font_weight` segment. `mapVariableTypeToDTCG` uses them only after
the scope checks, so a scoped variable types exactly as before. The FLOAT weight check sits *before* the
breakpoint rule, because that rule types any bare-number last segment as a `dimension`, and that is how
`font/weight/700` came back as one. The weight-role alias needed nothing of its own: with no scope on it
or its target, it reaches the same name check.

**Verified.** With the three groups unscoped in the committed emission (not committed here), the gate
reports 0 type disagreements in all 4 brands. With the scopes left as they are, the gate output is
unchanged. New `tests/unit/font-type-by-name.test.ts` (5, in the `ADDED` census). Mutations: dropping the
FLOAT name check fails three of its tests by name, and dropping the STRING one fails the family test.

**Why two PRs.** The order matters. Unscoping the emission before TokenPress can type by path turns the gate
red, so this PR lands first and changes no engine output. The emission change (`scopes: []` on
`core/font/weight/*`) follows as its own PR. `core/font/family/*` stays scoped. This change would make that
scope removable for typing, so that call goes to the owner on #2616.

**Not changed.** A STRING `font/weight/*` with no scope still types as `string`. Prism3 emits none, and the
existing `FONT_STYLE` route covers Figma's own string-weight convention. The cut rows (`font/style/*`) stay
`string`; they have no DTCG pair to agree with.
