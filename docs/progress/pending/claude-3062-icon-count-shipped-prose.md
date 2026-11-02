## (2026-11-02) — lint-icon-count reads every prose field the icon and provider-logo defs ship (#3062)

**Status:** `packages/engine/lint-icon-count.ts` and its line in `CONTRIBUTING.md` §3. ENGINE unchanged (no change
note: a gate-only change moves no artifact and owes no bump). CONTRACT unchanged.

### What changed

- **The gap (docs/34 shape 15).** `iconProse()` read `description`, each prop's `description`, each part `note` and
  `anatomy.codeOnly`. The provider-logo def (#2343's brand marks) also ships `summary`, `accessibility`, `content`,
  `docs`, `ai`, `motion` and `composition.replacesPatterns`, into `components.ai.json`, the docs page and the plugin
  bundle. "One of 74 marks" in `summary` passed. The icon arm uses the same extractor, so the icon def had the same gap.
- **The extractor** now names every shipped prose field by path. `notes` stays out: it is maintainer-only and ships
  nowhere. `ai.triggerKeywords` is in, because it ships as text a person types.
- **The floors** are one line per shipped surface, typed from each def as it stands (`SURFACES`), in place of four
  hand checks per def.
- **SHIPPED COVERAGE, the independent half.** A generic walk over each def's entry in the committed
  `components.ai.json` collects every string it ships, less a named list of identifier and enum keys (`NOT_PROSE`: ids,
  aliases, prop names, types and values, partner and plan id lists). Every string left must appear verbatim in the
  scanned set. The floors and the extractor are both typed from the def; this arm is typed from the emission, so a prose
  field added to the schema and projected fails here the day it ships (icon 42/42, provider-logo 37/37).
- **Self-checks:** the sample def covers every new path, and a def whose only count is in `summary` must reach both
  the glyph and the mark detector.
- **No false positives** on the real tree: 51 icon fields and 43 provider-logo fields scanned, zero claims.

### Verification

Mutations, each restored from a `wip:` commit:

- **M1, the issue's case:** provider-logo `summary` → "One of 74 marks: …", regenerated. Fails by field:
  `provider-logo.summary: "74 marks"`. On `main` the same edit exits 0.
- **M2:** the extractor drops `summary`. The self-check fails by name: `iconProse dropped the 'summary' field` and
  `a glyph count in summary does not reach the detector (#3062)`.
- **M3, the coverage arm's own case:** the emission ships a prose field the extractor does not know
  (`ai.example` in provider-logo's entry). Fails: `provider-logo.ai.example ships and is not scanned`.
- **M4:** "Pick from the set's 44 glyphs." in the icon def's `docs.usage`, regenerated. Fails:
  `icon.docs.usage: "44 glyphs" — the set has 46 glyphs`.
