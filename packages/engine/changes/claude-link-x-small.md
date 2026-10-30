---
engine: minor
---
Link gains an x-small size (#3179, owner decision D-A5 A): 12px body text, `type.body.xs.*` (the inline default binds
`type.body.xs.default-link`), for dense metadata such as an order row or a legal line. The value is `x-small`, the word
Icon and Spinner use for the rung below small (Q3179.1 A), placed after medium in the axis. The trailing icon stays 16px
(`icon.size.xs`). Link's set goes from 144 to 192 members; an Update adds the 48 x-small members and leaves the 144 in
place. No token is added, so CONTRACT is unchanged. `lint-hit-target` gains a standalone Link arm that holds each size's
line box to WCAG 2.5.8's 24px, as drawn or through the code-side hit area its codeOnly states (x-small 18px, small 21px).
