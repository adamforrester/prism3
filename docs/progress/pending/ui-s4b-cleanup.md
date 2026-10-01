## (2026-10-01) — UI cleanup after S2–S4a: an unused import, the strip ground kept on purpose, and two test gaps closed (#1954)

**STATUS: PR from `ui/s4b-cleanup`.** Closes #1954, all four items. UI and tests only. No engine change and no emitted artifact moves, so no ENGINE bump, no change note, and `CONTRACT_VERSION` is unchanged. No user-visible copy changes. This is S4b.1 in the S4b scoping (the cleanup split off ahead of the Roles matrix).

**1. The unused import.** `ALL_MODES` is gone from `apps/studio/src/main.ts`'s engine import. Its only use left with `renderModeSetMenu` in #1949, and `tsc` does not flag an unused import.

**2. The strip ground stays, with its reason written down.** The issue offered "drop the paint, or comment why it stays". I kept it. The paint on each strip (`specimenRoot` in `apps/studio/src/preview/palettes.ts`) is usually covered on prism3, because every ramp has 20 steps and fills its 10- or 5-square strips. But it is the specimen-root contract that `test:chrome` measures: `EXPECT_SPECIMENS` / `groundsOf` read every strip's composited ground against `background.primary`, so dropping the paint deletes those arms. It also shows wherever the squares do not cover it: a ramp whose step count does not fill its last strip, and the opacity scale, whose squares are translucent and whose 12 steps leave a short second strip. The comment on `specimenRoot` says this. The stale comment at `chrome.css` (`.p3-sqs`) now says the paint is seen only where the squares leave it uncovered, and points there.

**3. The pinned-slider test reads a moved anchor.** Pinning seeds the anchor from the neutral's own hue and chroma, so the old read passed with the sliders pointed at the neutral. The test now types a literal anchor, `#6b5f52`, into the pinned field and reads the sliders again. **The oracle** is the engine's own `rgbToOklch(hexToRgb(…))`, bundled for Node from `packages/engine/color.ts` and applied to that literal. Neither the slider code nor the page's OKLCH meta readout feeds it. A precondition assertion checks that the new anchor is far from the pinned seed (more than 5° and 0.002 chroma apart), so a slider left on the seed cannot pass by coincidence.

**4. Prune's running labels are read.** In the Figma-menu section, after the menu's Prune posts its dry run, the test opens the menu and reads the item: it must be `"… Checking…"`. It then answers with a dry run that finds 3 items, clicks the dialog's Delete (and asserts that posts `prune:true`), and reads the item again: `"… Removing…"`. The expected strings are literals in the test (`PRUNE_LABEL`), not read from `main.ts`. The delete's result lands as the old empty dry run did, so the rest of the section runs on the same state as before. It runs on every figma column (2 themes × 3 widths).

`test:chrome`: 10038 → 10058 assertions (2 for the pinned slider, 18 for the prune labels).

### Mutations (each after a `wip:` commit, each failing by name)

| Mutation | Failure |
|---|---|
| The pinned sliders read the neutral's `hue`/`chroma` instead of the anchor's (`domains/color-palettes.ts`) | `✗ neutral: after the pinned anchor changes to #6b5f52, the read-only sliders show its hue 69.4° and chroma 0.0254 (read hue 152, chroma 0.005)`. The old pinned check still passed under this mutation, which is the gap #1954 named. |
| `'… Checking…'` → `'… Looking…'` in `main.ts` | 6 failures, one per figma column: `✗ Figma menu figma light 1280: while the dry run is out, Prune stale reads "… Checking…" (read "… Looking…")` |
| `'… Removing…'` → `'… Deleting…'` in `main.ts` | 6 failures: `✗ Figma menu figma light 1280: while the delete runs, Prune stale reads "… Removing…" (read "… Deleting…")` |

**Trap for whoever re-runs these:** `test:chrome` drives the plugin's `dist/ui.html` for the figma host, so the prune mutations need both builds. Rebuild the studio and the plugin before each run.
