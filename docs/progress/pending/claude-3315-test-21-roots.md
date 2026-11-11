## (2026-11-10) — test.ts (21): the header no longer lists brand roots (#3315)

**Status:** a comment only, so no engine bump, no artifact moves and `CONTRACT_VERSION` is unchanged.

The header of `test.ts` block (21) EMIT-FIGMA GENERALISE said two brands' namespace roots were the default `prism`.
They emit their own roots (#3314's M2 mutation printed them). The arms read each root off the theme
(`theme.root`), but a reader who trusted the comment would write a literal `prism/` into a new arm and select
nothing for those brands, which is #3053's defect again. The sentence now says the arms select by each brand's
theme, so there is no per-brand list to go stale, and the comment inside arm (e), which repeated the same "two
brands that take the default" premise, is corrected too. One assertion was wrong: the doubled-root check in (e)
still tests each name's tail against a hardcoded root list that holds neither brand's root, so it cannot fail for
these two brands. That is a behavior fix, filed as #3575, and the header now names it.

No mutation: a comment has no behavior for a gate to fail on. `test.ts` passes unchanged.
