## (2026-11-18) — check:package checks each per-mode CSS file's names and values, not only its selector (#3877)

Found in quality scan #3868. `packages/tokens/check-package.mjs` ran [NAMES], [PREFIX], [VALUE] and [MODE] over the
joined `dist/prism3.css` only. The README also promises each block as its own import,
`@prism3/tokens/prism3/<mode>.css`, and for those files the gate checked one thing: the file resolves and holds the
selector. With every `--pds3-` declaration stripped from the four per-mode files after the join, `dark.css` read
`[data-theme="dark"] {\n}` and the gate exited 0. Nothing tied the per-mode files to the joined one.

The per-block arms moved into one function, `checkBlock`, and the per-mode loop now calls it on each file's own block,
after a new `[OWN FILE]` arm: the file resolves and holds exactly one block, the promised one. Each file is held to the
contract and the engine's tree directly. The issue's cheaper option, byte-equal to the joined file's block, was not
taken: it compares two outputs of the same build, so it inherits the joined file's check instead of having its own
(docs/34). `[MODE]` in a per-mode file compares against `base.css`, so the per-mode set is checked as a set a client
could import alone.

Mutations, each run through `npm pack` (prepack rebuilds `dist/`):
- the scan's mutation (strip every `--pds3-` line from the per-mode files after the join): main exit 0; the fix exits
  1 on `[NAMES] … in base.css (0/620)`, the same for `dark.css`, `hc-dark.css` and `hc-light.css`, and `[MODE]` for
  the three themes;
- `dark.css` rebuilt from `hc-dark.css` with the selector renamed: main exit 0; the fix exits 1 on
  `[VALUE] \`[data-theme="dark"]\` in dark.css … (460/620)`.
