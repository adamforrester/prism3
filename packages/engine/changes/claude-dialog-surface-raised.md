---
engine: minor
---
The raised surface (#3049, owner Q721 A; Q3049.1 C, Q3049.2 A, Q3049.3 A, Q3049.4): a new guaranteed role,
`color.foreground.raised`, the panel a dialog or sheet draws over the scrim, and a new optional brand input,
`raisedSurface: card | page | white` (Color, default `card`). The input acts in the light family only (light, hc-light):
`card` holds the card surface's palette step, `page` the page's, `white` the palette's white. Dark and hc-dark always
hold the card, so a dialog keeps its lift. Unset, the role aliases the card's own step in every mode, so every brand
that leaves it unset emits values identical to `foreground.primary`; no existing token value moves in any brand. The
reference brand's legacy fixture and its redesign seed set `white`, so its light dialog panel is white. An override on
`foreground.primary` carries to the raised surface wherever it holds the card. Dialog's panel binds the new role, so
its set builds differently under names that all stay; the primary and link inks are held on it in place of the card
(the same step under the default). The scrim's `.ai.json` names it as the modal surface. CONTRACT 14.11.0 → 14.12.0.
