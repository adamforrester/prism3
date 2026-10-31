---
engine: minor
---
Checkbox.Row, Radio.Row and Switch.Row set the gap between the control and the label to 8 / 12 / 12px (small / medium
/ large; Switch.Row has no large) at comfortable density (#3173, owner decision Q3173 A). Medium moves from `space.100`
to `space.150`; small and large are unchanged. Density still moves the gap one step, so compact is 6 / 8 / 8 and
spacious 12 / 16 / 16. Checkbox.Group and Radio.Group follow, because they nest the rows. The description sits in the
label's text column, so its start edge moves with the gap. An Update corrects an existing file in place: the medium
members of each row are rewritten, every key and id kept. No token name moves, so CONTRACT is unchanged.
