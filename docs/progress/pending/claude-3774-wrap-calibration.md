## (2026-11-17) — The usage-panel test host wraps text as the template does: the owner's 120px Accordion fails by name (#3774)

**What was wrong.** `test-doc-panel.ts`'s wrap clause could not see the failure the owner reported on 2026-11-13. With the sizing put back to the owner's 120px Accordion specimen, the host gave the title "Section title" 92px of room and read it as one line. The template wrapped it onto two lines and broke "components" across lines. The cause was the host's member layout, not the arm. A projection's plan names its padding and spacing as variables (`bound`, such as `space/200`), and the host read only literal numbers. So Accordion's header had no padding and 4px spacing. Every text sat at 14px whatever its style, and a text the plan gives no resize mode was a fixed 48px box. The executor writes that text auto-width.

**The calibration.** All test-only:
- `BRAND_PX` and `TYPE_PX` hold the default brand's px for each `bound` variable the plans use, and the font size of each text style. They were read by hand from `out/prism3.tokens.json` and typed in, never computed through the engine.
- A text with no resize mode is `WIDTH_AND_HEIGHT`, matching `write-components.ts`.
- `wrapOf` wraps a fixed-width text word by word. A word wider than its line is broken letter by letter.

At 120px the header now leaves 52px for the title (16px of padding on each side, the 24px glyph, a 12px gap). So "Section title" takes 2 lines. The content placeholder at `body/md` (16px) has 88px, under the 96px "components" needs, so the word breaks. Both match the owner's file.

**The arms.**
- `owner/accordion` keeps the width: 320.
- The new `owner/accordion wrap` holds the wrap clause on its own. Every "Section title" fits on one line, the content text is drawn, and no word is broken.
- `owner/badge` was re-read against the calibrated host. Each Badge label is auto-width, as the executor writes it, so it stays on one line by construction. The clause holds.
- All 345 assertions pass on main.

**Mutations.**
- The 4–6 `FIXED` + `resize` + `minWidth` sizing restored (the owner's state): `owner/accordion wrap` fails by name, reading the anatomy title on 2 lines and "Section", "title" and "components" broken. `owner/accordion` fails at 120.
- The same state with `BRAND_PX` and `TYPE_PX` switched off: the anatomy title reads 1 line at 92px and no word breaks. That is the #3771 review's reading, so the calibration is what carries the arm.

**Its limit.**
- The host still sizes a glyph or any other childless layer at 24 × 24, and a text's height from its length, not its lines.
- `TYPE_PX` and `BRAND_PX` are the default brand's. A brand with other spacing would need its own table.
- This calibrates the model against the owner's one reported state. It is not a measurement of Figma's line breaker. Kerning and Figma's own break rules can still differ by a pixel at the edge.
