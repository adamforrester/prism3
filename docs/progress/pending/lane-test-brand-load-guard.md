## (2026-09-30) — test.ts: an example brand the engine refuses fails by name, and the suite carries on (#1836)

**STATUS: PR from `lane/test-brand-load-guard`, held DO NOT MERGE for review.** Test-only: no change note, no ENGINE bump, CONTRACT unchanged.

**The defect.** Arms all over `packages/engine/test.ts` build a committed example brief into a Theme as a fixture, with a bare `brandTheme(...)` call. When the engine refuses a brief, the first such line throws and the process dies with a stack trace. No summary prints and no later arm runs, including the arm written to catch the refusal. Reproduced as the issue describes: `theme.ts` refusing a neutral action palette crashed the suite at the nb-redesign load in the #1368 face-pin block (then `test.ts:441`).

**The fix.** One helper, `exampleTheme(name, build)`, near the top of the file next to `ok`. A throw records one failure per name, `example brand <name> resolves — the engine threw: <message>`, and returns `undefined`. The arm that needed the brand skips:
- A brand list drops that row, through `loadedRows`.
- A single-brand arm is a labeled block that breaks out (`arm: { … if (!t) break arm; … }`), so the arm body is not re-indented.
- A few short arms use `if (t) { … }` instead, where breaking would skip unrelated arms later in the same block.

Three shared readers get the same treatment. `BRAND_ROOTS` gives a brand that did not load a root no emitted name starts with, so the arms that read it fail instead of crashing on `rootOfBrand`'s throw. `corpus()` from `token-contract.ts` builds aurora, harbor and wendys inside the engine module and cannot drop one brand, so `test.ts` now wraps it: a refusal records `example brand corpus (token-contract.ts corpus()) resolves` and yields no members. `buildContract()` is guarded the same way. `ok`, `pass` and `fails` moved above `BRAND_ROOTS` so the helper can record there.

**The sweep.** The issue asked for other loads of the same shape. There were many more than one: 74 direct `brandTheme(<example brief>)` calls, plus arms that parse a brief into `input` and build it later, or build it with a lever set (`density`, `modes`, `outlineInteraction`). All of them now go through the helper, or sit behind a guarded load of the same brief as-is. Left alone on purpose:
- `every-example-compiles`, which owns "each brief builds" and already caught its own throw.
- The materialise-budget arm, which also already caught its own.
- Arms whose input is a synthetic or `MINIMAL_*` brand. That brand is the arm's own subject, not an example brief.

**Mutations.** Each ran on a committed tree, restored by `git checkout --`.
- **(M1)** `theme.ts` throws on `actionPalette === 'neutral'`, the issue's own mutation. Before the fix: a stack trace at `test.ts:441` and no summary. After: `134357 passed, 8 failed`. The failures include `example brand nb-redesign resolves — the engine threw: …` and the three nb-redesign density variants.
- **Converse:** the helper made to rethrow, with M1 still live. The stack trace comes back at the first nb-redesign load, so the helper is what turns the crash into a verdict.
- **Completeness, one corpus brief at a time.** This ran in a copy of the tree, with `brandTheme` refusing any input rooted at `ads`, `hds`, `wds` and then `pds3`. Every run reached the summary, with `example brand <id> resolves` among its failures. The first aurora run is what found the `corpus()` and `STATUS_TIE` paths.
- **Reaching #1811.** #1827's `test.ts` hunk was applied to a copy of the tree, with M1 live. The suite now reaches the #1811 arm. It then crashes inside that arm, on the arm's own `brandTheme({ …, actionPalette: 'neutral' })`. That call builds a synthetic brand rather than an example brief, so it is #1827's to guard, and the note is on that PR.

On a green run the pass count is unchanged, 134,674 before and after. Every one of the 2,977 assertion sites still ran, and the helper's one new failure-only site reads as unexecuted.

**Traps for whoever re-verifies.**
- **The labeled blocks all use the label `arm`.** JavaScript refuses a label inside a block that already carries it. So an arm nested inside an `arm:` block cannot take one. Two prism3 override arms inside the #1354 block are left unguarded for that reason, and it is safe: the enclosing block has already broken out if prism3 did not load.
- **A skipped arm is not a pass.** The run is red by name the moment a brand does not load. The assertion-site arm (#1268) then also lists every skipped site as unexecuted, which is the honest count of what the refusal hid.
- **A per-brand mutation keyed on `root` also hits synthetic inputs that borrow the root**, such as the #1283 arm that declares `pds3` on purpose. Those extra failures belong to the mutation, not to the guard.
