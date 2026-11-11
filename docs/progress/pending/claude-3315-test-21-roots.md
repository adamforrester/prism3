## (2026-11-10) — test.ts (21): the header no longer lists brand roots (#3315)

**Status:** a comment only, so no engine bump, no artifact moves and `CONTRACT_VERSION` is unchanged.

The header of `test.ts` block (21) EMIT-FIGMA GENERALISE said two brands' namespace roots were the default `prism`.
They emit their own roots (#3314's M2 mutation printed them). The arms read each root off the theme
(`theme.root`), so no assertion was wrong, but a reader who trusted the comment would write a literal `prism/`
into a new arm and select nothing for those brands, which is #3053's defect again. The sentence now says the root
is read off each brand's theme and is never written as a literal, so there is no per-brand list to go stale.

No mutation: a comment has no behavior for a gate to fail on. `test.ts` passes unchanged.
