## (2026-10-05) — Studio: the dead legacy type-specimen CSS (.ts-*) is removed (#2012)

**Status:** `apps/studio/src/styles.css` only. No ENGINE bump (no emitted artifact moves). CONTRACT unchanged. No visible change.

### What changed

`apps/studio/src/styles.css` loses the eight-line legacy type-specimen block: `.ts-list`, `.ts-row`,
`.ts-sample`, `.ts-variants`, `.ts-var` and `.ts-var-range`, which #2012 names, plus `.ts-meta`, which sat
inside the same block with no user either, and the block's one comment. The legacy Type page that drew
them was already gone before S6.2.

### How "dead" was established, not assumed

- **Source and bundles.** A word-bounded search (`ts-meta` must not match `cw-row` or `weights-row`) over
  `apps/`, `packages/`, `tools/` and `skills/`, tests included, finds each class only in `styles.css`. No
  source builds a `ts-` class name by concatenation. The rebuilt `apps/studio/dist/main.js` and
  `apps/plugin/dist/{main.js,ui.html}` carry none of them.
- **The rendered DOM.** The repo has no unused-selector check, so a scratch Playwright preload (not
  committed) watched every page `test:chrome` and `test:smoke` opened, with a MutationObserver, for a node
  matching any removed selector. Zero hits in both suites. A positive control (`[data-p3]`) was seen on
  every page, so the observer was attached and reporting.
- **No visual change.** The 225 `test:chrome` screenshots were taken before and after the removal and
  compared.

### Trap for whoever re-verifies

A plain `grep ts-row` finds `components-row` and `weights-row` in the tests and the studio. Bound the
search on both sides with `[^a-zA-Z0-9_-]`, or the class looks used when it is not.
