## (2026-10-08) — test:chrome: the Build style guides field count waits for the option groups before measuring (#2341)

**Status:** test only (`apps/studio/test-chrome.mjs`, section 4, the #1031 arm re-hosted on the Build style guides page by
H12). No product code, no emitted artifact, no ENGINE bump, CONTRACT unchanged.

`main`'s CI failed twice in a row in the chrome suite with `✗ figma dark / Build style guides: measured 2 field(s) on
the page (floor 3 …)`, at `30189907` and again at `a2bfc7cb`. The same tree passed `test:chrome` locally.

- **The cause:** the arm waited only for `sg-collection` and then counted. The per-kind option groups (Color value,
  Color sample, Font sample) are built from the catalog's selection (`kindsOf(cat, S.sel)`), which renders after the
  Collection select. On a slow runner the count landed between the two.
- **The fix:** before measuring, the arm waits up to 10s for the floor of three enabled, visible fields, using the
  same selector the measurement uses. The wait's timeout is swallowed, so the floor check below still reports the
  measured count by name.
- **Trap for whoever re-checks this:** "Table header" in the floor message is a segmented control, not a field, and the
  selector doesn't count it. What reaches the floor is Collection plus the per-kind selects. The message was left as it
  was; it's a label, not the assertion.
