## (2026-10-06) — Studio: heading pass 2, the structure (#2220)

**Status:** `apps/studio/src/ui/lever-kit.ts` (`promoteLever`, `tokenLabel`'s `onLine`), the Surfaces & fills, Type, Shape and
Layout levers, `shell/pages.ts` (Type's sections), `preview/follow-edit.ts` (two pairings), `chrome.css`, and `test:chrome`
sections 18, 20 and 30. No ENGINE bump (no emitted artifact moves). CONTRACT unchanged. No new copy: "Default" and
"Inverse" are BG1 A's approved words, and every other string is an existing one, moved. Closes #2220, #2181, #2190, #2216,
#2217 and #2218.

### What changed

Heading pass 1 (#2210) landed the rule. This lands the structure the owner approved with it on 2026-10-06.

- **BG1 A (#2181): a lever named as its section says its name once.** `promoteLever` (in `lever-kit.ts`) hides the
  lever's head row and moves its ⓘ into the section's title row, `space-050` after the title. Its tip opens under the
  section's head, and its one-line lead (the editing-mode line) becomes the head's last description line. The lever's
  fieldset, or the control its `<label>` named, now takes its accessible name from the section title. Five sections
  repeated their name: Background fills and Gradients (Surfaces & fills), Density and Base radius (Shape), and
  Breakpoints (Layout). Each page calls the helper where the lever's label equals the section title, so no list is kept
  by hand. Background fills' subgroups now read **Default** and **Inverse**.
- **HP5 (#2218):** Gradients' On switch moves to the far end of the section's title row. Like the ⓘ, it overhangs the
  title's line (equal negative margins of `hit-min`), so the row is only as tall as the title. This is the same mechanism
  pass 1 uses for the lever-head ⓘ. The board's mock used `(1lh − hit-min) / 2`, which made the row about 13px taller;
  #2218's text ("the row is only as tall as the title") decides it.
- **TY1 A and HP2 (#2190):** Type's Font families section is now two sections, **Typeface library** and **Font family for
  each text type**. Each is titled by its lever's existing name and says that name once. The families section holds the
  seven rows, the missing-fonts warning, and Set every text type to with Apply to all. The old levers title "Font
  families" and its description are gone. The preview's Font families section keeps both, and `PREVIEW_HEADING` pairs
  the two new lever sections with it, so an edit in either one still reveals it. Type's section ids move up by one
  (`p3-lsec-type-0` is now the library).
- **TS1 A (#2216):** inside Type scale, the order is the control, then the pinned count as a plain line `space-050` under
  it, then the clash warning grouped with Release pinned sizes, then the missing-styles warning. That warning used to be
  a sibling after the lever and is now a group of its own inside it. There is `space-100` inside a group and `space-150`
  between groups. The count left the lever's state line.
- **#2217 with HP6:** the seven Font family rows and the seven Italic styles rows put the token flush right on the
  label's line (`flex-wrap`, `column-gap: space-200`, the token at `margin-inline-start: auto`). It wraps under the label
  when the two don't fit, and always at the narrow tier. The DOM order stays label, then token. Rows with a control on
  the right are unchanged. HP6: the Typeface library rows keep the token under the family name, because their right
  edge holds a status.

### The gate (test:chrome section 30, extended)

- **EXPECT_HEADINGS:** Type's L1 list now starts with the two TY1 titles (the #2190 comment). The promoted lever names
  leave the L2 lists, and the fills' subgroups read Default and Inverse. The literal floors move to match.
- **New checks.** Each runs on both hosts and both themes, at 1280 and 380:
  - No section draws its own title twice.
  - Each promoted ⓘ is in its section's title row. It opens the same help text it opened before, typed from the pre-pass
    source or read from the lever manifest, and the tip opens under the head.
  - Background fills' subgroups read exactly Default and Inverse.
  - Gradients' switch is at the far end of the title row, on the title's line.
  - The title row is as tall as the title. Pass 1's skip for a lever head holding a switch is removed.
  - Type has the two sections by lever hook. No levers section draws the old title or description.
  - Each token line is checked: the family and italic rows share the label's line, flush right, at 1280 and wrap under
    it at 380. Every other token sits under its label, and the label always comes first in the DOM.
- **TS1 A case.** It runs on prism3 with title xs pinned at 18px (a real pinned-size clash at the compact scale) and strong
  declined in display and title. It checks the order inside the control column, that each group holds its own action, and
  the measured gaps against `space-050`, `space-100` and `space-150` from the emission.
- **Sections 18 and 20** follow the new structure: the subgroup names, the Background fills tip read from the title row,
  the Gradients switch in the title row, and Type's two section titles and their pairing with the preview.

### Traps for whoever re-verifies

- `promoteLever` matches on the lever's label exactly. If a section is renamed away from its lever (or the reverse), it
  stops promoting, and section 30's "draws its own title again" check fails. That is the gate working, not a flake.
- The TS1 state needs a real clash. Title xs at 18px clashes only at compact. If the engine's size ladder or the compact
  scale moves, pick another pin with the probe `brandTheme` gives: try each scale and keep a pin that only one refuses.
