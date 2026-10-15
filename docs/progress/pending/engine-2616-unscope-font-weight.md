## (2026-10-15) — Numeric font weights are unscoped in Figma (#2616, Q334 step 2)

Q334 A's end state: of the font rows in `core`, only the roles stay scoped. `core/font/weight/*` (the numeric
300…900 ladder) now carries `scopes: []`, like every other primitive under Q292. `core/font/weight-role/*` keeps
FONT_WEIGHT and `core/font/family/*` keeps FONT_FAMILY. This depends on the TokenPress change landed just before
it (`tokenpress-2616-font-type-by-name`). Before that change, TokenPress typed these rows from their scope, and
unscoping them failed the exporter agreement gate.

**Moved.** `emit-figma-font.ts` writes `PRIMITIVE_SCOPES` on the numeric weights. Regen moves only the four
`out/figma/*/core.font.json`. The PRIMITIVE marker comment in `emit-figma-color.ts`, the exception text in
`docs/10` and the three #2602 arms in `test.ts` now name Q334. Their expectations stay literals: `[]` for
`core/font/weight`, and the `font/weight` entry is gone from `CORE_SCOPES_2602` / `CORE_CODES_2602`.

**A test that read the scope as a name.** `test-style-guide.ts` case 33 picked the raw weights and the roles
out of `core.font.json` by the FONT_WEIGHT scope. Once the numeric weights are unscoped, that filter finds only
the 5 roles and the case fails on `rawW.length === 6`. It now selects by path (`/core/font/weight(-role)?/`). The
style guide itself already placed the rows by name, so it draws the same two tables as before.

**Family.** `core/font/family/*` could be unscoped without breaking typing too. Per Q334 it stays scoped. The
owner question on #2616 recommends keeping it, because those rows are the role layer the family picker offers.

**Not changed.** The DTCG tree's `$extensions.prism3.figma.scope` hint on the weight leaf (and FONT_SIZE on the
size leaf, already unscoped since #2602) still names the old scope. Nothing reads it. Filed separately rather
than widening this PR: #2736.
