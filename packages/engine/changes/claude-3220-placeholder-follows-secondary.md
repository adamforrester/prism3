---
engine: minor
---
`color.field.placeholder` now takes `text.secondary`'s own fit (#3220, owner Q3212.5 A): the same candidates, bar and ground. The field hosts bind `text.secondary` for the placeholder, so the token and the components now show one placeholder ink. Under `secondaryTextGround: page` the placeholder moves with the secondary ink (the reference brand: `neutral.500` in light, measured on `background.primary`). In high contrast, every brand's placeholder moves one step darker to `text.secondary`'s HC floor fit (for example prism3 `neutral.650` → `neutral.700` in hc-light). Before, it was fitted on `background.secondary`, which is white in HC. No token name moves.
