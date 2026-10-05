## (2026-10-05) — layout refuses a first breakpoint that isn't 0px (#2132)

**STATUS: branch `engine/2132-first-breakpoint-zero`.** `ENGINE_VERSION` → **{{ENGINE_VERSION}}** (minor, a change note). No emitted artifact moves; `CONTRACT_VERSION` unchanged. **Fixes #2132** (engine side).

### What changed

Breakpoints are mobile-first min-widths, smallest first, so the first is the layout for every width below the second. A first floor of 320 leaves screens under 320px with no layout. The studio locks that field at 0px ("Always 0px."), so only a hand-written brief or saved file could reach another value. The engine accepted it silently, and the studio then showed the stored value beside "Always 0px.", which was false (found in #2120's review).

`buildLayout` (`theme.ts`) now throws when `layout.breakpoints[0]` is not 0, with the owner's approved wording (2026-10-05, decision F4 A), the value as entered:

> The first breakpoint must be 0px. This brand starts at ‹n›px.

Swept before landing: every committed brand, fixture and brief (`examples/*.design.md`, the test fixtures, the studio's and plugin's sources) starts at 0, so nothing that built before is refused.

### Tests

In the layout block of `test.ts`, beside `lyBrand`. Each expected message is the approved sentence as a literal, compared exactly:
- 0 builds, stated explicitly (`[0, 768, 1024]`) and by default;
- 320 is refused;
- 1 is refused, so the rule is "not 0" rather than a threshold;
- 0.5 is refused, and the message carries `0.5px` as entered, not rounded.

Mutation, deleting the refusal: the three refusal arms fail by name, the 0 arm stays green, and all 3129 assertion sites ran.

### Not this rule

**An empty `breakpoints` list builds**, with no breakpoints at all (measured: `layout: { breakpoints: [] }` gives an empty layout and no error). The approved message names a first value, and an empty list has none, so the refusal skips it (`floors.length > 0`). Filed as #2137.

**Showing the refusal on the studio's import** (`Line ‹n›: …` under the S7 template) is the UI lane's follow-up.
