## (2026-11-01) — TokenPress: the text-style reader keeps underline thickness and offset (#3085)

**Status:** TokenPress (guest port) and `tools/exporter-comparison/gate.ts` prose only. No engine file, emission,
token name or component surface moves, so no engine change note is owed (`packages/engine/changes/README.md`: a
change that owes no bump carries none) and `CONTRACT_VERSION` stays. TokenPress records the change in its own
`docs/CHANGELOG.md` under [Unreleased].

### What changed

- **The output shape is the held question's lean, A with AUTO omitted** (the comment on #3085; the owner has not
  answered it, so the shape is open to change). `TypographyConverter` writes `textDecorationThickness` and
  `textDecorationOffset` inside the typography composite, beside `textDecoration`, which is where the port already put
  its one non-standard field. PERCENT is a `%` dimension (5% → `{ value: 5, unit: '%' }`), PIXELS follows the px/rem
  preference as letter spacing does, AUTO and a missing field are left out, and neither is written when the style
  draws no decoration. It goes through the converter's `formatDimension`, so the dimension-format flag and rounding
  apply. The port's ES2018 rules hold: no optional chaining, no conditional spread.
- **The CSS export follows the composite**, as its own comment asks ("keep in sync if the composite shape grows"):
  `text-decoration-thickness` and `text-underline-offset`.
- **Tests, TokenPress's own:** `tests/unit/text-decoration-metrics.test.ts`, 7 tests in the suite's `ADDED` census (the
  263-test port baseline is untouched).
- **The gate.** `KNOWN_UNREACHABLE.nb` keeps `core.font.underline.thickness` / `.offset`. The values now reach
  TokenPress's output per style, but the gate pairs by path, and prism3's brand-wide path has no Figma counterpart.
  The `why` lines no longer say the reader drops them. The gate's adapter still passes `textDecoration` only, so its
  run is unchanged and still green.

### Verification

Mutations on a `wip:` commit, each failing TokenPress's suite by name: the thickness write removed (5 tests), and
PERCENT written as `px` (4 tests).
