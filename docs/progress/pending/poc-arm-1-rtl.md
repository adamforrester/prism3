## (2026-11-18) — The arm 1 Storybook's accessibility checks run right to left too (#3986 part 2)

**What changed.** On the code POC's integration branch `poc/arm-1`, every S5 check now opens each story twice: left
to right, and under `dir="rtl"`, in both delivery forms. Engine output doesn't move, so there is no change note.

- **A direction toolbar** in the Storybook. It puts `dir` on the story frame. Its wording is owner decision A (2026-11-18).
- **axe, the ARIA snapshot and the keyboard suite run right to left** against the same expectations. The
  right-to-left accessibility tree must equal the left-to-right one.
- **`check-rtl.ts` measures the layout.** The leading and trailing visuals, the required indicator and the status
  glyph swap sides. The Show/Hide button sits at the label row's left end. No slot, and no glyph that points
  nowhere, is flipped.
- **The expectations come from the defs' prose,** because #4030's `mirror` field isn't on `poc/arm-1`. The text
  field, field label and field message have no RTL prose (#4005), so their rows rest on #4005's audit.
- **Each check holds both directions as represented.** A story left out of the right-to-left run fails by id.
- **24 new mutants fail by name, plus 2 hand mutations.**
- **Filed, held as named exceptions:** #4052 (a directional arrow doesn't flip) and #4051 (the text field's input
  lacks `dir="auto"`).
- **Not built: the image snapshots** #3986 item 2 names. Layout is measured by boxes, not compared as images. Filed as
  #4079, with the owner's choice between building them and accepting box measurement.
