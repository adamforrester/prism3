---
engine: minor
---
A medium or large flush text button's hit area is at least 44×44 in code (#2408, owner Q154 A and Q170 B, 2026-10-09), and a small one's at least 24×24, the WCAG 2.5.8 floor (owner Q174 B). Button, Destructive and
Neutral share the rule: `codeOnly` and the `inset=flush` line in `docs.do` now state it, with the technique (a
transparent `::before` inset outward and centered on the label), replacing "at least its default sibling's size".
The box stays label-width so the label still lines up, and Figma is unchanged. Regenerated into
`out/components/button*.md`, `components.ai.json` and `component-maintainer.json`. No token moves, so CONTRACT is unchanged;
the projected plans' `codeOnly` text moves (no member, geometry or binding), so `schema/component-surface.json` is
accepted. `lint-hit-target` gains a FLUSH MEMBERS arm that requires each flush def to state the rule.
