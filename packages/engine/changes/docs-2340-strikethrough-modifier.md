---
engine: minor
---
Strikethrough is a documented modifier on the existing text styles, not a style of its own (#2340, owner Q150 D,
2026-10-09). Every body and caption composite's `.ai.json` entry (body/xs included, the `-link` variants not) now
says how to strike text: the same style plus a line-through modifier (`<del>` or `<s>` with
`text-decoration-line: line-through` in code, a strikethrough override on the style in Figma), with visually hidden
text naming it ("Original price:", "Sale price:"), and that Prism3 mints no strikethrough style. No token, style or
value moves, so CONTRACT is unchanged; only the five brands' `.ai.json` guidance changes.
