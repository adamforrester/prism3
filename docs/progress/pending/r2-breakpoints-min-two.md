## (2026-11-12) — Two breakpoints at least, and the lever sweep reaches sliders and lists (#3698 R2)

**What.** Owner decision R2 on #3698 (F3): a brand with `layout.breakpoints: [0]` validated and omitted four
guaranteed contract paths (`breakpoint.md`, `grid.md.*`). The input schema now states `minItems: 2`, and
`buildLayout` refuses fewer than two for input that never meets the schema (the studio, a direct
`brandTheme` call). The contract names stay guaranteed: `minimal-bp2` was already the contract corpus's
sparsest layout, so two is the floor the contract covers.

**The sweep.** `lint-lever-sweep.ts` swept only toggles and enum options, so the contract's blind spot was any
lever with a range. It now sweeps every slider at both ends of its manifest range and every list lever at
its boundaries: the empty list, plus `LIST_BOUNDARIES`' samples either side of a stated count bound. Each
setting meets the schema first (`validateBrandInput`), and a schema error is a refusal, matched by message
like any other. The breakpoint samples are literals in the gate, and the gate asserts that the schema's
`minItems` sits between them, so the gate and the schema state the floor independently (docs/34).

**What it found.** `typography.links: []` validates, drops six guaranteed `*-default-link` paths, and leaves
Link binding 112 text styles the brand does not emit, on all three sweep brands. Filed as #3707 with the
options. The gate holds it as a listed defect in both arms: a `REMOVALS` entry (`defect`), and a new
`BINDING_DEFECTS` list for arm (b), exact per brand and setting (the same def ids, the same miss count) and
failing as stale once the fix lands. Arm (b) still has no by-design allowlist.

**Cost.** The sweep goes from about 58 s to about 80 s here (232 → 313 settings built).

**Owner decision open.** The refusal sentence is DRAFT wording, and it replaces #2137's approved "The brand
needs at least one breakpoint, starting at 0px." for the empty list, which is no longer true. See the PR.
