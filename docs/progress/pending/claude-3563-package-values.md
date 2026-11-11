## (2026-11-11) — check:package checks each name's value, not only its presence (#3563)

Found in the post-merge review of #3503 (#3569). `packages/tokens/check-package.mjs` checked the shippable token CSS
for names only: every guaranteed name present (`[NAMES]`), every name prefixed (`[PREFIX]`), and each mode block
differing from `:root` somewhere (`[MODE]`). Nothing compared a declared value with the engine's. A dark block built
from the hc-dark overlay passed, and so did every hex color rewritten to red. The README's "a theme switch never falls
back to a light value" was true of names only. Today's output was correct; the gate could not see a regression.

A new `[VALUE]` arm, per promised block: every guaranteed name's declaration equals the engine's value for that
block's mode. The oracle is `packages/engine/out/prism3.tokens.json`, the full tree with each leaf's per-mode values,
which the build (`sd.ship.mjs`, base plus overlay projections) never reads. A mode the leaf does not list takes its
base `$value`. The comparison ignores spelling but not content or order: both sides become lists of atoms (an
alias is `var(--pds3-…)`, a color its rounded RGBA however written), compared in order. The engine's side is laid
out in the order CSS writes each composite, which the gate writes down (`CSS_ORDER`): cubic-bezier numbers as they
stand, each shadow layer as `offsetX offsetY blur spread color`, a transition as `duration timingFunction delay`,
and a typography value as the `font` shorthand. A composite with no order written down fails. Only the separators
(`,` between layers, `/` in the shorthand) are not compared. 620 of 620 names match in each of the 4 blocks. The README and `CONTRIBUTING.md` §3 say so.

Not changed: the no-custom-code scan in `check-consumability.mjs`, which the issue lists as optional to widen.

### Mutations

Each fails `[VALUE]` by name, while every other arm stays green:

- The dark block built from the hc-dark overlay (`sd.ship.mjs`) fails ``[VALUE] `[data-theme="dark"]` holds the
  engine's dark value``. Before this PR the same mutation passed.
- Every hex rewritten to `#ff0000` in the join step fails `[VALUE]` in all four blocks.
- Every `cubic-bezier( )` argument list reversed in the join step fails ``[VALUE] `:root` ``, e.g.
  `--pds3-motion-easing-standard: cubic-bezier(1, 0, 0, 0.2)`. With the first version's sorted comparison it passed.
- The font shorthand's size and line-height swapped in the join step fails `[VALUE]` in all four blocks. With the
  sorted comparison it passed.
