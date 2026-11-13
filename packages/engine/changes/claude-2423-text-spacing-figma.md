---
engine: minor
---
The line-height and letter-spacing primitives reach Figma as a `text-spacing` variable collection (#2423, owner Q175 A; collection name 2026-11-12). Every brand's Figma emission gains `text-spacing.json`: the `core.font.line-height.*` and `core.font.letter-spacing.*` steps (hidden from publishing) and their `-role.*` roles (published, aliasing the steps), FLOAT variables named by their DTCG paths and holding the DTCG's multipliers. They carry no scopes, because Figma reads a FLOAT bound to line height or letter spacing as pixels. Apply Theme and the CLI paste path write the collection; text styles keep their baked PERCENT. `CONTRACT_VERSION` unchanged: no DTCG name moves.
