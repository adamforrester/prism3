---
engine: minor
---
#2345 (owner direction 2026-10-07): image-placeholder gains four ratios, portrait 2:3, 3:4 and 4:5 and landscape 3:2,
beside 1:1, 4:3 and 16:9, ordered tallest to widest, so the set builds seven members; the default stays 4:3. Its
"no image" marker now scales with the frame: it leaves the auto-layout flow, sits centered and is constrained
SCALE/SCALE, which the frame's aspect lock keeps uniform, so a 64px thumbnail shows a 16px marker rather than a
cropped 180px one. A new `PartDef.scaleWithParent` carries it, projected as `absoluteCenter` plus a new
`absoluteScale` plan field that both executors honor and the read-back checks. A Figma-only `Marker` boolean,
on by default, hides the marker once an image is supplied. There is no code prop: in code the marker follows
whether an image is supplied. No token name moves (CONTRACT unchanged).
