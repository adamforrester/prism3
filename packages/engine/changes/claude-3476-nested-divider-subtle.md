---
engine: minor
---
Accordion and Dialog nest their dividers at emphasis subtle instead of bold (#3476, owner decision Q72 B), for every
brand, so their separators draw color.border.primary, the lighter edge, rather than color.border.secondary. Divider's
own default stays bold, so a placed divider keeps its color. Both strengths are decorative rules with no contrast
minimum. The Accordion and Dialog Figma sets keep their members and member names; only each nested divider's variant
changes. No token name moves, so CONTRACT is unchanged.
