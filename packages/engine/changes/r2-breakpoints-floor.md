---
engine: minor
---
Layout refuses fewer than two breakpoints (#3698 R2). One floor validated, built, and emitted no `md` tier, so
four guaranteed contract paths (`breakpoint.md`, `grid.md.*`) were missing from a brand the engine accepted.
The input schema now carries `minItems: 2` on `layout.breakpoints`, so the CLI, `validate_brand` and
`theme_brand` refuse it in the schema's words, and `buildLayout` refuses it for input that skips the schema:
"The brand needs at least two breakpoints, starting at 0px. This brand has 1." (DRAFT wording). That sentence
replaces #2137's "at least one breakpoint" for the empty list. The guaranteed contract names do not change.
