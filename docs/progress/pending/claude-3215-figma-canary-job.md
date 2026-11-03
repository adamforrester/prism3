## (2026-11-03) — The real-Figma canary: a scripted Mac job, a run file keyed by command, and a judge that checks the protocol's shape (#3215)

#3304 shipped the canary's path rule, its judge and the Mac's job as prose. This follows the owner's decisions of 2026-11-01 and 2026-11-03 (Q-C2 C: the owner switches Agent link on for each run) and turns the Mac's half into a script. It's still a tool, not a gate: nothing here is in `ci.yml` or `verify.ts`, and nothing in the plugin changed.

### What changed

- **`job.ts prepare <full sha> --checkout <dir> [--file-key <key>]`**: builds that exact `main` commit in a checkout of its own. It refuses a checkout inside the tree it runs from, a commit not on `origin/main`, and a dirty tree. It runs `npm ci` and the plugin build, reads the stamp the build printed, and writes `build.json` (commit, stamp, and the panel's "Built from" line) and `commands.json` into a run folder outside both trees. The scratch file's key is a run-time argument, used for one printed link and written nowhere.
- **`job.ts collect --run-dir <dir>`**: gathers the responses the session saved, verbatim, into one `run.json` keyed by command, with the commit, the stamp and the "Built from" line.
- **The run is bracketed by two `status` calls** (`status`, then `status-after` last). The bridge serves whichever plugin holds it (#3297), so both ends must name the scratch file and report the same build.
- **`judge.ts` reads the run file.** It now also holds when the job's commit isn't `--expect`, when the stamp the build printed isn't the build `status` reports, and when a response doesn't parse as a result envelope. The envelope's shape is literals in the judge (`PROTOCOL_V`, `TRANSPORTS`, `ERROR_CODES`, the fields), never read from `agent-protocol.ts` (`docs/34`). The scratch file's name is the default `--file-name`. The safe line reads `checked, safe to rebuild from <commit>`.
- **Fixtures, one bad run per check:** `bad-commit`, `bad-error`, `bad-file` (the closing `status` in another file) and `bad-shape`, beside `pass.json` and #3209's run. `selftest.ts` holds each by name, plus the job's stamp parse, "Built from" line and collect. 59 assertions.
- **The README's job text** now follows the script, and the owner switches the link on (Q-C2 C). The "can the Mac switch it on?" step from Q-C2 A is gone.

### Verification

- `prepare` ran end to end from a scratch folder against `c1cd0846`: clone, fetch, detach, `npm ci`, build, then `build.json` with `Built from tree-… (commit c1cd0846) at …`. The test key appeared in no file. `collect` over that empty run folder gave a run the judge held on every missing response, by name.
- Mutations, each failing by name: an empty `EXCEPTION` list fails `3209/update-components`; a commit compare that accepts anything fails `bad-commit/status`; the file compare limited to the opening `status` fails `bad-file/status-after`; the transport check dropped fails `bad-shape/readback`.

### Calls made where the decision was silent

- The brief's optional `should-run.ts` already exists as #3304's `needs-check.ts`, with its own fixture arms. It wasn't renamed or duplicated.
- The progress fragment for this branch name already existed, from #3304 and not yet folded, so this entry has its own file instead of overwriting that one.
