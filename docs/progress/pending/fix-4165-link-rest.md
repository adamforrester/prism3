## (2026-11-19) — The resting link state is `rest` (CONTRACT 16.0.0, #4165)

The owner chose A on #4165: rename the four `….link.default` tokens to `….link.rest`, with deprecation pointers. The links were the one family whose resting state wasn't `rest`, and `default` is also a weight role, an easing role, a transition and a scrim.

### What changed
- **Engine.** `LINK_STATES` in `modes.ts` and `color-order.ts` reads `rest`. `CONTRACT_VERSION` 15.1.0 → 16.0.0, with `token-contract.ts --accept` after the bump. The guaranteed diff is exactly 4 removed and 4 added.
- **`DEPRECATIONS`.** Four new entries, `since: '16.0.0'`, listed literally in `LINK_REST_FAMILIES`. Eight older entries pointed at a `….link.default` (the #891 / #1140 on-inverse ones and the #1148 appearance-tier ones). They now follow it to `….link.rest` through `followLinkRest`: `path` is history, `replacedBy` follows the live name.
- **Old override keys.** `withRestLinkKeys` (`theme-brand.ts`) reads an override keyed `….link.default` as `….link.rest`. `modes.ts` skips an override for a role a mode doesn't emit, without a word, so a saved brand input would otherwise lose its pinned link with no warning.
- **Consumers.** Link and Breadcrumbs bindings, the preview spec, Studio's link-family controls and Links preview (the state label now reads "rest"), `lint-skills` / `lint-voice` fixtures, `prism3-rebind`, and every test that named the old leaf.

### Traps for whoever re-verifies this
- `schema/token-contract.json` lists 12 `….link.default` paths, but only 4 are guaranteed. The other 8 are already-retired paths in its `deprecations`. A first draft gave all 12 new entries, and `--check` caught it as dangling pointers.
- The four #1148 appearance-tier entries used to be "tier-only" and projected no Figma rename. Following `rest`, they now project the same `default → rest` rename as the 16.0.0 entries, and `renameMap()` collapses each pair to one row. `test.ts`'s rename-map counts move with it: tier-only 237 → 233, projecting 278 → 286, twice-claimed 119 → 123, shipped 159 → 163, and a new 16.0.0 era of 4.
- The NB Figma fixture is the frozen real export, so it keeps `link/default`. The rename is declared in `NB_KNOWN_RENAMES`, which keeps the value checked, rather than made by editing the fixture.
- `tools/agent-adherence/packets/*` are built from a pinned commit and keep the old names. `packets.ts --check` holds them to the pin.
