## (2026-11-03) — Activity drawer draws a run's causes (#3326 PR 2)

**STATUS: in progress, stacked on #3326 PR 1 (causes as data).** Second of the four PRs in #3326's build plan (§4).
Owner decisions Q3326.1 A and Q3326.5 A, and #3308 Q3308.1 A.

### What it does so far

A bad result's causes come first in its Activity row, one disclosure each, with the first one open
(`causesEl`, `apps/studio/src/shell/activity.ts`). Closed, a cause reads its mark, the set's name in emphasis, what
happened, then `· <first reason>` clipped to one line. Open, it shows every reason, one per line, then its why, what
stays and what to do, under the approved labels "What stays:" and "What to do:". The set is named from the panel's
catalog (`nameOf`), never by a writer. `splitLines`' positional pick is gone, so no line is "the reason" because of
its place, and `.p3-op-reason` goes with it. The status line's finish words use the first cause's first reason when
there is one.

### Still to do in this PR

- Move the existing `op-reason` arms in `test-chrome.mjs` and `apps/plugin/test-build-verdict.mjs` to the causes, and
  add §4's arm: post the owner's run and hold `op-reason` empty and the first cause's subject, mark and step present.
  Mutation: put `splitLines` back.
- Notes and Steps (Q3326.4 A's one Update file row with its steps inside, Q3326.6–.8 A).
