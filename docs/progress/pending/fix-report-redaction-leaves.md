## (2026-11-12) — Report a problem: every brand-input string is redacted, typefaces included, and host errors carry their class (#3697 H4)

The code review of 2026-11-12 (#3697 H4) found two ways a brand reached a report with the brand box unticked. The
plugin prints `⚠ 3 typefaces unavailable (<face>, …)` exactly when a brand's licensed typeface is not installed, and
the scrub took out only the `id`, `name`, `root` and the named path segments of #3561. And raw host messages
(`write failed: …`, `prune failed: …`) went in as the host wrote them, carrying whatever the file holds.

### What changed
- **`brandWords` reads every string leaf of the brand input** (`apps/studio/src/state/report.ts`), extending #3561's
  owner decision A from authored path segments to every authored string: typeface families, face pins, palette
  references, color strings. A field added to `BrandInput` later is covered with no list to update. Two kinds of leaf
  are kept out, because they name no brand and every line uses them as ordinary words: the values the brand-input
  schema closes (`ENGINE_VOCABULARY`: `display`, `body`, `comfortable`, `light`, …) and the engine's reserved palettes
  (`primary`, `neutral`, via `isReservedPalette`). Without that, a report would read `[brand]` in every typography line
  and say nothing.
- **A whole segment is now bounded by any character that is not a letter or a digit**, in any script. The new gate
  found that the plugin joins a face as `Calibre Office|Regular`, and `|` was not on #3525's list of boundaries, so the
  family leaked even once it was a brand word. A list of the separators met so far was the defect, so it became the
  complement of letters and digits.
- **Three host-error sites carry the error's class, not its message** (`errorClass` in `apply-summary.ts`): Apply
  Theme's `write failed: TypeError`, Prune's `prune failed: Error`, and a skipped text style's reason in
  `write-text-styles.ts` (agent data only).

### The gate
`apps/plugin/test-report-redaction.ts` (in plugin `test`) runs the plugin's real Apply Theme and Prune over the file
shim for a fixture brand whose licensed body face is not installed, and puts each posted verdict through `buildReport`
as the Activity drawer hands it over. It asserts that none of the fixture's authored strings, written as literals in
the test, survives, and that a host message naming a page and a layer (in no brand field, so only the class rule can
remove it) does not either. Mutations that fail by name: typefaces dropped from `brandWords` → `#3697 H4 a missing
licensed typeface: … LEAKED Calibre Office` (and `test-report.ts`'s typeface arm); `write failed:` carrying the
message → `#3697 H4 a thrown write: the host's message is not in the report`. `test-report.ts` also holds every
`ENGINE_VOCABULARY` entry to the values `theme-schema.json` closes. A missing entry only over-redacts, but an extra
one could let an authored word through.

### Left
Other result lines still carry raw host messages (component build, file setup, style guide, cleanup, the refused
variable writes' reason in the apply line). Every brand-input string in them is now taken out, but text from the file
itself is not. Filed as #3702.
