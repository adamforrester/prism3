## (2026-10-16) — Component tests: radio group, link, tabs, list item and the accordion indicator carry their siblings' test kinds (#2715)

**What moved.** Tests only; no def changes. #2715 (from the #2706 consistency audit) listed defs missing a kind of test that a direct sibling carries. This PR covers the five the issue's title names:
- **Radio group** gets checkbox group's block. It checks set size (three members, one per size), per-member nesting (one FieldLabel, secondary/bold/rest, then eight Radio.Rows following the size, row 1 always shown, rows 2–8 behind "Option N", 2 and 3 on), that rows are nest-fixed and never the control atom, and the group → row → control → ring chain.
- **Link** gets paint, nesting and measured contrast. The label ink on all 96 members comes from the link ramp, by state, and from the inverse ramp on an inverse surface. The link box paints nothing. A focus ring appears only on the 24 focus-visible members and follows the surface. All 8 link inks clear 4.5:1 on their own ground in all 16 brand × mode cells.
- **Tabs** gets its own paint arm. The baseline is the only node Tabs paints, as a `color/border/primary` fill. Measured: the selected bar beats the baseline's contrast against the page in all 16 cells.
- **List item** joins `test-roundtrip.ts`'s owner-decided text-style table. It is built by the real executor and its text (and an ordered item's number) is read off the host in the body style of its size.
- **Accordion indicator** gets a build test in `test-roundtrip.ts`: 12 members, each one icon instance (the Q183 glyph for its indicator and expansion) in a frame bound to the icon size of its rung.

**Independence.** Every expected value is a literal from the brief or the owner decision the def cites. The plan and the built shim are only ever the actual. The contrast arms read the committed Figma exports and name all 16 cells, so a missing export fails the arm instead of shrinking it. One literal I first guessed wrong was the radio group's member *order*. Order is not a design fact, so the arm compares the set of names, not their sequence.

**No defect found.** Every new arm passed on first run against main, apart from that order guess. Nothing is marked with an issue.

**Left for a follow-up.** The issue's other two rows are filed separately: measured contrast for dialog, divider, accordion, list item and field label, and prose checks for the icon buttons, field label and field message. So is its suggestion of a "tests a new def owes" checklist in the build-component skill.
