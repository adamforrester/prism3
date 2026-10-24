---
engine: minor
---
Badge gains a `size` axis, `small | medium`, and a third `emphasis` value, `surface` (#2983, owner direction
2026-10-24; built on the Q2983.4–6 recommendations, pending the owner's answers). Medium is today's status label and
leads the axis. Small sets `type.caption.md.strong` (11px, resolved per brand through `typeWeight`) at `space.025` ×
`space.100`, about 19px tall. Surface paints `background.primary` under the tone's text role (`text.primary` for
neutral) with no edge, for a label on a photo or any busy ground. The count and dot stay medium and bold only. The
Figma set grows from 20 to 40 members, and every existing member gains `size=medium`. The padding keys become
`{type}.{size}.pad-*` and the label type `{size}.type`. No token path is added, so CONTRACT is unchanged.
Tab Item's nested count badge now pins `size: 'medium'`, so its coordinate still names one badge member.
