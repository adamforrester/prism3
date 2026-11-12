## (2026-11-12) — test.ts (21): the doubled-root arm reads every corpus root off its theme, and can fail (#3575)

**What moved.** Tests only; no engine change, no emission change. Block (21) EMIT-FIGMA GENERALISE checks that no emitted Figma variable name for aurora or wendys carries a second root segment after its own. It tested the tail against a spelled list, `['prism', 'nbds', 'acme']`, which held neither root the loop walks (`ads`, `wds`), so a doubled `ads/ads/…` never matched and the arm could not fail. The set is now built from the themes: this brand's `theme.root` plus the root of each of the five corpus brands (nb, aurora, harbor, prism3, wendys). A new assertion requires five distinct roots, so a theme that loses its root, or two that collapse onto one, fails there by name instead of quietly shrinking the set.

**Independence.** The roots come from the input (each brand's theme). The names come from the subject (the emitter). Neither is derived from the other (docs/34 shape 2).

**Mutation.** Committed first, then `emit-figma-font.ts` was changed to emit `${root}/${root}/font-fluid/…` (fluid names only, narrower than the issue's `nsName` mutation, which makes `test.ts` throw before it reaches this block). Result: 5 failed, including `figma generalise (aurora): and NOTHING carries a second root segment…` (DOUBLED: `ads/ads/font-fluid/display/sm/strong`, …) and the same for wendys (`wds/wds/…`). Under the old list, both arms passed. Restored, back to 0 failed.

**Already fixed upstream.** The issue's stale "two brands that take the default" comment was rewritten by #3315 before this PR. The block header's note that (e) "still tests against a hardcoded root list" is updated here.
