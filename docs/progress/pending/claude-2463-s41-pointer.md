## (2026-10-14) — test:chrome §41: Interactive is reached by pointer at 640 and 800, not by keyboard (#2463)

**STATUS: branch `claude/2463-s41-pointer`.** Test only (`apps/studio/test-chrome.mjs`). No product code, no artifact moves, no ENGINE bump.

**Why.** §41 (#2383) reached Color › Interactive at 640 and 800 by focusing the sub-nav's tab and pressing Enter, because before #2393 the sub-nav ran under the preview there and couldn't take a pointer (#1975). #2393 fixed the pointer path, so the workaround kept §41 from testing what a designer does.

**The change.** §41 uses `goPlace`, as every other place in the section and the suite does, at every width. `goPlace` clicks the Color tab and the sub-tab, and Playwright's click refuses a target another element covers at its center. So a sub-nav under the preview again would stop §41's case by name, rather than being stepped around.

**Mutation, from a commit:** #2441's own (the select's wrap given back `flex: 0 1 auto; min-width: 0`, the select `width: 100%`), on rebuilt bundles → 68 failures, every one of them §41's, including at the two widths that now go by pointer: `✗ #2383 web light 640 on color-interactive in light: the mode select shows its whole label, "Light · all pass" (94px of text in a 0px content box)` and `✗ #2383 web light 800 on color-interactive in light: … (94px of text in a 81.8px content box)`. `39328/39396 chrome assertions passed`, and there's no "case stopped" line, so the pointer reached Interactive in every case.
