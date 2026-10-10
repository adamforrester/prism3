---
engine: minor
---
One axis value order in every component def (#2501, owner decision Q213). Sizes run smallest to largest, so
text-field, textarea and select now list `small, medium, large` (medium led since #2266); their Figma default variant
is the small field, and a field set built before #2266 lands on small when it gains the size axis. States run Rest,
Hover, Pressed, then Focus, then Disabled: button, icon-button and their destructive and neutral siblings now project
`rest, hover, pressed, pending, focus-visible, disabled` (Focus visible was before Pressed), and their code `states`
put `inactive` after `disabled`. The fields' and switch-row's code `states` put `pending` after the press group.
No member is added, removed or renamed, and no token moves, so CONTRACT is unchanged; an existing file sees the
reordered members as moves on its next Update.
