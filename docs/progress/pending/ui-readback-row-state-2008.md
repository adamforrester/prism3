## (2026-10-02) — A "Clean" read-back after a failed restore draws as a normal row (#2008)

**STATUS: PR open from `ui/readback-row-state-2008`.** UI only, under S11's freeze exception (`shell/activity.ts` and the files S11 touched). No engine change and no emitted artifact moves, so ENGINE stays at {{ENGINE_VERSION}} and `CONTRACT_VERSION` is unchanged. No new strings.

**The owner's call (option a on #2008).** After #1990, a read-back whose checks pass reads "Clean" even when the saved brand could not be restored, with the refusal in its details. But `readbackOf` in `apps/studio/src/main.ts` still returned `state: ok && !err ? 'ok' : 'bad'`. So the row counted toward "N need attention", opened the drawer and drew as a failure under the word "Clean". The owner chose to draw it as a normal row: not counted, and it doesn't open the drawer. Since #1997 the plugin's error bar already says the saved brand did not load and that Apply is off.

**What changed.** One condition. The state is `'ok'` when the checks pass and either nothing was refused or the read-back found a theme (`o.state === 'present'`). That is exactly the "Clean" case. These still draw as bad rows, unchanged:
- a refusal with nothing checked ("Not restored");
- a failing check after a refusal;
- "No theme" after a refusal. The owner's call named "Clean" only, so this stays as it was.

**Suites.** `test-build-verdict.mjs` gains a `#2008` arm. It drives both orders the two host messages can arrive in, refusal first and read-back first, each with the drawer closed beforehand. It reads the row's state, the drawer's count, and whether the drawer opened. A control checks that a failing check after the same refusal is still bad, counted, and opens the drawer.

Mutations, each failing by name:
- the state back to `ok && !err` → the arm's three `#2008 …` assertions, in both orders;
- the state pinned to `'ok'` → `#2008 control: …`, and S11's own failing read-back arms.

**Trap for whoever re-verifies this.** A refusal alone is a bad row, so it opens the drawer. The refusal-first case closes the drawer before the read-back lands. Otherwise "does not open the drawer" would read an open drawer the refusal left behind, and fail with the fix in place.
