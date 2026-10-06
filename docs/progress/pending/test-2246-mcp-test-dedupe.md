## (2026-10-06) — mcp-test.ts runs the #2162 block once (#2246)

**STATUS: branch `test/2246-mcp-test-dedupe`.** Test only: no engine change, no emitted artifact moves. ENGINE bump class: **none owed**. `CONTRACT_VERSION` unchanged. **Fixes #2246.**

### What was wrong

`packages/engine/mcp-test.ts` carried the `#2162: a build-time refusal is an isError result, never a protocol error` block twice, byte-identical (lines 289–317 and 319–347). The second copy came from #2207, which branched off #2200's head and merged `main` in. Once #2200 was squash-merged, `main` carried the block as well, and the merge kept both copies. Every `#2162 <tool>` arm ran and counted twice, and an edit to one copy would have left the other stale under the same label.

### The fix

The second copy and its blank separator are deleted (30 lines). Before deleting, the span was asserted to be exactly the duplicate.

### Proof the count drops by exactly that block, and nothing else

A scratch copy of the suite (not committed) logged every assertion's label, before and after, and the two lists were compared as multisets:
- `Prism3 MCP suite: 79 passed` → `75 passed`;
- **dropped:** exactly four labels, once each, `#2162 theme_brand`, `#2162 theme_from_brief`, `#2162 export_theme` and `#2162 score_consumption` (`… a build-time refusal comes back as an isError result …`);
- **added:** none;
- **run more than once:** before, those four and only those; after, none.

The surviving block still guards #2200's fix. With `buildTree` moved back outside `buildBrand`'s `try`, all four `#2162` arms fail by name, once each (`71 passed, 4 failed`).
