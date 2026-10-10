---
engine: minor
---
Two new components, Tab and Tabs (#2416, owner decisions Q177, Q178 and Q179). `tab` is one trigger:
`selection` [unselected, selected] × `size` [small, medium, large] × five states, 30 members, with node-visibility
booleans for a leading icon (and its swap) and a count, the count a nested Badge (count · bold · neutral). A selected
tab shows the primary text color and a 2px bar in `color.interactive.primary.border.*` at `border-width.thick`; the
label keeps one type binding in both states, so selecting a tab never moves its neighbors. There is no hover wash:
an unselected tab at hover and pressed shows a 2px bar in `color.border.secondary`, the neutral edge role contracted
at 3:1 against the page. `tabs` is the list: `size` (3 members), six nested Tab instances following its size, tab 1
selected, tabs 4 to 6 behind Figma-only toggles, over a 1px `color.border.primary` baseline. Both build on their own
`↳ Tabs` page under Components. Every binding is an existing role, so CONTRACT is unchanged.
