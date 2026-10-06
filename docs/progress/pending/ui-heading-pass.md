## (2026-10-06) — Studio: one heading rule across every page (heading pass 1 of 2, TY2 A)

**Status:** `apps/studio/src/chrome.css` (heading rules only), `apps/studio/src/ui/lever-kit.ts` (`stateLine`), and
`test:chrome` section 29. No ENGINE bump (no emitted artifact moves). CONTRACT unchanged. No new copy. Visible on every
levers page, both hosts, both themes.

### What changed

The owner approved TY2 A and HP1–HP7 on 2026-10-06. This PR lands the rule. PR 2 lands the structure: BG1 / #2181,
the TY1 split / #2190, TS1 A, token names on the label line, HP2, HP5 and HP6. #2192 (the chips) comes after that.

- **Three levels, existing tokens only (HP7: no new weight).**
  - **L1 section title** keeps `fs-16` / `fw-strong` / `lh-compact` / `ls-snug`. Its description sits `space-050` under it,
    and its content starts `space-300` after the head.
  - **L2 group heading** (lever names, `.p3-rows-sub`, `.p3-icol-title`, Layout › Grid's breakpoint names) is now
    `fs-14` / `fw-strong` / `lh-compact`. Lever names were `fw-emphasis`. Its content starts `space-150` after it, fixed.
    Before, it ranged from 3.3 to 25.3 px. When a lever's own one-line description comes next, the gap is `space-050`.
  - **L3 field label** (`.p3-field-label`, `.p3-fill-label`) is `fs-14` / `fw-emphasis` / `lh-compact` in primary ink.
    Its control starts `space-050` after it. HP4: the 12px secondary labels (Inverse fill palette, the gradient fields,
    Interactive's link states, Depth's tint, Type's viewport fields and Set every text type to) move up to L3.
  - **Not a level:** the table headers in Type's four tables keep `fs-12` in secondary ink.
- **The ⓘ button** keeps its `hit-min` target. It overhangs the heading's line (`margin-block: (1lh − hit-min) / 2`), so
  the head row is as tall as its line. It sits `space-050` after the text, centered on the line.
- **HP3:** a hint line (`stateLine(text, 'hint')`) no longer draws the ⓘ glyph, so the ⓘ appears only on a button. All 14
  hint sites go through that one helper. Warnings keep their glyph.
- **Mechanics found while measuring:**
  - A group lever's head is a `<legend>`, which the fieldset's gap does not reach, so the legend carries the full
    `space-150`.
  - A readout in a head row, or in Depth's slider head, takes `lh-compact`. At `lh-normal` it made the row 3.5px taller.
  - An Interactive group's first row and a row list's first row are pulled up from `space-300` to `space-150`.
  - Gradients' Stops label pulls its first stop up to `space-050`.
  - Layout › Grid's `<b>` drew at the UA's 700. It now takes `fw-strong`.
- **Held decision 7, applied:** Neutral emphasis, the lever inside Interactive's Neutral group, takes L3's weight.

### The gate (test:chrome section 29)

Section 29 runs on both hosts, both themes, at 1280, on every page, with every Show advanced open. It finds headings
by class. It checks each level's computed size, weight, line height and the space after it. It also checks L1's
tracking and L3's ink.

The expected values come from the committed emission, never from the CSS. Each token the rule names is mapped by a
literal to its emitted path (`core.font.weight-role.strong`, `space.150`, …) and resolved by the section's own alias
walk. It does not import `chrome/tokens.mjs`.

The audit's per-page heading list is typed in, and every entry must be found at its level. Floors on the counts (L1
35, L2 73, L3 20, table headers 21, ⓘ 55, token labels 288, hint lines 16, per host and theme) fail a sweep that finds
fewer. In Light and in High contrast light, the section also fails any hint line that draws a glyph, and any ⓘ glyph
drawn outside a button.

### Traps for whoever re-verifies this

- **The ⓘ target is 24px, not 44.** `hit-min` is `core.dimension.24`, the WCAG 2.5.8 floor. The plan's "44px" was a
  misstatement: the measured 3.3px gap under a 17.5px name in a 24px row only works out at 24. The gate holds the ⓘ to
  `hit-min` read from the emission. Whether it should grow to 44 is a design question for the owner, not this PR's.
- **Measure from the heading's row, not from its text.** The Interactive group title and the Grid breakpoint name sit
  on a baseline with smaller secondary text, so the text box ends 1.3–1.5px above its row. Measured from the row's
  content box, the gap is exactly `space-150`.
- **Gradients' switch still sets its row's height.** HP5 moves it into the title row in PR 2, so the row-height check
  skips a head that holds a switch.
- **The audit ran on aurora; the gate runs on prism3**, the suite's brand. The lists match, except that prism3's Grid
  has no `xs` group.
- **#2171's Style guides page has its own heading classes.** It takes the rule after it lands, not here.
