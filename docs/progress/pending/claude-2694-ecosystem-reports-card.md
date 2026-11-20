## (2026-11-19) — The ecosystem diagram draws the reports and the agent reference (#2694)

**What.** One output card, "Reports and agent reference" (`reports-reference`), joins the outputs column of
`docs/public/ecosystem/ecosystem.json`, with one edge from the engine (owner decision #2694 A: one card for both). It
covers the four analysis reports under `docs/public/reports/` (#2651) and the agent reference,
`docs/public/reference/commands.json` (#2644), with `docs/public/llms.txt` as the agent's entry point to both. The card's
sources name both generators, so `lint-ecosystem.ts`'s SOURCE arm fails if either moves.

**Wording is a draft.** The purpose line, inputs, outputs and the edge's `what` are held for the owner's review on the
PR. The card sits after Component docs, the other generated-documentation output, so the Figma file group keeps its
place in the column.
