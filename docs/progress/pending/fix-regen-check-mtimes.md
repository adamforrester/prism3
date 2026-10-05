## (2026-10-05) — `regen --check` keeps file mtimes, so a later browser suite doesn't read the bundle as stale

`#2102` (bundle freshness for every suite that drives `apps/studio/dist`, #2067) went red in CI at the smoke step. It was not a defect in that PR. CI runs `regen.ts --check` a second time, at "Drift gate still covers the full artifact set", after both builds and after `test:chrome`. `check()` snapshots `out/`, the emitted `schema/` files and the engine-root artifacts, regenerates them, compares, and restores. The restored bytes were identical, but plain `cpSync` gave every restored file a new mtime. `icon-glyphs.ts` is one of those files, and it is imported into the studio bundle. The new freshness check then saw `dist/main.js` as older than its sources and refused it: `✗ main.js freshness: apps/studio/dist/main.js is older than packages/engine/icon-glyphs.ts`. `test:chrome` only got through because it runs before that step.

### The fix

All six `cpSync` calls in `check()`, the three snapshot copies and the three restore copies, now pass `preserveTimestamps: true`. The file header's promise that `--check` "never leaves the tree dirty" now covers mtimes, because something reads them.

### What was considered

- **Narrowing the freshness scan to leave out `packages/engine/`.** Rejected: `icon-glyphs.ts` really is a bundle input, so the scan is right to watch it.
- **Moving the second drift step in `ci.yml` before "Build web"**, to match the order in `verify.ts`. This would fix CI only: anyone running `regen --check` by hand between a build and a browser suite would still be refused.

### The gate

Once `#2102` is on `main`, its smoke and `mode-audit` freshness checks are this fix's gate. Removing `preserveTimestamps` makes CI's late smoke step refuse the bundle by name. Locally: build the studio, run `npx tsx packages/engine/regen.ts --check`, then `find packages/engine -newer apps/studio/dist/main.js -type f`. Measured on this branch: with the fix that lists no files; with `preserveTimestamps` removed it lists every artifact the check restored, `icon-glyphs.ts` among them.
