---
engine: patch
---
`lint-icon-count.ts` reads a glyph or mark count with up to two words between the number and its noun
("One of 99 named glyphs", "all 99 of its glyphs", "99 SVG icons"), a count before `set of` ("a 99-strong set of
glyphs"), and spelled-out numbers from two to ninety-nine (#3882). Before, only a number directly beside its noun was
read. Gates only; no committed artifact moves.
