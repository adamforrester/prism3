## (2026-10-07) — Bar fit: the brand switcher's tooltip follows the name's own cut, and §29d reads a cut under one pixel (#2272)

**The finding: the frame was right at 590; the check misread it.** §29d failed locally at 590 (plugin, the long brand
name, both themes): "the switcher carries a tooltip with its name whole". #2272's cause comment read that as the frame
choosing `trim` while the name still fit. Measured, it does not fit. Its text is 200.27px wide and the first row has
534px of room for 534.27px of controls. Under `trim` the name's box is 200px, and the screenshot shows
`northwind-outdoor-supply-...` with the ellipsis drawn. So the tooltip was right. §29d's `FIT_SEEN` read "cut" as
`scrollWidth > clientWidth`, both whole pixels (200 and 200), so a 0.27px cut with a visible ellipsis read as whole.
CI's text metrics put 590 on the `rows` side, which is why CI never saw it.

**The approach tried and dropped.** The first fix stepped `trim` back to `rows` whenever the name was not cut by
`scrollWidth`. At 590 that drew Export on a third row (§29d: `drew other in 3 row(s)`), because the row really is
0.27px too wide. `trim` stays the step the sum picks; the step logic is unchanged.

**What changed:**
- **The frame (`fitBar`).** The tooltip follows the cut, not the step. Under `trim` it is set only while the name's
  text, a Range read to the fraction of a pixel, is wider than its box by more than one layout unit. A `trim` that
  leaves the name whole carries no tooltip.
- **§29d's `FIT_SEEN`.** It reads a cut as the name's box narrower than the same name's box at 1280, where the full bar
  shows, by more than one layout unit. That is a second derivation from the frame's: a box at another width, against
  the text's own Range at this one. With it, 590 reads as `trim`, cut, with the tooltip, and passes on every machine.
- **§33, new, at the end of `test-chrome.mjs`.** It builds the frame's `trim`-with-room case on every machine:
  1. at a width 2px wider than the plugin's first row needs (FIT_ORACLE's reading), Export is made 4px wider;
  2. the frame re-measures on a font-load event;
  3. the extra width is taken off with an inline style, which the frame does not watch, and the window is resized.

  The frame's sum is then 4px too wide, so it stays on `trim`, and the name fits. The bar must draw two rows, the name
  whole, and no tooltip. Two controls hold the fixture: before the inflation the bar draws `rows`, and with it the name
  is really cut and the tooltip is the name.

**Mutations,** each on the committed head, through a harness that asserts the anchor, confirms the mutated text is
present and restores in `finally` (`git diff` empty after), each with both bundles rebuilt and `test:chrome` run:
- M1, the frame's tooltip from the step alone: `test:chrome` 34643/34645. Only §33 fails, both themes, e.g. `✗ 33 figma light 592: measured 4px too wide, the bar keeps two rows with the name whole and no tooltip, because nothing is cut (#2272) (drew rows, cut false, rows […], title "northwind-outdoor-supply-co")`. §29d stays green under it, so §33 is the only check that holds the frame's half, in every environment.
- M2, `FIT_SEEN`'s whole-pixel cut back: 34639/34641, §29d's original failure back, both themes: `✗ 29d figma light northwind-outdoor-supply-co: across 91 widths the bar draws the measured step, in no more rows than it allows (590: the switcher carries a tooltip ("northwind-outdoor-supply-co") with its name whole (rows))`. The four fewer assertions are §29d's per-state `trim` checks, which run only where a state reads as cut, not a truncated run.

**Trap for whoever re-verifies:** a sub-pixel question cannot be answered with `scrollWidth`, `clientWidth` or
`offsetWidth`; they round. Use `getBoundingClientRect()` or a Range.
