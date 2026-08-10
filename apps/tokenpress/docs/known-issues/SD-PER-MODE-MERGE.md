# Known Issue: Style Dictionary crashes when merging per-mode token files

**Status:** Resolved in v2.2.0 · pre-existing (since v1.6, commit `9281cfe`)
**Severity:** Medium — affected users who piped multi-mode Token Press exports into Style Dictionary using SD's default file-glob merge
**First reproduced:** 2026-05-19, validating v1.7.0 SD-preset output against `npm run test:sd`
**Resolved:** 2026-06-03, v2.2.0 — directory-per-mode export layout

---

## Resolution (v2.2.0)

Fixed via a new export shape rather than the namespace-prefixing approach
originally proposed below. Multi-mode exports now emit a
**directory-per-mode** tree:

```
tokens/
  shared/        # files from collections with only one mode
    typography.json
    shadows.json
  dark/
    colors.json
    motion.json
  light/
    colors.json
    motion.json
  wireframe/
    colors.json
    motion.json
```

Per-mode CSS in the SD preset folder is also nested under `<mode>/`.

**Why this shape (vs. the originally-recommended approach #2)** — directory-per-mode
is the convention used by Spectrum, Lightning, Primer, and Tokens Studio. It
keeps the DTCG token paths unchanged across modes (so consumers don't have to
strip a synthetic `dark.` / `light.` prefix), avoids polluting the path with
build-system metadata, and makes "one SD config per mode" the obvious and only
way to consume the export.

The downstream SD config now looks like:

```json
{
  "source": ["tokens/shared/**/*.json", "tokens/dark/**/*.json"],
  "usesDtcg": true,
  "platforms": { /* … */ }
}
```

Working examples ship in
[`examples/style-dictionary/`](../../examples/style-dictionary/) for SD v4/v5
(via `usesDtcg: true`) and SD v3 (with a parser shim). The pre-v2.2.0
mitigation patterns below are no longer needed.

Verification: against the same multi-mode export, the naive `tokens/**/*.json`
glob still produces 1712 token collisions and the SD `flattenProperties` crash;
the new per-mode configs produce zero token collisions and a clean 1024-line
CSS file per mode (see `tests/sd-per-mode/`).

---

## Original report (preserved for context)

---

## Summary

When Style Dictionary loads a Token Press export that contains per-mode files (e.g. `typography.json` + `typography-desktop.json` + `typography-mobile.json`) using a glob source like `tokens/**/*.json`, the build crashes with `RangeError: Maximum call stack size exceeded` inside `flattenProperties.js`.

This affects **both** DTCG-default and SD-preset exports — it has nothing to do with dimension format. The issue is that per-mode files share the same path namespace (`nbds.font.size.display.lg`) but carry different `$value`s for each mode, so SD's merge produces a self-referential resolution chain.

## Reproduction

1. Export tokens from a Figma file with at least one multi-mode collection (e.g. typography with `desktop` + `mobile` modes) using either DTCG defaults or the SD preset.
2. The exporter writes both a base file (`typography.json`) and per-mode files (`typography-desktop.json`, `typography-mobile.json`).
3. Run Style Dictionary against the export with the default config:

   ```json
   {
     "source": ["tokens/**/*.json"],
     "platforms": {
       "css": {
         "transformGroup": "css",
         "buildPath": "build/css/",
         "files": [{ "destination": "variables.css", "format": "css/variables" }]
       }
     }
   }
   ```

4. SD warns about collisions, then crashes:

   ```
   Collision detected at: nbds.font.letterspacing.heading.default! Original value: dimension, New value: dimension
   Collision detected at: nbds.font.letterspacing.heading.default! Original value: {nbds.font.letterspacing.normal}, New value: {nbds.font.letterspacing.normal}
   ...
   RangeError: Maximum call stack size exceeded
       at flattenProperties (.../style-dictionary/lib/utils/flattenProperties.js:29:20)
   ```

> **Note (v3.0.0):** the `RangeError` above is the original 2.2.0-era
> reproduction and is preserved here as the historical record. Re-running the
> naive glob against a current export **no longer crashes** — it exits 0. The
> stack overflow needed a specific alias-cycle shape the exporter has since
> stopped producing. The collision warnings remain, and they're the durable
> symptom: 1712 real token collisions, silently resolved last-write-wins. See
> [`tests/sd-per-mode/README.md`](../../tests/sd-per-mode/README.md) for
> current figures and the two collision classes.

## Root cause analysis

The exporter's per-mode CSS feature (added in `9281cfe`) emits one file per mode for variables that have multiple modes. Each file uses the **same DTCG path** for the same logical token, just with a different concrete value. Example:

```jsonc
// typography-desktop.json
{ "nbds": { "font": { "size": { "display": { "lg": {
  "$type": "dimension",
  "$value": "{nbds.font.size.120}"
}}}}}}

// typography-mobile.json — same path, different value
{ "nbds": { "font": { "size": { "display": { "lg": {
  "$type": "dimension",
  "$value": "{nbds.font.size.96}"
}}}}}}

// typography.json — composite tokens that REFERENCE that path
{ "typography": { "display": { "lg-book-condensed": {
  "$type": "typography",
  "$value": { "fontSize": "{nbds.font.size.display.lg}", ... }
}}}}
```

SD's default merge picks one of the two `nbds.font.size.display.lg` definitions (last-write-wins), and during reference resolution something about the merged tree creates a cycle in `flattenProperties`. Every individual file builds fine in isolation; the failure is purely in the merge.

### Why this is not a v1.7.0 regression

I verified by:

1. Running SD against the v1.7.0 **DTCG-default** export → same crash
2. Running SD against the v1.7.0 **SD-preset** export → same crash
3. Running SD against each individual file alone → all 16 build cleanly
4. Running the curated baseline `npm run test:sd` (no per-mode files) → builds cleanly

The dimension-format change in v1.7.0 doesn't touch path generation or per-mode file emission, so it cannot cause this. The crash exists on `main` before this branch was cut.

## Mitigations (for users today)

Until fixed, users piping Token Press output into Style Dictionary have three options:

1. **Build per-mode**, one SD config per mode file. Natural mapping of "Figma mode → output platform variant":

   ```json
   { "source": ["tokens/typography-desktop.json", "tokens/typography.json", "tokens/core-*.json"] }
   ```

2. **Skip the per-mode duplicates** in the SD source glob:

   ```json
   { "source": ["tokens/**/*.json", "!tokens/**/*-desktop.json", "!tokens/**/*-mobile.json"] }
   ```

3. **Disable per-mode CSS export** in Token Press settings (where exposed) and consume the merged single-mode output.

## Proposed fixes (in priority order)

1. **Namespace per-mode files** by mode name in the path: `nbds.modes.desktop.font.size.display.lg`. Pros: SD merges cleanly, mode is explicit in the consumer. Cons: breaking change to consumer paths; needs a release note.

2. **Emit per-mode files into separate top-level keys** (`tokens.json`, `tokens-desktop.json`, `tokens-mobile.json`) with the mode name as the root: `desktop.nbds.font.size.display.lg`. Less disruptive than #1 because the base file is unchanged.

3. **Add a "single-file mode-merged output" option** that bundles all modes into one DTCG file using `$extensions.figma.modes` to disambiguate. Avoids the merge problem entirely at the cost of a more complex schema.

4. **Documentation-only fix:** ship as-is, add a Style Dictionary section to README explaining the source-glob pattern. Cheapest, but doesn't fix the underlying surprise.

## Recommended path

Approach #2 is the lowest-risk structural fix — non-base files get a mode-prefixed root that SD will merge as siblings rather than collisions. This keeps the base file backwards-compatible for users who consume only `tokens.json`. Estimate: ~1 day to implement + regenerate fixtures.

In the meantime, ship v1.7.0 with the documentation-only mitigation (option #4) since v1.7.0 is itself a breaking-change release; bundling another schema change would complicate the migration story.

## Related

- Originating commit: `9281cfe` — feat: Export CSS custom properties per mode instead of merging all modes
- Verified during: v1.7.0 spec-compliance work (`feature/sd-compat-toggle`)
- Test fixtures used to reproduce: `test-examples/tokens - dtcg - 3.1 /` and `test-examples/tokens-sd - 3.2/`
