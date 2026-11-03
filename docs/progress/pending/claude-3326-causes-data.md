## (2026-11-03) — Activity causes as data, the writer side (#3326 PR 1)

**STATUS: plugin and panel data only; nothing drawn changes.** First of the four PRs in #3326's build plan (the
2026-11-03T03:14Z proposal, §4). Owner decisions Q3326.1–.9 A, and #3308's Q3308.1 A / Q3308.2 A. No engine change, no
executor change (revision stays 49).

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
- **"updated with problems"** is the one phrase not in the approved draft: the update's form of the build's
  "built with problems". It is not shown until PR 2, and PR 4 owns the words.

### Gates, and the mutation that fails by name

`test-canvas-furniture.ts` `templates/cause …` reads `causes` only. Dropping the template line from `templateCauses`'
reasons while leaving its prose fails `templates/cause build`, `templates/cause update` and `templates/cause merge`,
while every `templates/missing …` prose arm stays green, which is what shows the gate is not reading the prose
(`docs/34`). Also: `causes/…` in `test-update-apply.ts` and `test-build-completed.ts` (the posts `main.ts` makes),
`causes/run …` in `test-component-groups.ts`, and the adapter's arms in `test-write-adapter.ts`.

### Trap for PR 2

`step` is empty from every writer: Update file's step names are the panel's. PR 2 fills it where it groups the steps.
