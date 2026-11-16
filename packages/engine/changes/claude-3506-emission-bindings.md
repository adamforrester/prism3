---
engine: minor
---
The component emission carries four bindings it left out (#3506, owner Q142 A on #3408), so a code generator reads
`specs.json` and `component-defs.json` only. Redlines gain each part's corner (`radius`, or one per corner when they
differ) and stroke (`strokeWidth`, or one per side), read from the same plan that builds the set; a row's key grows
where they move (a stroke on `state`, a corner on `shape`). A spec gains `focusRing` (each part nesting the shared ring:
the host's offset token, and the ring's width and style) and `motion` (each `tokens` binding to a `motion.*` token).
Spinner binds its five motion tokens, which it named only in prose. The Specs projection maps the corner and stroke to
`cornerRadius` and `strokeWeight`. Formats: `prism3-component-specs/1.1`, `prism3-component-defs/1.4`. The component pages'
Specs tables show the corner and stroke under Other.
