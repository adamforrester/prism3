## (2026-10-25) — Text field: the clear button states a 24×24 hit area (#2930)

Text field's `clearable` button draws the 20px trailing glyph (`icon.size.sm`) inside the input's own target, so
the WCAG 2.5.8 spacing exception cannot apply and the button has to meet 24×24 CSS px on its own. The def never said
so, so a host that sized the button to its glyph failed 2.5.8 while following the contract. It now states the hit
area exactly as #2912 did for Search field: at least 24×24, drawn around the 20px glyph, adding no height to the
field, in the trailing affix `codeOnly` entry, in the `trailingIcon` description and in its own 2.5.8 line (split
out of the shared `4.1.2 / 2.5.8` line so it can name both targets). The test `#2930 text-field clear button` holds
it, mirroring `#2912 search-field clear button`.

The sweep for other fields with an interactive trailing affix found none owing the same. Password field's Show/Hide
button sits on the label row and already states 44×44 (24×24 at small, #2804). Counter's buttons and Slider's thumb
state 44×44. Select's chevron is part of the control's single target, and Textarea's resize handle is the browser's.
Code input has no affix. Search field was #2912.

Prose only: no token, part or member moves; the component artifacts' text does.
