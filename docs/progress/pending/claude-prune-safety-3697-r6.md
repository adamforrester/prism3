## (2026-11-12) — A confirmed prune saves a version, needs the applied brand and its preview's hash (#3697 R6)

The owner decided R6 (#3697 H2) as recommended: a confirmed prune saves a named version first, is refused unless the
file holds the input it was sent, must echo its preview's `previewHash` as `update-components` does, tries each
removal on its own, and reports running counts.

### What changed

- **The guards, in `main.ts`'s `prune`, in order.** `holdsInput` (the brand Apply Theme stored) must equal the input;
  the confirm's `previewHash` must equal the hash a fresh read gives now (`prunePreviewHashOf`, over the plan and the
  stale canvas labels); then `saveVersion({ run: 'prune' })`, and a version that cannot be saved removes nothing. The
  plan is built from the input, which need not have been applied, so before this an agent's confirm with an input the
  file never held could remove variables and modes that built sets still bind.
- **Each removal tried on its own.** `applyPrunePlan` records a `remove()` that throws in `PruneResult.failed` and
  goes on; `pruneFurniture` does the same. The counts live in a `counts` object the caller owns, so a throw outside a
  removal still reports what was removed (`PRUNE_COPY.stopped`) instead of `count: 0`.
- **Protocol.** `prune`'s args are now `{ input, confirm: false } | { input, confirm: true, previewHash }`; a confirm
  without one is `bad-args`. The panel's Clean up carries the preview's hash to its Delete (`prunePreview.previewHash`).
  The agent-link guide, `commands.json`, the bridge tool's description, `tools/figma-mcp` and the adherence scorer
  (a hashless confirm is refused before any write, so it is not counted as one) follow.

### For whoever re-verifies

- `test-prune-main.ts` drives the real `main.ts` over `file-shim.ts`: Apply Theme, three planted stale variables,
  then an unapplied input, a missing hash, a wrong hash, and a confirm whose second removal throws. Every expected
  line is a literal; the version-first order is read from one log of host calls.
- The refusal lines, the version title and the "could not be removed" line are DRAFTS for the owner (`PRUNE_COPY`,
  `versionOf({ run: 'prune' })`).
