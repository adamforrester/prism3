## (2026-11-12) — A fold bot, and a build identity in live output (#3698 R1)

**What.** Owner decision R1 on #3698 (F1). The review counted 303 change notes and about 500 fragments pending,
so `ENGINE_VERSION` had stopped saying which code produced an artifact.

- **The fold runs from a bot.** `.github/workflows/fold.yml` runs CONTRIBUTING §2's sequence and opens the fold
  PR: `fold.ts --dry-run`, then `fold.ts` (which regenerates), a commit, a push and `gh pr create` with the plan as
  its body.
  - It refuses while a `fold/` PR is open, and it merges nothing.
  - It needs a `FOLD_TOKEN` secret, because a PR opened with the default workflow token starts no CI, so the
    fold PR would never get `gates`. Without the secret it fails by name.
  - It runs by hand until the owner picks a cadence (OWNER DECISION on the PR).
  - `lint-doc-gates.ts` gains `foldWorkflowGaps`, which reads the file for the token, the two refusals and the
    fold sequence, and fails a bot that merges. It is self-tested over four mutations of the real file.
- **A build identity**, `<ENGINE_VERSION>+pending.<n>`, or the plain version at a fold, from
  `build-identity.ts`, which is node-only. It appears in three places:
  - the MCP `serverInfo.version`;
  - `$extensions.generator.build` on a tree the MCP or the CLI writes;
  - `build` on a brand's defs export (format `1.2 → 1.3`).

  The pure core takes it as an argument and never computes it. docs/30 records the decision.

**The boundary, and why.** The committed corpus carries no build identity. Stamping the pending count into
committed trees would make every note-adding PR rewrite every tree's stamp. Two such PRs would leave `main` stale,
and `lint-emission-version.ts` already forbids editing `out/` stamps (#1807). regen passes `cli.ts --committed` for
wendys, the one committed tree written through the CLI. The only committed byte that moved is the defs export's
`format` string. This boundary is flagged on the PR for the owner to confirm.

**Tested.** `test.ts` builds the expected server version from `git ls-files` (an independent count of the notes),
types the format literally, and checks that the pure tree and the committed export carry no `build`.
