## (2026-10-06) — layout refuses more than seven breakpoints (#2198)

**STATUS: branch `engine/2198-max-seven-breakpoints`, built on #2200's branch with `main` merged in. Merge held for the owner's approval of the refusal sentence (listed in the PR body).** ENGINE bump class: **`minor`** (a change note: a new refusal narrows what the engine accepts). No emitted artifact moves; `CONTRACT_VERSION` unchanged. **Fixes #2198.**

### What changed

`bpNames()` names up to seven breakpoints (xs to 3xl). An eighth built without an error and took the placeholder `bp7` from `buildLayout`'s fallback. `buildLayout` now refuses a list longer than seven (owner decision 2026-10-06, Q43 A), after the empty-list (#2137) and first-breakpoint (#2132) checks, with the count as entered:

> The brand can have at most seven breakpoints. This brand has ‹n›.

The refusal is in the build path, so MCP `validate_brand` (full build since #2168) and the generating tools (through #2200's guarded build) report it in that sentence. **The studio already holds at seven:** `MAX_BREAKPOINTS = 7` in `apps/studio/src/state/layout-input.ts`, and the Layout page offers "Add breakpoint" only below it. So the UI can't reach the refusal, and no studio change is made.

Swept: no committed brand, fixture, brief, studio or plugin source declares more than seven breakpoints.

### Not added: `maxItems: 7` on the schema

Measured with it in place: `validate_brand` reports `layout.breakpoints: 8 item(s) > maxItems 7`, and `theme_brand` reports `BrandInput failed schema validation` with the same line. A schema-invalid input never reaches the build, so the owner's sentence would never be shown on those paths. The studio's import goes through the same schema validator. Left out, and offered in the PR body as the owner's choice.

**Also not added:** an "at most seven" sentence in the schema's breakpoints description. That line is the one #2202 rewrites, which is held for approval, so editing it here would conflict. It can follow once #2202 lands, if wanted.

### Tests

- **`test.ts`, beside #2137's arms:** seven builds as `xs sm md lg xl 2xl 3xl` with no placeholder; eight is refused with exactly the sentence; nine is refused, naming its count.
- **`mcp-test.ts`:** `validate_brand` on eight reports exactly the sentence; `theme_brand` on eight returns `isError` with the sentence in `errors`.

### Mutation: allow an eighth

Delete the refusal:
- **Engine:** `❌ [#2198] an eighth breakpoint is refused (got "")` and the nine arm fail. The seven arm stays green. All 3140 sites ran.
- **MCP:** `❌ #2198 validate_brand reports the more-than-seven refusal (got {"valid":true,"errors":[]})` and the `theme_brand` arm fail (it built a full theme).
