## (2026-09-30) — Merge independence: a PR writes its own files, and a fold writes the shared lines (#1807)

**STATUS: PR open from `lane/merge-independence` (#1823), labeled DO NOT MERGE.** No `ENGINE_VERSION` bump: the change is tooling, gates and docs, and nothing a consumer can observe moved (the #1725 precedent). It is the last PR to follow the old version convention, and the first to carry its entry as a fragment: this file, which the first fold moves into the log.

**The problem, measured in #1807.** Every PR wrote the same four places: the top of this file, `ENGINE_VERSION`, the changelog above it, and the stamp in every emitted tree. Replayed over the last 40 merges, 40 of 40 consecutive pairs conflicted, and 35 of those conflicted only on those lines. Six ready PRs took hours to land on 2026-09-30, one at a time.

**What the owner decided (2026-09-30), and what it changed.**

1. `ENGINE_VERSION` may name a fold covering several PRs, and `main` may briefly run merged behavior under the previous number. Principle 5 in `CLAUDE.md` now says so; "names are versioned, values are not" and every `CONTRACT_VERSION` rule stand as they were.
2. A progress entry is a per-PR file, `docs/progress/pending/<slug>.md`, and appears in this log at fold time.
3. The semantic-conflict net is the fold PR's own CI: merge the batch, and the fold's run is the first run of every gate over `main` plus the whole batch. The fold is run by hand for now, with no bot and no token.
4. **Every PR carries a fragment, except a fold** (decided after the PR opened, answering the proposal's §7.3). `lint-progress-order` enforces it.

**The technical calls, mine.**

- **One version per fold, not one per note.** A version names a state that existed on `main` and that the fold's regen stamped into every tree. One per note would mint numbers no build ran as. The fold bumps once, by the highest class any note declares.
- **A folded entry is dated the UTC day its fragment landed**, not the day it was drafted. That makes merge order and date order the same order, so the fold only ever prepends, and the date gate stays true without the fold having to search the log for a slot. A fragment open for a week would otherwise have landed below entries that merged after it.
- **What counts as a fold, for the fragment requirement:** a diff that deletes a pending fragment. Only a fold may do that (FOLDED ENTRIES fails any other diff that does), so a PR that is not a fold cannot claim the exemption. A heading written straight into the log does not count as carrying an entry. With HEAD equal to the base (CI's push run on `main`) there is no diff, and the arm says n/a.
- **No new gate file.** Each arm lives in the gate that owns its question, so the gate list in `CLAUDE.md`, `CONTRIBUTING.md` §3, the PR template, `ci.yml` and `verify.ts` does not move.

**What landed.**

- **`fold.ts`** at the repo root, beside `verify.ts`. It validates everything before it writes anything, orders by the first-parent commit that added each file, writes the constant and a section under a new FOLD MARKER in `version.ts`, prepends the fragments here, fills in the version placeholder, deletes what it folded and runs `regen.ts`. With nothing pending it prints "nothing to fold" and exits 0. It does not branch, commit or push.
- **`lint-emission-version.ts`:** an added change note declaring a bump satisfies a moved emission; the forward-version route stays for the fold (#1271 unchanged). New arms: NOTE SHAPE; ONE WRITER (a diff that is not a fold may not edit the constant, the changelog region, or delete a pending note); FOLD INTEGRITY (the version is exactly the next one, and every deleted note's prose sits under it).
- **`lint-component-surface.ts`:** arm B and `--accept` take an added note as the bump.
- **`lint-progress-order.ts`:** FRAGMENT SHAPE, FOLDED ENTRIES (each folded fragment is in the log with its title, at its landing day, in merge order) and CARRIES AN ENTRY (every PR but a fold adds a fragment). It now reads git history and refuses a shallow clone.
- **`lint-layout-claims.ts`, `lint-advisory-expiry.ts`, `lint-decisions-index.ts`:** `docs/progress/` is exempt by the same genre argument as this file. Without it a fragment would fail while it waits and pass once folded, and an index row pointing at a fragment would dangle the moment the fold deleted it.
- **Docs:** `CLAUDE.md` (principle 5, the progress-entry rule, where to read recent state), `CONTRIBUTING.md` §2 (the workflow, "How to fold", and "Converting an open PR from the old convention"), the PR template, `.claude/commands/review-pr.md`, `docs/30` (a `Decided` section, indexed in `docs/42`), the `prism3-build-component` skill's versioning section, and a `README.md` in each of the two directories.

**The #1104 / #1170 same-day order is settled.** The date sort ties same-day entries and so could never order them. The FOLDED ENTRIES arm reads merge order from `git log --first-parent` with its own code: swapping two same-day folded entries fails by name while the date arm still reports clean.

**Independence (docs/34).** The fold and the gates share one input, merge order, which is shape 17's shared ancestor. It is acceptable only because it is ground truth: the order `main` recorded, not something anything derives. Neither gate imports `fold.ts`; each parses notes and fragments with its own code, and each computes the next version or the landing day with its own arithmetic. The one-writer arm starts at the commit that introduces the FOLD MARKER and says so on this PR ("not yet in force").

**Mutations.** Run in a throwaway clone with a fake `origin` (three simulated lanes squash-merged on two days, then a real fold with its regen; version literals read from the base, so the battery reruns on any `main`), each committed first, each red by name; the full table is in the PR. Highlights: a PR bumping `ENGINE_VERSION` fails ONE WRITER; a fold dropping a note's prose fails FOLD INTEGRITY; a fold skipping or under-running the number fails by name; a surface accepted with a note and then the note removed fails arm B; two same-day folded entries swapped fail FOLDED ENTRIES while the date arm stays green. Converses: each of those arms neutralized alone, with the defect still live, goes green. The fragment requirement: a PR adding no fragment, and a PR writing its entry straight into the log instead, each fail CARRIES AN ENTRY by name; with the arm neutralized, the first goes green. This PR failed it by name too, before its own entry moved from the log into this file.

**Traps for whoever folds first.**

- **The contract baseline no longer records `engineVersion`** (#1817 landed first), so a fold needs no `token-contract.ts --accept`. An earlier revision of this PR printed a stamp-only `--accept` step from `fold.ts` while the field existed; it was removed once #1817 merged.
- **Rename-rule `since` stamps are authored version literals** (`MATERIALIZATION_RENAMES`, `COLLECTION_RENAMES`, and `test.ts`'s tables for them). A PR adding one cannot know its version; the fold PR sets it by hand for now. Filed as #1816.
- **Folded headings are history.** The FOLDED ENTRIES arm finds an entry by its title and landing day, so a later edit to a folded heading fails it by name. Correct the body, not the heading.

### Review round (independent review of #1823 at d54f3c47: request changes)

- **A note line opening with the placeholder broke the whole batch (HIGH).** A line opening with the version placeholder followed by a dash passed NOTE SHAPE and, once folded, read as a changelog heading, so FOLD INTEGRITY cut the section short and failed every note in it. NOTE SHAPE (gate and fold) now checks the prose after substitution, and a section ends only at the next fold's own header.
- **A pending note could be edited by any PR (MEDIUM).** The docs already said it could not. ONE WRITER now fails a diff that changes a note the base carries.
- **Bump-class policy (the orchestrator's call):** `minor` for any behavior change, `patch` only when no committed artifact moves (a patch note over a moved emission fails), `major` refused while ENGINE is below 1.0, by the gate and by the fold. The fold takes the highest class.
- **Shallow clones (MEDIUM).** `lint-progress-order` refused every shallow clone, and agent sessions clone about 50 deep. It now refuses only when the clone stops after the pending directory was introduced, where every file would look added at the boundary.
- **Every PR but a fold carries a fragment** (owner decision). A fold is recognized by content, never by branch name: it deletes a pending fragment or note, and the FOLDED ENTRIES arm passed. The arm is skipped only on a push run; elsewhere a HEAD equal to its base fails. This PR's own entry moved from the log into this file.
- **No literal double brace in the log or the changelog.** The reviewer's mutation, a fold that never substituted, left the placeholder in the log with every gate green. Both gates now fail it by name, and a fragment or note carrying a double brace other than the placeholder fails its shape arm, since the fold would copy it into the log.
- **Docs:** how to revert a merged PR that is not folded yet (keep its note and fragment, add your own), one fragment and one note per entry in the migration steps, and that a branch which has not merged `main` since this landed can pass locally and fail in CI.

### Re-review round (#1823 at 398d8e12: all seven fixes confirmed, five more)

- **A PR carrying a fragment could still write into the log (MEDIUM).** Outside a fold-shaped diff, adding a heading to the log now fails (ONE WRITER for the log), fragment or not.
- **A normal PR could pass as a fold (MEDIUM)** by changing a file, adding no fragment and hand-moving another PR's fragment into the log. A fold is now exempt from carrying a fragment only if it is PURE: it touches nothing but the log, the pending directories, `version.ts` and `out/`. A fold PR that fixes a semantic conflict carries a fragment for the fix.
- **A fold that deleted the notes and left the fragments passed both gates (MEDIUM, the reviewer's surviving mutation).** It surfaced one fold late, blamed on the wrong fold. A pending fragment whose title is already an entry in the log now fails.
- **A patch note passed over a moved component surface (LOW).** `component-surface.json` is outside regen's list, so the emission gate never saw it. Arm B and `--accept` now count only `minor` or `major`.
- **The first fold's section ran to the end of the comment (LOW).** It now ends at the first header naming another version.
- **Docs:** `npm run verify` on a plain checkout of `main` is red by design, because HEAD is its own base and CARRIES AN ENTRY has no diff to read; `GITHUB_EVENT_NAME=push npm run verify` checks `main` the way CI's push run does.
- **#1817 merged first.** The shared sentences were resolved by hand (the PR template's emission row, the build-component skill). The contract baseline carries no `engineVersion`, so the stamp-only `--accept` step `fold.ts` printed while it existed never fires now; it was removed rather than left as dead code.
- **Orchestrator's surviving mutation at 22110184:** a PR carrying its fragment appended to the body of the newest log entry and passed. Outside a fold-shaped diff, any change to the log now fails, not only a new heading; a correction to an old entry travels as a fragment. The line is fold-shaped rather than pure because a fold that fixes a semantic conflict still writes the log.
