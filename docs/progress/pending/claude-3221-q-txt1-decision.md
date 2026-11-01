## (2026-11-01) — Q-TXT1 A recorded where the decisions index can cite it (#3221)

Owner decision Q-TXT1 A (the reference brand's secondary text fitted on the page) lived only in #3212's own
restatement: a bullet in `docs/06` §"The contrast floor is the one text promise" and a pending progress entry.
Review nit N2 on #3212 asked for a citable record.

- **Where.** A `#### Decided (2026-10-31, #3221)` section in `docs/06-surface-and-content-color-model.md`, right
  after the floor promise it is the exception to. The old bullet now points at it. It carries the decision, the
  mechanism (`secondaryTextGround: floor | page`, default `floor`), and the #3212 refinements Q3212.1, .2, .3, .6,
  .7 and .8 A. Q3212.4 and .5 are their own follow-ups (#3219, #3220) and are not restated here.
- **Indexed.** A row in `docs/42-current-decisions.md` and in `schema/decisions-index.json` (appended by
  `lint-decisions-index.ts --accept`, never hand-regenerated).
- **Gate.** Before the row existed, `lint-decisions-index.ts` failed by name: `UNINDEXED DECISION:
  docs/06-surface-and-content-color-model.md — Decided (2026-10-31, #3221)`. With the row, it passes.
- **No engine change**, so no `changes/` note: nothing emitted moves.
