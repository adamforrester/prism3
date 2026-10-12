## (2026-10-11) — Build style guides: a quiet run's finish is announced once, ruled out as doubled and pinned (#2508)

**Status:** test only (`apps/plugin/test-style-guides-page.mjs`, in `test:verdict`). No product code moves, no engine
bump, CONTRACT unchanged.

**The question (owner Q217.5).** A style guide run on the Build style guides page is quiet: it opens no drawer.
Activity's status line still announces its finish (Q194). If the page announced its own result too, a screen reader
would hear the finish twice. The rule: when a page announces a run's result itself, Activity stays silent for it.

**Ruled out.**
- **Reading:** the page's one live region (`sg-live`, `aria-live="polite"`) holds only the run line ("Drawing table N
  of M…"), and `paint` empties it once the run is no longer pending. The page's other regions are none: the existing
  `progress` arm already asserts there is no live or status region inside the page.
- **Measured:** a MutationObserver the test installs just before the verdict lands watches every live region in the
  document (`aria-live`, and the `status`, `alert` and `log` roles). It records exactly one announcement,
  `{"region":"activity-status","text":"Style guides finished."}`. So the finish is heard once, from Activity, and the
  rule needs no change here.

**The arm**, `#2508: a quiet run's finish is announced exactly once, by Activity's status line, and the drawer stays
closed`. Two mutations, each from a `wip:` commit and restored with `git checkout --`:
- **The page also announces its result** (its live line takes the verdict's headline at the finish):
  `✗ #2508: … ([{"region":"activity-status","text":"Style guides finished."},{"region":"sg-live","text":"✓ style guide: 2 tables"}], …)`,
  beside the existing `✗ progress: the live region is emptied when the run ends`.
- **Activity silent for a quiet run** (`said.push` gated on `loud`): `✗ #2508: … ([], drawer open false)`, beside the
  two #2507 finish-line arms.

**A trap for whoever re-verifies this.** A mutation keyed on the page's `S.pending` survived: the count is already zero
by the paint that draws the verdict. Key a page-side announcement on the run's own state (`r.state`, `r.run`).
