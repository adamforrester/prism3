---
engine: minor
---
Segmented control (#2724, owner decisions Q336 A and Q342 A, 2026-10-15): the selected look is now a flat pill on a
neutral track, superseding the tint and 2px outline of Q269.3 and the 1px track outline Q278 kept. The control's track
fills with `color.background.secondary` and has no outline. A selected option's indicator fills with
`color.background.primary`, with no border and no shadow, and holds at hover, pressed and disabled; its label keeps
the emphasis weight and the bold reserve, which are the state cue. Unselected options keep the neutral wash at hover
and pressed. No brand color in the control. Both roles already existed, so CONTRACT is unchanged. The label clears
4.5:1 and the icon 3:1 on the pill and on the track at every wash, and the focus ring 3:1 against the track and the
page, in every committed brand and mode. An in-place Update removes the old indicator border and track outline.
