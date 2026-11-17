## (2026-11-17) — TokenPress: gradient paint styles export as DTCG gradient tokens (#731)

**Status:** TokenPress (guest port), the exporter-comparison harness, and the plugin's read-back parity test. No
engine file, emission, token name or component surface moves, so no engine change note is owed
(`packages/engine/changes/README.md`: a change that owes no bump carries none) and `CONTRACT_VERSION` stays.
TokenPress records the change in its own `docs/CHANGELOG.md` under [Unreleased].

### What changed

- **The scanner reads a fifth channel**, `figma.getLocalPaintStylesAsync()`. Until now it read four, so every gradient
  in a file was missing from the export, with no warning.
- **`TokenExporter.exportGradients`**, built like `exportShadows`, writes `gradients.json` (`shared/` in a multi-mode
  export). A style whose one visible paint is a gradient becomes `$type: "gradient"`, `$value: [{ color, position }]`:
  DTCG Format Module 2025.10 §9.6, which defines the type. A stop bound to a color variable is an alias through the
  same `createAliasReference` and active namespace the variable files use. An unbound stop is a literal in the
  export's color format.
- **Representation, an owner decision, built as recommended:** DTCG's gradient holds stops only, so the kind
  (`GRADIENT_LINEAR`/`RADIAL`/`ANGULAR`/`DIAMOND`), the transform and a paint opacity other than 1 go in
  `$extensions.figma`, beside `styleId`, the way `shadows.json` keeps `effectTypes`. The alternatives were a
  non-standard `$value` field (an angle) that stock consumers would reject, or dropping the geometry. Neither was built.
- **Skips.** A style that layers a gradient with other visible paints has no single-gradient form. It is skipped, its
  name collected (`getSkippedGradientStyles()`) and logged. Solid and image paint styles are not gradients and are
  left alone. Both are follow-ups: #3884 (solid paint styles), #3885 (show the skip in the UI). #3886 covers the
  optional CSS format, which writes `gradient` (and already `cubicBezier`) values as JSON.
- **Tests, TokenPress's own:** `tests/unit/gradient-paint-styles.test.ts`, 6 tests in the suite's `ADDED` census,
  driven through `exportToZip` with a stubbed `figma` global (the exporter builds its own scanner, so the global is
  the only seam). All 6 fail against main's `scanner.ts` and `exporter.ts`.
- **The gate.** The harness adapter now feeds `gradient-styles.json` into the paint channel, each stop's `alias`
  rebound to a variable id. Its transform is an identity matrix: the comparison pairs `$value`, which carries no
  angle on either side. The gate went red with `STALE MEMORY: gradient.brand … now PAIRS` for aurora and prism3, as
  #731 said it would. The four `KNOWN_UNREACHABLE` entries are deleted, and `gradient` joins the gate's `STYLE_TYPES`
  (an unrooted `gradient` group comes from a style, not from a variable that lost its root). Both brands' gradients
  pair with `$value` byte-identical to the engine's DTCG. compare.ts drops its now-false "unreachable" verdict.
- **Read-back parity** built its shim input with no paint styles, so the Apply Theme side offered none while the
  emission side now did (REMOVED 2 per brand). It now passes `file.styles.paint`, so the gradients Apply Theme writes
  cross the export comparison as well: ADDED/REMOVED/VALUE 0 on aurora, prism3 and wendys.

### Verification

Mutations on a `wip:` commit, each failing by name: the scanner's paint call replaced with `[]` (5 TokenPress tests),
the bound-stop alias branch disabled (2 tests), the layered-gradient skip disabled (1 test), and the harness stub's
paint channel emptied (the gate fails with `UNPAIRED (prism3-only), NOT IN THE MEMORY: gradient.brand` / `.glow` on
aurora and prism3).
