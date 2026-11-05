## (2026-11-03) — Activity drawer draws a run's causes (#3326 PR 2)

**STATUS: the causes and their tests are done; Notes and Steps are held for owner questions (posted on the PR).**
Second of the four PRs in #3326's build plan (§4). Owner decisions Q3326.1 A and Q3326.5 A, and #3308 Q3308.1 A.
PR 1 (causes as data, #3389) is in `main`; this branch merged `main` rather than rebasing.

### What it does

A bad result's causes come first in its Activity row, one disclosure each, with the first one open
(`causesEl`, `apps/studio/src/shell/activity.ts`). Closed, a cause reads its mark, the set's name in emphasis, what
happened, then `· <first reason>` clipped to one line. Open, it shows every reason, one per line, then its why, what
stays and what to do, under the approved labels "What stays:" and "What to do:". The set is named from the panel's
catalog (`nameOf`), never by a writer. `splitLines`' positional pick is gone, so no line is "the reason" because of
its place, and `.p3-op-reason` goes with it. The status line's finish words use the first cause's first reason when
there is one.

### Tests

- `apps/studio/test-chrome.mjs` section 10's row reader reads `causes` (subject, what, mark, step, open) and
  `positional` in place of the old `reason`. The Set up file arm that held Q3113.5 A's reason line in the UI face now
  holds the opposite: Set up file's writer names no causes, so its line stays in the mono list and nothing is set apart.
- #3305's UI-face arm reads a cause's set and reasons at 12px, in place of `.p3-op-reason`.
- New section `3326` (shard 3): the owner's first run (#3308: nine sets, five with problems, its lines led by
  "Built Icon on ↳ Icons & assets.") on the plugin's drawer, light and dark, at 1280 and 380. It holds no `op-reason`,
  the causes first, the first cause open with "Button:", the warning mark and its step ("To add" at 1280, "Step: To add"
  at 380), one cause per set in order, and every line kept below.
- **Mutation:** `splitLines` put back (the first line drawn as `op-reason`) → `#3326 figma … no line is set apart as
  the reason by its place`, by name, at all four cells (12 of section 3326's 28 checks failed).

### Held

Notes and Steps (Q3326.4 A's one Update file row with its steps inside, Q3326.6–.8 A) need three answers the
decisions do not give: what a run outside Update file draws, which rerun button a step's failure offers, and where a
note comes from before PR 4 splits the usage-panels line. The questions are on the PR. No writer fills a cause's
`step` yet; the drawer draws it when sent.
