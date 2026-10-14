## (2026-10-14) — test:chrome §42: a choice row drawn again already holds its words when its region goes in (#2472)

**STATUS: branch `claude/2472-s42-redrawn-region`.** Test only (`apps/studio/test-chrome.mjs`). No product code, no artifact moves, no ENGINE bump.

**Why.** `lever-kit.ts` says a choice row that leaves the page and is drawn again "gets a new region that already holds its words when it is put in the document, which is not announced". `syncLive` gets that from its order: `sayLines` fills the region, then the holder takes it. No arm held that order: with the two swapped, `test:chrome` passed in full (#2458 round 2's review), because no §42 case came back to Type while a warning showed.

**The change: §42 arm (5)**, on Aurora, where Compact is refused for the title floor. After arm (3), the case:
1. leaves Type for Shape;
2. puts a `MutationObserver` on the live-region holder (`childList`, `characterData`, `subtree`);
3. comes back to Type.

It asserts four things:
- the holder exists;
- a record adds the Type scale row's region (`data-key` `typography.typeScale`);
- that region now says exactly the refused-Compact sentence (a literal typed here);
- no record targets anything but the holder itself.

A region filled after it went in would make a record on that region, or on a paragraph inside it. The arm reads only the browser's records, never `lever-kit.ts`.

**Mutation, from a commit:** the issue's own swap (`syncLive` puts a new region in the holder, then `sayLines` fills it), on rebuilt bundles → `✗ §42 web light 1280 Aurora: (5) back on Type, the Type scale row's new region is put in the document already saying the refused-Compact line, and nothing in a region already in the document changes (holder true, region added true, lines ["Compact can't be used …"], 1 record(s) inside a region — [{"type":"childList","onHolder":false,"target":"typography.typeScale","added":["P"]}])`, and the same line for figma. `39396/39398 chrome assertions passed`: arm (5) on both hosts, nothing else.
- With the swap, the region still ends up saying the sentence, so a check on the final text alone would pass. Only the record inside the region shows the order.
