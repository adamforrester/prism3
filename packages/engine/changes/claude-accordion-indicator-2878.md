---
engine: minor
---
Accordion carries the indicator pair as its own variant axis, `indicator` (`chevron | plus-minus`, chevron first), and
its nested `_accordion-indicator` follows it per member beside `expansion` and `size` (#2878, Q-block A). The nested
instance is no longer exposed (`nest-exposed` → `nest-fixed` with `follow`). The set goes from 24 to 48 members. The code
prop `indicator` already existed and is unchanged. Additive for library consumers: Update renames the 24 existing
members to `indicator=chevron` in place and builds the 24 plus-minus members. No token name moves, so CONTRACT is
unchanged.
