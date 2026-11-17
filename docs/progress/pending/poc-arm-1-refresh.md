## (2026-11-16) — `poc/arm-1` takes 205 commits of `main`; `@prism3/css` generates the component exports it reads (#3408)

**What changed.** `main` merged into the code POC's integration branch `poc/arm-1` with a merge commit, across
the CONTRACT_VERSION 15.0.0 bump. Engine output doesn't move, so there is no change note.

- **The one break was not the contract change.** No token `button.css` reads changed, and `button.css` regenerated
  byte-identical. What broke was #3698 R3: the engine stopped committing `specs.json` and `component-defs.json`,
  which the `@prism3/css` generator and checks read from `out/`. A local run after `regen` passed; CI's checkout
  would have failed.
- **`packages/css/emission.ts`** runs `emit-component-docs.ts --uncommitted` into a temp folder, the pattern
  `packages/tokens/check-specs.mjs` uses. Mutated: a broken emitter path fails by name, and a stale planted
  `out/` copy is ignored.
- **The journal** (`docs/poc/arm-1-journal.md`) logs it as a Q55 "what breaks when an update arrives" data point.
