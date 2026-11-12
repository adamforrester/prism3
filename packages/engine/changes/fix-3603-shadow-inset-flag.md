---
engine: minor
---
`shadow.inset` carries DTCG's `inset: true` on its layer in every mode it ships: the light value, the dark mode and any
per-mode shadow override (#3603, owner decision A). Without it a stock consumer read the inner shadow as a drop shadow:
the shippable CSS wrote `--pds3-shadow-inset: 0px 2px 4px 0px …` with no `inset` keyword. The drop shadows `xs`–`2xl` are
unchanged and carry no `inset` field. The Figma effect styles do not move: they already drew `shadow/inset` as
INNER_SHADOW. Only the value changes and the token name stays, so CONTRACT is unchanged.
