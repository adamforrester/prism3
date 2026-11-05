## (2026-11-03) — Activity causes as data, the writer side (#3326 PR 1)

**STATUS: plugin and panel data only; nothing drawn changes.** First of the four PRs in #3326's build plan (the
2026-11-03T03:14Z proposal, §4). Owner decisions Q3326.1–.9 A, and #3308's Q3308.1 A / Q3308.2 A. No engine change, no
executor change: the PR takes no executor revision.

### What it does

A verdict that is not clean now says why as data: `causes` beside `lines` on `component-result` and
`component-update-result`, each `{ kind, subject, what, reasons[], step?, why?, stays?, todo? }` (`Cause`,
`apps/plugin/src/messages.ts`). The drawer could only find a warning by position: it took the first line as "the reason",
so the owner's library run showed "Button: 4 updated in place." as the reason for a warning that was the last line.

- **The template line** (`canvas-furniture.ts`): `withTemplateWarning`, the one place a missing template turns a run `⚠`,
  now also adds `templateCauses`: one cause per set that lacked a template, its reason that set's template line. The
  same predicate does both, so a run is never turned `⚠` by a template without its cause.
- **The build** (`main.ts`): a set with real misses or a stale note is "built with problems"; no set at all, a refused
  def, or a throw is "could not be built", the host's words first.
- **The applied update** (`update-apply.ts` `applyVerdict`): a set stopped, not verified, or not updated, each with the
  clauses its lines already print after the set's name; a whole-run refusal is the run's own cause (`subject: null`).
- **The panel's queue** (`build-queue.ts` `runCauses`): each set that failed or had problems carries the causes its own
  build sent, so "Badge: built with problems." finally has its reasons behind it (#3308.1); each set a stop left is one too.
- **The adapter** (`write-adapter.ts` `causesOf`) checks every field and drops a list with a malformed entry whole, as
  `linesOf` does. `host-session.ts` carries the causes into each verdict slot.

### Decisions taken here, and why

- **`subject` is a def id, never words.** The drawer names it from its catalog (PR 2), so no writer words a set's name and
  the plugin and the queue agree on one key.
- **The agent's envelope is unchanged.** `forAgent` drops `causes` with `lines`; an agent reads the same facts as
  `activity`'s `problems` (#3309). Gated by `#3326 causes/<cmd>` in `test-agent-link.ts`.
- **A cause only on a verdict that is not `ok`.** A dependency built first with misses is in `activity`'s `problems` but
  does not turn the build's `ok` false, so it is not a cause here. Filed as #3386, not changed here.
- **A stop names the sets it left by def id** (review S1). A library names its sets its own way ("Button" for
  `button`), so `halted` carries `leftDefs` beside `left`, and a cause's subject never falls back to a set's name.
- **The plugin's cause rules live once**, in `causes.ts` (review N1). The panel's queue and its refusal import
  `mergeCauses` and `CAUSE_WHAT` (a pure module) rather than copying them, so PR 4's rewording moves every writer.
- **The web bundle reads one plugin file, `causes.ts`** (second review S1). So `apps/studio/vercel-ignore.sh` now
  watches it: a commit that changes only `causes.ts` builds the site (exit 1) where it was skipped (exit 0), measured
  against the script before and after. The gate gap behind it (`check:ignore` checks engine files only) is #3407.
- **Draw specs carries no causes yet.** It is outside PR 1's four writers. Filed as #3404.
- **"updated with problems"** is the one phrase not in the approved draft: the update's form of the build's
  "built with problems". It is not shown until PR 2, and PR 4 owns the words.

### Gates, and the mutation that fails by name

`test-canvas-furniture.ts` `templates/cause …` reads `causes` only. Dropping the template line from `templateCauses`'
reasons while leaving its prose fails `templates/cause build`, `templates/cause update` and `templates/cause merge`,
while every `templates/missing …` prose arm stays green, which is what shows the gate is not reading the prose
(`docs/34`). Also: `causes/…` in `test-update-apply.ts` and `test-build-completed.ts` (the posts `main.ts` makes),
`causes/run …` in `test-component-groups.ts`, and the adapter's arms in `test-write-adapter.ts`. After review:
`causes/halted` (a set named "Tag set" for `tag`), `causes/idle`, `causes/refused`, `causes/unknown`, `causes/misses`,
and in both suites `causes/every verdict`, an invariant over every verdict each suite reads: one not `ok` names at least
one cause, each subject a def id. Each of the review's four surviving mutations now fails one of them by name. Second review: `causes/run merged` in
`test-component-groups.ts` (a set two builds name is one cause; `runCauses` returning its list unmerged fails it).

Third review: eleven guide citations that quote nothing still carried main's line numbers after this PR moved the
code. `lint-guide-claims` checks such a citation for range only, so it could not see them (#3417). Each is re-pointed
by mapping main's cited line through the diff, merged with #3353 so it carries both PRs' shifts.

### Trap for PR 2

`step` is empty from every writer: Update file's step names are the panel's. PR 2 fills it where it groups the steps.
