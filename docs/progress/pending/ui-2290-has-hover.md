## (2026-10-07) — Chrome: a `:hover` inside `:has()` carries the Q28 limit on the element it hovers (#2290)

**The gap.** The `[hover]` check (#2247) read a compound as hovering if `:hover` appeared anywhere in it, `:has()`
arguments included, and passed it if that compound carried the limit. So `.a:where(:not(:disabled, [aria-disabled="true"])):has(.b:hover)`
passed, though what is hovered is `.b`, the control that can be switched off. Found in the review of #2286.

**The fix** (`apps/studio/chrome/esbuild-plugin.mjs`):
- **`bareHovers`** reads each `:has()` argument, at any depth (inside `:is()` or `:not()` too), as a relative selector
  of its own, so its hovered compound must hold the limit itself. A `:hover` inside `:is()`, `:where()` or `:not()`
  stays the compound's own element, as before.
- **The subject's limit no longer counts** for a hover inside its `:has()`. Nothing in `chrome.css` hovers inside
  `:has()` today, so no rule changes and nothing on screen moves. The one `:has()` rule, the color field, has its limit
  in a `:has()` and hovers its own element; it stays in HOVER_EXEMPT, unchanged.
- **Four new HOVER_CANARIES, both forms literal:** a limited hover inside `:has()`, and one after a combinator, must
  pass; a limit on the `:has()` subject only, and a `:has()` inside `:is()` with an unlimited hover, must fail.

**Mutations,** each on the committed head through the #2247 harness (anchor asserted, mutated text present, restored
in `finally`, `git diff` empty after), against `npm run -w @prism3/studio build`:
- (a) a rule added with the limit only on the subject, `.p3-colorfield:where(…):has(.p3-color-input:hover)`:
  `✘ [ERROR] p3:chrome-css [hover] apps/studio/src/chrome.css:743: ".p3-colorfield:where(:not(:disabled, [aria-disabled="true"])):has(.p3-color-input:hover)" hovers without the Q28 limit … on the element it hovers (on ".p3-color-input:hover")`.
- (b) the control: the same rule with the limit on `.p3-color-input`. The build passes.
- (c) the check back to the whole-compound rule: four self-checks fail by name, including `self-check: the hover scan no longer flags a limit on the :has() subject only (want ".a:where(…):has(.b:hover)", got [])`, which is #2290's gap, and `self-check: the hover scan now refuses a limited hover inside :has()`.
