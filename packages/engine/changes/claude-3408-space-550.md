---
engine: minor
---
`space.550` (44px) joins the spacing scale beside the half steps `space.150` and `space.250` (#3408, owner Q-HT1 A), in
every brand's DTCG tokens, Figma space variables, `.ai.json` and reports. It is a step of the scale, not of the density
ladder, so no component's compact or spacious spacing moves. Button, Button.Destructive and Button.Neutral state their
code-side hit-target floor per size as a spacing token, `size.<size>.hit-target`: `space.300` at small and `space.550` at
medium and large (owner Q141 revised). New Balance's medium grid margin (44px) now aliases `space.550` instead of
`core.dimension.44`, by the existing rule that a layout value aliases a spacing step when one has its value; its px is
unchanged. `CONTRACT_VERSION` 15.0.0 → 15.1.0.
