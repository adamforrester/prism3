---
engine: minor
---
`file-seed.ts` (#2075 part 2, Q-FS1 A): `seedFromFacts` reads a file facts report and proposes a starting brand input. It picks a primary, an accent, type families, density, `radiusScale` and the action palette (Q-BK7 A), each with a confidence and the evidence behind it, plus the neutral cast a compiling input needs. `seedDesignMd` writes the seed as a `design.md` that `cli.ts` already compiles. It's new and nothing calls it yet: no plugin UI, no start-screen entry. Every committed artifact is unchanged.
