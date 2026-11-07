## (2026-11-07) — The disposition is one of four names in both schemas, and `check:ignore` checks every web input (#3451, #3407)

Two schema and gate gaps found in review, fixed in one PR.

### #3451: the four disposition names in both schemas

The `disposition` of a `syncBoundary` item was `{ type: string, minLength: 1 }` in both `schema/component-docs.schema.json` and `schema/component-defs.schema.json`, so a consumer validating an export accepted a typo. Both are now an `enum` of CARRIED, LOWERED, REFUSED and UNSUPPORTED (Q3441.1 A), written as literals in each schema and not read from `DISPOSITION_NAMES` (`docs/34` shape 1: a schema built from the constant would accept whatever the constant says). The register's header now says a rename edits the two enums too.

- **Nothing emitted moves.** The schemas are authored, not `regen.ts` artifacts, and every export already carries the four names, so `regen.ts` changes nothing. No change note: the engine's behavior did not change. `CONTRACT_VERSION` does not move (no token name moves). The schemas' `$id` does not move either: no field was added, removed or renamed, and every export that validated before still validates.
- **Mutations, each failing by name in `lint-component-docs.ts`:** `"CARIED"` written into the committed `components.ai.json` and `component-defs.json` fails `SCHEMA` and `DEFS SCHEMA` (`"CARIED" is not one of [...]`). The same mutation against main's schemas reports nothing. `DISPOSITION_NAMES.carried = 'CARIED'` fails `DEFS SCHEMA (<brand>)` for every live brand export.

**Correction to 2026-11-05 "`codeOnly` as data: a class register and a four-way disposition (#3441)".** Its totals were measured before the merge. After #3380, the export carries **547 entries on 62 defs**, not 530 on 60. By disposition: CARRIED 2, LOWERED 116, REFUSED 251, UNSUPPORTED 178 (measured from `out/components/components.ai.json`).

### #3407: every web bundle input sits under a trigger path

`vercel-ignore-check.mjs` asked one question of the bundle's inputs: is an engine file on the skip list? A web input outside `packages/engine/` and outside every `PATHS` entry passed, so a change to it alone skipped the deploy. That happened in #3389 with `apps/plugin/src/causes.ts`.

The gate now checks every input. Neither side is computed by the gate:
- **The inputs** are esbuild's metafile, plus the files the chrome CSS plugin builds the virtual `p3-chrome:chrome-css` from (the token trees, fonts and icon license), taken from the `watchFiles` it already returns to esbuild. A virtual input with no recorded file behind it fails.
- **The trigger set** is the script's own array code, run by bash, so the `:(exclude)` pathspecs arrive as `git diff` gets them. Which files they cover is answered by `git ls-files`, with git's own pathspec rules. A `node_modules/` input counts as `package-lock.json`. An input git does not track is reported as one no commit can change.
- **One declared exemption, `CHECK_ONLY = ['apps/plugin/src/']`.** The chrome plugin also watches every plugin source file, because its `[glyphs]` check reads their string literals. That check can fail the build but never changes the CSS. The entry fails as stale once the glyph check stops reading that root.
- **Represented, not counted:** the walk must contain an input under `apps/studio/`, one outside it, and one file the chrome plugin builds from.
- **The detector is held to a plant:** a bundle importing `apps/plugin/src/pace.ts`, which is under no trigger path, must be reported by that name.

A new fixture asserts that a change to `causes.ts` alone BUILDS. Mutations: dropping `apps/plugin/src/causes.ts` from `PATHS` fails with `apps/plugin/src/causes.ts` named under "sit under no trigger path". Blinding the detector fails on the plant (`does not report apps/plugin/src/pace.ts`).

Trap for whoever extends this: `watchFiles` is what a plugin asks esbuild to watch, and that can include files a check reads (as `[glyphs]` does). It is an over-approximation of what the build reads, so an exemption needs a reason and a staleness check, never a silent filter.
