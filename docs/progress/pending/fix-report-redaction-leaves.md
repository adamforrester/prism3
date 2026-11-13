## (2026-11-12) — Report a problem: every brand-input string is redacted, typefaces included, and a thrown write's report line keeps only its error class (#3697 H4)

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
- **The Activity drawer keeps Figma's message; only the report reduces it to the error's class** (owner decision
  D3703.1 B). A thrown Apply Theme or Prune posts `write failed: <Class>: <host message>` (`failureDetail` in
  `apply-summary.ts`), so the designer still reads Figma's reason in the drawer, now led by the error's class
  (`write failed: TypeError: …`). The class leads so the report can find it: `buildReport` passes every line through
  `reduceFailure` (`report.ts`), which cuts a `write failed:` or `prune failed:` line to `write failed: TypeError`, brand
  box ticked or not, because the message can carry anything the file holds. A skipped text style's reason in
  `write-text-styles.ts` reaches agent data only, never the drawer, so it keeps the class alone
  (`font unavailable: Inter Bold (TypeError)`). The apply-a-theme guide's "The detail holds Figma's message" stays
  true (D3703.2). The engine's closed values and reserved palettes stay out of redaction (D3703.3).

### The gate
`apps/plugin/test-report-redaction.ts` (in plugin `test`) runs the plugin's real Apply Theme and Prune over the file
shim for a fixture brand whose licensed body face is not installed, and puts each posted verdict through `buildReport`
as the Activity drawer hands it over. It asserts that none of the fixture's authored strings, written as literals in
the test, survives, and that a host message naming a page and a layer (in no brand field, so only the report's failure
rule can remove it) does not either. Mutations that fail by name: typefaces dropped from `brandWords` → `#3697 H4 a missing
licensed typeface: … LEAKED Calibre Office` (and `test-report.ts`'s typeface arm); `reduceFailure` dropped from
`buildReport` → `#3697 H4 a thrown write: the host's message is not in the report` (and its prune twin, and
`test-report.ts`'s `#3697 H4 D3703.1 B …` arms). Each thrown
arm also holds the posted drawer line, typed whole, to the host's message: the line carrying the class alone fails
`#3697 H4 D3703.1 B a thrown write: the drawer line keeps the host's message`. `test-report.ts` also holds every
`ENGINE_VOCABULARY` entry to the values `theme-schema.json` closes. A missing entry only over-redacts, but an extra
one could let an authored word through.

### Left
Other result lines still carry raw host messages (component build, file setup, style guide, cleanup, the refused
variable writes' reason in the apply line). Every brand-input string in them is now taken out, but text from the file
itself is not. Filed as #3702.
