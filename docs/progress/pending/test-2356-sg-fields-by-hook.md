## (2026-10-08) — test:chrome's Build style guides arm names each expected field by its hook, not a floor of 3 (#2356)

`test:chrome` section 4 (#1031, re-hosted on Build style guides by H12) counted the page's enabled, visible text fields and asserted `>= 3`. With `SG_RING_CATALOG` the page draws 5, so the whole color group (Color value plus Color sample) could go missing and the arm still passed on Collection, the titles box and Font sample. Found by the review lane on #2354.

- **The arm now holds a literal list of hooks:** `sg-collection`, `sg-titles-input` (the titles box's textarea), `sg-opt-value-format`, `sg-opt-color-sample`, `sg-opt-font-sample`. It fails with each missing hook named, the rule for what is counted (enabled, visible text inputs, selects and textareas), and the hooks it measured.
- **#2354's wait waits on the same condition:** every listed hook present under the measurement's own selector and filter, bounded at 10 s, timeout swallowed so the named check reports.
- **"Table header" is gone from the message.** It is a segmented control and was never counted.

Test only: no product code, no emitted artifact, no engine bump.

### Diagnosis worth keeping

- **The list is literal on purpose.** Deriving it from the catalog's kinds or from the page would make it agree with whatever the page draws (docs/34 shape 1). If the fixture's tables change kind, this list changes by hand.
- **Only missing hooks fail, not extra ones.** A new field on the page still gets its ink measured by the arm's next check; the issue asked for expected fields by hook, not an exact set.
- **The titles box counts even while its `<details>` is closed:** Chromium gives the textarea a nonzero box. That was already true under the floor (#2354's "Collection and the titles box only").

### Mutation, failing by name

Committed tree, both bundles rebuilt, `test:chrome` in full. The color group alone removed (`if (false && k.has('color'))` in `shell/style-guides.ts`):

`✗ figma dark / Build style guides: every expected field is measured, by hook (counted: enabled, visible text inputs, selects and textareas; expected sg-collection, sg-titles-input, sg-opt-value-format, sg-opt-color-sample, sg-opt-font-sample; measured sg-collection, sg-titles-input, sg-opt-font-sample) — missing sg-opt-value-format, sg-opt-color-sample`

Under the old floor this same mutation passed this arm (#2354 recorded it as the weaker mutation). Unmutated: 37222/37222.
