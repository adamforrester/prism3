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
- **5b: a design.md or JSON import saved before #1946 migrates the same way a saved brand does.** Not built yet:
  an import carries no version stamp, so how an older file is told apart is held for the owner (below).

### Held for the owner

- **How 5b tells an older import apart.** A: copy `surfaces[base]` on every import wherever `surfaces[name]` is
  absent. B: stamp the design.md and JSON export with a version. C: always write `surfaces.<name>` for each custom
  mode from now on, so an absent key means the file predates #1946.
- **Copy.** The DECISIONS LOG note (`custom modes: … (started from dark) — each keeps the copy …`) and the schema
  descriptions of `customModes`, `customModes[].base` and `surfaces` are DRAFT, as are the `surfaces.<key>` refusal
  (`… is not light, dark or a custom mode of this brand …`) and Background fills' line for a custom mode (`Custom
  modes keep the surfaces they were given when they were made.`). Also DRAFT, from O1 B: the source select's label
  `Start from` (its accessible name `Start the new custom mode from`, options `Light` and `Dark`, and the disabled
  Dark's reason `Dark is off, so it has no settings to copy.`), the row's record `Started from Light` / `Started from
  Dark`, and the add row's line `Copies the mode it starts from; later changes to that mode don’t reach it.`

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
