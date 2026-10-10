---
engine: minor
---
One axis value order in every component def (#2501, owner decisions Q213, Q220 A and Q221 B). Sizes run smallest
to largest, except text-field, textarea and select, which keep `medium, small, large` as a named exception so the
field a designer inserts stays Medium (Figma takes a set's default from its top-left member). States run Rest,
Hover, Pressed, then Focus, then Disabled: button, icon-button and their destructive and neutral siblings now project
`rest, hover, pressed, pending, focus-visible, disabled` (Focus visible was before Pressed), and their code `states`
put `inactive` after `disabled`. The fields' and switch-row's code `states` put `pending` after the press group.
No member is added, removed or renamed, and no token moves, so CONTRACT is unchanged; an existing file sees the
reordered members as moves on its next Update.
