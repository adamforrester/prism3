## (2026-10-08) — Two CI flakes: the spinner and pinned-clash checks wait on the state they assert (#2332, #2339)

Two checks kept stopping `gates` on unrelated PRs and on `main`, and passed on re-run. Both now wait on the state they assert, not on a fixed time or on how fast the test side round-trips. This PR changes tests only: no product code, no artifact.

- **#2332, `test:verdict`'s #1990 spinner arm.** The arc must stay hidden for its 200–500 ms delay. The arm read its opacity from the test side, after a `waitForSelector` and an `evaluate`, and on a cold runner that read landed after the delay and saw the arc drawn. Now a `MutationObserver`, installed in the page before the `agent-started` post, reads the arc's computed opacity in the microtask after `.p3-spin` is inserted, before any frame can advance its animation. The "drawn after the delay" arm waits for opacity 1, bounded at 5 s, instead of reading once after a 900 ms sleep.
- **#2339, `test:chrome`'s #2194 pinned-clash arm.** The figma host arm's click timed out at 30 s in CI, twice, and its message kept only Playwright's first line, so which click was unknown. Each step now waits, bounded at 10 s, on what the step before it produces: the pick has landed when Release pinned sizes is drawn, the value picker is gone before the scale is read, and Release's box holds still across two frames before it is clicked. A step that throws is named, with the call log's line that says what blocked the action.

### Diagnosis worth keeping

- **#2339 did not reproduce locally.** Twelve runs of the figma arm, with four extra CPU-bound processes, all passed in about 400 ms each. So the fix is the #2231 pattern (#2080, #2167) applied to every step, plus a stop message that names the step and the blocking reason, so the next CI failure, if there is one, says which click and why.
- **The product-state waits do not throw.** A pin or a release that never lands still fails the arm's own named checks, with what the page shows, rather than a generic "stopped" message.
- **Proof the #2332 race is gone, not just narrower:** an 800 ms stall injected between the post and the at-start read fails the old arm (`opacity at start 1`) and passes the new one.

### Mutations, each failing by name

- **#1990:**
  - base `opacity: 1` on `.p3-spin::before` → `#1990 the arc is not drawn at once — opacity at start 1`;
  - `p3-spin-show` ending at 0 → `#1990 … and is drawn after the delay — opacity after waiting up to 5 s 0`;
  - the delay removed → `#1990 the spinner's arc waits …` (`delay 0 ms`), and the at-start arm too. The arm's header used to say removing the delay alone does not fail the at-start arm; measured, it does, and the header now says so.
- **#2194, both hosts:**
  - Release's handler emptied → `#2194: <host>: Release pinned sizes clears the clash …`;
  - Release given `pointer-events: none` → `#2194 pinned clash <host>: the case stopped at "click Release pinned sizes" — locator.click: Timeout 10000ms exceeded. · - <div data-p3="type-scale-clash" …> intercepts pointer events`.

### Traps for whoever re-verifies

- A CSS mutation restored with `git checkout --` gives `chrome.css` a newer timestamp than the built bundle, and `test:chrome`'s freshness check then refuses to run. Rebuild the studio after restoring.
- #2341, the Build style guides field floor, was considered for this PR and kept out: it failed the same way on two consecutive `main` commits, so it is treated as a regression with its own fix.
