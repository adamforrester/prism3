---
engine: minor
---
Two opt-in typography levers (#3077, owner decisions 2026-10-27, caption A and tracking A). `typography.sizes` takes
`caption` at the brand level: md and lg, one static size each, on the size ladder, at or above 10px, through the strict
ramp check (caption.xs and caption.sm stay pinned by sizeFloor and captionFloor; sizeOverrides and each mode's
typeSizes stay heading-only, so caption keeps one size in every mode). `typography.tracking` pins every style in a text
type to one named letter spacing role, any of the nine including open, in place of the size-derived role and its
trackingShift nudge, for the pinned text types only. Unset, both change nothing, so every brand that sets neither is
byte-identical. The reference brand sets them: its redesign seed builds title.2xs 20px (18px on mobile), caption.md
10px, open (+1%) letter spacing for display, title, body, caption and label, and wide (+2%) for eyebrow; its legacy
fixture takes the caption and letter spacing parts. Values move, not names, so CONTRACT is unchanged.
