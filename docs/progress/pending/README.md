# Pending progress entries

Each file here is one entry of `docs/00-progress.md`, carried by the PR that wrote it (#1807). A PR
adds its own file instead of writing at the top of the log, so no two PRs write the same line.
**Every PR adds one, except a fold;** `lint-progress-order.ts` fails a PR that does not.

Write it as part of the work, while the reasoning is still in hand: the entry is worth most for what
a diff cannot show — the diagnosis that made the fix small, the tradeoff that was deliberate, the
approach tried and discarded, and any trap waiting for whoever re-verifies the change later. PRs that
merged without one needed a separate docs PR to catch up.

- **Name:** your branch name with `/` turned into `-`, for example `lane-merge-independence.md`.
- **Content:** exactly one entry, the same shape as the log's. The first line is
  `## (YYYY-MM-DD) — <title>`, and any subsections inside it use `###`.
- **The title is final.** The fold finds the entry by it once it is in the log.
- **The date will change.** The fold dates each entry with the UTC day its PR landed on `main`, so the
  log reads in merge order.
- **Version numbers:** write `{{ENGINE_VERSION}}` where the engine version goes. The fold fills it in.
  Any other `{{` is refused, because the fold would copy it into the log unchanged.

**The log itself is the fold's.** A heading written straight into `docs/00-progress.md` does not count
as your entry, and outside a fold **any** change to the log fails, including an edit to an existing
entry. A correction travels as a fragment of its own, titled "Correction to <date> <title>"; the entry
it corrects stays as written.

**The fold exemption is for a pure fold** (owner decision, 2026-09-30). It consumes fragments rather
than adding one: it deletes pending files, every entry it consumed reached the log, and it touches
nothing but the log, the pending directories, `version.ts`, `CHANGELOG.md`, `out/`, the release notes
under `docs/public/releases/` (#2650) and the rename stamps it fills. A fold PR that also fixes a
semantic conflict carries a fragment for the fix.

`fold.ts` at the repo root moves these files into the log, newest merge first, and deletes them. Until
the next fold, read this directory together with the top of the log. `lint-progress-order.ts` checks
each file's shape here, and each folded entry's place in the log. How to fold: `CONTRIBUTING.md`.
