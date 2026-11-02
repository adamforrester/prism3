## (2026-11-02) — Plugin open paces its projections and member reads on a full library (#3301)

The owner opened the plugin on the Prism3 template with a dev build: the panel hung while it read the file, and the
status strip's progress started only after a while. #3110 and #3170 had paged the read after open, but their stand-in
held 50 sets of one member each, no usage panels and no style guides.

### Where the time went

Measured on a new stand-in shaped like the template (`test-open-large-file.ts`, the template section): every def with
Figma properties (60 sets, 4,391 members built from their own plans, each stamped and recorded), a usage panel beside
each set, 8 style-guide pages of 1,500 nodes, 67 pages, and a ledger naming every set under an older engine, as a dev
build finds it. Every node is a `Proxy` that counts host calls, and the test's clock moves 10 µs per call. On `main`:

- **The strip spoke late.** The read's page 0 ("Reading this file…") was posted when the page read began, after the
  ledger answer had projected every engine-moved set.
- **One projection was one turn.** Button's 576 members took about 0.24 s to project and print in Node, in one turn, and
  the print hashed its accumulated strings at the end for about 0.2 s more.
- **The hand-edit pass projected every set's plans** only to read the set's name, which is its def's id.
- **24 members per hand-back.** `readSetView` handed back every 24 members, whatever their size: a field's 24 members are
  thousands of host reads. `readSingleView` read every component's parent in one turn, and every lookup over the read
  (`rootOver`) read every node's type again. Worst turn: 30,789 host calls (about 0.3 s at 10 µs a call).

### The fix

- `ui-ready`'s own turn posts the strip's page 0, before any projection or page load; the read posts pages from 1.
- The engine's `figmaAnatomySet` is now `figmaAnatomyMembers` (a generator, a member at a time) drained, then
  `checkAnatomySet`; and `printOf` is `printSteps` drained, with every hash fed as it goes (`fnvStream`). The plugin's
  print at open drives both a plan at a time and hands back once about `PACE_MS` has run (`pace.ts`, which now holds
  `PACE_MS` and a `pacer`). Every print is unchanged: compared with `main`'s for all 60 defs under 4 brands.
- The hand-edit pass's target carries no plans for a set (`passTarget`): `locateSets` finds it by `t.def`. A
  single-component def's plans are still projected, paced.
- `readSetView` and `readSingleView` also hand back once about `PACE_MS` has run, and the read keeps each node's type and
  name from its page's turn, so `rootOver` and `presentNames` read no node.
- `ledgerNow` keeps each def's entry per read, worked out ahead of `needsPrint` and `dueOf` with the same pacing.

After: worst turn 5,443 host calls; longest event-loop stall on the template stand-in 209 → 72 ms, on the 60-page
stand-in 523 → 86 ms (wall clock, measured, not asserted). The remaining two are the brand's materializer, built once,
and the end of the page read.

### Gates

`open/strip-first`, `open/member-paced`, `open/print-paced`, `open/pass-light` and `open/hand-edits`. On `main` the first
four fail. Mutations, each failing by name: the early page 0 dropped → `open/strip-first`; `readSetView`'s `PACE_MS`
hand-back, `readSingleView`'s, or `rootOver`'s kept types → `open/member-paced`; the projection's tick → `open/print-paced`;
the pass's target from `updateTargets` again → `open/pass-light`. Not asserted, measured only: `ledgerNow`'s pacing and the
streamed print hashes, which make no host call and showed only as wall-clock stalls.

### Not done

A page's own search is Figma's and cannot be split, so a page holding thousands of components is still one turn. Pure
JavaScript in Figma's plugin sandbox may run slower than in Node; the shim cannot say by how much, so the fix paces by
the clock rather than by a count. Engine patch (change note): no committed artifact moves. `EXECUTOR_REVISION` as
`lint-executor-revision.ts` requires.
