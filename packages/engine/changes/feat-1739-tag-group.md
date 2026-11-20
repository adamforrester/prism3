---
engine: minor
---
Tag.Group (`tag-group`), a new component: a wrapping row of tags in a native `items` slot, three by default (#1739, owner decision A, A, A). Any number of select tags can be pressed, each a toggle button with `aria-pressed`; the row wraps, with `space.100` between tags across and down; the Figma set has a `size` axis (3 members) that follows into the tags. The anatomy schema gains `rowGap`, the line gap of a wrapping row, projected as a bound `counterAxisSpacing`. Tag's `planned` list drops `tag-group`, its `ai.commonPartners` gains it, and its group `codeOnly` entry names the new component.
