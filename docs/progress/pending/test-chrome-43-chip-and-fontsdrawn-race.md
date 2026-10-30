## (2026-10-29) — Chrome suite: §43 asserts which chip a refusal disables, and the font read survives a re-render (#3121, #3069)

Test-only, in `apps/studio/test-chrome.mjs`. The engine, the studio and the plugin are unchanged.

- **#3121, §43.** `chipOff` was a bounded wait that swallowed its timeout, so nothing held which chip a refusal disabled.
  It now waits, then reads every chip (button) in the group and asserts the disabled ones by hand: the refused chip
  alone while the refusal shows, none once it is lifted. That is eight assertions per host and width, 32 in all. The
  issue's mutation (the caption floor's refusal on `v: '11'`) survived the old section and now fails by name on both
  hosts at both widths. So does the Compact refusal moved to the 18px chip.
- **#3069, `fontsDrawn`.** The `Could not find node` guard that already covered the font read now covers all three CDP
  reads of a probed node (fonts, attributes, markup) through one helper. A node re-rendered between any two of them
  makes the function return `null`, and `measure` reads the whole state again, as it already did for the first read.
  Any other error still throws. A node read whole is measured exactly as before.

### How it was shown

- An injected re-render (the probed node replaced by an identical clone between its attribute and markup reads, the
  issue's site) throws the issue's `DOM.getOuterHTML: Could not find node` on `main`'s function. With the fix, section 1
  passes whole (1972/1972).
- An injected re-render combined with the faces registered under the wrong name (`chrome/tokens.mjs`) still fails
  "every chrome text element draws in the embedded Inter" by name, on the raced case too. So the retry hides no failure.
- Trap for re-verification: removing the node, rather than replacing it, leaves a real hole in the page, and the rail
  checks fail for that reason, not for the race. Replace it with a clone so the page drawn is the same.
