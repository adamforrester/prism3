# Legacy Files

These files are **obsolete** and **not used** by the current build process.

## Files in This Directory

### `working-code.js`
- Old monolithic JavaScript version of the plugin
- Before the TypeScript refactor
- Kept for reference only

### `simple-code.js`
- Simple test/debugging version
- Used for early development
- Not part of production plugin

## Why Are They Kept?

Historical reference only. These may contain logic patterns that could be useful to review, but they should **never be edited** for plugin changes.

## Current Plugin Source

The actual plugin source is in TypeScript:
- `src/plugin/exporter.ts` - Main export logic
- `src/plugin/scanner.ts` - Token scanning
- `src/plugin/validator.ts` - Validation
- `src/code.ts` - Entry point
- `src/types/*.ts` - Type definitions

**Always edit the TypeScript files, never these legacy JavaScript files!**
