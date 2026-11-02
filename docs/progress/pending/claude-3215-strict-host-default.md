## (2026-11-02) — The plugin test shim's host is strict by default; a shrink-only register holds the opt-outs (#3215 Q-C8 A)

`makeShim` in `apps/plugin/component-shim.ts` now fixes its host's methods and its root's methods by default: own data properties, neither writable nor configurable, as Figma defines `figma`'s. Before this, only the three arms #3214 opted in could see #3209's class of bug, a `Proxy` over the host that hands back a bound copy. Any new wrapper around the host, in any action, now fails in the plugin's own tests the way it fails in Figma. This is test-harness only: no plugin or engine behavior moves, so there is no change note.

### What changed

- **The default reads a fixture.** `apps/plugin/host-descriptors.json` records each host surface as `fixed` or `plain`, and where that came from. `figma` is `measured` (#3209's real-host error names `getLocalTextStylesAsync` as read-only and non-configurable). The root is `assumed` fixed, the stricter case #3214 already tested. Nodes are `unmeasured` and stay plain. The canary's descriptor read (`tools/figma-canary`) is the measurement that will settle the root and nodes.
- **The opt-out is named and registered.** A suite that patches a host method after building the shim passes `makeShim({ looseHost: '<reason>' })`. An empty reason throws. Each call site opts out alone, so the rest of the suite stays strict.
- **The register can only shrink.** `apps/plugin/loose-host-register.json` lists each opting-out suite with its reason. `test-loose-host.ts`, now in the plugin's `test` step, fails `register/unlisted` for an opt-out not in the register, `register/stale` for an entry nothing uses, and `register/shrink-only` for an entry that is not in the register at the merge base. The base is read from git history, not the tree, because a ceiling in the tree gets edited in the same commit as the entry it should refuse (`docs/34` shape 6). Until the register reaches main, the base is the seed measured below.

### The seed: 10 suites, not the proposal's 9

Each suite that imports the shim was run alone with the strict default and no opt-out, on main `fa3c934b`. Ten failed, each on a host method it reassigns after building the shim (or, in `test-run-read`, a `Proxy` over the root that substitutes its search):

- `test-build-completed`, `test-open-large-file`, `test-run-progress`, `test-update-fresh`: `root.findAllWithCriteria`;
- `test-native-slots`: `createComponentFromNode`;
- `test-roundtrip`, `test-slot-constraints`: `combineAsVariants`;
- `test-run-read`: a `Proxy` over the root substituting `findAllWithCriteria`;
- `test-update-apply`: `loadFontAsync` and `createNodeFromSvg`;
- `test-write-components`: `createNodeFromSvg`.

The proposal's grep counted 9 by a different measure and named a different set: `test-cover-frame`, `test-library-about` and `test-canvas-furniture` pass strict, since what they patch is a node or a copy rather than the shim's host; `test-open-large-file`, `test-roundtrip`, `test-run-progress` and `test-update-fresh` reassign the root's search or `combineAsVariants`, which the grep missed.

**Trap for whoever re-verifies this:** spreading a strict shim (`{ ...shim }`) makes plain properties again, so a suite that builds its host as a spread copy is loose without opting out. #3214's arms call `fixHostMethods` on their copies for that reason; a new arm that copies the host should too.
