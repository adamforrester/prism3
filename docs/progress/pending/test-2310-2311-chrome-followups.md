## (2026-10-07) — test:chrome: §35 re-holds an aria-held widget put back in the tab order, and §34's labels read "34" (#2310, #2311)

**#2310, the gap.** `holdSettings` (`apps/studio/src/shell/frame.ts`) puts a hold back on a node a page lifted in
place. A native control counts as still held only while it is `disabled`. Any other widget counts as still held only
while it is `aria-disabled="true"` and at `tabindex="-1"`. §35 held only the native half: Depth's tint hue re-enabled
in place. Dropping the `tabindex` half survived the suite (the #2284 review).

**The arm** (§35, the brand-change-while-held case, on both hosts):
1. A `div role="slider" tabindex="0"` is planted in the held levers region, right after a live ⓘ. No page draws such a
   widget there today, so the test supplies one. The hold catches it as it catches any node drawn: the control half
   asserts `aria-disabled="true"`, `tabindex="-1"` and its old tabindex recorded (`data-held="0"`).
2. Its `tabindex` is set back to 0 in place, with `aria-disabled` left alone.
3. It must be held again: `tabindex="-1"`, and a Tab from the ⓘ before it does not land on it.

**One part of #2310's done-when is not asserted, on purpose:** "`focus()` doesn't land on it". By the HTML spec a
`tabindex="-1"` element still takes a script's `focus()`, so a correctly held widget would fail it too. What keeps a
held widget out of reach is the tab order, so the arm checks the Tab.

**#2311.** #2284 renumbered #2298's section from §33 to §34, since #2275 had taken §33, but the section's failure labels
still began `33 …`. They all come from one `where` string, which now reads `34 figma ${theme}`. No `33 …` label is left
in `test-chrome.mjs`; #2275's own labels read `#2275 …`. (#2298's fragment quotes an old run's `✗ 33 figma light 592`
line verbatim, as the record of that run, and stays as it is.)

**Mutation** (#2310's reviewer's own), on the committed head through the #2272 harness (anchor asserted, mutated text
present, restored in `finally`, `git diff` empty after), both bundles rebuilt and `test:chrome` run: the still-held test
without its `tabindex` half (`n.getAttribute('aria-disabled') === 'true'` alone). 36216/36220, the full count run;
the arm fails by name on both hosts, the control half still passing:
- `✗ #1984 web light 1280 hc-light on depth, a brand change while held: an aria-held widget put back in the tab order in place, aria-disabled left alone, is held again: tabindex -1 (#2310) ({"aria":"true","tabindex":"0","mark":"0"})`
- `✗ #1984 web light 1280 hc-light on depth, a brand change while held: a Tab from the live ⓘ before it does not land on the re-held widget (#2310) (focus on DIV)`
- and the same two on figma.
