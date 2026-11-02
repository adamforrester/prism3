## (2026-11-02) — At the narrow tier the Inspect menu stays inside the window (#3298)

**Status:** studio chrome fix (`apps/studio/src/chrome.css`), shared by both hosts, built as the owner decided
(Q3298.1 A), and a new `test:chrome` section, `3298` (shard 3). ENGINE patch (change note): no committed artifact,
emission or component surface moves.

### The defect

`.p3-menu` is `min-width: max-content` and hangs from the right edge of its button (`right: 0` in `.p3-popwrap`), so its
longest unwrapped line sets its width. In the Inspect menu that is the privacy note (#3138), 529px wide. At 380 the
menu's left edge sat at −161 on both hosts, and the page does not scroll sideways, so the clipped part could not be
reached.

### The fix

Three rules under `.p3-frame[data-w="narrow"]`, nothing at the wide tiers. The preview header becomes the menu's
containing block (`position: relative` on it, `position: static` on Inspect's wrap). The menu keeps `top: auto`, its
static position at the top of Inspect's wrap, and drops by the narrow button's height plus the usual gap
(`--p3-ctl-h-xs` + `--p3-space-050`), so it hangs where it did. It sits `--p3-space-150` from the header's right edge,
which is the header's padding at this tier, so Inspect's right edge. It is capped at the header's width less
`--p3-space-150` a side, with `min-width: 0`, so the note and the stamp wrap. All lengths are chrome tokens: the RAW
scan in `chrome/tokens.mjs` refuses `100vw`, which is why the cap is the header's width and not the window's.

Measured at 380, both hosts: the menu is 296px wide, from 72 to 368, its top unchanged (4px under Inspect). At 1280 the
menu, Inspect, the note and the stamp have the same rects as on `main`, and the screenshots are byte-identical on both
hosts.

### The arm

Section `3298`, both hosts, Brand, light chrome, at 380 (the Preview pane) and 1280, Inspect open. EXPECTED is the
window (`innerWidth`) and Inspect's own rect; ACTUAL is `getBoundingClientRect()` of the open menu, the privacy note and
the build stamp. Three arms per case: the menu inside `[0, innerWidth]`; the note and the stamp inside the menu; the
menu's right edge on Inspect's and its top below Inspect.

Mutation, failing by name: the fix reverted → `3298 web 380: the open Inspect menu stays inside the window, [0, 380]
({"l":-160.8,…})` and `3298 figma 380: …` the same. 1280 passes either way.

At 380 a fourth arm holds the decision's cap from both sides: the menu inside the preview header less 12px a side (12
typed in the test). The window alone passed a menu reaching the header's left edge. Mutation, failing by name: a cap
on the right only (`max-width: calc(100% - var(--p3-space-150))`) → `3298 web 380: the menu is capped at the preview
header less 12px a side` (menu `l 60`, header `l 60`) and `3298 figma 380: …` the same.

### Composing with #3294 (owner decision Q3298/3294 compose, A, 2026-11-02)

#3294 (now on `main`) gave `.p3-menu-privacy` `width: 0; min-width: 100%` at every tier, and the Inspect menu a ~320px
width at the wide tier (O2 B, already `:not([data-w="narrow"])`). At 380 the first rule let the items set the menu's
width: 164px on the web, with the note 14 lines tall. The owner decided the minimum is the wide tier's alone and the
narrow cap decides at 380, so `width: 0; min-width: 100%` now sits under `.p3-frame:not([data-w="narrow"])`, the same
scope as O2 B's rule. At 380 the note sets the menu's width up to the cap: 296px (72 to 368) on both hosts, the note 7
lines. 1280 keeps both of #3294's rules unchanged.

Two arms hold it. Section `3298` gains a fifth arm at 380: the menu reaches the cap's left edge (the header's left plus
12). Section `47-menu` gains a 380 case on both hosts: the menu inside the viewport, and at the cap with the note at
most 8 lines (8 is a test bound, not a design number: 7 at the cap, 14 without the scope). Mutation, from a `wip:`
commit, the scope dropped (`width: 0; min-width: 100%` back at every tier) → 38/40:
`✗ 3298 web 380: the privacy note sets the menu's width up to the cap, the preview header less 12px a side (menu
{"l":203.7,"r":368,…,"w":164.3}, …)` and `✗ §47 web light 380 Inspect: the open menu reaches the narrow cap … at most 8
lines (… "lines":14 …)`. The figma host lays out the same either way, because its build stamp already sets the menu to
the cap.

### Trap for whoever re-verifies

The margin that drops the menu below Inspect is the narrow button's height token. If Inspect's narrow height ever stops
being `--p3-ctl-h-xs`, the menu overlaps it or floats off it; the arm's "hangs below it" check catches the overlap only.

### Not covered

The arm holds only the Inspect menu. The Theme menu was measured once by hand at 380 (Brand, Preview pane) and fits on
both hosts: 50.5 to 304.5 on the web, 50.5 to 206.5 in the plugin.
