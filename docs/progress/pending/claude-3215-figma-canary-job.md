## (2026-11-03) — The real-Figma canary: a scripted Mac job, a run file keyed by command, and a judge that checks the protocol's shape (#3215)

#3304 shipped the canary's path rule, its judge and the Mac's job as prose. This follows the owner's decisions of 2026-11-01 and 2026-11-03 (Q-C2 C: the owner switches Agent link on for each run; Q20 A: runs use the owner's normal plugin build, gated by a build-stamp check, with no separate checkout) and turns the Mac's half into a script. It's still a tool, not a gate: nothing here is in `ci.yml` or `verify.ts`, and nothing in the plugin changed.

### What changed

- **`job.ts prepare <full sha> --run-dir <dir> [--file-key <key>]`**: builds nothing and checks nothing out (Q20 A). It writes `request.json` (the commit asked for) and `commands.json` into the run folder and prints the steps. The scratch file's key is a run-time argument, used for one printed link and written nowhere.
- **`job.ts check --run-dir <dir>`**: the stamp check, run on the first `status` before anything else. Unless the build stamp the plugin reports names exactly the commit asked for, from a clean tree, in the scratch file, it says `stop` with what to ask the owner (rebuild from the commit, or open the scratch file), and the Mac sends nothing else. A later commit isn't accepted.
- **`job.ts collect --run-dir <dir>`**: gathers the responses the session saved, verbatim, into one `run.json` keyed by command, with the commit asked for.
- **The run is bracketed by two `status` calls** (`status`, then `status-after` last). The bridge serves whichever plugin holds it (#3297), so both ends must name the scratch file and report the same build.
- **`judge.ts` reads the run file.** It now also holds when the commit the job was asked to check isn't `--expect`, and when a response doesn't parse as a result envelope. It keeps the commit check on both `status` responses' build stamps, so what ran is what was asked for, with no job build to compare against. The envelope's shape is literals in the judge (`PROTOCOL_V`, `TRANSPORTS`, `ERROR_CODES`, the fields), never read from `agent-protocol.ts` (`docs/34`). The scratch file's name is the default `--file-name`. The safe line reads `checked, safe to rebuild from <commit>`.
- **Fixtures, one bad run per check:** `bad-commit`, `bad-error`, `bad-file` (the closing `status` in another file) and `bad-shape`, beside `pass.json` and #3209's run. `selftest.ts` holds each by name, plus the job's stamp check and collect. 63 assertions.
- **The README's job text** now follows the script, and the owner switches the link on (Q-C2 C). The "can the Mac switch it on?" step from Q-C2 A is gone.

### Verification

- `prepare`, `check`, `collect` and the judge ran end to end over a scratch run folder: `prepare` wrote only `request.json` and `commands.json`, and the test key appeared in no file; `check` said `stop … ask the owner to rebuild` on a stale stamp (exit 1) and `go on` on the right one; `collect` then the judge gave `checked, safe to rebuild`. The git tree stayed clean.
- Mutations, each failing by name: an empty `EXCEPTION` list fails `3209/update-components`; a commit compare that accepts anything fails `bad-commit/status`; the file compare limited to the opening `status` fails `bad-file/status-after`; the transport check dropped fails `bad-shape/readback`. For the Q20 A rework: the run's requested-commit compare dropped fails `asked/run`; the stamp check's commit compare dropped fails `check/stale`, its file compare `check/file`, letting a stamp with no usable commit through `check/dirty`, its `cmd` guard `check/wrong-cmd`; a commit compare that accepts any commit fails `bad-commit/status` and `check/later`.

### Calls made where the decision was silent

- The brief's optional `should-run.ts` already exists as #3304's `needs-check.ts`, with its own fixture arms. It wasn't renamed or duplicated.
- The progress fragment for this branch name already existed, from #3304 and not yet folded, so this entry has its own file instead of overwriting that one.
