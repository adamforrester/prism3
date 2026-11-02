---
engine: patch
---
At the narrow tier the Inspect menu stays inside the window: the preview header holds it, at Inspect's right edge and capped at the header's width less 12px a side, with the privacy note and the build stamp wrapping inside it (#3298). At 380 it had run 161px off the window's left edge on both hosts. The Inspect menu's 320px minimum (#3147) applies at the wide tier only, so at 380 the privacy note fills the menu out to that cap. 1280 is unchanged.
