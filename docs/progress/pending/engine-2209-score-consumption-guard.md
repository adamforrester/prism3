## (2026-10-06) — MCP score_consumption: a malformed refs item or pairs entry is an isError result, not -32603 (#2209)

**STATUS: branch `engine/2209-score-consumption-guard`, copy approved by the owner (Q53, 2026-10-06).** MCP only: no token, name or value moves, `CONTRACT_VERSION` unchanged. Change note `engine: minor`, so ENGINE moves at the next fold past {{ENGINE_VERSION}}. **Fixes #2209.** The five new sentences are owner-approved (Q53) and listed in `docs/voice-standard.md` §3. Also fixes, in passing as #2209 asked, the `emit-figma-dims.ts:416` comment: four floors auto-name `sm..xl`, not `sm..2xl`.

### Diagnosis

#2200 put `brandTheme` and `buildTree` behind one guard, `buildBrand`. `score_consumption`'s own scoring runs after it, outside any `try`:
- `scoreContractCompliance` reads `pair.fg` and calls `.replace` on it, so `pairs: [null]`, a pair missing `fg` or `bg`, or one whose `fg` is a number, all throw;
- `normalizeRef` calls `.trim()` on each ref, so `refs: [null]` throws the same way. The issue named only `pairs`; `refs` is the same defect in the same handler.

Each escaped `tools/call` as -32603. A `kind` outside the enum threw nothing, but it was scored silently at the 4.5:1 text floor.

### What changed

`scoreInputErrors` in `mcp.ts` checks each `refs` item and `pairs` entry against the tool's inputSchema before the build. It returns `{ error: 'score_consumption input failed validation', errors: [...] }` with `isError`, one sentence per bad entry, naming its index and what is wrong. Every bad entry is reported at once, so one round fixes them all. Only types are checked: an empty or unknown role still scores as `unresolved`, as before. A `pairs` that is not an array is still ignored, as an absent one is; it threw nothing, so it is outside this fix.

### `figmaArtifacts` is reachable from user input: filed as #2227, not guarded here

The issue asked to confirm that `figmaArtifacts` and `buildAiMetadata`, both outside `buildBrand`'s guard, have no user input that reaches a throw. **That holds for `buildAiMetadata` and not for `figmaArtifacts`.** An earlier draft of this entry said both were safe. The independent review of #2223 showed otherwise, and the claim is withdrawn.

- **`ai-metadata.ts`** throws nothing.
- **`figmaArtifacts` is reachable.** A schema-valid brand with `surfaces: { light: { floorStep: 25 } }` makes `buildFigmaColor` throw "… is measured against the palette step 'neutral.025', which no page ground aliases …". `export_theme` with `include: ["figma"]` returns -32603, while `validate_brand` calls the brand valid. The review's sweep found 79 of 285 schema-valid brands throwing past the guard, all of them `surfaces` cases that set `floorStep` or `secondary`. The plugin's apply path calls the same function.
- **Why my probe missed it.** It covered overrides, raw colors, and extreme OKLCH values, and treated the "palette step that zero or several page grounds alias" throw as an invariant because overrides of a ground are refused. It never varied `surfaces`, the lever that picks the step directly. `lint-lever-sweep.ts` runs toggles and enums, not `floorStep` numbers, so it doesn't cover this either.
- **Why it isn't fixed here.** Wrapping `figmaArtifacts` in the guard would turn the crash into a refusal from the Figma step alone. #2227 asks for the refusal, or a fix to the emission, to come from the build path so `validate_brand` reports it, and for the studio picker to stop offering the step. That is its own change.

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
