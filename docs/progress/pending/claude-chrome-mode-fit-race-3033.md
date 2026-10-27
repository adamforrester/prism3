## (2026-10-26) — The chrome suite waits for the mode control to settle before it reads it (#3033)

`web light 380 / brand, 4 modes: every mode is choosable in the preview header, none clipped` went red on main and on several PR heads, reading `hc-dark` as clipped. The control's `fit` (`apps/studio/src/shell/preview.ts`) picks radios or the select in a `requestAnimationFrame` scheduled by a `ResizeObserver`. At widths up to 560 the check clicked `pane-toggle-preview` and read the control straight away, so it could land before that frame and see the radios the select was about to replace.

Section 17 of `apps/studio/test-chrome.mjs` now reads through `settled`: it re-reads the control a frame apart until the select shows, or radios show with none clipped, for at most 2 s, then reports what it read. The 5- and 6-mode checks used to wait a fixed two frames; they use `settled` too, because the measurement below showed two frames is not enough under a slow frame. While this was in review, #3037 added a fixed two-frame wait before the 4-mode read on main, and #3028 then added a bounded wait for the same condition after it. The merge replaces both with `settled`: the two-frame wait for the reason above, and #3028's wait because it duplicates `settled`'s check.

### How it was proved

Section 17 was run on its own (the suite's head plus that section) against a build with `fit` delayed 300 ms after its frame, which stands in for a slow CI frame:

- Without the wait, the 4-mode check failed with the reading from the issue (`{"radios":4,"clipped":["hc-dark"],…,"select":false}`). The 5- and 6-mode checks failed the same way even with their two-frame wait.
- With `settled` on all three reads, all 162 assertions passed.
- With `fit` never running on resize, a real clip, all three checks still failed by name after the 2 s bound. The wait does not hide a control that never settles.
