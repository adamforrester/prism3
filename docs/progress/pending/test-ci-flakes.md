## (2026-10-08) — The Apply spinner's anti-flash wait starts when the control turns busy, and the pinned-clash check waits on state (#2332, #2339)

Two checks kept failing `gates` on unrelated PRs and on `main`. One turned out to be a real product defect; the other is a test that now waits on the state it asserts.

- **#2332, a product defect, not a flake.** #1990's spinner holds a "…" for its 200–500 ms wait, then fades the arc in, so a quick write never flashes a spinner. But a control's spinner is made with its label, at mount, and held with `visibility: hidden` until the control turns busy, and an invisible element still runs its animations. So the wait and the fade were spent unseen about 400 ms after mount, and **every apply that came later drew the arc at once**, which is every real apply. `test:verdict`'s #1990 arm was right; it failed only when the run's post landed outside that window. Found by Lane D on review: with a 2 s wait before the post, the arm failed 2 of 2 runs with no load at all.
  - **The fix** (`chrome.css`): a spinner inside a control that isn't busy holds `animation: none`, so its animations start when the control turns busy, and again on the next write. The style guide's "drawing" spinner is made when it's shown and isn't in a control, so it's unchanged.
  - **The arm:** first it waits until the mounted spinner runs no fade, which is the state a real apply finds the panel in. With the defect, that means waiting out the mount-time fade; with the fix, there's none. Then it reads the arc's opacity inside the page, from a `MutationObserver` on the control's `aria-busy`, in the microtask after it turns true. The "drawn after the delay" read waits for opacity 1, bounded at 5 s.
- **#2339, `test:chrome`'s #2194 pinned-clash arm.** The figma host arm's click timed out at 30 s in CI, twice, and its message kept only Playwright's first line. Each step now waits, bounded at 10 s, on what the step before it produces:
  - the pick has landed when Release pinned sizes is drawn;
  - the value picker is gone before the scale is read;
  - Release's box holds still across two frames before it's clicked.

  A step that throws is named, with the call log's line that says what blocked it.

### Diagnosis worth keeping

- **My first #2332 change was wrong, and the stall proof I gave for it didn't prove what I said.** It read the opacity "in the microtask after `.p3-spin` is inserted", but the spinner isn't inserted on a write: it has been in the page since mount. That observer read an already-mounted node on the first unrelated mutation. Whether a failure is a flake is a claim to test against the product, not only against the test.
- **#2339 didn't reproduce locally.** Twelve runs of the figma arm, with four extra CPU-bound processes, all passed in about 400 ms each. So the fix is the #2231 pattern (#2080, #2167) on every step, plus a stop message that says which click stuck and why.
- **The product-state waits don't throw.** A pin or a release that never lands still fails the arm's own named checks, with what the page shows.

### Mutations, each failing by name

- **#1990:**
  - the fix removed (the `animation: none` hold) → `#1990 the arc is not drawn at once — opacity at start 1`, on 2 of 2 runs;
  - base `opacity: 1` on `.p3-spin::before` → the same;
  - `p3-spin-show` ending at 0 → `#1990 … and is drawn after the delay — opacity after waiting up to 5 s 0`;
  - the delay removed → `#1990 the spinner's arc waits …` (`delay 0 ms`), alone.

  With the fix in, an apply 2 s after mount passes 367/367.
- **#2194, both hosts:**
  - Release's handler emptied → `#2194: <host>: Release pinned sizes clears the clash …`;
  - Release given `pointer-events: none` → `#2194 pinned clash <host>: the case stopped at "click Release pinned sizes" — locator.click: Timeout 10000ms exceeded. · - <div data-p3="type-scale-clash" …> intercepts pointer events`.

### Traps for whoever re-verifies

- A CSS mutation restored with `git checkout --` gives `chrome.css` a newer timestamp than the built bundle, and `test:chrome`'s freshness check then refuses to run. Rebuild the studio and the plugin after restoring.
- **Not checked in Figma itself.** The fix is CSS the plugin's panel and the web studio share, and the arm reads it in Chromium. Seeing the "…" before the arc on a real apply is the live check.
