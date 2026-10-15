## (2026-10-15) — Short token names are tested on effect and gradient tables that share a root (#2659)

**The gap.** In short mode the style guide's Token column prints a row's name below its table's common
prefix (#2372). #2623 tested this for text styles (#2475). Its review named two wrong planners a
one-segment root cannot tell apart: M3 caps the common prefix at one segment
(`commonPrefix(…).slice(0, 1)`), and M4 always drops the first segment (`.slice(1)` for
`.slice(prefix.length)`). The issue asked the same of the other three Token-cell planners. Run on main
(afe5d369), against `apps/plugin/test-style-guide.ts`:

| Planner | M3 | M4 |
|---|---|---|
| `planEffectStyles` | exit 0, passed silently | exit 0, passed silently |
| `planGradientStyles` | exit 0, passed silently | exit 0, passed silently |
| `planVariableTables` | exit 1 | exit 1 |

The fixture's effect and gradient styles share no root (`shadow/…` beside `Brand/…`), and §36 tested
only the default, which prints the whole name.

**The variable tables needed no test.** M3 and M4 as written fail there, but through side effects:
`prefix` also builds the table title, and `token` feeds ramp order and sizing, so the failing lines are
about those. So each mutation was also run in a form that touches only the Token cell's short argument.
Both still fail by the short-name assertion itself: "34: short: the space step prints 025 (space/025)".
`pds3/space/` is two segments deep, so that fixture already separates the two readings.

**The fix (test only, so no change note).** §36 gains the #2623 shape for both tables. The same styles
are renamed under `lib/fx/`, a root two segments deep. Short mode must print the name below the root
(`shadow/xs`, `gradient/brand`), and the default the whole name. Short mode on the plain fixture, whose
names share no root, must print the whole name. The new cases sit in §36, clear of #2623's §34 hunk.

**Proof.** With the fix, each of the eight survivors fails by name. Those are M3 and M4 on each of the
two planners, in the issue's form and in the cell-only form:

- M3, either form → "36: short: effect styles under one root print the name below it, shadow/xs for
  lib/fx/shadow/xs (fx/shadow/xs)". The same holds for gradients, `(fx/gradient/brand)`.
- M4, either form → the same line, plus "36: short: effect styles that share no root print their whole
  name, shadow/xs (xs)". Likewise for gradients, `(brand)`.
