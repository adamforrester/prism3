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
- **§29d's `FIT_SEEN`.** It reads a cut as the name's box narrower than its text by more than 1/16px, the text
  measured by a canvas in the name's own computed font. That is a second derivation from the frame's (canvas shaping,
  against the frame's Range over the laid-out text). Measured, canvas and layout agree to 0.013px at 14px and at 12px,
  well inside 1/16px, which is well inside the 0.27px cut at 590. With it, 590 reads as `trim`, cut, with the tooltip,
  and passes on every machine.
- **Tried first and dropped: the name's box at 1280 as the whole width.** It failed every narrow width on both hosts
  (`down 560 (narrow): title null, name cut` …, 76 per theme). The narrow tier sets the name in 12px, not 14px, so its
  whole box is 171.66px and read as cut. The canvas reads the size the tier sets.
- **§34, new, at the end of `test-chrome.mjs`.** It builds the frame's `trim`-with-room case on every machine:
  1. at a width 2px wider than the plugin's first row needs (FIT_ORACLE's reading), Export is made 4px wider;
  2. the frame re-measures on a font-load event;
  3. the extra width is taken off with an inline style, which the frame does not watch, and the window is resized.

  The frame's sum is then 4px too wide, so it stays on `trim`, and the name fits. The bar must draw two rows, the name
  whole, and no tooltip. Two controls hold the fixture: before the inflation the bar draws `rows`, and with it the name
  is really cut and the tooltip is the name.

**Mutations,** each on the committed head, through a harness that asserts the anchor, confirms the mutated text is
present and restores in `finally` (`git diff` empty after), each with both bundles rebuilt and `test:chrome` run:
- M1, the frame's tooltip from the step alone: `test:chrome` 34707/34709. Only §34 fails, both themes, e.g. `✗ 33 figma light 592: measured 4px too wide, the bar keeps two rows with the name whole and no tooltip, because nothing is cut (#2272) (drew rows, cut false, rows […], title "northwind-outdoor-supply-co")`. §29d stays green under it, so §34 is the only check that holds the frame's half, in every environment.
- M2, `FIT_SEEN`'s whole-pixel cut back (`scrollWidth > clientWidth + 0.5`): 34701/34705, and #2272's failure is back at 590 in both themes, in both of §29d's checks: `✗ 29d figma light northwind-outdoor-supply-co: across 91 widths the bar draws the measured step, in no more rows than it allows (590: the switcher carries a tooltip ("northwind-outdoor-supply-co") with its name whole (rows))` and #2262's `✗ 29d figma light northwind-outdoor-supply-co: the switcher has a tooltip only while its name is cut, down to 380 and back up to 1280, the narrow tier included (down 590: title "northwind-outdoor-supply-co", name whole | up 590: …)`. The four fewer assertions are §29d's per-state `trim` checks, which run only where a state reads as cut, so this isn't a truncated run. (The first M2 attempt on this head exited 1 without its output kept; it was re-run with the full log saved, and this is that run.)

**#2262's sweep, merged meanwhile, reads the same cut.** Its down-and-up tooltip check (`tipCheck`) takes
`FIT_SEEN`'s `cut`, so it now passes `whole` too. Its fragment's trap ("locally this assertion is also red at 590 …
the name still fits") was this misreading: at 590 the name is cut and the tooltip is right, so that check is green
locally now.

**Trap for whoever re-verifies:** a sub-pixel question cannot be answered with `scrollWidth`, `clientWidth` or
`offsetWidth`; they round. Use `getBoundingClientRect()` or a Range.
