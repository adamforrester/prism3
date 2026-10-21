---
engine: minor
---
Search field (#2888, owner decisions Q514, 2026-10-21). `search-field` (SearchField) is the shared field factory's third
output: TextField's anatomy and token block, size x status x state = 84 members (Q?6 A), a leading `search` glyph shown
by default, the clear button as TextField's trailing glyph starting at `close-filled` and built hidden (Q?3 A), a
Figma-only `label` switch standing for the code prop `hideLabel` (Q?4 A), no submit button (Q?5 A), and the site
header as a docs example (Q?8 A). Its own page under Components. The factory gains the three Search-only switches
(`leading`, `trailing`, `labelSwitch`); TextField and Password field are byte-identical. A new Form lever,
`searchFieldStyle` ("Search field style": Follow field style / Outline / Underline, default Follow, Q?1 A and Q?2 A),
right after Field style: `fieldStyleFor` resolves the style the search field is drawn in and `applyFieldStyle` draws it
unchanged, so a brand that leaves it unset builds every def as before. Control shape's Boxed and Hairline corners reach
the search field as they reach Text field. `search-field` leaves Text field's `composition.planned` for its
`alternativeTo`. No token is added or renamed, so CONTRACT is unchanged.
