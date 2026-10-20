---
engine: minor
---
Dialog's close button takes the flush shape (owner QA, 2026-10-19). It nested FlushIconButton.Neutral at
`shape: round`, which drew a circle and a decorative edge around the X; it now nests `shape: flush, size: medium`, the
bare glyph with no edge or fill, whose hover and pressed move the glyph ink alone. The hit area stays 44×44px, drawn
in code. Every Dialog member's plan, the docs and `.ai.json` follow. No token path moves, so CONTRACT is unchanged.
