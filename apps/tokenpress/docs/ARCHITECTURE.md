# Token Press Architecture

**Version:** 1.7.0
**Last Updated:** May 2026
**Status:** Production

> **1.7.0 note — dual-mode dimensions.** As of 1.7.0 the exporter emits
> DTCG-spec object-form dimensions (`{ value, unit }`) by default, with a
> string-form (`"16px"`) fallback for Style Dictionary consumers. The
> output shape is controlled by `ExportOptions.dimensionFormat` and
> `ExportOptions.letterSpacingFormat`. The variable-token hot path lives
> in `exporter.ts` (`convertVariableValue` FLOAT switch via
> `formatDimensionValue`), **not** in the converter classes — editing only
> `DimensionConverter` will not change variable output.

## Table of Contents

- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Extension Points](#extension-points)
- [Performance Optimizations](#performance-optimizations)
- [Technical Constraints](#technical-constraints)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

Token Press is a Figma plugin that exports design tokens to DTCG (Design Tokens Community Group) compliant JSON format. The plugin is architected using the Strategy pattern for maximum extensibility and maintainability.

### Key Features

- **DTCG Compliance:** Exports to W3C DTCG specification format
- **Multi-token Support:** Variables, typography composites, shadow effects
- **Performance Optimized:** O(1) caching, adaptive batch processing
- **Type Safe:** Strong TypeScript typing with ES2018 compliance
- **Extensible:** Plugin architecture for additional export formats

### Technology Stack

- **Language:** TypeScript (ES2018 target for Figma compatibility)
- **Build Tool:** Vite with Rollup
- **Package Manager:** npm
- **Code Quality:** ESLint, Prettier, Husky pre-commit hooks
- **Dependencies:** JSZip for archive creation

---

## Architecture Principles

### 1. Separation of Concerns

Each module has a single, well-defined responsibility:
- **Scanner** - Enumerate Figma design resources
- **Converters** - Transform Figma types to DTCG format
- **Cache Manager** - Optimize variable lookups
- **Exporter** - Orchestrate export process
- **Validator** - Validate token integrity

### 2. Strategy Pattern

Token converters use the Strategy pattern, allowing different conversion strategies for different token types:

```typescript
interface TokenConverter<T> {
  convert(input: T, context: ConversionContext): DTCGValue;
}

// Implementations:
// - ColorConverter
// - DimensionConverter
// - TypographyConverter
// - ShadowConverter
```

### 3. Performance First

- O(1) lookups using pre-built caches
- Adaptive batch sizing for large datasets
- Tree-shaking for minimal bundle size
- Async APIs for non-blocking operations

### 4. ES2018 Compliance

Strict ES2018 compliance ensures compatibility with Figma's plugin runtime:
- No optional chaining (`?.`)
- No nullish coalescing (`??`)
- No spread operators (`...`) - use `Object.assign()` and `Array.concat()`
- No BigInt, async iterators, or ES2019+ features

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Figma Plugin UI                      │
│                     (src/ui.html - inline JS)                │
└────────────────────────────┬────────────────────────────────┘
                             │ postMessage
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   Main Thread (src/code.ts)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Scanner    │→ │  Validator   │→ │   Exporter   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                ↓            ↓            ↓
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ Variables│  │Typography│  │ Shadows  │
         └──────────┘  └──────────┘  └──────────┘
                             │
                    ┌────────┴────────┐
                    ↓                 ↓
            ┌──────────────┐   ┌──────────────┐
            │  Converters  │   │ Cache Manager│
            │  (Strategy)  │   │   (O(1))     │
            └──────────────┘   └──────────────┘
                    │
                    ↓
            ┌──────────────┐
            │  DTCG File   │
            └──────────────┘
                    │
                    ↓
            ┌──────────────┐
            │   ZIP File   │
            └──────────────┘
```

---

## Core Components

### 1. TokenScanner (`src/plugin/scanner.ts`)

**Responsibility:** Enumerate and organize Figma design resources

**Key Methods:**
```typescript
class TokenScanner {
  // Scan all local design tokens
  async scanAll(): Promise<ScanResult>

  // Organize variables by collection and mode
  getVariablesByCollectionAndMode(
    variables: Variable[],
    collections: VariableCollection[]
  ): Map<string, Map<string, Variable[]>>

  // Extract bound variables from text styles
  getBoundVariablesForTextStyle(
    textStyle: TextStyle
  ): Record<string, VariableAlias>
}
```

**Performance:** Uses async Figma APIs with `Promise.all()` for parallel loading

---

### 2. Token Converters (`src/plugin/converters/`)

**Responsibility:** Transform Figma types to DTCG-compliant format

#### BaseConverter (`base-converter.ts`)

Abstract base class providing common functionality:
- `sanitizeTokenName()` - Convert Figma paths to DTCG-safe names
- `createAlias()` - Generate DTCG alias references `{path.to.token}`
- `resolveValue()` - Handle variable resolution vs. fallback values

#### ColorConverter (`color-converter.ts`)

Converts Figma RGB colors to DTCG sRGB format:
```typescript
// Figma: { r: 0.5, g: 0.5, b: 0.5 }
// DTCG:  { colorSpace: 'srgb', components: [0.5, 0.5, 0.5] }
```

#### DimensionConverter (`dimension-converter.ts`)

Handles multiple dimension types:
- Standard dimensions (px, rem, em, %)
- Grid tokens (columns, gutter, margin)
- Breakpoints (always px)
- Line heights (ratio/percentage/dimension)
- Motion durations (ms)
- Opacity (unitless, 3 decimal precision)

#### TypographyConverter (`typography-converter.ts`)

Creates DTCG typography composites with intelligent variable resolution:
```typescript
{
  $type: 'typography',
  $value: {
    fontFamily: '{font.family.inter}',  // Alias if bound
    fontSize: { value: 16, unit: 'px' },
    fontWeight: 700,                     // Resolved from cache
    lineHeight: 1.5,                     // Unitless multiplier
    letterSpacing: { value: 0, unit: 'px' }
  }
}
```

**Key Features:**
- Font weight caching (O(1) lookup)
- Line height caching (O(1) lookup)
- Italic style extraction from font name
- Unit conversion (px ↔ rem)

#### ShadowConverter (`shadow-converter.ts`)

Converts Figma DROP_SHADOW and INNER_SHADOW effects:
```typescript
{
  $type: 'shadow',
  $value: [  // Array for multiple layers
    {
      color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.25 },
      offsetX: { value: 0, unit: 'px' },
      offsetY: { value: 4, unit: 'px' },
      blur: { value: 8, unit: 'px' },
      spread: { value: 0, unit: 'px' },
      inset: false
    }
  ]
}
```

---

### 3. VariableCacheManager (`src/plugin/cache-manager.ts`)

**Responsibility:** O(1) variable lookups for font weights and line heights

**How It Works:**

```typescript
// Build caches once at export start
buildVariableCaches(variables: Variable[]) {
  const fontWeightCache: Record<string, Variable> = {};
  const lineHeightCache: Record<string, Variable> = {};

  // Index by multiple keys for flexible lookup:
  // - Numeric value: '400', '700'
  // - Weight name: 'regular', 'bold'
  // - Line height ratio: '1.5', '150'

  return { fontWeightCache, lineHeightCache };
}
```

**Performance Impact:**
- Before: O(n) linear search through all variables
- After: O(1) hash map lookup
- **Result: 52x speedup** for font weight lookups

**Cache Keys:**
```typescript
// Font Weight Cache:
fontWeightCache['400'] = regularWeightVariable;
fontWeightCache['regular'] = regularWeightVariable;
fontWeightCache['bold'] = boldWeightVariable;
fontWeightCache['700'] = boldWeightVariable;

// Line Height Cache:
lineHeightCache['1.5'] = lineHeightVariable;
lineHeightCache['150'] = lineHeightVariable;  // percentage equivalent
```

---

### 4. TokenExporter (`src/plugin/exporter.ts`)

**Responsibility:** Orchestrate the export process

**Export Flow:**

```typescript
async exportToZip(progressCallback) {
  // 1. Scan all resources (25%)
  const { collections, variables, textStyles, effectStyles } =
    await this.scanner.scanAll();

  // 2. Export variables by collection/mode (25-70%)
  await this.exportVariables(zip, collections, variables);

  // 3. Export typography composites (70-80%)
  await this.exportTypography(zip, textStyles, variables);

  // 4. Export shadow effects (80-90%)
  await this.exportShadows(zip, effectStyles);

  // 5. Generate ZIP (90-100%)
  return await zip.generateAsync({ type: 'arraybuffer' });
}
```

**Key Features:**
- Progress reporting for UI feedback
- Batch processing with adaptive sizing
- Error handling with graceful degradation
- Namespace support for token organization

---

### 5. TokenValidator (`src/plugin/validator.ts`)

**Responsibility:** Validate token integrity before export

**Validation Types:**

**Critical (Block Export):**
- Broken alias references
- Circular alias dependencies
- Type mismatches in aliases

**Warnings (Allow Export):**
- Empty collections
- Modes with no values
- AUTO line heights
- Missing shadow spread values

**Example:**
```typescript
validator.validateAll(data);

// Returns:
{
  issues: [
    {
      type: 'error',
      message: 'Broken alias reference in variable "color.primary"',
      source: 'variable-abc123',
      details: { targetId: 'xyz789', collectionName: 'Colors' }
    }
  ]
}
```

---

## Data Flow

### 1. Export Process

```
User clicks Export
      ↓
UI sends 'export' message → code.ts
      ↓
TokenExporter.exportToZip()
      ↓
┌─────────────────────────────────────┐
│  Scanner.scanAll()                  │
│  ↓                                  │
│  Parallel fetch:                    │
│  - getLocalVariableCollections()    │
│  - getLocalVariables()             │
│  - getLocalTextStyles()            │
│  - getLocalEffectStyles()          │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│  Validator.validateAll()            │
│  - Check alias integrity            │
│  - Detect circular references       │
│  - Validate type consistency        │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│  CacheManager.buildVariableCaches() │
│  - Index font weights (O(1))        │
│  - Index line heights (O(1))        │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│  Export Variables                   │
│  For each collection+mode:          │
│    - Build DTCG structure           │
│    - Convert with DimensionConverter│
│    - Add to ZIP as JSON             │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│  Export Typography                  │
│  With adaptive batching:            │
│    - Build conversion context       │
│    - Convert with TypographyConverter│
│    - Resolve font weights (O(1))    │
│    - Resolve line heights (O(1))    │
│    - Adjust batch size dynamically  │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│  Export Shadows                     │
│  For each effect style:             │
│    - Convert with ShadowConverter   │
│    - Add to ZIP as JSON             │
└─────────────────────────────────────┘
      ↓
Generate ZIP with compression
      ↓
Send ArrayBuffer to UI
      ↓
UI triggers download
```

### 2. Variable Resolution Flow

```
TypographyConverter.convert(textStyle)
      ↓
Check if property has bound variable
      ↓
   [YES]              [NO]
      ↓                ↓
Create alias     Use fallback value
{token.ref}           ↓
                 Is it a font weight?
                      ↓
                   [YES]
                      ↓
              O(1) cache lookup
              fontWeightCache[value]
                      ↓
                  Found? → Create alias
                  Not found? → Use numeric value
```

---

## Extension Points

### 1. Adding New Token Types

To add support for a new token type:

**Step 1:** Create a converter class

```typescript
// src/plugin/converters/gradient-converter.ts
export class GradientConverter extends BaseConverter
  implements TokenConverter<GradientStyle> {

  convert(
    gradient: GradientStyle,
    context: ConversionContext
  ): DTCGGradient {
    // Conversion logic
    return {
      type: gradient.type,
      stops: gradient.gradientStops.map(stop => ({
        position: stop.position,
        color: this.colorConverter.convert(stop.color, context)
      }))
    };
  }
}
```

**Step 2:** Add to TokenExporter

```typescript
// src/plugin/exporter.ts
export class TokenExporter {
  private gradientConverter: GradientConverter;

  constructor(options: ExportOptions) {
    // ... existing converters
    this.gradientConverter = new GradientConverter();
  }

  private async exportGradients(
    zip: JSZip,
    gradientStyles: GradientStyle[]
  ): Promise<void> {
    // Export logic using gradientConverter
  }
}
```

### 2. Adding New Export Formats

The architecture supports multiple export formats through the format exporter system:

```typescript
// src/plugin/format-exporters/scss-exporter.ts
export class SCSSFormatExporter extends BaseFormatExporter {
  async export(
    tokens: DTCGFile,
    options: FormatOptions
  ): Promise<PlatformExport[]> {
    const lines: string[] = [];

    this.walkTokens(tokens, (token, path) => {
      const scssVar = '$' + this.sanitizeName(path, {
        caseStyle: 'kebab'
      });
      const value = this.transformToken(token, path);
      lines.push(`${scssVar}: ${value};`);
    });

    return [
      this.createExport('tokens.scss', lines.join('\n'), 'scss')
    ];
  }

  getSupportedExtensions(): string[] {
    return ['scss'];
  }

  getDisplayName(): string {
    return 'SCSS Variables';
  }
}
```

**Register the exporter:**

```typescript
// src/plugin/multi-format-exporter.ts
private initializeFormatExporters(): void {
  exporterRegistry.register('css', new CSSFormatExporter());
  exporterRegistry.register('scss', new SCSSFormatExporter()); // NEW
}
```

### 3. Current Format Support

**Implemented:**
- ✅ **DTCG (JSON)** - W3C standard format (actively exported)
- ✅ **CSS** - Custom properties (code exists, not wired to UI)

**Infrastructure Ready, Not Implemented:**
- ⚠️ MultiFormatTokenExporter exists but isn't used
- ⚠️ Format registry system in place
- ⚠️ BaseFormatExporter provides common functionality

**Planned for Future:**
- ❌ **SCSS** - Sass variables and mixins
- ❌ **Style Dictionary** - Multi-platform transformation
- ❌ **Tailwind** - Tailwind config format
- ❌ **iOS** - Swift/Objective-C
- ❌ **Android** - XML resources

---

## Performance Optimizations

### 1. O(1) Variable Caching

**Problem:** Finding font weight/line height variables required O(n) linear search

**Solution:** Pre-build hash maps indexed by multiple keys

**Impact:**
- Font weight lookups: O(n) → O(1) (**52x speedup**)
- Line height lookups: O(n) → O(1) (**52x speedup**)
- Cache hit rate: ~95% for common text styles

### 2. Adaptive Batch Processing

**Problem:** Fixed batch sizes cause either UI blocking (too large) or poor throughput (too small)

**Solution:** BatchOptimizer with dynamic sizing

```typescript
const batchOptimizer = new BatchOptimizer({
  minBatchSize: 10,
  maxBatchSize: 100,
  initialBatchSize: 50,
  targetBatchTime: 16  // 60fps
});

while (hasMoreWork) {
  const batchSize = batchOptimizer.getBatchSize();
  const startTime = Date.now();

  // Process batch
  await processBatch(items.slice(index, index + batchSize));

  // Record metrics and adjust
  batchOptimizer.recordBatch(batchSize, Date.now() - startTime);
  index += batchSize;
}
```

**How It Works:**
- Measures processing time per batch
- Calculates optimal batch size for 16ms target
- Uses exponential moving average for stability
- Adjusts gradually to avoid oscillation

**Impact:**
- Batch size adapts from 10-100 items based on complexity
- Maintains ~60fps responsiveness
- 30% better throughput on large exports

### 3. Build Optimizations

**Tree-Shaking:**
```typescript
// vite.config.ts
treeshake: {
  moduleSideEffects: false,        // Remove side-effect modules
  propertyReadSideEffects: false,  // Remove unused property reads
  tryCatchDeoptimization: false    // Optimize try-catch blocks
}
```

**Impact:**
- Build time: ~400ms → 294ms (**26% faster**)
- Removes unused code paths
- Bundle: 227 kB (reasonable without minification)

**Note:** Minification is disabled because esbuild introduces ES2019+ syntax (spread operators) that breaks Figma's ES2018 runtime.

### 4. Memory Management

**Object Pooling** (infrastructure ready, not actively used):

```typescript
// src/utils/object-pool.ts
const dimensionPool = new ObjectPool(
  () => ({ value: 0, unit: 'px' }),  // Factory
  (obj) => { obj.value = 0; obj.unit = 'px'; },  // Reset
  100  // Max pool size
);

// Acquire from pool instead of allocating
const dim = dimensionPool.acquire();
dim.value = 16;
dim.unit = 'rem';

// Release back to pool when done
dimensionPool.release(dim);
```

**Impact:**
- Reduces GC pressure in hot paths
- Ready for future optimizations

---


## Technical Constraints

### Figma Plugin Requirements

1. **Single File Bundle**
   - All code must bundle to `dist/code.js`
   - No code splitting allowed
   - UI JavaScript must be inline in HTML

2. **ES2018 Target**
   - No optional chaining (`?.`)
   - No nullish coalescing (`??`)
   - No spread operators (`...`)
   - No BigInt, async iterators

3. **Dual Environment**
   - Main thread: Plugin sandbox (src/code.ts)
   - UI thread: iframe (src/ui.html)
   - Communication via `postMessage`

4. **Async APIs Only**
   - All Figma API calls must be async
   - Use `Promise.all()` for parallel operations
   - Yield control periodically to prevent blocking

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2018',           // Strict ES2018
    minify: false,              // Disabled (esbuild violates ES2018)
    sourcemap: false,           // Disabled for bundle size
    rollupOptions: {
      treeshake: {              // Aggressive tree-shaking
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    }
  }
});
```

---

## Contributing Guidelines

### Code Style

- **TypeScript:** Strict mode enabled
- **Formatting:** Prettier (single quotes, 100 width, 2 spaces)
- **Linting:** ESLint with TypeScript rules
- **Pre-commit:** Husky runs prettier + eslint on staged files

### Adding Features

1. **Type Safety First**
   - Add proper TypeScript types
   - Avoid `any` - use `unknown` and type guards
   - Document complex types with JSDoc

2. **Performance Matters**
   - Profile hot paths
   - Use caching where appropriate
   - Implement batch processing for large datasets

3. **ES2018 Compliance**
   - Test in Figma before committing
   - No modern syntax (spread, optional chaining, etc.)
   - Use polyfills if needed

4. **Documentation**
   - Update ARCHITECTURE.md for structural changes
   - Add JSDoc to public APIs
   - Update OPTIMIZATION_PROGRESS.md for performance work

### Testing

1. **Manual Testing**
   - Test in Figma with real design files
   - Verify large exports (100+ tokens)
   - Check edge cases (empty collections, circular refs)

2. **Validation**
   - Run `npm run lint` before commit
   - Run `npm run build` to verify bundle
   - Check bundle size stays reasonable

---

## Troubleshooting

### Common Issues

**"Unexpected token ..." Error**
- **Cause:** ES2019+ syntax in code (spread operators, optional chaining)
- **Solution:** Replace with ES2018 alternatives (Object.assign, explicit checks)

**Large Bundle Size**
- **Cause:** Importing too much from libraries
- **Solution:** Use tree-shakeable imports, check rollup analysis

**Slow Export Performance**
- **Check:** Is caching working? (fontWeightCache, lineHeightCache)
- **Check:** Is batch size too small? (Should adapt 10-100)
- **Check:** Are you blocking the UI? (Use setTimeout(0) to yield)

**Type Errors**
- **Cause:** Figma's type definitions are loose (Variable | VariableAlias)
- **Solution:** Use type guards or eslint-disable with explanation

---

## Appendix

### File Structure

```
src/
├── code.ts                    # Main plugin entry point
├── ui.html                    # Plugin UI (inline JavaScript)
├── constants.ts               # Configuration constants
├── types/
│   ├── dtcg.ts               # DTCG type definitions
│   ├── plugin.ts             # Plugin-specific types
│   ├── converter-types.ts    # Converter interfaces
│   └── export-formats.ts     # Format exporter types
├── plugin/
│   ├── scanner.ts            # Resource enumeration
│   ├── validator.ts          # Token validation
│   ├── exporter.ts           # DTCG export orchestration
│   ├── multi-format-exporter.ts  # Multi-format support (not used)
│   ├── cache-manager.ts      # O(1) variable caching
│   ├── type-detection.ts     # Token type detection
│   ├── converters/
│   │   ├── base-converter.ts        # Abstract base class
│   │   ├── color-converter.ts       # RGB → DTCG sRGB
│   │   ├── dimension-converter.ts   # Figma → DTCG dimensions
│   │   ├── typography-converter.ts  # Text styles → composites
│   │   └── shadow-converter.ts      # Effects → shadow tokens
│   └── format-exporters/
│       ├── base-exporter.ts         # Abstract format exporter
│       ├── css-exporter.ts          # CSS custom properties (not wired)
│       └── registry.ts              # Format exporter registry
└── utils/
    ├── batch-optimizer.ts    # Adaptive batch sizing
    ├── cache-builder.ts      # Generic cache builder
    ├── object-pool.ts        # Object pooling (not actively used)
    └── dtcg-validator.ts     # DTCG spec validation
```

### Key Metrics

- **Bundle Size:** 227 kB (unminified, tree-shaken)
- **Gzipped Size:** 51 kB
- **Build Time:** 294ms (26% faster than baseline)
- **ESLint Errors:** 0
- **ESLint Warnings:** 693 (mostly Figma API type issues)
- **Explicit `any` Usage:** 28 (down 39% from 46)
- **Test Coverage:** Manual testing (no automated tests)

### Optimization History

| Phase | Optimization | Impact |
|-------|-------------|--------|
| 1 | Strategy pattern + converters | 30% code reduction, better maintainability |
| 1 | O(1) variable caching | 52x speedup for lookups, 95% cache hit rate |
| 2 | ESLint + Prettier + Husky | Code quality enforcement, 0 errors |
| 2 | Type safety improvements | 39% reduction in `any` usage |
| 3 | Adaptive batch sizing | Better throughput, smooth UI |
| 3 | Tree-shaking | 26% faster builds |

---

**Document Maintained By:** Token Press Development Team
**Last Reviewed:** November 2024
**Next Review:** As needed for major changes
