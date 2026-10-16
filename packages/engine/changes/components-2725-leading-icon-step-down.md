---
engine: minor
---
Segmented control, Tab and Tag step their glyph down one rung, as Button does (#2725, owner decision Q337 A,
2026-10-15): small `icon.size.xs` (16px), medium `icon.size.sm` (20px), large `icon.size.md` (24px), where they bound
the 1:1 rung (20 / 24 / 32px). On Tag the one rung sizes the leading icon, the check and the ×, so the three stay one
size (owner Q356 A). Icon button and Flush icon button keep their own rung. `lint-rung-names.ts` records the three defs in
`ICON_OFFSET_DEFS`. No token is added or renamed, so CONTRACT is unchanged; Update rebinds the glyph in an existing
file in place.
