## (2026-11-19) — The conformance scan builds every brand on disk: harbor and prism3 no longer throw (#4212)

`tools/conformance-scan/expected.ts` kept a hand list of design files (`DESIGN_OF`) that `THEME_OF` is built from. It named two brands; `out/figma/` holds five. harbor (#4035) and prism3 had emissions and no entry, so `expected.ts harbor` threw "Add 'harbor' to THEME_OF", and `--brands` printed the two as "would fail".

### The fix

`DESIGN_OF` is now derived: each brand directory under `packages/engine/out/figma/` that has an `examples/<id>.design.md`. A new brand with a design file needs no edit here. `nb` still has none, on purpose (a hand-written fixture), and keeps its own `THEME_OF` entry.

### Proof

- `--selftest` gains arm 3: one row per brand on disk, asserting it has a `THEME_OF` entry. On `main` it fails by name for harbor and prism3. On the fix every row passes, and arm 2 (the committed emission matches the design file it was built from, tier by tier and file by file) now runs for harbor and prism3 too, and passes.
- Mutation: filtering prism3 out of the derivation fails `arm 3 prism3` by name.
- Arm 2 walks the design files in `examples/`, not `DESIGN_OF`. `DESIGN_OF` is read off the disk, so a brand whose emission disappeared would have dropped out of the self-test without a word. Now it fails by name (`arm 2 <brand>: an emission is on disk to compare against`). `nb-redesign` is exempt by name: it is a seed brief with no emission. `mutations.sh` hides wendys from the disk read and the row fails by name; before this change the same mutation left no wendys row and the self-test passed.
- `expected.ts harbor` and `expected.ts prism3` build (964 contrast contracts each).
- The tool is not wired into CI, so nothing outside `tools/` moves.
