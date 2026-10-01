## (2026-10-01) — S4a follow-ups: the swatch check reads a column's mode from its position, the shared sections carry a marker, the stale "held" notes

**STATUS: PR from `ui/s4-followups`.** The reviewer's follow-ups on #1951 (S4a), items 1 to 3. Tests, code comments, one invisible attribute and docs. No engine change and no emitted artifact moves, so no ENGINE bump, and `CONTRACT_VERSION` is unchanged. No user-visible copy changes: item 4, the Surfaces & fills page description in `shell/pages.ts`, is the owner's call and is left as it is.

### 1. The swatch check took its expected mode from the code under test

`test-smoke.mjs` held each painted swatch to `emission.role(role, n.mode ?? mode)`, where `n.mode` was the `data-sg-mode` attribute that `preview/sections/kit.ts`'s `painted()` writes. So the section said which mode it meant, and the test believed it. The reviewer's mutation showed it: the Text color section's left column ("On ‹current› surface") painted the opposite mode and wrote the opposite mode into its attribute, and Surfaces & fills reported 0 failures (docs/34, shape 1: both sides from the subject).

**Now the expected mode comes from position.** `readSections` reports, for a painted cell of the Text color section's three-column grid, its column (its index among the grid's children, mod 3: the three heads, then three cells per ink). The first column is held to the page's mode. The second column is held to the opposite mode, which the test works out by its own rule (`OPPOSITE`: light and dark, hc-light and hc-dark, else the first other mode in the mode control's list). Every other painted node is held to the page's mode. The attribute is read only to print in a failure message. The Text color section is the only one that passes a mode to `painted()`, so it is the only one that writes `data-sg-mode`. Every painted node in all five sections goes through the same position rule.

**The Style guide is now swept too.** Before, the Style guide (Brand's preview) had its chips checked once per brand, in whatever mode was left over. Now the swatch check (`checkSwatches`) and the marker check run there in every mode, as they do on Surfaces & fills. A new arm also fails if no second-column cell was read, so the swatch check cannot pass on an empty read.

### 2. "main.ts draws no Border of its own" was a text match

`test-shell-imports.ts` matched `palSection\(\s*'Border'` in `main.ts`. `const mkSec = palSection; mkSec("Border", …)` gets past it, and so does a double quote. **The structural check:** each of the five section modules (`background`, `foreground`, `text-color`, `border`, `icon`) stamps its own root `data-sg-section="<file>"`, as a literal in that module. `palSection` does not set it, because `main.ts` imports `palSection`, and a marker set there would also mark a section `main.ts` drew itself. The rule is in `kit.ts`'s header. `test-smoke.mjs` (`checkSharedMarkers`, `EXPECT_SHARED_MARKER`, literal) holds each of the five on both pages, in every mode, to its marker. `test-shell-imports.ts` holds that only `preview/sections/` writes the marker, and that each module stamps its own. Without that, a section `main.ts` drew could just copy the marker. The text match stays as a cheap first line, and its comment now says what it cannot catch.

**The Style guide's "identical HTML" measurement** (S4a's fragment) now strips one more attribute, `data-sg-section` on each of the five section roots. Like the others, it is a data attribute and not visible.

### 3. Docs and comments

- `decisions-2026-10-01-qa.md`: Q10 records its one exception, "Back to the page" became "Back" (#1950). Q7 names its PR (#1949, closing #1943).
- `ui-s4-surfaces.md`: it now cites Q5 to Q21. Design calls 1, 2 and 4 are marked decided by Q19, Q20 and Q21. The surface tiers fall under Q20's rule: every role the Roles matrix shows keeps a normal row. The Style guide diff is stated as stripping four attributes: `data-p3="specimen"` (S3 adds it too, so it is on `main`), `data-sg-role`, `data-sg-paint`, and `data-sg-mode`, which it had not mentioned. Modes leaving the brand menu now cite #1943, fixed by #1949.
- Comments that still called the Text rows interim, or held them for the owner, now follow Q20 (permanent, primary editor; the Roles matrix is a secondary view) and Q19 (the rows edit the previewed mode). They are in `shell/pages.ts`, `domains/color-fills.ts` and `state/fills-input.ts`. Comments only. The `desc` strings are copy and are unchanged.

### Tests

`test:smoke` 3,581 → 3,804: per Surfaces & fills state, five marker checks and the second-column arm; per Style guide state (now 12, was 3), the chips, the swatches, the markers and the no-badge check; and the sweep floor. 2,976 swatches are checked, up from 1,476. `test-shell-imports` 71 → 77. `test:chrome` 10,038, unchanged.

### Mutations (each after a `wip:` commit, diff checked non-empty, each failing by name)

| Mutation | Failure |
|---|---|
| (a) `text-color.ts`: the left column paints the opposite mode and the right column the current one, so each column's `data-sg-mode` matches what it paints (the reviewer's mutation) | `test:smoke`, 36 failures. 24 are this check, on both pages in every mode: `prism3 / Surfaces & fills / light: every swatch is painted its emitted hex, the Text color columns in light and dark — text.primary color (Text color column 1, light) is painted #f7f7f7 (emitted #0d0d0e in light; the node says data-sg-mode="dark") \| …`. The other 12 are the Brand sweep's 2:1 text-node check on the Style guide. |
| (b) `main.ts` draws its own Border, identical in content, through `const mkSec = palSection; mkSec("Border", …)` | `test-shell-imports` 77/77 (the text match is evaded, as expected). `test:smoke`, 12 failures, all this check: `prism3 / Style guide / light: the Border section is the shared module's (data-sg-section="border") — its root carries no marker: drawn by something other than preview/sections/` |
| (c) the marker removed from `border.ts` | `test:smoke`, 24 failures, all this check, on both pages: `prism3 / Surfaces & fills / light: the Border section is the shared module's (data-sg-section="border") — its root carries no marker: …`. `test-shell-imports`: `✗ preview/sections/border.ts stamps its own root data-sg-section="border"` |
| (d) `main.ts` writes `s.dataset.sgSection = 'border'` | `test-shell-imports`: `✗ only preview/sections/ writes the shared-section marker — also written by main.ts` |

**Trap:** mutation (a) also fails the Brand sweep's 2:1 text check, because a column's text lands on the other column's ground. That check is not why the mutation counts as caught. The reviewer's "0 failures" was about the Surfaces & fills section, and what decides it here is the swatch check's own failure line, by name, on Surfaces & fills, which never runs that text check.
