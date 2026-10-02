## (2026-10-02) — S11 follow-ups: Read-back says "Clean" when its checks pass, and every short verdict and the spinner delay get a test (#1990)

**STATUS: PR open from `ui/s11-followups-1990`.** UI only, under S11's freeze exception (`shell/activity.ts` and the files S11 touched). No engine change and no emitted artifact moves, so ENGINE stays at {{ENGINE_VERSION}} and `CONTRACT_VERSION` is unchanged. No new strings: every word here is the copy the owner approved on #1956.

**What was wrong.** The owner approved this rule: a read-back whose brand settings could not be restored, but whose checks pass, reads "Clean", and its details say the settings were not restored. `readbackOf` in `apps/studio/src/main.ts` showed "Not restored" whenever the restore had refused, even when the contract passed. Separately, no test asserted "Removed N", "No theme", "Not restored", or the "Failed" fallback, and the spinner's delay is CSS only, also untested.

**What changed.** One line. A contract-passing read-back reads `SHORT.clean` whatever the restore said. "Not restored" is left for a refusal with no read-back to show.

**Held for the owner: the row's state, not its word.** A "Clean" read-back after a restore refusal still draws as a bad row. It counts toward "N need attention" and opens the drawer, because `state` stays `ok && !err`. The approved copy settles the word but not this. The designer's saved brand really was not applied, which argues for keeping the row bad. A red "Clean" argues against. I did not pick, and no test pins the state either way.

**Suites.** `test-build-verdict.mjs` gains:
- `#1990` short-verdict arms. Each literal is driven by a host message: "Not restored", and then "Clean" with the refusal in details when the read-back lands; "No theme"; "Failed" for a read-back that threw; "Failed" for a failing contract with no count; "1 mismatch"; "Removed 3"; "Failed" for a prune; "Clean" for an empty preview.
- A spinner arm. It pins the computed delay of `.p3-spin::before`'s fade-in to the engine spinner's 200 to 500 ms anti-flash window, and it reads the arc's opacity at the start (0) and at 900 ms (1) on the busy Apply during an agent's run.

Mutations, each failing by name: restoring `err ? SHORT.notRestored : …` fails the "Clean" arm; each `SHORT` word, or `Removed ${n}`, fails its own arm; removing the delay fails the window arm; drawing the arc before its fade (base `opacity: 1`) fails the at-start arm; never showing the arc fails the after-delay arm. Removing the delay alone does not fail the at-start arm, because the fast fade has finished before the first read.

**Trap for whoever re-verifies this.** The spinner arm reads its control during an agent's run, with no host message in between. `renderBar` re-mints the bar's controls on each host change, which restarts the CSS delay, so an arm that posted anything between the two reads would measure a fresh spinner.
