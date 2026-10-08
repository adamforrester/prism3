---
engine: minor
---
#2324 (owner Q110 and the 2026-10-08 answers): a button at the text appearance underlines its label, at rest and in
every state, disabled included, on Button, Destructive and Neutral. The underline is fixed. Every brand now mints
underlined label styles, `type.label.{sm,md,lg}.emphasis-link` (and `default-link` under `buttonLabelWeight: default`),
whatever `typography.links` lists; they describe themselves as a text button's label, not a `text.link.*` link.
Text-appearance buttons bind them through a per-appearance label key, `size.<size>.<appearance>.type`. A text button
is never filled at rest, and by default not on hover or pressed either: a new Button option, `buttonTextHover`
("Text button hover": `text`, "Text & icon only", the default; or `fill`, "Fill"), gives it the outline appearance's
overlay wash on hover and pressed. Neutral's interactive ink now walks like the other families (rest unchanged; hover
and pressed reflect toward the middle of the ramp, 950 to 850 and 750 in light; 025 to 100 and 200 on the inverse
band), so its text and outline buttons change on hover and pressed, on both grounds; its border follows. The token contract gains the three label link paths
(CONTRACT 14.4.0 to 14.5.0).
