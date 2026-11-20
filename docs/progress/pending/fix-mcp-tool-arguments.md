## (2026-11-19) — The MCP tools take the brand one way and write the CLI's file names (#4120, #4141, #4144)

Three findings from the overnight consumer-agent audit (#4104), all owner decision A on 2026-11-19, built together
because they are one root cause: the MCP tool surface had drifted from its own documentation and from the CLI.

- **#4120.** `validate_brand` took the BrandInput bare while every other brand-taking tool took `{ brand }`, so the
  documented pre-flight (`validate_brand`, then `theme_brand`, with one object) failed its first call with misleading
  errors. It now declares `{ brand }` and still reads the bare form for one release, through the same `'brand' in args`
  test `theme_brand` already used. `export_theme` and `score_consumption` with no `brand` now name the argument instead
  of reporting `(root): expected object`. The new message is DRAFT.
- **#4141.** `export_theme`'s description said "add componentSpecs", but `include` replaces the default, as
  `theme_brand`'s does. Kept the replace semantics, so the contract doesn't change, and changed the description and the
  `include` property to say "replaces". The README tool table now names componentSpecs.
- **#4144.** `export_theme` wrote `tokens.json` / `ai-metadata.json` where the CLI and every doc say
  `<id>.tokens.json` / `<id>.ai.json`, and it never wrote the base + overlay set `prism3-build-ui` rule 3 builds from.
  It now writes the CLI's names, the overlay set through the same `buildOverlaySet` call `emitTheme` makes, and the
  component files under `componentDefsFileNames(id)`. The old names are written beside them for one release, behind
  `LEGACY_EXPORT_NAMES`, the way #1325 kept `component-defs.json`. The prefixed `<id>.ai.json` names `<id>.tokens.json`
  as its tree; the legacy `ai-metadata.json` keeps naming `tokens.json`, so each copy points at its own neighbor.

Trap for whoever retires the legacy names: delete `LEGACY_EXPORT_NAMES`, the sentence in `export_theme`'s description
that promises them, and the README's "for one release" clause together. The test arms assert the legacy files
exist, so they fail by name until that arm is retired in the same diff.
