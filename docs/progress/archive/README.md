# Archived progress entries

Each file here holds the oldest entries of `docs/00-progress.md`, moved out unchanged once they are
about a month old, so the live log stays a size an agent can read (#2583). Read the log and these files
as one log: the log first, then each file here newest first. Each file continues straight on from the
bottom of the one before it.

- **Name:** the months the file holds. `2026-07-08.md` is July and August 2026; a single month is
  `YYYY-MM.md`.
- **Content:** whole entries, exactly as they were in the log, in the same order. Only the short
  preamble above a file's first `## ` heading is its own.
- **Never edited.** A correction to an archived entry travels as a fragment in `docs/progress/pending/`
  ("Correction to <date> <title>"), the same as a correction to an entry in the log.

**How to archive.** In a PR of its own, not inside a fold: cut whole entries from the bottom of the log
and paste them, unchanged, at the top of the newest archive file, or into a new file named for their
months. `lint-progress-order.ts` reads the log and this directory as one sequence, at the merge base and
at HEAD, and fails the PR by name unless both hold the same sections in the same order, byte for byte
(ARCHIVE MOVE). Add the new file to `JOURNALS` in `tools/forward-claim-check/measure.ts`.
