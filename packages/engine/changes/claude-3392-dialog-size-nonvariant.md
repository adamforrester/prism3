---
engine: minor
---
Dialog's `size` is no longer a Figma variant (#3392). It only set a centered panel's width, so Dialog is one set of 16 members (placement × footer), a centered member is built at 560px, and the designer or the container sets the width. The code prop `size` stays, with 400, 560 and 720px documented as the recommended widths. `COMPONENT_RENAMES` gains a `merge` kind: an Update file moves each `size=medium` member off the axis in place and merges the `size=small` and `size=large` members into it, swapping their placed instances onto it at their old width, then removing them.
