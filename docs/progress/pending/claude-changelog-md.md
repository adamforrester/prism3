## (2026-10-15) — The engine changelog moves out of `version.ts` into `packages/engine/CHANGELOG.md` (Q319.3)

Owner decision Q319.3 A on #2583. The ENGINE changelog was a 5,090-line comment between `version.ts`'s module header and `ENGINE_VERSION`. It is now `packages/engine/CHANGELOG.md`, and `version.ts` keeps the module header, the two constants and the contract surface around them (1,276 lines, from 6,365). `fold.ts` writes each fold under the FOLD MARKER in the new file, and `lint-emission-version.ts` reads it there.

**The move is byte-faithful under one stated transform.** It strips ` * ` / ` *` from each line, turns each block boundary (`*/` then `/**`) into a blank line, `---` and a blank line, and drops the opening `/**`, the closing `*/` and the constant's own first line. That line, "The code. Bumps on any behaviour change…", stays on the constant as its doc comment. Reversing the transform over the new file reproduces lines 75–5163 of `version.ts` at `e4a22077` exactly (5,089 lines, equal). The order is kept: a few pre-#1807 entries, then the folded section, then the rest of the pre-#1807 entries. The file's intro says so, and a reorder would be a separate decision.

**The gate proves the move rather than trusting it.** ONE WRITER compares the changelog region at the base and at HEAD. A base with no `CHANGELOG.md` (this PR, and `main`'s push run on its squash) is read the old way, then run through the same transform, restated in the gate and not imported. So this PR passes as a non-fold only if the move was faithful. One changed word in the moved text (`29` → `28` in the 0.237.0 header) fails ONE WRITER by name. In steady state the region is everything below the `<!-- ENGINE CHANGELOG (#1807)` comment. The intro above it stays editable, the way `version.ts`'s module header always was, and an intro edit passes.

**Mutations, in a throwaway clone with the move committed as `main`:**
- (a) A non-fold PR edits a fold header in `CHANGELOG.md`: `ONE WRITER — this diff edits the ENGINE changelog in CHANGELOG.md and is not a fold`.
- (b) A synthetic note (`engine: patch`) and fragment merge, then `fold.ts` runs. It writes `0.237.1 — folded …` under the marker in `CHANGELOG.md` with the placeholder filled, and moves only the constant line in `version.ts`. `lint-emission-version.ts` passes (`a fold — 1 note(s) consumed at patch`), and so does `lint-progress-order.ts` (`exempt — a pure fold`).
- (b2) The same fold with the note's second paragraph deleted fails `FOLD INTEGRITY — … its prose is not in the 0.237.1 section`.
- `lint-progress-order.ts` with `CHANGELOG.md` taken back out of `FOLD_WRITES` fails the real fold with `CARRIES AN ENTRY`. The list had to gain the file, or every fold would stop counting as pure.

**Dropped as a rule: "no `*/` in a change note".** It existed only because the prose was folded into a comment. Both `fold.ts` and NOTE SHAPE refused it, and both checks are removed with their reason.

**No change note.** No committed artifact and no projected surface moves (`regen --check` is clean). The fold and gate tooling is not engine behavior. The earlier tooling PRs that changed `fold.ts` or this gate (#2556, the #2583 archive move, #1816) carried none either.

**Kept in `version.ts`: the CONTRACT changelog** (the entries above `CONTRACT_VERSION`). Q319.3 names the fold's changelog. The contract entries are written by the PR that bumps the contract, in the same diff as its `--accept`. Moving them would put a per-PR writer into a file the one-writer arm guards, so that is a separate call if wanted.

**Coordination.** #2658 (release notes) reads only the `ENGINE_VERSION` constant out of `version.ts` and is unaffected. But it rewrites `lint-progress-order.ts`'s `FOLD_WRITES` line, which this PR also changes, so whichever lands second keeps both entries. #2672 (CLAUDE.md trim) rewrites principle 5. This PR changes one phrase there ("the changelog above it" becomes "its changelog, `packages/engine/CHANGELOG.md`"), and the trim should carry the path forward.
