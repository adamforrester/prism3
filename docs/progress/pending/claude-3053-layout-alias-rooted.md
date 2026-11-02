## (2026-11-02) — test.ts (21)(d): the generalize layout-alias arm matches rooted names and counts its rows (#3053)

**Status:** `packages/engine/test.ts` only. ENGINE unchanged (no change note: a test-only change owes no bump,
`packages/engine/changes/README.md`). CONTRACT unchanged.

### What changed

- **The defect.** Block (21) EMIT-FIGMA GENERALISE, arm (d), selected layout rows with
  `v.name === 'grid/gutter' || v.name === 'grid/margin'`. Since #1097 every emitted Figma variable name carries its
  brand's root (`ads/grid/gutter`, `wds/grid/gutter`), so the filter matched nothing, the bad list stayed empty, and
  the arm passed for any emission. It printed no row count, so nothing showed the empty selection (docs/34 shape 15).
- **The fix.** The arm matches `${theme.root}/grid/gutter` and `${theme.root}/grid/margin`, with the root read off the
  theme as arm (e) does. A literal root would be wrong here: aurora's root is `ads` and wendys' is `wds`, not the
  `prism` default the block header still names. It asserts the selected count equals `layout.length * 2` and prints it
  (12/12 aurora, 10/10 wendys). Since #3052 (Q785 A) a grid alias may point into `core/dimension/*` when no spacing
  step has the value, so a target in either collection passes; which of the two is right stays with (19g).

### Verification

- `test.ts`: 635626 passed, 0 failed.
- **M1, the issue's case** (the arm's names put back unrooted): 2 failed, both this arm by name,
  `(0/12 rows selected)` and `(0/10 rows selected)`.
- **M2, the subject** (`emit-figma-dims.ts` emits each `grid/margin` alias with a `-x` suffix, so it dangles): this
  arm fails by name for both brands, listing the dangling rows (`xs:ads/grid/margin → ads/space/200-x`, …).
