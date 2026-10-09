---
engine: minor
---
Text field, select and textarea project the focused field that holds a value, `state=focus-visible-filled` (#2318,
owner decision Q157, 2026-10-09). It is the focus-visible member's focus ring and focus border (each status keeps its
own border) around the filled member's value in `text.primary`, with no placeholder. Each set grows from 72 to 84
members (size 3 × status 4 × state 7), 12 new per field; the 72 existing members project exactly as before, so an in-place
update adds the 12 and renames, moves or replaces nothing. Text field and textarea draw the caret at the start of the
value on the new member, behind one switch (`FOCUSED_FILLED_CARET` in `field-focus.ts`) while the owner re-decides it
(Q157.3); select has no caret. An absolute part's `when` may now name a list of states, so the one focus ring shows at
both focus states; an overlay's `when` still names one. No token name or value moves, so CONTRACT is unchanged.
