## (2026-10-15) — CLAUDE.md trimmed to its rules, narrative moved to where each rule points (Q319.1)

**STATUS: docs only.** `CLAUDE.md` goes from 28,683 to about 17,300 bytes. No code, no gate, no emitted
artifact. Owner decision Q319.1 A; the owner reviews the diff before merge.

### What moved, and what did not need to

Every rule stays as a sentence or two with a pointer. The narrative behind it was already held
almost everywhere: the worktree and `npm ci` incidents in `.claude/hooks/session-start-npm-ci.sh` and
`.claude/commands/review-pr.md`; the pathspec hazard, including the "byte-identical reads as clean"
detail, in `review-pr.md`; the mutation-restore and `[new branch]` incidents in the archived
2026-08-14/21/24 entries; the fold mechanics, change-note classes and fragment corrections in
`CONTRIBUTING.md` §2; the version window and contract rules in `docs/30`; the independence
diagnosis in `docs/34`. Two passages had no home and were moved rather than dropped:

- **Why `CLAUDE.md` names the artifact count instead of stating it** (#1110's "third site" argument)
  now sits in the header of `.claude/hooks/session-start-claude-md-freshness.sh`, #1110's own file.
- **What a progress entry is worth most for** (the diagnosis, the deliberate tradeoff, the discarded
  approach, the trap) now sits in `docs/progress/pending/README.md`.

The old pointers to `docs/00-progress.md (2026-08-14)` and `(2026-08-21, 2026-08-24)` were stale since
the archive split; they now name `docs/progress/archive/2026-07-08.md`.

### Why it stopped at about 17 KB, not 15

Principle 4's gate list stays verbatim (about 6,000 bytes): `lint-doc-gates.ts` matches it against
`ci.yml`, and other open PRs edit those lines. Everything else came to about 11 KB. Going lower meant
dropping a rule or the three Class 3 hazards `docs/43` §5 argues must stay resident (worktree,
pathspec, squash-merge), which this change was not allowed to do.

### Traps for whoever trims next

- `tools/forward-claim-check/measure.ts` reads the guest declaration from `CLAUDE.md`: a line matching
  "as a guest" with the backticked `apps/tokenpress/` on it. Keep both on the TokenPress row.
- `lint-layout-claims.ts` reads only the first cell of each layer-table row, and `lint-doc-gates.ts`
  only the command tokens inside principle 4. Neither notices a rule dropped from the prose around
  them (`docs/43` §3). Only review does.
