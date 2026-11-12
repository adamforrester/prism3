## (2026-11-12) — lint-skills scan 7 resolves the script a backticked command runs, and backticked directories (#2794)

Scan 7 reads `.claude/commands/review-pr.md` and resolved a backticked name only when the name filled the whole code span. Two mutations from #2767 passed clean: `npx tsx fold.ts` changed to `npx tsx folds.ts`, and `docs/public/releases/` changed to `docs/public/release/`. Both shapes now resolve.

**A script run by a command.** In a span that starts with `npx tsx`, `tsx`, `node`, `bash` or `sh`, the first operand that is not a flag is resolved as a file by scan 7's existing rule: from the repo root when it has a `/`, otherwise in one of the bare homes. Only the runner's operand is read. The other words in a command (`npm install <pkg> --prefix <worktree>`, a `git` ref) name nothing that has to exist. `npx tsx packages/engine/...` and `node -e` carry no file name and are skipped.

**A directory.** A span that ends in `/` resolves against the directories `git ls-files` lists. With an inner `/` it must be that path from the root. A bare one (`figma/`, `pending/`) must be the last segment of some tracked directory. That rule is looser than the bare-file rule on purpose: the command names `figma/` and `components/` inside a sentence that already named `packages/engine/out/`. It still catches a misspelling (`figmas/` fails).

**Code spans that wrap.** The scan now walks every code span rather than matching a name pattern, so a span that wraps onto the next line had to be read as one. `npm install --no-save` wraps its flags onto the next line, and a line-only reading paired the backticks after it the wrong way round and dropped `package-lock.json`. Spans may now cross a single newline, as Markdown allows. All 36 names the old pattern read are still read.

**Mutations, each failing by name.** `folds.ts` fails `missing file` naming the command. `docs/public/release/` and `figmas/` fail `missing directory`. Neutering either new push, or the runner pattern, fails the self-check with the expected dead names listed. Each shape has its own floor of 5 reads from the real command. Today it reads 36 file names, 8 scripts and 13 directories.
