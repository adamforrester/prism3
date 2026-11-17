## (2026-11-17) — Clearing a type size on a brand without typography leaves it unedited (#1071)

**Status:** Studio only. ENGINE unchanged (no change note: no engine code moved). CONTRACT unchanged.

### What changed

- **`setBrandSize` and `setViewportSize`** (`apps/studio/src/state/type-input.ts`) created `brandState.typography`
  before their clear path returned, and nothing removed it. On a brand that arrived without the key (a new brand, a
  `design.md` without one), setting a heading size on the Type page and pressing its reset left `typography: {}`.
  `isDirty` is exact equality, so the brand read as edited with nothing on screen to undo: the overwrite confirm fired
  on every example load. The clear paths now never create the key, and a new `pruneTypography` drops it once a clear
  empties it. **Release pinned sizes** had the same gap (it emptied `sizes` and `sizeOverrides` and kept the object)
  and takes the same prune. The docstring's "an all-cleared brand stays byte-identical" is now true.
- **Reachability:** the Type page's size picker (`apps/studio/src/domains/type.ts`, `onReset`) calls `setSizePin` and
  `setMobileSize` directly, on any brand, so this was reachable from the shipped UI. Checked by reading the call
  sites, not by driving a browser.

### Verification

`apps/studio/test-type-input.ts` §12 loads a literal brand with no `typography` key and, for a brand-wide size, a
mobile size and Release, checks that a clear on an untouched brand writes nothing and that set-then-clear is byte-identical
and not dirty. On `main` five of the nine fail (`{}`). Two `wip:` mutations fail by name: removing `setBrandSize`'s
prune fails the set-then-clear arm, and restoring `??=` on its clear path fails the clear-on-untouched arm.
