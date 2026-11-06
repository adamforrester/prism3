## (2026-11-03) — Activity drawer draws a run's causes (#3326 PR 2)

**STATUS: done.** Second of the four PRs in #3326's build plan (§4). Owner decisions Q3326.1 A, Q3326.4 A to Q3326.8 A,
#3308 Q3308.1 A, and Q3390.1 A to Q3390.3 A (2026-11-05). PR 1 (causes as data, #3389) is in `main`. This branch merged
`main` and was never rebased.

### What it does

**Causes first.** A bad result's causes come first in its Activity row, one disclosure each, with the first one open
(`causesEl`, `apps/studio/src/shell/activity.ts`). Closed, a cause reads its mark, the set's name in emphasis, what
happened, then `· <first reason>` clipped to one line. Open, it shows every reason, one per line, then its why, what
stays and what to do, under the approved labels "What stays:" and "What to do:". The set is named from the panel's
catalog (`nameOf`), never by a writer. `splitLines`' positional pick is gone, so no line is "the reason" because of
its place, and `.p3-op-reason` goes with it. The status line's finish words use the first cause's first reason when
there is one.

**Update file is one row** (Q3326.4 A, Q3390.1 A). `main.ts` lends the latest run it started (`UpdateReading`): each
step's name, the operation that runs it, and, once it ended, its verdict and that operation's lines, causes and publish
description as they stood then. The drawer files a step's operation under the run instead of on its own row. It knows
which verdicts are the run's by their `ref`, kept for the whole session (`runRefs`), so a later run does not hand an
earlier run's verdict back to the operation's row. Every other writer keeps its own row: an agent's command, Check, the
boot Read-back, Clean up, Draw specs, and a build from Components. The row reads "Update file" and the status strip's
verdict ("Stopped at To add", "Theme applied"). Its body is the causes, then the notes, then "Steps". Each step has its
mark, name and verdict words, and its mono lines sit behind its own closed disclosure (Q3326.6 A). A step the run never
reached reads with a dash and "Not run" (Q3326.8 A). The panel fills each cause's `step` with the step's name. The run
counts once.

**"Update again"** (Q3390.2 A) is the run's one next step. It opens Update file again, and that checklist reads the file
afresh and checks what is due. It does not replay the run's steps, because the run's own writes moved the hashes its
update step compared, so a replay would be refused as "changed since the check". No step offers a button.

**Notes** (Q3390.3 A, Q3326.7 A). `note` is now a `Cause` kind (`apps/plugin/src/messages.ts`, accepted by
`write-adapter.ts`). It is drawn under a "Note" or "Notes" label with the info mark, its step in emphasis, then what it
says. It counts nothing, and a clean run stays clean. No writer sends one yet; PR 4's split is the first. `mergeCauses`
ranks the kinds so a note never hides a warning.

**Two fixes the run row needed.**
- A refusal that ended a step is the run's. The step already carries the host's words, so it no longer opens a lone
  operation row holding only "Refused".
- The bar row leads with the most recent row by a sequence stamp (`Rec.at`), not by the clock's minute. A run row and
  an older operation row can share one minute, and the older one used to win the tie.

### Tests

- `apps/studio/test-chrome.mjs` section `3326` (shard 3), light and dark, at 1280 and 380, each with literal
  expectations:
  - The owner's first run: causes first, no positional reason, every line kept.
  - A run stopped at To add: one "Update file" row reading "Stopped at To add", with no Set up file row. The body is
    causes, then "Steps", then next steps. Badge's cause carries its step "To add". The steps are Set up file ✓ "File
    set up", To add ✗ "Build failed", and Style guides with a dash and "Not run". There is no button in a step, the next
    steps are "Update again" and "Copy details", and the count is one failure. "Update again" opens Update file and
    posts nothing.
  - An agent's Build set after the run keeps its own row.
  - A clean run whose To add step sends a note: "Note", the info mark, "To add: <what>", no cause, "Sets added", and no
    count.
- Section 10 now reads the run row where it read a step's operation row after an Update file run: the running Theme, the
  clean Theme run, Set up file's failure and warning, its rerun and history, the #3128 refusal, and the #3308 runs. The
  agent's Set up file result keeps its own row. Section 3150 opens the run row's lines.
- `test-write-adapter.ts` accepts a note on a clean verdict; its unknown-kind arm uses `info`.

### Mutations, each failing by name at all four cells

| Mutation | Fails |
|---|---|
| A button drawn in each step | `… no step offers a button; the run offers "Update again" and "Copy details"` |
| A note counted as a warning (`counts`) | `… a note adds nothing to the count, and the run stays clean` |
| `owned` folding every operation into the run | `… an agent's Build set after the run keeps its own row, not a step of the run` |
| A never-run step drawn without "Not run" | `… a step the run never reached is listed with a dash and "Not run", and no disclosure` |
| `splitLines` put back (earlier push) | `#3326 figma … no line is set apart as the reason by its place` |

### Left for later PRs

- The row's verdict uses the strip's words alone. The renders' "· 5 sets with problems" suffix has no general form in
  the drafted copy, so it waits for PR 4 (the words).
- A `⚠` Set up file step stops the run. The run row and the count read it as a failure, as the strip does, while the
  step keeps its warning mark.
- PR 3 scopes the count to the latest run.
