## (2026-10-05) — layout refuses an empty breakpoints list (#2137)

**STATUS: branch `engine/2137-empty-breakpoints`.** `ENGINE_VERSION` → **{{ENGINE_VERSION}}** (minor, a change note). No emitted artifact moves; `CONTRACT_VERSION` unchanged. **Fixes #2137** (engine side).

### What changed

`layout: { breakpoints: [] }` built a brand with no breakpoints at all, so no layout. #2132's first-breakpoint refusal skipped it on purpose (`floors.length > 0`), because its message names the first value and an empty list has none.

`buildLayout` (`theme.ts`) now refuses an empty list **before** the first-breakpoint check, with the owner's approved wording (2026-10-05, Q22 a):

> The brand needs at least one breakpoint, starting at 0px.

With the empty case handled first, #2132's check no longer needs its `floors.length > 0` guard, and it now reads `if (floors[0] !== 0)`.

Swept before landing: no committed brand, fixture, brief, studio or plugin source declares an empty list.

### Tests

In the layout block of `test.ts`, beside #2132's arms. The expected message is the approved sentence as a literal, compared exactly:
- `[]` is refused;
- `[0]` builds, with one breakpoint.

### Mutations, each failing the refused arm by name

All 3137 assertion sites ran under both, the same as unmutated. The `[0]` arm stayed green in both.

- **Delete only the new check.** `❌ [#2137] an empty breakpoints list is refused with the approved wording (got "The first breakpoint must be 0px. This brand starts at undefinedpx.")`. With the guard gone too, `[]` falls into #2132's check and gets a message naming `undefinedpx`. The exact match is what rejects it: an arm checking only that `[]` throws would have passed here.
- **Restore the pre-PR code** (the guard back, no empty check). `❌ … (got "")`: `[]` builds again.

**Out of scope:** offering the refusal up front in the studio, the UI lane's follow-up.
