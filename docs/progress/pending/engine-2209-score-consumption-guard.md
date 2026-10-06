## (2026-10-06) — MCP score_consumption: a malformed refs item or pairs entry is an isError result, not -32603 (#2209)

**STATUS: branch `engine/2209-score-consumption-guard`, PR held for owner copy review.** MCP only: no token, name or value moves, `CONTRACT_VERSION` unchanged. Change note `engine: minor`, so ENGINE moves at the next fold past {{ENGINE_VERSION}}. **Fixes #2209.** Five new sentences are drafts and the owner's to approve; they are listed in `docs/voice-standard.md` §3.

### Diagnosis

#2200 put `brandTheme` and `buildTree` behind one guard, `buildBrand`. `score_consumption`'s own scoring runs after it, outside any `try`:
- `scoreContractCompliance` reads `pair.fg` and calls `.replace` on it, so `pairs: [null]`, a pair missing `fg` or `bg`, or one whose `fg` is a number, all throw;
- `normalizeRef` calls `.trim()` on each ref, so `refs: [null]` throws the same way. The issue named only `pairs`; `refs` is the same defect in the same handler.

Each escaped `tools/call` as -32603. A `kind` outside the enum threw nothing, but it was scored silently at the 4.5:1 text floor.

### What changed

`scoreInputErrors` in `mcp.ts` checks each `refs` item and `pairs` entry against the tool's inputSchema before the build. It returns `{ error: 'score_consumption input failed validation', errors: [...] }` with `isError`, one sentence per bad entry, naming its index and what is wrong. Every bad entry is reported at once, so one round fixes them all. Only types are checked: an empty or unknown role still scores as `unresolved`, as before. A `pairs` that is not an array is still ignored, as an absent one is; it threw nothing, so it is outside this fix.

### The guard was not widened, on evidence

The issue asked to confirm that `figmaArtifacts` and `buildAiMetadata`, both outside `buildBrand`'s guard, have no user input that reaches a throw. `ai-metadata.ts` throws nothing. `emit-figma*.ts` has six throws, all internal invariants:
- an unparseable color;
- a palette literal with no Figma line;
- a palette with no build;
- a palette step that zero or several page grounds alias;
- a fill opacity that is not a number token;
- a shadow mode entry that is not the wrapped `{ $value: [...] }` shape the tree writes (#708).

Two routes for user input were checked:
- **Overrides.** The only free-form route to a page ground is an override, and `brandTheme` refuses every override of a ground ("is a GROUND — N role(s) are contrast-measured against it"). Measured: all 31 ground-onto-ground and ground-onto-step overrides were refused inside the guard.
- **Colors.** No brand field takes a raw color string. Colors arrive as OKLCH numbers and the engine writes every color value `parseColor` reads.

A probe of 66 hostile but schema-valid brands, run through both emitters, found 0 throws past the guard. It covered `l` 0, 0.5 and 1; `c` up to 1e6; `h` from -720 to 1e9; neutral chroma up to 1e6; a pinned neutral anchor; and a `brandColors` entry at those corners. 6 brands were refused inside the guard, and the other 60 emitted clean. `lint-lever-sweep.ts` already runs `figmaArtifacts` for every toggle and enum value.

### Gates and their independence

`mcp-test.ts` gains a `#2209` block of five arms and a control, read off the raw reply. Expected sentences are typed in the test, never read from `mcp.ts`. The cases:
- `pairs: [null]`;
- a pair missing `bg` after a good one, which proves the index;
- an array entry and a numeric `fg` together, which proves every bad entry is reported;
- a bad `kind`;
- `refs: [null]`.

The control sends every `kind` and an unknown role, and checks the input still scores, with one `unresolved`.

### Trap for whoever is next

`mcp-test.ts` carries the `#2162` block twice, verbatim. #2207's merge added the second copy. Filed as #2222, not fixed here.
