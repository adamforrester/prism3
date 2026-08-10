# Claude Code Custom Instructions for Token Press

## ⚠️ CRITICAL: Read This First!

### This is a TypeScript Project

**NEVER edit these files** (they are obsolete legacy files):
- `src/working-code.js` ❌
- `src/simple-code.js` ❌

**ALWAYS edit these files** for plugin changes:
- `src/plugin/exporter.ts` ✅ - Main export and transformation logic
- `src/plugin/scanner.ts` ✅ - Token scanning
- `src/plugin/validator.ts` ✅ - Validation logic
- `src/code.ts` ✅ - Main entry point
- `src/types/*.ts` ✅ - Type definitions

### Build Process

1. **Source**: TypeScript files in `src/`
2. **Build**: `npm run build` → compiles to `dist/code.js`
3. **Plugin loads**: `dist/code.js` (specified in manifest.json)

**Your changes won't work unless you:**
1. Edit the `.ts` files (not `.js` files)
2. Run `npm run build`
3. Reload the plugin in Figma

## Quick Reference

### For Token Export Logic Changes
→ Edit `src/plugin/exporter.ts` (orchestration)
→ Edit `src/plugin/converters/*.ts` (conversion logic)
→ Contains: type mapping, value conversion, composite token compilation

### For New Token Types
1. Update `src/types/dtcg.ts` with new type definitions
2. Create new converter in `src/plugin/converters/` extending `BaseConverter`
3. Update `src/plugin/exporter.ts` to use new converter
4. Build and test

### For Validation Changes
→ Edit `src/plugin/validator.ts`

## ES2018 Compatibility Required

Figma's plugin environment is ES2018 only. **NO**:
- Optional chaining (`?.`)
- Nullish coalescing (`??`)
- Conditional spread (`...(condition && { prop: value })`)

**YES**:
- Explicit checks: `obj && obj.prop`
- Object.assign() for merging
- Traditional if statements

## Workflow

1. Read existing code to understand patterns
2. Make changes to `.ts` files only
3. Run `npm run build`
4. Test in Figma
5. Update `agents.md` with any significant changes

## ⚠️ Variable-Token Hot Path Lives in `exporter.ts`, Not the Converter Classes

When changing how **variable tokens** (FLOAT/COLOR/STRING/BOOLEAN) are emitted — including dimension/duration/grid/opacity formatting — the path that actually runs is the inline FLOAT switch in `convertVariableValue()` inside `src/plugin/exporter.ts` (~line 596).

The Strategy-pattern `DimensionConverter` class in `src/plugin/converters/` is instantiated but **not invoked** for variable tokens during the main export flow. Editing only `dimension-converter.ts` will NOT change exported JSON for variables.

| Change you want to make | File to edit |
|---|---|
| Variable-token dimension formatting | `convertVariableValue()` in `src/plugin/exporter.ts` |
| Text-style dimension formatting | `src/plugin/converters/typography-converter.ts` |
| Shadow dimension formatting | `src/plugin/converters/shadow-converter.ts` (this one IS used) |

If you touch `dimension-converter.ts` for a fix, also edit `exporter.ts` or the change won't ship. (Future cleanup: make exporter actually delegate to `DimensionConverter` and remove the inline duplication.)

## DTCG-Spec Dimension Output (v1.7.0+)

`ExportOptions` includes:

- `dimensionFormat: 'object' | 'string'` — controls dimension `$value` shape
  - `'object'` (default, DTCG-spec): `{ value: 16, unit: "px" }`
  - `'string'` (Style Dictionary compat): `"16px"`
- `letterSpacingFormat: 'object' | 'string'` — same idea for letter-spacing
  - Percent letter-spacing always emits as a string regardless of this setting (CSS-style)

UI exposes paired **"Apply Style Dictionary preset"** / **"Reset to DTCG defaults"** buttons that stamp values into the existing dropdowns (one-shot — user can override anything afterward). When updating preset behavior, edit `applySDCompatPreset()` / `applyDTCGDefaults()` in `src/ui.html`.

## Plugin Testing Loop

There is no automated UI test path. After UI/exporter changes:

1. `npm run build` — proves the bundle is parseable (does NOT prove the feature works)
2. Adam manually reloads the plugin in Figma desktop
3. Adam exercises the UI and reports observations

Don't claim a UI change is "verified" just because the build is clean. Surface a short list of expected observations so Adam can check each one.

## More Details

- **`docs/ARCHITECTURE.md`** - Complete system architecture, design patterns, and extension points
- **`docs/OPTIMIZATION_PROGRESS.md`** - Optimization history and metrics
- **`agents.md`** - Legacy development notes
- **`WIP-SD-COMPAT.md`** (if present) - Active feature scratchpad for v1.7.0 spec-compliance work
