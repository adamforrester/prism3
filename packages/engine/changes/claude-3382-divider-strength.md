---
engine: minor
---
Divider gains an emphasis axis, bold | subtle (#3382, owner decision Q15 revised A): bold binds color.border.secondary,
the color every divider drew before, and subtle binds color.border.primary. Bold leads, so it is the code default and
Figma's default member, and placed dividers and the Accordion and Dialog dividers keep their color. The rule and the
labeled divider's two lines are drawn as an inside stroke at border-width.hairline instead of a fill, so the border
color shows in Figma's stroke picker; the box is one hairline thick, so the pixels are unchanged. The Figma set grows
from seven members to fourteen. The code-only separator binding is renamed separator.rule.border, so it stays clear of
the new emphasis grammar. No token name moves, so CONTRACT is unchanged.
