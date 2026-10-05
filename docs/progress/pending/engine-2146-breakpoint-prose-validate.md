## (2026-10-05) — the breakpoint prose says the first is always 0, and validate_brand reports the engine's refusals (#2146 items 1 and 2)

**STATUS: branch `engine/2146-breakpoint-prose-validate`.** `ENGINE_VERSION` → **{{ENGINE_VERSION}}** (minor, a change note: `schema/lever-manifest.json` moves). No token, name or value moves; `CONTRACT_VERSION` unchanged. **Items 1 and 2 of #2146.** Item 3 (the studio's `namesFor` guard) is the UI lane's.

### Item 2: the prose (owner decision Q26 a)

- `levers.ts`, the `layout.breakpoints` description: "Studio keeps the first at 0px." becomes "The first is always 0px." Regen carries it into `schema/lever-manifest.json`, which is what owes the minor bump.
- `schema/theme-schema.json`, the `breakpoints` description, gains "The first must be 0." That file is hand-authored, not a regen artifact.
- `apps/studio/src/domains/layout.ts`, `breakpointsTip`, gets the same sentence. `test-lever-tips.ts` (#2106) requires a studio tooltip to equal its lever's description word for word, so the levers.ts change could not land alone. It's the same approved sentence, so this is mechanical fallout, not a studio decision.

### Item 1: validate_brand

MCP `validate_brand` ran the schema only, so it returned `{ valid: true }` for inputs `brandTheme` refuses: `layout.breakpoints: [320, 768]` (#2132), or an empty or reversed viewport range (#2068). `theme_brand` then refused them. It now also runs `brandTheme` on a **schema-valid** input, and reports what it throws, verbatim. A schema-invalid input is not handed to `brandTheme`. Measured: with that guard removed, `{ id: 'nope' }` gains `Cannot read properties of undefined (reading 'chroma')` among its errors.

**Not covered:** refusals that only fire at resolve time, for example an override naming an unknown palette or step, which `resolveAllModes` throws. #2146 named `brandTheme`'s refusals.

**Owed when #2137 lands:** an exact `validate_brand` arm for the empty-list refusal. That refusal isn't on `main` yet, so whichever of #2137 and this PR merges second adds the arm.

### Tests, in `mcp-test.ts` over the wire

53 → 59 passing.
- `validate_brand` on `[320, 768]` returns exactly the #2132 sentence.
- On 1280/375 it returns exactly the #2068 sentence.
- A buildable brand is still valid with no errors.
- A schema-invalid input reports schema errors only.
- The lever description (from `list_levers`) and the schema description (from `list_levers describe: ['layout']`) carry the approved sentences.

### Mutations, each failing by name

- **Drop the `brandTheme` call:** both refusal arms fail (`got {"valid":true,"errors":[]}`).
- **Restore the old lever sentence:** the lever-prose arm fails.
- **Restore the old schema sentence:** the schema-prose arm fails.
- **Run `brandTheme` on a schema-invalid input** (`if (true)`): the malformed-input arm fails, showing the `Cannot read properties…` error.
