## (2026-10-19) — Canvas placement, consolidated on main: 160px of white space between sets, labels in full, labels on the header's edge (Q432 A)

**Why one PR.** Four stacked PRs (#2737 the 160px visible gap, Q335 A and Q358 A; #2717 column labels in full,
#2705; #2770 sets go back to 160 when labels narrow, #2734; #2760 labels on the header's left edge, #2735) stalled
when #2805 (Q379) rewrote the same placement and Update code. The owner chose (Q432 A) to measure each problem on
current main first and rebuild only what remains, as one PR. This PR supersedes the four.

**The triage, on main `9be4d89e`, in the plugin's file shim** (fake `_Label`, 7px per character; posted on #2737).
All four still reproduced, because #2805 touched none of the gap, the column labels or the header anchor:

| Problem | Main | This PR |
|---|---|---|
| Visible gap between sets, fresh build | Buttons 83, 83, 400 · Icon button 76, 76 · Flush Icon Button 255, 255 · Accordion 141 · Tabs and List 320 · others 400 | 160 on every pair of all ten shared pages |
| radio-control column labels, drawn/needed width | Hover 32/35, Pressed 32/49, Focus visible 32/91, Disabled 32/56 (4 of 5 clip) | 35/35, 49/49, 91/91, 56/56 (none clip), set 304 → 599 |
| Label 50px narrower in an Update (Radio) | the gap stays 50 wider, 0 moves listed | back to [160,160] in the same Update, next dry run clean |
| Set rebuilt under a header | labels hang 317px (Buttons) and 324px (Icon button) past the header | 0 on both, frame back at the first build's `x` |

**How it was built.** The four PRs' final heads were composed (#2737 `86ca2158`, #2770 `461b9310`, #2760
`6757b5cf`), then merged with main. Where both sides changed the same code:

- **`respaceSets`** takes both rule sets: the visible box, `OLD_SET_GAP` and the snug sets from the stack, and #2805's
  header-row lift. A lifted set now lands with its **furniture edge** on the header's left edge, as `placeNewSet` does
  for a rebuilt set (#2735), so an Update and a fresh build still lay the page out the same relative to the header.
  `header row/furniture edge` pins it.
- **The Update's furniture.** #2805 drew it in `main.ts` after the apply (`furnishUpdate`). #2737 moved the redraw into
  `applyUpdate` as a hook (`opts.furnish`), so `settle` can re-space from the labels as drawn. The hook wins, because
  the settle pass needs it. `main.ts`'s hook calls `furnishUpdate` for one def at a time, so #2805's drawing function,
  its per-set catch and its outcomes are unchanged, and a furniture-only set (#2803) is redrawn and settled like any
  other.
- **#2805's dry-run furniture check** (`furnitureDue`) matched a column label by its left edge and width. Since #2705 a
  label is as wide as its text when that is wider than its column, centered on the column, so every widened set read as
  furniture to redraw. It now matches by center, bottom and a width at least the column's. `columns/converges` and
  `columns/shared page` fail by name without it.

**Traps for whoever re-verifies.**
- The stack's Radio fixtures built sets with **no** labels and called that "built before the fix". Under #2805 a set
  with no labels has furniture due, so the dry run lists it and the main path saves the version, and the settle-pass
  version arm stops testing what it says. The fixtures now draw the labels as a pre-#2705 plugin did, each fixed to its
  column (`fakeTemplates({ topChar: 0 })`). They also give the dry run the templates the draw used (`fileRoot`), since
  #2805's check reads them off the file.
- `#2770`'s `columns/labels shrink` arm was written before #2737 moved the Radio setup into `radioPage()`, so the
  textual merge left it reading a `page` and `IDS` that no longer existed in scope. It now takes both from the helper.
- `EXECUTOR_REVISION` is 34. Main is at 33, and each stacked PR's number is void.
