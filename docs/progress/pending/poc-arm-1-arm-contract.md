## (2026-11-20) — The arm input contract: one file another arm fills in, so the comparison runs on its Storybook unchanged (#3408)

**What changed.** On `poc/arm-1`, with no engine change. `@prism3/storybook` gains an input contract, the first item of
the remaining arm 1 plan posted on #3408.

- **The contract** (`arm-contract.ts`, `ARM-CONTRACT.md`) is one JSON file per arm. It gives each component's root,
  each anatomy part path mapped to a selector or declared unboxed, the focus ring, a story id per KPI 2 state per form,
  and the token naming.
- **`check-arm-contract.ts`**, in `check:build`, holds arm 1's contract complete against the emitted anatomy, the
  emitted token tree and the built `index.json`. Eight mutants fail by name.
- **The geometry scripts read the contract.** `check-geometry.ts` reads its roots and part selectors from it, and
  `compare-figma-geometry.ts` compares the contract's parts.
- **A fix inside it.** The Figma comparison used to take its parts from the code record, so a part the code never drew
  dropped out of the comparison instead of failing. A self-test case shows the old code missed it, and the new code
  names it.

**Blocked:** the arm 2 run needs read access to the contributor's repo.
