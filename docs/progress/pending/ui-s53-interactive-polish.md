## (2026-10-02) — S5.3: the Interactive page polish (the owner's QA-I1 to QA-I10)

**STATUS: branch `ui/s53-interactive-polish`, pushed, no PR yet.** UI only: Color › Interactive, plus one reusable
helper in `ui/lever-kit.ts`. No engine change and no emitted artifact moves, so ENGINE stays at {{ENGINE_VERSION}} and
`CONTRACT_VERSION` is unchanged. QA-I11 and QA-I12 belong to other lanes and are not in this change.

### What changed

- **QA-I1, the badge overlap.** A treatment label's foot line (its token and ratio badge) did not wrap, so it ran
  out of its 120px column and under the first button. It wraps now, inside the column (`.p3-ipv .sg-foothint`,
  `.p3-ipv .sg-tlab { min-width: 0 }`). The buttons did not move.
- **QA-I2, the badge marks.** A pass mark draws in the chrome's success icon color, a miss mark in its danger icon
  color. The badge keeps its ink and edge. The marks sit on the brand's page, or on the inverse fill in an Inverse
  row, and either can be light or dark. So the preview stamps each mark with the chrome theme (`data-theme`) made
  for a ground of that lightness. Then `--p3-ok-icon` and `--p3-bad-icon` resolve to the light theme's values on a
  light ground and to the dark theme's values on a dark one. Measured at 3:1 or better on every ground, Light, Dark,
  HC light and HC dark.
- **QA-I3.** The line beside Hover and Pressed is dashed.
- **QA-I4, Add button set.** `addRowButton` in `ui/lever-kit.ts` draws the full-width dashed add button on the
  existing `.p3-addrow` rule, which is what Gradients' Add gradient already wears. Brand's Add custom mode and
  Gradients' Add gradient are not converted here. On Interactive, the add row is a dashed "Add button set". Clicking
  it shows the select "Color for the new button set" (now a visible label), the add, and Cancel. Cancel and Escape
  write nothing and put the dashed button back, focused. The add row sits 16px further from the last set than the
  sets sit from each other.
- **QA-I5.** The strict switch sits with the page-wide settings, after Outline hover and above the button sets.
  Its approved caption is unchanged.
- **QA-I6.** The neutral emphasis chips open the Neutral button set, under its heading. In `pages.ts`, the button
  sets row now carries the `neutralEmphasis` key, because that row draws it.
- **QA-I7.** The gap between button sets is `space.500` (40px), up from `space.300` (24px).
- **QA-I8, the Disabled switch.** "Full contrast" is a switch. On writes `'full'` and off writes `'reduced'`, the
  two values the segmented control wrote. The captions are the approved "Disabled controls keep full contrast." and
  "Disabled controls drop to the floor you pick." The four floor chips are drawn only while the switch is off.
- **QA-I9.** The three link state selects each take a line at the panel's full width, so "Auto: tuned walk" is
  not cut.
- **QA-I10.** The icon contrast control is gone from Interactive, and so is the preview's Icons section. The lever
  sections and the preview's sections still match one for one (Q23): Interactive, Disabled, Links. `iconContrast`
  is homed on Surfaces & fills' Icon row in `pages.ts` (`test-pages.ts` needs one home per manifest key). Its Unpair
  and Pair buttons are now the control that writes it. Surfaces & fills' UI is untouched. `ICONS_DESC` stays
  exported, because the owner's answer gives it to Surfaces & fills' Icon section, which another change restyles.

### Proof

- **Equivalence.** A driver ran origin/main's build and this branch's build in lockstep on prism3, aurora and
  harbor, in Light and Dark. It drove every kept control: the action palette (every option), outline hover,
  neutral emphasis, the strict switch, the disabled switch against the segmented chips (including Full with a
  floor set), each floor chip, the link palette (every option and Auto), each link rung, every row's picker (a pick,
  then Auto), and add and remove a button set. It also compared the new Cancel against doing nothing. After each
  edit it compared the raw persisted brand: **938/938 byte-identical.** Only prism3 has a palette to add, so the
  add and remove steps ran on prism3 only.
- **Suites.** `test:chrome` section 19b holds each QA item against a literal, and section 19 and the Q52 re-pair
  case follow the removals. The Q52 case now drives Surfaces & fills' Pair button. `test:smoke` drops Icons from the
  preview roots and the two chip groups that are no longer chips, and drives the floor chips through the switch.
- **Mutations**, each after a `wip:` commit, each failing by name in `test:chrome`:
  - **(a)** The switch writes `'reduced'` when it turns on. This fails `QA-I8: switching Full contrast on writes
    disabledStrategy "full", as the segmented control did (wrote "reduced")`.
  - **(b)** The chips are drawn under Full. This fails `QA-I8: under Full contrast the floor chips are not shown
    (4 shown)`.
  - **(c)** The add form starts open. This fails `QA-I4: before Add button set is clicked, the color select is not
    shown`.
  - **(d)** The Icons section is put back on Interactive. This fails `QA-I10: Interactive draws no icon contrast
    control and no Icons section (1 lever-icon-contrast, Icons title true)`, and also `test-pages`'s `no manifest
    lever has two homes`.
  - **(e)** The miss mark's CSS rule is dropped. This fails `QA-I2 (light): a failing mark is the danger icon token
    (#a82e2e or #e34b49) — interactive.primary.text.rest #19693f`.

  (c) ran alone, because it stops the S5.3 case before (a) and (e) are reached. (a) and (e) ran together, as did
  (b) and (d).

### DRAFT copy

None. Every visible string is approved or reused: "Add button set", "Color for the new button set", "Cancel" (the
inline confirm's word), "Full contrast" and its two captions, and the Full note "At 4.5:1 a disabled label reads like
body text. The disabled cue rests on fill, border and cursor." (#1974).

### Design calls, for the owner

1. QA-I1 was fixed by wrapping the label's foot line, not by right-aligning the buttons. This keeps the Style
   guide's layout, and it holds at every preview width.
2. QA-I10 removed the preview's Icons section along with the lever, because a read-only section with no lever
   section would break Q23.
3. `iconContrast` is homed on Surfaces & fills' Icon row in the page data.
4. The add row stays after the last button set, which is below Destructive only when there are no accents.
5. "Color for the new button set" shows as a visible label above the select, not only as its accessible name.
6. Under Full, the approved Full note stays under the switch. "Full fixes the disabled floor at 4.5:1, so this has
   no effect." is gone, because the chips it described are not drawn.
7. The add form closes when the previewed mode changes, the same way an open step picker closes.
8. The red and green marks apply on Interactive only (`.p3-ipv`). Surfaces & fills' badges are unchanged.

### Trap for whoever re-verifies this

At 800 and 640, the preview covers the sub-nav's last tab, so a pointer click cannot reach Interactive and the
suite reaches it by keyboard. The first draft of 19b used `goPlace` at 800 and timed out there.
