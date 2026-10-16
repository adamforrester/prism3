---
engine: minor
---
Accordion: the large size's side padding is 20px, not 24 (#2726, owner decision Q338 A). `size.large.pad-x` binds
`space.250` instead of `space.300`, so the header's inline padding and the open panel's inline inset step 12 / 16 / 20px
at small / medium / large (comfortable; compact 8 / 12 / 16, spacious 16 / 20 / 24). Small and medium are unchanged,
the panel's bottom inset stays 12 / 16 / 24, and Text field and Select keep 24 at large. An Update corrects an existing
file in place: the 8 large members are rewritten, keeping every key and id. No new token, so CONTRACT is unchanged.
