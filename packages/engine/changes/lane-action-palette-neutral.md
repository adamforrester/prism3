---
engine: minor
---
#1811: the studio's Action palette select offers `neutral`. Its row description already said
"point it at your neutral for a restrained, monochrome look", and the engine already accepted
`actionPalette: 'neutral'` (it validates against every defined palette;
`packages/engine/examples/nb-redesign.design.md` ships it), but the select listed only primary + brandColors, so the copy promised an option the control
did not have. The `actionPalette` lever description in `schema/lever-manifest.json` now names neutral
too, so the manifest (and `list_levers`) agrees with the studio. A studio behavior change and a shipped
manifest prose change → ENGINE bump. CONTRACT STANDS (no token name moves).
