## (2026-10-10) — The verdict suite's #2177 drawer check waits for the narrow tier before it measures (#2459)

A flaky CI check, about 3 failures in 40 runs: `✗ #2177 styleguide 380: every line stays inside the drawer, which
does not scroll sideways — inside false, no side scroll false`. Test code only; the product is unchanged.

**What changed:** `apps/plugin/test-build-verdict.mjs`, the #2177 arm. Before it measures, it now waits for three
real conditions, one each, with the 5 s bound the arm already had: the frame's tier (`data-w`) is the one the width
calls for (`narrow` at 380, `wide` at 1280, typed in the test); at 380, the Activity drawer is open as a direct child
of the frame (the full-pane sheet at that tier); and the run's details are visible. Each wait's outcome is an `ok()`
by name (the `.then(() => true, () => false)` shape the suite already uses at its #1890 collapse check), so the old
`.catch(() => {})` on the visibility wait is gone and a wait that does not arrive fails as itself instead of letting a
stale layout be measured. The containment assertion's label now carries the tier, the drawer body's width and right
edge, its `scrollWidth` and `clientWidth`, and the widest line's right edge. No retries, and no timeout raised.

**The cause, reproduced on a mutated bundle rather than by chance.** The tier is set only by the frame's
ResizeObserver, a rendering step after `setViewportSize`; the old visibility wait was satisfied by the row as soon as
it was posted, so nothing held the measurement until the tier changed. Locally the race never lost: the unchanged test passed 300 of 300 cases at 380
unthrottled, 300 of 300 under 6× CPU throttling (CDP `Emulation.setCPUThrottlingRate`), and a 20× run stopped at
its time limit with no failure; the mutant without the tier wait also passed 180 of 180 under 6×.
A bundle whose ResizeObserver sets the tier 400 ms late makes the unchanged test fail on all three run kinds at 380
with CI's exact message, a 220.4px drawer body inside a 380px frame and a 278 to 322 `scrollWidth`; the fixed test
passes on that same bundle.

**One condition per wait, on purpose.** The first draft's sheet wait used
`[data-w="narrow"]:has(> drawer[data-open="true"])`, so it also waited for the tier. Removing the tier wait then
changed nothing, and the mutation passed. The sheet wait now reads the drawer's own open state only, so the tier is
waited on in one place and its removal is observable.

**Mutations,** each after a `wip:` commit:
- the tier wait removed, on the 400 ms late-tier bundle → `✗ #2177 styleguide 380: every line stays inside the drawer,
  which does not scroll sideways — inside false, no side scroll false; tier wide, body 220.4px wide (right edge 380),
  scrollWidth 322 of clientWidth 220, widest line's right edge 444.6` (and the same for apply and components);
- the tier forced to `wide` in the bundle, against the fixed test → `✗ #2177 styleguide 380: the frame reaches the
  narrow tier before the drawer is measured — read wide`.

**Left open.** Why CI only ever failed `styleguide`, when a stale tier fails all three kinds here, is still unknown;
the new label will say which layout a future failure measured. The one-frame flash of the wide grid at narrow widths
after a resize is a product issue for the owner, filed as #2462.
