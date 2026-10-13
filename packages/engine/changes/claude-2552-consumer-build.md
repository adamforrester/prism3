---
engine: minor
---
The consumer token build (#2552, owner decision Q250 A, 2026-10-12): the conforming projection is now the clean
consumer set. `<brand>.base.tokens.json` and every `<brand>.<mode>.overlay.tokens.json` carry no `$extensions`
anywhere, so a token holds only `$value`, `$type` and `$description`, and the base file no longer carries the
generator stamp or the `decisions` log. Measured against the previous projection: all 20 files are byte-identical to
it with `$extensions` removed, and nothing else moved. `buildOverlaySet(tree)` strips by default;
`buildOverlaySet(tree, { metadata: true })` keeps the metadata for the studio's internal "Include build metadata"
export. The single-file `<brand>.tokens.json` keeps every extension (its non-default modes live there) and stays
internal. No token name changes, so CONTRACT is unchanged. `lint-consumer-build.ts` holds the projection to this shape.
