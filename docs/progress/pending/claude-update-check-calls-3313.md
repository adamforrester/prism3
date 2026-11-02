## (2026-11-02) — Update check: the file's names read once, the pass's member reads reused (#3313)

On the template the Update check took about 20 s before the dialog could show anything. #3302's measurement on the
template-sized stand-in from #3312 put it at 2.6M host calls. #3313 named where they went: reading every member again
(44%), and `fileBlockers` rebuilding every component's name once per set (28%).

### The fix

- **The names, once per check.** `previewUpdate` builds the file's component and set names once, after every set is
  located, and hands the set to `fileBlockers` for each set. It is the same list for every set in a run.
- **The pass's reads, kept** (`member-views.ts`). The hand-edit pass at open already reads every member's snapshot,
  stamp and record, which is the view the dry run lays its plans against. `handEditsOf` hands each set's view on, and
  `checkSets` passes `previewUpdate` a lookup by set node id. Every kept view is dropped together:
  - when a document change touches any component or set, or any node inside one. Figma never reports an instance
    sublayer updated by its main component, so an edit to one set can resize another set's members unheard;
  - on any style change. Figma never reports a node updated by a style either, so a text style's size can re-flow
    every member that uses it unheard (#3348's review: the check read no move where a fresh read read 41);
  - when a change can't be placed (a deletion, unreadable parents);
  - when a write starts or ends (`guarded`).

  A change outside every component and set (a canvas frame, a usage panel) keeps them.

  A read that was in progress during any drop is not kept (`viewEpoch`).
- **What a kept view doesn't hold is read every time** (`freshView`):
  - how each member draws against the file's variables (`drawn`), because a variable's value can change with no
    document change;
  - the set's publish status.
- **The apply never uses a kept view.** It reads each set again before it writes, under the check's hash, so a view
  kept wrongly makes the apply refuse, not write.
- **Sets only.** A single-component def's read depends on the plans the brand projects (`readSingleView`). The pass and
  the check can project for different brands, so those defs are read fresh.

### Measured

Template stand-in, every set ticked:
- on `main`: about 2.80M host calls (both fixes mutated back out);
- names once per check: 2.00M;
- both fixes: 0.84M.

The `drawn` re-read is about 137k of the remainder. It is kept so the check stays exact.

Not done: the issue's second item, `checkSets` projecting every target's plans in one turn before the read starts, is
left for its own change.

### Gates

New arms in `test-open-large-file.ts`, after the template's open:
- `check/calls`: at most 900,000 host calls;
- `check/views`: all 57 sets are kept, and each kept read, as handed on, equals a fresh `readSetView` field for field;
- `check/same`: the answer is the same over the kept reads, over them again, and over a fresh read of every set;
- `check/drops`: a hand edit heard as `documentchange` after the pass is in the next answer, as a fresh read gives it.

The stand-in gains one glyph vector reaching past its frame, so a `drawn` fault exists to lose. Mutations, each failing
by name:
- `fileBlockers` rebuilding the names per set → `check/calls` (1.64M);
- the check not given the kept reads → `check/calls` (2.00M);
- a kept view handed on without `drawn` read again → `check/views`;
- the listener's drop removed → `check/drops`.

After review, more arms:
- `test-update-apply.ts`, `views/…`, on the strict shim. A set's read is kept, then a member grows with no change of
  its own, as a re-flow grows it. Then the one change Figma would report is sent: a style change, a main component
  resized outside every set, another set's member resized, or a text inside another set's member edited. The check
  laid against the kept read must equal a fresh read, whole. The premise shows the kept read is stale with no drop
  (44 moves fresh, 0 against it). `views/canvas` keeps the view for a canvas frame's change; `views/epoch` refuses a
  read that ran across a drop.
- `test-open-large-file.ts`, `check/write start` and `check/write end`: a write drops every view as it starts, and a
  view kept while it runs is gone after it.

Mutations, each failing by name:
- `STYLE_*` changes skipped → `views/style`;
- a component change not dropping the views → the three `views/main …` arms;
- `keepView` ignoring its epoch → `views/epoch`;
- `guarded`'s drop at the start removed → `check/write start`; at the end → `check/write end`; both → both.
