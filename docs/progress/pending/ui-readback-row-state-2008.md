## (2026-10-02) — A failed restore on its own no longer makes a read-back row bad (#2008)

**STATUS: PR #2009 open from `ui/readback-row-state-2008`.** UI only, under S11's freeze exception (`shell/activity.ts` and the files S11 touched). No engine change and no emitted artifact moves, so ENGINE stays at {{ENGINE_VERSION}} and `CONTRACT_VERSION` is unchanged. No new strings.

**The owner's calls (option a on #2008, then the question on #2009).** After #1990, a read-back whose checks pass reads "Clean" even when the saved brand could not be restored, with the refusal in its details. But `readbackOf` in `apps/studio/src/main.ts` still returned `state: ok && !err ? 'ok' : 'bad'`. So the row counted toward "N need attention", opened the drawer and drew as a failure under the word "Clean". The owner chose to draw it as a normal row: not counted, and it doesn't open the drawer. Since #1997 the plugin's error bar already says the saved brand did not load and that Apply is off. #2009's first version covered "Clean" only. The owner then ruled that "No theme" after a failed restore follows the same rule. A failed restore on its own no longer makes the row bad; only "Not restored", "Failed" and mismatches do.

**What changed.** The restore error drops out of the row's state, which is now `ok ? 'ok' : 'bad'`. `ok` was already false for a read-back that threw and for a failing contract, and true for "Clean" and "No theme". "Not restored", a refusal with nothing checked, is its own branch and stays bad.

**Suites.** `test-build-verdict.mjs` gains a `#2008, #2009` arm. For "Clean" and for "No theme", it drives both orders the two host messages can arrive in, refusal first and read-back first, each with the drawer closed beforehand. It reads the row's state, the drawer's count, and whether the drawer opened. Two controls check that a failing check, and a read-back that threw, after the same refusal are still bad, counted, and open the drawer.

Mutations, each failing by name:
- the state back to `ok && !err` → the arm's three `#2008 …` assertions, for both verdicts in both orders (12);
- back to #2009's first version, `ok && (!err || o.state === 'present')` → the same three, for "No theme" only (6);
- the state pinned to `'ok'` → both `#2008 control: …` arms, and S11's own failing read-back arms.

**Trap for whoever re-verifies this.** A refusal alone is a bad row, so it opens the drawer. The refusal-first cases close the drawer before the read-back lands. Otherwise "does not open the drawer" would read an open drawer the refusal left behind, and fail with the fix in place.
