## (2026-11-20) — Activity's status line names the write holding the file; Record and Adopt agree with a count of one (#3760, #3275)

**#3760, what.** Since #3697 R7 one write holds the whole file, so a request for one write is declined behind another.
The Activity row reads the host's words (`busyMessage(held)`, "Theme is already running. Try again when it
finishes."), but the drawer's live region said `${OP_TITLE[r.op]} already running; …`, naming the write ASKED for:
"Set up file already running" while Theme ran. A screen-reader user and a sighted user were told different things.

**#3760, the fix.** The reducer (`apps/studio/src/state/host-session.ts`) carries the wire's `held` into the refusal,
as an `OpKey`, and `refusedLine` (`apps/studio/src/shell/activity.ts`) names it in the owner's sentence (#1957,
2026-10-02): "Theme already running; the second request was declined." With no `held` (an older host) it names the
write asked for, as before. The plugin's titles (`run-guard.ts` `TITLE`) are held equal to `OP_TITLE` by
`test-agent-link.ts`, and an update holds the build's guard, so the line and the row (`busyMessage(held)`) always name
the same write. The sentence's form is unchanged; whether the line should also name the declined write is an owner
decision on #3760.

**A trap for the re-verifier.** An earlier draft of this fix announced the host's message instead, on the belief that
the panel's title for an update's hold ("Build set") and the row's would differ. They don't (`guardFor` maps every
update command to `build-components`, titled "Build set" in both places), and `test-build-verdict.mjs`'s #1957 arm,
which pins the owner's sentence, failed that draft by name. Its `BUSY` literal still reads "Update file is already
running", the row's words before #3718; it is a fixture string the arm only echoes, so it is left as it is.

**#3275.** Record as built's and Adopt's verdicts read "1 left as they are". Both now use #3243's count-aware pronoun:
"1 left as it is", "2 left as they are". `test-update-components.ts`'s Adopt arm pinned the old form and is updated.

**Arms and mutations.** `apps/studio/test-host-session.ts`: a Set up file request declined behind Theme, through the
reducer: the refusal carries `held`, and the line names Theme as the plugin's own `busyMessage('apply-theme')` does; with
no `held`, the asked write; the refused branch calls `refusedLine` (read from the source). Main's reducer (no `held`) →
`#3760 the reducer carries the write holding the file`; `refusedLine` back to `r.op` → `#3760 the status line names the
write holding the file`; the branch not calling it → `#3760 the drawer's refused branch announces refusedLine`.
`apps/plugin/test-update-components.ts`: both verdicts at one and two left. Adopt back to a fixed plural → `#3275 Adopt,
1 left` and `adopt/words`. Plugin and studio behavior only: no change note.
