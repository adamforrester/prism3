## (2026-10-06) — a click on blank space inside the start window keeps focus in it (#2232)

**STATUS: branch `ui/2232-start-focus-trap`.** UI only, with no visible change: no engine change, no emitted artifact moves. ENGINE bump class: **none owed**. `CONTRACT_VERSION` unchanged. **Fixes #2232.**

### What was wrong

The S12 start window traps Tab with a keydown listener on its scrim, through `trapTab`. A click on blank space inside the window (its lede, a card's text) moved focus to `<body>`, because the window wasn't focusable. `<body>` is outside the scrim, so the trap's listener no longer heard the keys. Measured on today's code, on both hosts: after such a click, `document.activeElement` is `body`.

**The issue said Shift+Tab then stays on `<body>`. That didn't reproduce in headless Chromium.** With everything behind the window inert, Tab and Shift+Tab from `<body>` both landed on a control in the window, so those two arms passed on today's code. The issue says it was found by reading the code. The failing condition, focus leaving the modal on a click, is the defect.

### The fix

`windowShell` (`apps/studio/src/shell/start.ts`) gives the window `tabindex="-1"`. This covers the start window and its guard, which both come from it. A click on blank space now focuses the window itself. `trapTab` already treats the window as its fallback focus: Tab goes to the first control, Shift+Tab to the last. `focusables()` skips `tabindex="-1"`, so the window is never a Tab stop. A mouse focus draws no ring (`:focus-visible` stays false). There is no visible change.

### Test

A new section at the end of `test-chrome.mjs` (kept clear of the open UI-lane PRs), on both hosts at 1280. It opens the start window from the brand menu, clicks its lede (`hooks.click`), and asserts three things. After the click, focus is in the window. Tab then moves focus to a control in it. After another click on blank space, Shift+Tab moves focus to a control in it.

### Mutation: the fix reverted (today's code)

Both hosts fail by name, `✗ #2232 web light 1280: after a click on blank space, focus stays in the start window (focus is on body)` and the same for figma (`33667/33669`). With the fix: `33669/33669`.
