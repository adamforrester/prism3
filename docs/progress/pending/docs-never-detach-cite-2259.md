## (2026-10-10) — docs/46 cites #2259, and prism3-rebind states createAutoLayout plainly (#2357 follow-up)

**STATUS: branch `docs/never-detach-cite-2259`.** Docs and skill text only. No engine code, no artifact moves, no ENGINE bump owed (the #1328 precedent, as #2357). `CONTRACT_VERSION` unchanged.

Two non-blocking notes from Lane D's #2357 review. Both land here because CLAUDE.md says a correction to a branch under review goes in as a follow-up:
- **The citation.** The orchestrator's record of owner decision Q131 (on #2357) gives the heading as `Decided (2026-10-06, #2259): …`, while #2357 had kept the issue-less form. Now `docs/46-never-detach.md`'s heading cites #2259, and so do `docs/42`'s row and `decisions-index.json`'s `issue`. The JSON is a **hand edit**: `lint-decisions-index --accept` only appends and refuses to rewrite an existing row, so changing a row is a superseding edit by design.
- **`createAutoLayout`.** The skill's trap row said it "may not exist". It isn't in the plugin typings at all, so the row now says it isn't part of the plugin API.

**Verified.** `lint-decisions-index` and `lint-skills` are clean. Mutation: setting the JSON row's issue to 2258 fails `lint-decisions-index` by name in both directions (`ROW NOT FOUND` for the row, `UNINDEXED DECISION` for the heading), so the citation is checked, not decorative.
