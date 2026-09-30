# Pending progress entries

Each file here is one entry of `docs/00-progress.md`, carried by the PR that wrote it (#1807). A PR
adds its own file instead of writing at the top of the log, so no two PRs write the same line.
**Every PR adds one, except a fold;** `lint-progress-order.ts` fails a PR that does not.

- **Name:** your branch name with `/` turned into `-`, for example `lane-merge-independence.md`.
- **Content:** exactly one entry, the same shape as the log's. The first line is
  `## (YYYY-MM-DD) — <title>`, and any subsections inside it use `###`.
- **The title is final.** The fold finds the entry by it once it is in the log.
- **The date will change.** The fold dates each entry with the UTC day its PR landed on `main`, so the
  log reads in merge order.
- **Version numbers:** write `{{ENGINE_VERSION}}` where the engine version goes. The fold fills it in.
  Any other `{{` is refused, because the fold would copy it into the log unchanged.

`fold.ts` at the repo root moves these files into the log, newest merge first, and deletes them. Until
the next fold, read this directory together with the top of the log. `lint-progress-order.ts` checks
each file's shape here, and each folded entry's place in the log. How to fold: `CONTRIBUTING.md`.
