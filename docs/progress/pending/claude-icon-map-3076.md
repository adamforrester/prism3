## (2026-11-18) — A brand icon map: the brand's own icons stand in for Prism3's in every generated component (#3076)

**The decision.** #3076's owner decision (2026-11-18, A, both) has two halves. The second, a designer's hand swap kept
as a hand edit, is #4056. This is the first: a brand icon map in the brand settings. The proposal's Q1–Q8 take their
recommendations: the art travels in the brand input (Q1 A), the map is global (Q3 A), a brand glyph named like a
Prism3 icon redraws it (Q5 A), Studio gets no control yet (Q7 A), and the `-filled` twins are mapped with their line
forms (Q8 A, taught in the theme skill).

**The shape.** `icons: { map, glyphs }` in `theme-schema.json` and `BrandInput`. `icon-map.ts` (pure) holds the rules
(`iconMapErrors`, called from `brandTheme`, so every entry path refuses a broken map by name) and the rewrite
(`applyIconMap`). The rewrite sits first in each materialization chain: the plugin's `materializerFor`, the export's
`brandMaterializer`, and `lint-lever-sweep`'s restatement. It rewrites the three fields a def names an icon in: a
`vector` glyph, a slot's `swapDefault` and `overrides.swaps`. On the `icon` def it rewrites the `name` axis. The art
rides on the def as `brandGlyphs`, attached only where the projector draws or names a brand glyph, and the projector
reads it before `ICON_PATHS`. A brand with no block gets every def back as the same object, so `component-surface.json`
and every committed plan are unmoved.

**Code side.** The component-defs export carries `brand.settings.icons` (format 1.7, after #2778 took 1.6), and its `spec` follows the map
(its `def` is the authored one in every export, by design). `<brand>.ai.json` gains `icons: { note, map, names }`
(schema 0.7, after #2857 took 0.6). That version is the only committed byte that moves, in every brand's `.ai.json`.

**Gates (docs/34).** The expected side is typed from #3076's own table of where the core icons are used, plus the
counter (the proposal's finding 2), never read from `icon-map.ts`.
- `test.ts`: no mapped core icon in any plan; each listed component instances the brand's icon; the icon set's 43
  members; identity with no map; the refusals by name; the schema; three design.md round trips; the export; `.ai.json`.
- The brand's art is measured offline (Q1 A, the proposal's Design B), in review: `glyphInkBox` reads the whole SVG
  path grammar, sampling curves and arcs, and `iconMapErrors` refuses art that does not parse, draws nothing, or leaves
  the 24×24 artboard (a 512 artboard, as icon packages ship it). `lint-glyph-geometry.ts` gained a BRAND ART arm that
  projects the icon set through a fixture brand's map and holds core ∪ brand to its own measures: one filled path per
  member, the member's own outline, its fill rule kept, ink inside the artboard, no undeclared shape collision.
  `theme-schema.json` holds the engine's name shapes, and the brand validator learned `propertyNames`.
- `test-roundtrip.ts`: builds every def the map rewrites and the brand's icon set (under its own id: the projector knows
  the set by it), reading the brand's path back off the built vector. It also holds the plugin's chain equal to the
  engine's for a brand with the map.
- Mutations, each failing by name:
  - the slot-default rewrite → `list-item`, `search-field`;
  - the override rewrite → `counter`;
  - the icon-set axis → the icon-set arms;
  - the projector's lookup order → the redrawn `close`;
  - the chain rule → `a chain is refused`;
  - the `brandTheme` call → all seven refusals;
  - the serializer dropping `icons` → the round trip;
  - the export's chain step → its spec axis;
  - the `.ai.json` block;
  - the plugin's chain step → the round trip's parity arm.

**Duplicate art is reported, never blocked (owner decision 2026-11-20 A).** Before, a real brand's glyph that drew the
same shape as another icon in its set was neither refused nor named anywhere: only `lint-glyph-geometry`'s fixture was
checked. Update file's dry run now names it. `iconArtDuplicates` (`icon-map.ts`) reads the icon set's plans, so it names
what the update would build. It groups the members that draw one shape, keeping only groups where the brand's art is
one of them. The art is rewritten to absolute commands through `glyphInkBox`'s own walker and then compared with
`canonicalShape`, fill rule included. `previewUpdate` sets `iconDuplicates` and `previewVerdict` adds one line: a
report, outside the hash, with no blocker. Tests: `test-update-apply.ts` builds a brand set holding two duplicates.
It asserts that the dry run names both groups, carries the line, refuses nothing, and that the apply it hashed goes
through. `test.ts` holds relative spellings, a mapped-away look-alike, and Prism3's own duplicates left out. Each of
these mutations fails by name: a blocker on duplicates, a dropped report, and a dropped brand filter.

**A harness trap, recorded.** The round trip renames each variant row's id (`tag@icon-map`). Renaming the icon set made
the projector treat it as a consumer of itself (86 divergences), so that row builds under its real id. It also prebuilt
nested sets unmaterialized, where the plugin's own `project` materializes them, so it now takes the brand's map for
those too.

**Not built, filed.** The opt-in retire step for a stamped core icon the map leaves unused (Q4 A, #4100): today it is a
drop, kept and marked deprecated, as before. The file dry run on the brand file (Q6 A, #4101) needs the bridge. A
per-brand icon module in `out/` with core names as aliases (#4102) and the web preview following the map (#4103) are
later phases.
