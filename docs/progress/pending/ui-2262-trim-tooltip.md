## (2026-10-07) — Top bar: the brand switcher's trim tooltip clears at the narrow tier (#2262, the technical half)

**Status:** UI only (`apps/studio/src/shell/frame.ts`, plus `test-chrome.mjs` §29d). No engine change, no emitted
artifact moves, no ENGINE bump, CONTRACT unchanged, no new strings, no visual change. #2262 stays open for its other
half, the long name's arbitrary wrap at the narrow tier, which is the owner's design decision.

### The defect

`fitBar` returns early at the narrow tier (560px and below), before the line that sets or clears the brand switcher's
`title`. So a tooltip set at the `trim` step (Q83 A, #2257), where the switcher cuts its name with an ellipsis,
lingered after the bar shrank into narrow. Whether the switcher had a tooltip at a narrow width depended on the path
taken to get there. The tooltip's text was still the correct full name.

### The fix

The narrow branch clears the switcher's `title` before it returns. The rule is now one rule at every width: the tooltip
exists only while `trim` cuts the name. The switcher's accessible name is its text, the full brand name at every
width, and that does not change.

### The test

§29d's tooltip check now covers the narrow tier, both ways. On both hosts and both themes, the long name
(`northwind-outdoor-supply-co`) is swept from 1280 down to 380, as before, then back up to 1280. At every width the
switcher has a `title` exactly when its name is cut, and then the title is the full name.

- **The oracle is the render's own `cut`** (`FIT_SEEN`: the name's text wider than its box), never the frame's
  `data-bar-fit` (docs/34 shape 2).
- **It can fail (shape 4).** On the plugin, the down sweep must reach the narrow tier after a cut name, which is the
  path the defect needs. The web never cuts the name, so it can't show the defect, and isn't required to.

### Mutation

After a `wip:` commit, with the narrow-tier clear removed, rebuilt and run:

`✗ 29d figma light northwind-outdoor-supply-co: the switcher has a tooltip only while its name is cut, down to 380 and back up to 1280, the narrow tier included (down 590: title "northwind-outdoor-supply-co", name whole | down 560 (narrow): title "northwind-outdoor-supply-co", name whole | down 550 (narrow): …`

That's 38 narrow widths per theme, on both figma themes: 19 on the way down, from 560 to 380, and 19 on the way back
up, until `trim` clears it. The unmutated run lists none.

### A trap for whoever re-verifies this

**Locally this assertion is also red at 590, both ways, with or without the fix.** That is #2272: in this environment,
at 590, the frame chooses `trim` and sets the tooltip, but the name still fits, so nothing is cut. The tooltip follows
the step, not the cut (noted on #2272). CI's text metrics put 590 on the other side of the edge.

So locally, the evidence that the mutation bites is **which widths** the assertion lists, never whether it is red: the
failing-assertion count does not move (34623/34627 both times). Read the `(narrow)` entries.

### Not done, on purpose

The long name still wraps the bar arbitrarily at the narrow tier: on the plugin at 460px and below, and on the web at
about 430px and below. Whether the narrow tier takes Q83 A's ellipsis step too is a visible change and the owner's
decision, so #2262 stays open for it.
