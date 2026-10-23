---
engine: minor
---
Tag, under Tag style Underline (#2945, owner Q585 A): the tag hugs its content, with no height floor at the rung. The frame is the label row plus the inset: 20, 26 and 32px at small, medium and large, where it was 36, 44 and 56. The × slot keeps the rung height as its width and hugs its height. The minimum width stays 1.5 times the rung height, through a new `minWidthBase` part field. The 24px target moves to code, as Link's does. The pill does not change.
