---
engine: minor
---
Plugin: usage panels, phase 1 of #2927 (owner decision Q551 A). One panel per taxonomy page, beside the set of the
page's lead (`lead` in `file-taxonomy.ts`: Button, and the Row for Checkbox, Radio and Switch), listing the family's
sets and merging their Do and Don't items; only the lead's set makes room for it, and the members' own panels are
replaced, or kept aside when edited. Anatomy markers sit on their parts (#2916): every listed number on a specimen,
found by the def's part path (slot-hosted and instance-nested parts included), a hidden part shown through its boolean,
one more specimen per member for parts only another member holds, numbered across them; a 1px leader to the part, from
the host's laid-out boxes; a bracket for the root and any part holding another marked part; repeated parts merged into
one entry. The panel's print no longer reads a specimen's content, sizes or main components, so a rebuilt set does not
leave two panels stacked (the Progress double panel). The Figma conventions file names each page's panel lead.
