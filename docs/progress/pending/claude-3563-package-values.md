## (2026-11-11) — check:package checks each name's value, not only its presence (#3563)

Found in the post-merge review of #3503 (#3569). `packages/tokens/check-package.mjs` checked the shippable token CSS
for names only: every guaranteed name present (`[NAMES]`), every name prefixed (`[PREFIX]`), and each mode block
differing from `:root` somewhere (`[MODE]`). Nothing compared a declared value with the engine's. A dark block built
from the hc-dark overlay passed, and so did every hex color rewritten to red. The README's "a theme switch never falls
back to a light value" was true of names only. Today's output was correct; the gate could not see a regression.

A new `[VALUE]` arm, per promised block: every guaranteed name's declaration equals the engine's value for that
block's mode. The oracle is `packages/engine/out/prism3.tokens.json`, the full tree with each leaf's per-mode values,
which the build (`sd.ship.mjs`, base plus overlay projections) never reads. A mode the leaf does not list takes its
base `$value`. The comparison is loose on spelling and strict on content: both sides become sorted atoms (an alias
is `var(--pds3-…)`, a color its rounded RGBA however written, a composite its fields), and a typography value is
compared on the CSS `font` shorthand's fields, which the gate writes down. 620 of 620 names match in each of the 4
blocks. The README and `CONTRIBUTING.md` §3 say so.

Not changed: the no-custom-code scan in `check-consumability.mjs`, which the issue lists as optional to widen.

### Mutations

Each fails `[VALUE]` by name, while every other arm stays green:

- The dark block built from the hc-dark overlay (`sd.ship.mjs`) fails ``[VALUE] `[data-theme="dark"]` holds the
  engine's dark value``. Before this PR the same mutation passed.
- Every hex rewritten to `#ff0000` in the join step fails `[VALUE]` in all four blocks.
