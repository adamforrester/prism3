---
engine: minor
---
Badge's inline label takes the contained label's text size at each size (#3475 part 1, owner decision Q93 B): `type.label.sm.default`
(12px) at medium and `type.caption.md.default` (the corpus's 11px) at small, in place of the body roles (16px and 14px)
#3199 set. The inline style keeps its regular weight and its dot-and-text look. Its dot cell follows the new line box,
`type.label.sm.line-box` at medium and the new `type.caption.{md,lg}.line-box` at small, so the inline members are 14px
tall at medium and 15px at small (14px on the reference brand). `typeWeight` gains `keys`, which scopes the fixed weight
intent to named token keys, so the contained small label stays the bold caption while the inline one is the regular
caption. The member names and count are unchanged. CONTRACT is raised to 14.15.0 for the added caption line-box paths.
