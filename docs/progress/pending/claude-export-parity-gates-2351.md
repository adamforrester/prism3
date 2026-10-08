## (2026-10-08) — Export parity gates: web vs plugin export, and the applied file's read-back (#2351 gaps 1 and 2, offline)

Two new CI gates for #2351. The owner asked for an automated check that the exported tokens are correct, and that the plugin's export matches the web studio's.

### Gap 1 — `npm run -w @prism3/studio test:export-parity`

The plugin's iframe is the studio's UI, imported whole. So "the plugin's token export" and "the studio's token export" are the same `exportTokens` → `projectDtcg` in two bundles built with two `PRISM3_HOST` defines. The gate drives **both built bundles** in Chromium through the person's path: start screen, then Export, then Download with default settings. It compares the downloaded bytes in two ways:
- **PARITY:** web === plugin, byte for byte.
- **ACCURACY:** each one === the committed `out/<id>.tokens.json`, byte for byte.

The second rule is what makes the first one worth having. The expected file is the engine's Node CLI emission (`emit-dtcg.ts` / `cli.ts`, run by regen), which runs no studio code. A defect both bundles share still fails, and parity alone would miss it.

Brands are discovered from `out/*.tokens.json` and placed in both directions: the start screen's 3 example chips, plus wendys pasted as its design.md. nb is excluded with its reason: it is the regression fixture from `nbTheme()`, so it has no BrandInput a UI can load. Measured today: all 4 gated brands are byte-identical across all three (aurora 879,562 bytes, harbor 859,432, prism3 952,306, wendys 886,157). No normalization rule was needed.

### Gap 2 — `npm run -w @prism3/plugin test:readback-parity`

The pipeline: design.md → `runApplyTheme` (the sequence `main.ts` runs) into `FileShim` → TokenPress's real `TokenExporter` reading the shim as its host. That export is compared with the same exporter run over the committed `out/figma/<brand>/` emission. Each difference prints by `<zip file>#<path>` as ADDED, REMOVED, RETYPED, VALUE or DESCRIPTION, and every count is asserted at 0.
- **One stated tolerance:** half an 8-bit step inside a color. The emission stores float32 channels and the shim stores float64, so the exporter's 4-place rounding can leave them 0.0001 apart.
- **Why the exporter is the same on both sides:** it is held constant on purpose, so what differs is the file. `gate.ts` already holds the emission's export to the engine's DTCG on the defect arms.
- **The two channels TokenPress doesn't read** are compared as written: grid styles, and gradient paint styles (#731).
- Brands come from `out/figma/`: prism3, aurora and wendys. nb is excluded for the same reason as in gap 1.

`FileShim` moved, unchanged, from `test-mcp-paste.ts` into `apps/plugin/file-shim.ts`. That keeps one file model for both suites rather than adding a second mental model of Figma (the #874 reason).

### What the first run found: #2365

`color/interactive/primary/subtle-fill/selected` came back as `{components: [null, null, null]}` from the shim's export in all 4 modes of all 3 brands. The cause is not the plugin. Since #1646, Apply Theme writes a tinted wash as an **alias with opacity**, which the host accepts. TokenPress can't read that shape and exports invalid DTCG. The exporter-comparison adapter has a matching gap: it drops `aliasOpacity` and hands TokenPress a plain alias, so `gate.ts` has been comparing the wash as an opaque alias.

Filed as #2365. The gate carves these leaves out as a **bijection** against the emission's own `aliasOpacity` variables, so when TokenPress learns the shape, the carve-out fails. Each wash is then checked as written: its color alias and its opacity alias, by name, per mode.

### Mutations (each committed first; each fails by the named arm)

- A FLOAT write off by one (`core/dimension/4`) → `<brand> export: VALUE — 1` on all 3 brands.
  - The first attempt mutated `space/md`. It was a **non-mutation**: `space/md` is an alias, so that write path never reached it. Check that the mutation hits the thing that decides.
- One effect layer dropped → `export: VALUE` on `shadow.md` and `shadow-dark.md`.
- Grid gutter +2 → `grid styles: VALUE — 6`.
- Wash opacity aliased to the color → `washes (#2365): … written as its color alias at its opacity alias`.
- One text style never written → `export: REMOVED — 1`.
  - The first attempt named a style that doesn't exist (`body/md/regular`): another non-mutation, and green for that reason.
- Plugin-host-only value change in `exportTokens` → `PARITY` and the plugin `ACCURACY` fail; the web side stays green.
- The same change in both hosts → both `ACCURACY` arms fail, and `PARITY` stays green. This is the case rule 2 exists for.

### Out of scope, left for #2351

- The live read-back script: the same diff over a real file through the agent link's `readback`.
- The owner's product question about what TokenPress is for.
- Gap 3 (spot checks independent of the engine).
