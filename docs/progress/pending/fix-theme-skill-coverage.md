## (2026-11-19) — prism3-theme names every input it documents, and lint-skills stops counting an English word as one (#4171, #4172, #4173)

A fix lane from the 2026-11-19 skills audit (#4104). Three findings with one root: the theme skill's coverage gate read an English word as documentation, so the skill could leave out `name`, `modes` and fourteen nested inputs and stay green, and its compile-loop advice pointed at an input that cannot cause the failure it was about.

### The gate (#4173)

`scanCoverage` in `lint-skills.ts` counted a BrandInput property as covered if `\b<prop>\b` appeared anywhere in the body. "four modes" covered `modes`; "`[{ name, oklch … }]`" and "`name: accent`" covered `name`. It also read only the schema's top level. Now a property counts only where the skill names it: a code span that is its path (or its path and a dotted child), or a fenced example's key at the block's base indentation. One level down, for `typography`, `layout` and `motionPersonality` (`NESTED_COVERAGE`), a key also counts inside a code span on its parent's table row. `omits:` takes dotted keys, and a dotted entry naming nothing, or one outside `NESTED_COVERAGE`'s parents (which the scan never reads, so it exempts nothing), is a dead omission. Eleven self-check arms drive each shape through the shipping function. Run against main's skill, the gate reports 16 uncovered inputs; mutating `named()` back to a prose match, or emptying `NESTED_COVERAGE`, fails the self-check by name.

A first cut matched any span that started with the name, which let "`name: accent`" (a brand color's name) cover the brand's `name`. The rule is now exact: the span is the path, or the path then a dot.

### The skill (#4171, #4172)

- `name` is described under the minimum brand, and `modes` has a row.
- Rows for `typography.weights`, `italics` / `italicDefault`, `lineHeights` / `letterSpacings`, `leadingShift` / `trackingShift`, `typefaceLibrary` and `sizeOverrides`; `faces` joins the typography row; `layout` and `motionPersonality` rows name their remaining keys. Each line is taken from `theme-schema.json`'s description. `typography.faces` is not written dotted, because the dead-path check accepts only token paths and lever keys.
- The Exit 1 advice now sends a failed contrast contract to `surfaces` and `floorStep`, and says not to move the primary's lightness. Step 3 says a hero far from mid-lightness is not the action fill. Verified on main: a primary at l 0.92 or l 0.15 holds every mode contract, and a page tinted to step 300 fails 18. The `#4171` arm in `test.ts` reads both from the engine, and checks the skill's bullet. The first draft said to move `surfaces` "back toward white", which is wrong in dark: a dark page tinted to step 600 fails 61 contracts and 500 fails 98, while 700 and 800 hold all 980 (review of #4273). The bullet now says toward the mode's extreme (white in light, black in dark), and the arm measures a dark tint and checks the bullet names black.

### Held

The new skill prose is a draft for owner review against `docs/voice-standard.md`.
