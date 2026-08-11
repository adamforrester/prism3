# Source Files Directory

## ⚠️ Important: TypeScript vs JavaScript Files

This directory contains both **active TypeScript source files** and **obsolete JavaScript files**.

### ✅ Active Source Files (Edit These)

```
src/
├── code.ts                 # Main plugin entry point
├── ui.html                # Plugin UI
├── types/
│   ├── dtcg.ts           # DTCG type definitions
│   └── plugin.ts         # Plugin interfaces
├── plugin/
│   ├── scanner.ts        # Token scanning
│   ├── validator.ts      # Validation
│   └── exporter.ts       # Export & transformation logic
└── utils/
    └── *.ts              # Utility functions
```

### ❌ Legacy Files (DO NOT EDIT)

```
src/
├── working-code.js        # OBSOLETE - Old monolithic version
└── simple-code.js         # OBSOLETE - Test file only
```

**These .js files are NOT used by the build process and NOT loaded by the plugin!**

## Build Process

1. TypeScript source files are compiled by Vite
2. Output goes to `dist/code.js`
3. Plugin manifest points to `dist/code.js`

## To Make Changes

1. Edit `.ts` files (especially `plugin/exporter.ts` for token logic)
2. Run `npm run build`
3. Reload plugin in Figma
4. Test your changes

## Why Are Legacy Files Still Here?

They are kept temporarily for reference but should be moved to a `legacy/` folder or deleted.

**Recommendation**: Move to `src/legacy/` to avoid confusion.
