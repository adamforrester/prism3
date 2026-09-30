## (2026-09-30) — The paste script refuses a set whose axes changed, and places a new set beside the page's content (#1809)

**STATUS: PR open from `lane/paste-axes-placement`, labeled DO NOT MERGE.** Engine bump owed (`engine: minor`, change note `lane-paste-axes-placement.md`).

**What was wrong.** The plugin got two find-or-create fixes, #1780 (#1808: refuse a set whose variant axes differ from the plan's) and #1750 (place a new set beside the page's content). The MCP paste script's chunk body (`PAYLOAD_CHUNK_BODY` in `anatomy-figma.ts`) has its own find-or-create and got neither. A paste after an axis change appended every member into the old set, which Figma then reports as broken, and a second set pasted onto a page landed at the origin over the first.

**The fix.** Both rules are written into the chunk body again, not shared: the paste script cannot import the plugin, and a shared helper would leave the parity arm comparing one function with itself (docs/34 shape 2).
- **Refusal.** The axis lists are read off the member names, as `memberAxisLists` does. The miss is the plugin's string, character for character, and the result carries `axesChanged` as the plugin's does.
- **On every chunk, not only chunk 1.** The issue said only chunk 1 needs the check, since later chunks append into the set chunk 1 made. That holds when chunk 1 created the set. When chunk 1 was refused, chunk 2 finds the old set by name and would append into it. On a set chunk 1 made, the check always passes, so running it everywhere costs nothing but bytes. Mutation a2 (`if(set&&FIRST)`) shows the difference.
- **Placement.** `placeNewSet`'s rule: top-aligned with the sets already there (or all content when there is none), 160 right of everything overlapping the set's row. Only when the chunk creates the set, which is chunk 1. A set that exists keeps its position.

**The deliberate limit.** Chunk 1 places the set using its own height. Later chunks grow the set down and right and do not move it, while the plugin places once at the finished height. So a node below chunk 1's rows but inside the finished set's rows can be covered by the paste where the plugin would have pushed past it. Filed as #1856 rather than fixed here.

**Bytes.** Every chunk carries the new code. The first, indented spelling cost 1,511 bytes of shell; the compacted one costs 1,176. Either way icon-button's set packs into 16 chunks, up from 14, and the pin in `test.ts` moves with a note. The position read-back the plugin has was left out: the stub stores `x`/`y` as plain fields, so no gate could make it fail.

**Tests** (`test.ts`, the `#1809` block after the #1798 split grid). Every expectation is a literal: the miss strings, the axis lists, the pinned 504x348 box of the 36-member button set, and every coordinate (664,0 beside it; 1160,0 past a note in the row but not a header above; 760,40 beside content with no set). The plugin runs on the same page states as the parity arms.

**Review round.** Independent review found two arms missing, each shown by a mutation that left the suite green. First, a hand-made child (`Button copy`) inside the existing set: the coordinate-name filter keeps it from counting as an axis list, so pasting all 36 still appends the 9 new members. Second, a node wholly below the row: it does not push the set, which stays at 664,0. Both arms run the paste and the plugin on the same page state, and each reviewer mutation now fails its arm by name.
