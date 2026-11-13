## (2026-11-12) — A refused font load reports the host's reason, not "(undefined)"

The owner's Update file run on 2026-11-12 reported SignInButton with "36 parts not written as planned", each one
`label.font -> Google Sans Medium (undefined)`. There is one for each Google member (3 styles × 3 sizes × 4 states).
The file has no Google Sans, so each load was refused, and the label fell back to Roboto Medium 14/20 as designed
(Q-S7 A). That part worked: 36 refusals, not 72, means every fallback loaded. What was lost is the reason.

**Cause.** Every font-load catch, in the executor (`write-components.ts`, three) and its paste twin (`anatomy-figma.ts`,
two), printed `(err as Error).message`. Figma's rejection of a face it does not have is not an `Error`, so `.message`
read `undefined`. Both shims threw an `Error`, so no test could see it.

**Fix.** `refusalOf(err)` reports `.message` when there is one, and the rejection itself when there is not. The paste
payload carries the same rule inline, so the two executors' miss strings stay byte for byte. Both shims take
`fontRefusal: 'string'`, which rejects with a plain string. Executor code moved, so `EXECUTOR_REVISION` goes 56 → 57.
Its reach entry is empty: `lint-executor-reach` drew 62 sets × 10 arms and found nothing redrawn, because only a miss's
wording changed. Engine note: `patch`, since `regen --check` is clean (229 artifacts).

**Not fixed here, and not a bug:** the 36 refusals still make SignInButton "not verified" in a file without Google Sans.
The owner settles that in the file, by installing the face or by accepting Roboto as Q-S7's fallback.

**Verified.** `test-write-components.ts` `sign-in build/font reason` and engine `test.ts` `paste executor font reason`
each refuse Google Sans with a string and assert the line, typed: `label.font -> Google Sans Medium (Cannot load font
"Google Sans Medium": it is not available.)`. The mutation, both catches back to `err.message` as a `wip:` commit, fails
both by name with the owner's `(undefined)`.
