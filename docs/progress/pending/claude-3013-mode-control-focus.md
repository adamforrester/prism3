## (2026-11-02) — The preview's mode control keeps focus when it switches between its radios and its select (#3013)

**Status:** studio fix (`apps/studio/src/shell/preview.ts`), shared by both hosts, and a new `test:chrome` section,
`3013` (shard 3). ENGINE patch (change note): no committed artifact, emission or component surface moves.

### The defect

The preview header's mode control shows its radios when they fit and a select otherwise (#2383). `fit()` hides the
one that gives way with `display: none`, and Chromium drops focus from a hidden control to the body. A keyboard user on
a mode radio who narrowed the plugin window lost their place (WCAG 2.4.3), and so did someone on the select when the
window widened. #3005 fixed the test probe that tripped on the same race. This is the product side.

### The fix

`fit()` notes whether focus was inside the control when it began. If it was, and the control now shown does not hold
it, focus moves to the shown control: the checked radio (the roving `tabIndex` 0), or the select. Focus that was
elsewhere is never pulled in. The issue left where focus goes to the owner. The batch of 2026-11-02 decided it: focus
stays on the control, as the issue proposed.

### The arm

Section `3013`, both hosts, Depth & motion, light chrome. The checked radio is focused at 1600 px, then the window
narrows 100 px at a time until the select shows (1300 px on both hosts). Focus must be on the select. Widened back to
1600, it must be on the checked radio. The control: Inspect focused through the same switch both ways stays focused.
The widths are found by narrowing, never read from the code.

Mutations, each failing by name:
- The focus move dropped → `3013 <host>: narrowing to 1300 px … focus moves from the checked radio to the select …
  ({"active":"BODY"})` and the widening arm, on both hosts. That is #3013's own reproduction.
- The `had` test dropped → `3013 <host>: … focus on Inspect stays there …`, since focus was pulled into the select.
