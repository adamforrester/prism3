## (2026-11-01) — Badge: copy the inline style made stale, as approved (#3234)

**Status:** Badge def copy + regen. ENGINE minor (change note). CONTRACT unchanged: no token path moves. No executor
change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision (2026-11-01, on #3234): Q3234.1 A, Q3234.2 A, Q3234.3 A.** The three DRAFTs from the proposal comment
  are applied verbatim in `packages/engine/components/badge.ts`, with no other prose touched:
  - the `size` prop description names both styles, in the current order (size first);
  - "next to what it describes" replaces the second sense of "inline" in `docs.usage` and in `ai.whenToUse`;
  - the do "Keep a contained label to one or two words, and use the same casing everywhere", with the matching `label`
    prop and `accessibility.labelPattern` rewording.
- Regen moves `out/components/badge.md` and `out/components/components.ai.json` only.

### For whoever re-verifies

- The approved "Inline style: …" sentence at the end of `ai.whenToUse` and the contentGuidelines line ("longer than a
  contained label's one or two words") are deliberately unchanged; the new do now agrees with the latter.
