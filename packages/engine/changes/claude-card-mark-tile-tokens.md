---
engine: minor
---
Card marks are full-bleed tiles whose corners and edge the component draws (#2343, owner decision Q720 A). The four
`card/*` files are re-exported with square corners and no rounded tile, their ground kept, and their provenance
records say so. On every `card/*` member the frame that holds the artwork binds its four corner radii to
`radius.sm` and its stroke weight to `border-width.hairline`, strokes in `color.border.primary`, and clips the artwork
to its corners, so every tile has the same corner and the same 1px edge at every height a host binds and in every
mode. A new `tileEdge` field on a `vector` part carries it, gated on the members it names. Square and wallet marks are
unchanged. `brand-mark`'s plans move for its 4 card members (19 members, same count); only existing token roles are
bound, so CONTRACT is unchanged. `lint-mark-colors.ts` holds the bound edge on every card member, and
`lint-glyph-geometry.ts` refuses a card file that bakes a rounded tile or a border.
