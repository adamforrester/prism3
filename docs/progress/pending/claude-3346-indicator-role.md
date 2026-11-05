## (2026-11-03) — The selection mark gets its own role: `interactive.<c>.indicator.*` (#3346 PR 1)

Engine {{ENGINE_VERSION}}, contract 14.14.0. PR 1 of #3346, built to the owner's decisions of 2026-11-03: Q1 (revised) A, Q2 A, Q3 A and E1–E7 A.

### What changed
- **A new shape role, `color.interactive.<c>.indicator.{rest,hover,pressed}`**, on the page and the inverse band, for every interactive family: 18 guaranteed paths, a `CONTRACT_VERSION` minor (14.13.0 → 14.14.0). It is the bold value, the label's ink as resolved, overrides included, and it is derived, not a setting. The later outline-edge setting (PR 2) moves `border.*` only.
- **Five marks rebind to it:** the tab's selected bar, the radio's checked ring, the tag's selected outline, the switch's off thumb and the slider's disc. Each had bound `interactive.*.border.*`, a role a brand may quiet for outline buttons. The owner doesn't allow a shape to bind a text role, even where the values match, so the marks get their own role rather than `interactive.*.text.*`.
- **The override twins (E3 A), `withIndicatorTwins` in `modes.ts`:** a label override carries to `.border.<state>` and to `.indicator.<state>`, unless that role carries its own override. A border override never reaches the indicator.
- **Tag style Underline:** the unselected line copies the selected line's keys, and the copy swaps the mark back to `interactive.primary.border.*`, so the unselected line stays an edge, the role Q589 named.
- **Studio's verdict count moves:** 884 → 956 pairs (221 → 239 per mode). The owner's rule, "every role with a floor", is unchanged, and the 18 new gated roles fall under it. The verdict, Health and the dark-off confirm literals were retyped in the Studio tests, and the plugin style guide's row counts too (Interactive table 55 → 64 rows).
- Q2 A and Q3 A are recorded in `tab.ts`: the hover preview stays on `border.secondary`, and pressed leaves the bar as is. The pressed item leaves `notes.contested`.

### Measured
- **No existing token value moves in any example brand.** Every emitted `.tokens.json` was compared by resolved `$value` against `origin/main`: 0 moved, and only `indicator` paths were added.
- On the reference brand's master input, light: the mark is #0b0e10 / #292d31 / #3f4449 (rest / hover / pressed), the label's. The outline edge keeps its hand-set rest #8f959a and now takes the label's hover and pressed.

### Gates
- New `#3346-E` arms in `test.ts`, each expectation a literal: the mark is the label in every brand × mode × band (the master forced to four modes included); the master's literal hexes; the bold edge is the label unless it's overridden itself; the five marks' 13 keys; **no shape binds a text role** across every projected box node of every def.
- The retyped arms: #2416 Q178 and Q226 (the tab bar), #2715 (tabs contrast), #1423 (radio), Q550 (the slider disc), the tag rest, selected-state and underline arms, and #2860 (the role order). The tag pill's pinned hash was re-pinned. The new plans, with the 12 refs swapped back, hash to the old literal.
- **#3336's regression fixture** (the reference brand on one neutral palette) holds E3 A's one value move as literals. The edge's hover and pressed go 700 / 800 → 800 / 700, the label's, where the derived ink had crossed them. Its contract count goes 214 → 232, and its decided table gains the six primary marks.
- `lint-paint` and `lint-component-surface` were re-accepted after reading each diff. Only the five defs moved, with the same counts.

### Trap for whoever re-verifies
- The "no shape binds a text role" arm has one known exception: the text cursor (`caret` / `caretEnd`) in the field defs paints `color.text.primary`. It's listed as a floor (a stale entry fails) and filed for the owner as #3397, not changed here.
- The slider's selected **bar** and the nav-item preview's indicator still bind `interactive.neutral.border.rest` / `interactive.primary.border.rest`. Under bold they read the same. Whether they're marks, and Tag Underline's unselected line, are held for the owner before PR 2 (#3398).
