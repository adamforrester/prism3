---
engine: minor
---
The `neutral.anchor` lever is no longer flagged `advanced` (#2175, owner decision PN3, 2026-10-05). The lever
manifest (`schema/lever-manifest.json`) drops `advanced: true` from it, so a reader that follows the flag, such as
the Studio's Color › Palettes page, places it with the neutral hue and chroma rather than behind Show advanced.
Its key, label, control, description and saved value are unchanged. No token, name or value moves, so the
token contract stands (`token-contract.ts --check`: unchanged).
