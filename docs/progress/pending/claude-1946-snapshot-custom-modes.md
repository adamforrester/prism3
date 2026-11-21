## (2026-11-18) — Custom modes are snapshots: no live link to the mode they started from (#1946)

Owner decision 2026-11-18 A on #1946: a custom mode created from an existing mode stores the full per-mode input,
frozen at creation, with no live link afterward; provenance records where it started, for reference only.

### What main did, and what differed

- **Engine.** A custom mode cloned its base's mode descriptor (the light/dark derivation: kind, family, contrast
  mins). It already read its own `overrides`, `modeAnchors` and `modeLevers` under its own name, never its base's.
  Two things were live links: `brandTheme` refused a custom mode whose base the brand did not generate (so Dark off
  was refused while a custom mode started from Dark), and `modeConfigs` resolved surfaces per *family*, so a
  dark-based custom mode followed `surfaces.dark` live and ignored a `surfaces.<name>` of its own (which the schema
  also refused). Both are gone: the base may be off, and a custom mode resolves its own `surfaces.<name>` against its
  family's defaults. A `surfaces` key that is neither light, dark nor a declared custom mode is refused by name,
  since the schema now takes any key. Studio's Background fills reads a custom mode's own `surfaces.<name>`, and
  its floor-refusal reader takes `surfaces.<custom>.floorStep`. `base` stays, as provenance and as the appearance the mode derives with. ENGINE minor; no
  CONTRACT bump, because no emitted name moves.
- **Studio.** `addCustomMode` copied nothing. It now takes a deep copy of light's per-mode input under the new name
  (`copyMode`, a `copy` on each mode row of `name-refs.ts`, the table the rename and removal already read). The
  Dark-off confirm lost its "refused until it is based on Light or removed" line and no longer opens for a custom
  mode alone, because the change is no longer refused. Removing a fresh custom mode now goes through its confirm, because it holds a copy
  of light's surface (the shipped examples set one), and the confirm lists it.
- **Test arms.** `test-brand-input.ts`'s #1939 arm (a refused Dark off loses nothing) is retired with the refusal it
  tested; its place is the #1946 arm that Dark off is taken and the custom mode keeps its copy.

### Owner decisions O1 B, O2 A, O3 C (2026-11-19), built

- **O1 B: the source is chosen at creation.** Brand's custom modes ask for the source (Light, or Dark while dark is
  on) before Add, and the new mode copies that mode's per-mode input. After creation the Base select is gone: the
  row records `Started from Light` or `Started from Dark` as text, and nothing in Studio sets `base` again
  (`setCustomBase` is removed). This retires the light-page-in-a-dark-mode result the select gave.
- **O2 A: saved brands migrate once.** `PERSIST_VERSION` goes from 2 to 3. A v2 blob is migrated on read, not
  refused: for each custom mode with no `surfaces[name]`, `surfaces[base]` is copied to it, so each saved custom mode
  keeps the page it showed. What this build writes is v3, and v3 is never migrated, so the copy runs once and a
  snapshot that took no surfaces is never given its base's on a later reload. It covers the web's saved brand and the
  plugin's file blob, which share `deserializeBrandInput`. The migration reads a custom mode's base only as an own
  key of the stored `surfaces`, so a base that names an `Object.prototype` key copies nothing (`test.ts` pins
  `constructor`, `__proto__` and `toString`).
- **O3 C: editing custom-mode surfaces in Studio** is a follow-up, filed as its own issue.

### Owner decisions 5a and 5b (2026-11-20)

- **5a: brand-wide settings still reach custom modes**, built as the current behavior. Light has no per-mode
  non-color levers (`modeLevers.light` is refused: light's are the brand-wide ones), and every mode shares the
  palettes and globals. Those flow into a custom mode as brand edits; the snapshot covers per-mode values only.
- **5b: a design.md import saved before #1946 migrates the same way a saved brand does.** Built, as 5b C below.

### Owner decisions 5b C and the copy (2026-11-21), built

- **5b C: the export writes the key, so its absence dates the file.** `toDesignMd` always writes `surfaces.<name>`
  for every custom mode, as `{}` where it has none (`{}` resolves exactly as no entry does). So a custom mode with no
  such key is from a file written before #1946 (the schema refused the key then), and `parseDesignMd` gives only that
  mode a copy of its base's surfaces. A key that is present, `{}` included, is taken as is. No version stamp, and no
  copy where the key is present. The copy is `copyBaseSurfaces` (`custom-surfaces.ts`), which the v2 saved-brand
  migration now shares, own-key checks included. Every design.md reader goes through `parseDesignMd`: Studio's
  import and paste, the CLI and the MCP's `theme_from_brief` (whose `derivedBrandInput` is the migrated input). A
  saved JSON brand already migrates by its version (O2 A). `lint-design-md-round-trip` owes the `{}` key back for
  each custom mode with none, typed from the decision, so an export that skips it fails `LOST: surfaces.<name>`.
- **The copy is approved as written:** the DECISIONS LOG note (`custom modes: … (started from dark) — each keeps the
  copy …`), the schema descriptions of `customModes`, `customModes[].base` and `surfaces`, the `surfaces.<key>`
  refusal (`… is not light, dark or a custom mode of this brand …`), Background fills' line for a custom mode
  (`Custom modes keep the surfaces they were given when they were made.`), the custom-mode floor sentence with its
  lowercase slug, and from O1 B the source select's label `Start from` (its accessible name `Start the new custom
  mode from`, options `Light` and `Dark`, and the disabled Dark's reason `Dark is off, so it has no settings to
  copy.`), the row's record `Started from Light` / `Started from Dark`, and the add row's line `Copies the mode it
  starts from; later changes to that mode don’t reach it.`

### Verification

`test.ts` #1946 block: each source edit (an override, an anchor, a per-mode setting, the page surface) moves dark and
leaves the custom mode's resolved roles as they were; Dark off with dark's data dropped builds, and the custom mode
resolves identically; dark's surface does not reach the custom mode, its own does; `base` survives the build; the
design.md round trip keeps the custom mode, its provenance and its copied input, and resolves the same; the schema
takes `surfaces.<custom>`, and `brandTheme` refuses a `surfaces` key no mode reads (`drak`, `hc-light`, an undeclared
custom mode), naming it. `test-fills-input.ts` §2: after light's page moves, Background fills for a new custom mode
shows its copied page and swatch, not light's new one; a refused `surfaces.<custom>.floorStep` reads in the studio's
words. `test-brand-input.ts` 3b/3c: Studio's Dark off is taken and keeps the custom mode's copy;
add copies light deep, and a later light edit reaches neither the copy nor what it resolves to. `test-chrome.mjs`:
Dark off with a dark-based custom mode is taken in the browser, with no confirm, and the record stays. `npm run verify`'s list ran in chunks under ten minutes, the
plugin suites one by one with `run-suites.ts`'s verdict, and the Chrome suite in fifteen smaller shards (a local
split, not committed) whose records `test:chrome-shards` merged: 47,340 assertions, every section once.

O1 B and O2 A (2026-11-19): `test-brand-input.ts` 3d: a mode created from Dark holds dark's copy and resolves dark
surfaces; no export of the module writes `base`; with dark off, Dark is no source. `test.ts` and `test-store.ts`: a
v2 saved brand loads with `surfaces[base]` copied to each custom mode and keeps each page; the next save is v3, and a
v3 blob is not migrated. `test-chrome.mjs`: the record is text with no control in the row, a mode created from Dark
records Dark, and with Dark off Dark is not offered.

5b C (2026-11-21): `test.ts`: an exported custom mode whose base's page moved after it was made comes back from
import with its own `{}` and its own page; a design.md typed as written before #1946 imports with each custom mode
given its base's surfaces and page; an explicit `surfaces.<name>` (`{}` or set) is taken as is while a mode without
one beside it is given its base's. Each failed before the fix. Mutations, each failing by name: the export skips the
key (`… keeps its own surfaces through import after its base's page moved`, and the round-trip gate's `SELF-CHECK`
and `LOST: surfaces.<name>`); the import copies whether or not the key is present (`… explicit surfaces.<name> … is
not overwritten …`, the same round-trip arm, and the v2 `… keeps them (the copy is only where absent)`).
