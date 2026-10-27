---
engine: minor
---
A grid margin or gutter off the spacing scale now builds (#3052, owner decision Q785 A). `grid.<bp>.margin` and
`grid.<bp>.gutter` link to the first of these that exists: the `space/*` step with that px; otherwise the brand's
`core/dimension/*` step with that px; otherwise a plain px, flagged off-scale (`$extensions.prism3.offScale` and a
decisions note). The value is never snapped. `resolveGap` no longer throws for an off-ladder override (#1593); it
refuses only a value that is not a length. The reference brand's md margin is 44 in its legacy fixture and in its
redesign seed brief: whole-pixel 41px columns at 1440 with 24 columns and 16px gutters. It links to
`core/dimension/44`, in DTCG and in the Figma `layout` collection, and the md grid style's offset is 44. Every other
brand's emission is value- and alias-identical. No guaranteed token name moves, so CONTRACT is unchanged.
