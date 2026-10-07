## (2026-10-07) — test:chrome: the contrast audit measures a check control's own box (#2238)

**The gap.** The probe's non-text arm read each control's own border against the ground outside it. A check control's
indicator, its `.p3-check-box`, is a span inside the control, so nothing read it. Found in the review of #2235: the
always-on Light row turned into an enabled checkbox (`role="checkbox"`, `aria-checked="true"`, `tabIndex = 0`) kept its
disabled box, and the box measured 1.80:1 while no contrast assertion fired.

**The fix** (`apps/studio/test-chrome.mjs`, the PROBE and `check`):
- **Every drawn `.p3-check-box` is measured** as a boundary against the ground around it. The reading is its weakest
  edge side, or its fill if the fill stands out more (SC 1.4.11 asks that the box be identifiable, by either). It joins
  the existing edge list, so a box under an enabled control is held to 3:1 and one under a switched-off control goes
  through the contrast exemption like every other measured node.
- **Its control is the nearest check host:** a CONTROL, or an element with a `checkbox`, `menuitemcheckbox` or `switch`
  role. That last part is the reviewer's case: a `div` with a checkbox role is not a CONTROL, so the control loop never
  saw it.
- **The always-on Light row is set aside by its literal class** (`.p3-check-fixed`, with no role and no tabindex of its
  own; a fixed fact, not a control, DB1 A). A box under neither a host nor that row fails by name.
- **Represented, not merely counted:**
  - every drawn `.p3-check` control, read by the control's own class rather than the box's, must have had its box
    measured;
  - and every host × chrome theme pair (web and figma, light and dark) must have measured at least one box over the run.

No visible change: every live check box already clears 3:1 (unchecked, the field edge; checked, the text fill).

**Mutations,** each on the committed head through the #2272 harness (anchor asserted, mutated text present, restored
in `finally`, `git diff` empty after), with both bundles rebuilt and `test:chrome` run:
- (a) the reviewer's: the Light row made an enabled checkbox (`role="checkbox"`, `aria-checked="true"`,
  `tabIndex = 0`) in `src/domains/brand.ts`. 35288/35345. The new arm fails by name on both hosts, both themes, every
  width, e.g. `✗ web light 1280 / brand: every control edge and indicator clears 3:1 — edge check box in div[mode-on-light] "LightAlways generated: it’s th" 1.8:1 < 3` (1.65:1 in dark). The focus-ring lines and #2235's DB1 A line fire too, as before.
- (b) the probe's box selector misspelled (`.p3-check-boxx`). 35314/35343, the full count run. 21 lines, e.g.
  `✗ web light 1280 / brand: every drawn check control had its box measured (4 check control(s)) — no box measured in button[mode-on-dark] …`, plus the four run-wide lines, e.g. `✗ #2238 web light: the contrast audit measured check boxes in the sweep (0)`.
