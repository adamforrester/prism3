## (2026-10-09) — Choice rows: a refused chip's reason reaches the keyboard, state lines are announced, arrows pass over a disabled chip, focus after Release (#2233)

The four defects the review of #2225 found in the studio's choice rows (`choice()`, `chipChoice()` and `stateLine` in `apps/studio/src/ui/lever-kit.ts`), fixed with no new or reworded words and nothing visible changed.

- **A refused chip's reason describes the group.** A disabled button takes no focus, so `title` was the only place its reason was said. `refuseOption(group, value, why, reasonId?)` disables the chip, keeps `title`, and, when the reason is also drawn as a line, adds that line's id to the group's `aria-describedby`. Type scale is the one choice row whose refusals have a drawn line: the clash line (`p3-tscale-clash`) and each other reason's line (`p3-tscale-why-<n>`).
- **One polite region per choice row, updated in place.** Every lever block that holds a `choice` or `chipChoice` gets one `role="status"` `aria-live="polite"` `aria-atomic="false"` region (hook `choice-live`, `data-key` the lever's key). It says the block's visible `stateLine`s, one paragraph each, keeping a paragraph that already says a line, so only a line that appears is announced and one that goes is silently removed.
- **The arrows pass over a disabled option** in `choice()`, as a radio group does; with nothing else enabled, nothing moves. `chipChoice` keeps KB1 A (#2256): arrows do nothing there.
- **Focus after Release pinned sizes** lands on Type scale's checked chip, the group's one Tab stop. The button is gone once it has worked, so focus used to fall to the page.

### The diagnosis that decided where the regions live

Every page redraws its levers whole (`root.replaceChildren`, `type.ts`'s `render`). A region inside the block would be a new node on every edit, or the same node detached and put back, and a screen reader cannot be relied on to hear a change to either. So the regions sit in one visually hidden holder on `<body>`, as the style guides' run line does (#2171), and the redraw never touches them. `leverBlock` notes each block it makes. A microtask after the redraw (the redraw is synchronous, so by then the page has drawn, filtered and restored focus) syncs each region with its block's lines. A row that leaves the page takes its region out of the document. A region put back already holding its words is not read, so returning to a page says nothing until something on it changes.

### Focus after Release: the checked chip, not "the chip just enabled"

Release can enable more than one chip, and in a radio group focus belongs on the checked option. Landing on an unchecked chip would leave focus on an option that is not selected. The checked chip keeps focus inside Type scale, and the arrows then reach the chips the release enabled.

### Tests (`test:chrome` §42, both hosts, light, 1280)

Aurora (Compact refused for the title floor) and prism3 with display md pinned at 56px (Expressive refused for the clash). The accessibility tree via CDP reads the radiogroup's `description` and the region's `live`/`role`. A MutationObserver installed before the pin sees the region take the pinned count and the clash as added text and keep its node, then lose both on Release with nothing added. Real `ArrowRight`/`ArrowLeft` presses pass over Compact in both directions. After clicking Release, `document.activeElement` is the Default chip.

**Mutations** (a `wip:` commit before each, both bundles rebuilt, §42 run alone; web shown, figma fails the same lines):
- (a) `aria-describedby` dropped → `§42 web light 1280 Aurora: (1) the refused Compact chip's reason describes the Type scale group, … (read {"role":"radiogroup","description":"",…}, lines [])` and the pinned clash's (4).
- (b) a new region on every redraw → `§42 web light 1280 prism3 pinned clash: (2) the row's live region is the node it was before the edit, updated in place, never replaced (same node false, connected false, 1 for the row)` and the two other region arms (6).
- (c) arrows to the next chip, disabled or not → `§42 web light 1280 Aurora: (3) ArrowRight from Expressive passes over the disabled Compact to Default, …` and ArrowLeft (4).
- (d) no focus after Release → `§42 web light 1280 prism3: (4) after Release pinned sizes, focus is on Type scale's checked chip, Default (read {"focus":"BODY",…})` (2).

### Not done, on purpose

- **Rows with no drawn reason keep `title` alone:** the 16px and 18px title floor chips (`S63.titleFloorCompact`, `S63.titleFloorPinned`) and Italic styles' "Italic only" (`S63.italicPinned`). They have no visible line to point at, and drawing one would be new visible copy, which is the owner's call. Filed as #2451.
- **The visible state lines stay where they are.** The region repeats their words, so a browse-mode reader meets each line twice, once beside the chips and once at the end of the page. This is the same cost #2171's run line carries.
