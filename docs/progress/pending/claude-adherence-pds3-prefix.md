## (2026-11-07) — Agent adherence scorer reads the stock `--pds3-` CSS names (#3408 Q98 A)

The code-surface adherence scorer (`tools/agent-adherence/`, #3440) now checks the CSS custom-property names stock
Style Dictionary emits, `--pds3-color-text-primary`, instead of stripping the `pds3` root. Owner decision Q98 A keeps the
stock names (no custom build step in `packages/tokens`), so the scorer learns the prefix.

- **The root comes from the tree.** `oracle.ts`'s hard-coded `BRAND_ROOT` is gone; `rootOf` reads the tree's one
  top-level key and throws on none or several. `cssName(root, path)` is the subject, the tree is the oracle (`docs/34`).
  `loadOracle` now wraps a pure `buildOracle`, so the self-test can score the good run against the same tree rerooted
  at `zz9` (`oracle/other-root`, `R1/other-root`, `R1/other-root-pds3`).
- **Unprefixed reads are R1, invented.** Nothing a consumer installs defines `--color-text-primary`, so it behaves as an
  invented name on a real page. The violation names the stock name so a run that dropped the prefix everywhere reads as
  one repeated mistake (`R1/unprefixed`, `R1/unprefixed-all`).
- **Measured:** stock Style Dictionary 5's `css` names equal `<root>-<path with . as ->` for all 820 leaves of the
  pinned tree.
- **The packets changed; the pin didn't.** Only the paragraph that spells the CSS names moved. A run planned before this
  change was told unprefixed names and would score every token read as R1, so it must be re-planned, not compared. The
  README records both packet hashes.
- **Mutations, each red by name:** prefix stripped again → `oracle/load`, the good-run arm, `R1/unprefixed`,
  `oracle/other-root`; an unprefixed name accepted → `R1/unprefixed`, `R1/unprefixed-all`; `pds3` hard-coded →
  `oracle/other-root` (the other-root scoring arms are skipped without an oracle).
