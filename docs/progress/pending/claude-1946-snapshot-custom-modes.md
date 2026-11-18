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
  family's defaults. `base` stays, as provenance and as the appearance the mode derives with. ENGINE minor; no
  CONTRACT bump, because no emitted name moves.
- **Studio.** `addCustomMode` copied nothing. It now takes a deep copy of light's per-mode input under the new name
  (`copyMode`, a `copy` on each mode row of `name-refs.ts`, the table the rename and removal already read). The
  Dark-off confirm lost its "refused until it is based on Light or removed" line and no longer opens for a custom
  mode alone, because the change is no longer refused. Removing a fresh custom mode now goes through its confirm, because it holds a copy
  of light's surface (the shipped examples set one), and the confirm lists it.
- **Test arms.** `test-brand-input.ts`'s #1939 arm (a refused Dark off loses nothing) is retired with the refusal it
  tested; its place is the #1946 arm that Dark off is taken and the custom mode keeps its copy.

### Held for the owner

- **Changing a custom mode's base after creation.** Studio's add starts every custom mode from Light; the Base select
  then changes `base`. It now changes only the record and the appearance, and does not re-copy the new source's
  per-mode input, because a re-copy would overwrite the designer's edits. So a "copy of Dark" is today a copy of
  Light's input with Dark's appearance. Whether the select should re-take the snapshot (and with what warning), or
  creation should offer the source up front, is a UI decision.
- **Brand-wide levers.** Light has no per-mode non-color levers (`modeLevers.light` is refused: light's are the
  brand-wide ones), and every mode shares the palettes and globals. Those still flow into a custom mode, read as
  brand edits rather than edits to the source mode.
- **Saved brands (a migration rule).** A custom mode saved before this change followed its base family's surfaces,
  so in a saved brand with `surfaces.light` (every shipped example sets one) or `surfaces.dark`, its custom modes'
  pages change on load: they now read only their own `surfaces.<name>`, which they do not have. No migration was
  written; Studio's saved brand carries no format version to run one against. The rule that would keep each such
  mode as it looked is to copy `surfaces[base]` to `surfaces[name]` once, where absent.
- **Copy.** The DECISIONS LOG note (`custom modes: … (started from dark) — each keeps the copy …`) and the schema
  descriptions of `customModes`, `customModes[].base` and `surfaces` are DRAFT.

### Verification

`test.ts` #1946 block: each source edit (an override, an anchor, a per-mode setting, the page surface) moves dark and
leaves the custom mode's resolved roles as they were; Dark off with dark's data dropped builds, and the custom mode
resolves identically; dark's surface does not reach the custom mode, its own does; `base` survives the build; the
design.md round trip keeps the custom mode, its provenance and its copied input, and resolves the same; the schema
takes `surfaces.<custom>`. `test-brand-input.ts` 3b/3c: Studio's Dark off is taken and keeps the custom mode's copy;
add copies light deep, and a later light edit reaches neither the copy nor what it resolves to. `test-chrome.mjs`:
Dark off with a dark-based custom mode is taken in the browser, with no confirm, and the record stays. `npm run verify`'s list ran in chunks under ten minutes, the
plugin suites one by one with `run-suites.ts`'s verdict, and the Chrome suite in fifteen smaller shards (a local
split, not committed) whose records `test:chrome-shards` merged: 47,340 assertions, every section once.
