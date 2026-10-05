## (2026-10-05) — lint-ratio-truth names a missing committed tree instead of crashing (#2136)

**STATUS: branch `gate/2136-committed-tree-missing`.** Gate only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. **Fixes #2136.**

### What was wrong

#2131 made `lint-ratio-truth` read palette steps from `out/<brand>.tokens.json` for every brand in `COMMITTED_TREES`. The comment on that list says a moved file "fails by name below". It didn't. `existsSync` was imported and never called, so a missing file reached `readFileSync` and the gate died on `ENOENT` with a stack trace. That still exits 1, but it names neither the gate nor the missing tree. The comment and the code were written in one pass and never checked against each other: docs/34 shape 20, in my own #2131.

### The fix

`sweep()` checks the committed path with `existsSync` before reading it. A missing file fails as:

> COMMITTED_TREES names '‹id›', but out/‹id›.tokens.json is missing

The brand is then swept from its in-memory build, so the rest of the run still reports. Floor 6 fails it as well, because that tree was not read.

### Mutation

In a scratch copy of `packages/engine`, `out/harbor.tokens.json` was renamed to `out/harbor.tokens.json.moved`:
- **The gate as it was:** `exit=1`, `Error: ENOENT: no such file or directory, open '…/out/harbor.tokens.json'` and a stack trace (`at sweep (…lint-ratio-truth.ts:215:39)`).
- **The fixed gate:** `exit=1`, `❌ 2 ratio-truth failure(s):`, `COMMITTED_TREES names 'harbor', but out/harbor.tokens.json is missing`, then floor 6's `COMMITTED_TREES names 'harbor', but no corpus brand read out/harbor.tokens.json — …`.

The unmutated gate is clean, with the same coverage as before (49432 ratios, 656 from the four committed trees).
