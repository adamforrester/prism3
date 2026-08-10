# Token Press - Agent Documentation

This document provides comprehensive information for future AI agents working on the Token Press Figma plugin project.

## ⚠️ CRITICAL: Source File Locations

**THE PLUGIN IS WRITTEN IN TYPESCRIPT, NOT JAVASCRIPT!**

### ✅ Correct Files to Edit
```
src/
├── code.ts                 # Main plugin entry point
├── ui.html                # Plugin UI (embedded JS)
├── types/
│   ├── dtcg.ts           # Type definitions
│   └── plugin.ts         # Plugin interfaces
└── plugin/
    ├── scanner.ts        # Token scanning logic
    ├── validator.ts      # Validation
    └── exporter.ts       # ⭐ MAIN EXPORT LOGIC - Edit this for token transformations
```

### ❌ NEVER Edit These Files (Legacy/Test Files)
```
src/working-code.js        # OBSOLETE - Old monolithic version
src/simple-code.js         # OBSOLETE - Testing file only
```

**Build Process**:
- Source: TypeScript files in `src/`
- Build: `npm run build` compiles to `dist/code.js`
- Manifest: Points to `dist/code.js` (NOT the .js files in src/)

**If you edit `.js` files in src/, your changes will NOT be included in the plugin!**

## Project Overview

**Token Press** is a Figma plugin that exports Variables, Text Styles, and Effect Styles to W3C DTCG-compliant JSON format, packaged as a ZIP file ready for Style Dictionary consumption.

### Key Goals
- Export design tokens from Figma in W3C DTCG format
- Support multi-mode/multi-theme workflows
- Generate Typography and Shadow composite tokens
- Maintain variable references as DTCG aliases
- Provide comprehensive validation with error detection

## Critical Technical Decisions & History

### 1. JavaScript/TypeScript Compatibility (ES2018)

**Issue**: Figma's plugin JavaScript engine has limited ES feature support.

**Critical Decisions Made**:
- **Target**: ES2018 (both tsconfig.json AND vite.config.ts must match)
- **No Optional Chaining**: `?.` operators cause syntax errors
- **No Conditional Spread**: `...(condition && { prop: value })` not supported
- **Use Object.assign()**: Instead of spread operators for object merging

**Files Modified for Compatibility**:
```typescript
// ❌ WRONG (causes syntax errors)
textStyle.boundVariables?.fontFamily
{ ...obj1, ...obj2 }
...(condition && { prop: value })

// ✅ CORRECT (ES2018 compatible)  
textStyle.boundVariables && textStyle.boundVariables.fontFamily
Object.assign({}, obj1, obj2)
if (condition) { result.prop = value; }
```

### 2. Plugin Manifest Configuration

**Critical Settings** (manifest.json):
```json
{
  "main": "dist/code.js",      // ❌ NOT "src/working-code.js"
  "ui": "src/ui.html",         // Points to HTML, not JS
}
```

**Why This Matters**: Previous issues occurred when manifest pointed to wrong files, causing code changes to not execute.

### 3. TextDecoration Implementation

**User Requirement**: Add `textDecoration` property to typography tokens in W3C DTCG format.

**Implementation Approach**:
- Read actual Figma `textStyle.textDecoration` property (not naming conventions)
- Convert Figma values to DTCG format: `'UNDERLINE' → 'underline'`, `'STRIKETHROUGH' → 'line-through'`, `'NONE' → 'none'`
- Only include `textDecoration` property when value is not 'none'
- **NO naming pattern dependencies** (no "-link" suffix logic)

**Key Method** (src/plugin/exporter.ts:299-308):
```typescript
private convertFigmaTextDecoration(figmaTextDecoration: string): 'none' | 'underline' | 'line-through' | null {
  switch (figmaTextDecoration) {
    case 'NONE': return 'none';
    case 'UNDERLINE': return 'underline'; 
    case 'STRIKETHROUGH': return 'line-through';
    default: return null;
  }
}
```

### 4. Variable Resolution Logic

**How It Works**:
- Text styles may or may not have bound variables for properties
- If `boundVars.fontWeight` exists → resolve to `{variable.reference}`
- If `boundVars.fontWeight` is missing → use raw value (700, 400, etc.)
- **This is correct behavior** - not all properties are linked to variables in Figma

**Debug Pattern Used**:
```typescript
// Temporary debug logging pattern for investigating issues
if (textStyles.indexOf(textStyle) < 3) {
  console.log(`=== DEBUG: Text Style "${textStyle.name}" ===`);
  console.log('boundVars:', JSON.stringify(boundVars, null, 2));
}
```

### 5. UI Implementation Issues Resolved

**Problem**: Plugin UI wasn't loading due to file path issues.

**Solution**: Embed JavaScript directly in HTML instead of external references:
```html
<!-- ❌ External reference (path issues) -->
<script src="../dist/ui.js"></script>

<!-- ✅ Embedded (works reliably) -->
<script>
class TokenPressUI { /* implementation */ }
const ui = new TokenPressUI();
// ... rest of implementation
</script>
```

## Architecture Details

### Core Files Structure
```
src/
├── code.ts                 # Main plugin sandbox code
├── ui.html                # Plugin UI (with embedded JS)
├── types/
│   ├── dtcg.ts           # W3C DTCG type definitions
│   └── plugin.ts         # Plugin-specific interfaces
└── plugin/
    ├── scanner.ts        # Token enumeration & bound variable detection
    ├── validator.ts      # Validation logic (errors/warnings)  
    └── exporter.ts       # DTCG transformation & ZIP creation
```

### Key Classes & Responsibilities

**TokenScanner** (src/plugin/scanner.ts):
- Enumerates design tokens using async Figma APIs
- Detects bound variables on text styles (`getBoundVariablesForTextStyle`)
- Groups variables by collection and mode

**TokenExporter** (src/plugin/exporter.ts):
- Transforms Figma data to DTCG format
- Handles variable resolution and alias creation
- Creates ZIP files with proper structure
- **Critical**: Contains `textDecoration` implementation

**TokenValidator** (src/plugin/validator.ts):
- Validates token references and structure
- Categorizes issues as errors (block export) vs warnings (allow export)

## Build Process & Dependencies

### Build Commands
```bash
npm run build    # Production build
npm run dev      # Watch mode
```

### Critical Build Configuration

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2018",        // Must match vite config
    "lib": ["ES2018"],
    "module": "ESNext",
    // ...
  }
}
```

**vite.config.ts**:
```javascript
export default defineConfig({
  build: {
    target: 'es2018',          // Must match tsconfig
    rollupOptions: {
      input: {
        code: resolve(__dirname, 'src/code.ts'),
        ui: resolve(__dirname, 'src/ui/ui.js')  // Note: .js not .ts
      },
      // ...
    }
  }
});
```

## Testing & Validation

### Test Structure
```
test-examples/tokens/       # Sample output files
tests/sd/                  # Style Dictionary integration test
```

### Validation Approach
1. **Manual Testing**: Load plugin in Figma, scan/export tokens
2. **Style Dictionary Test**: Verify exported tokens build successfully
3. **Debug Logging**: Add temporary console logs for investigation

### Common Debug Patterns

**Variable Resolution Investigation**:
```typescript
console.log('boundVars:', JSON.stringify(boundVars, null, 2));
console.log('fontWeight boundVar:', boundVars.fontWeight ? 'EXISTS' : 'MISSING');
```

**Export Process Monitoring**:
```typescript
console.log('=== STARTING EXPORT ===');
console.log('Export options:', JSON.stringify(options));
console.log('Found styles:', textStyles.length);
```

## Known Issues & Solutions

### Issue: "Unexpected token ..." JavaScript Errors
**Cause**: ES2019+ syntax in ES2018 environment
**Solution**: Replace with ES2018 compatible equivalents
- Optional chaining → explicit null checks
- Spread operators → Object.assign()
- Conditional spread → explicit conditionals

### Issue: Plugin UI Not Loading
**Cause**: File path issues or external script loading problems
**Solution**: Embed JavaScript directly in HTML file

### Issue: Code Changes Not Executing  
**Cause**: manifest.json pointing to wrong files
**Solution**: Ensure manifest points to `dist/code.js` not `src/working-code.js`

### Issue: Variable Resolution "Not Working"
**Investigation**: Check if properties are actually bound to variables in Figma
**Common Finding**: Raw values are correct when properties aren't linked to variables

## Output Format Examples

### Typography Token with TextDecoration
```json
{
  "$type": "typography",
  "$value": {
    "fontFamily": "{pds.font.family.body}",
    "fontSize": "{pds.font.size.body.lg}",
    "fontWeight": 700,
    "letterSpacing": "{pds.font.letterspacing.body.none}",
    "lineHeight": 1.5,
    "textDecoration": "underline"
  },
  "$extensions": {
    "figma": {
      "styleId": "S:75b125a012827dceb23b9bfc38583e05df8ed352",
      "textDecoration": "UNDERLINE"
    }
  }
}
```

## Recent Development History

### Session: Cubic Bezier & Transition Composite Tokens Implementation
**Goal**: Convert easing tokens to DTCG-compliant cubicBezier arrays and compile transition composites
**Date**: October 2025
**Approach**:
- Parse easing strings to cubic bezier arrays according to DTCG spec
- Compile transition property tokens (duration/delay/timingFunction) into composite tokens
- Remove individual properties after compilation

**Result**: Successfully implemented, tested, and built

**Key Changes** (all in `src/plugin/exporter.ts`):
1. Added `CUBIC_BEZIER_MAP` constant mapping easing names to arrays
2. Implemented `parseCubicBezier()` method for string-to-array conversion
3. Implemented `resolveEasingValue()` for reference resolution
4. Updated `mapVariableTypeToDTCG()` to detect easing tokens → `'cubicBezier'` type
5. Updated `convertVariableValue()` to handle cubicBezier type conversion
6. Added `compileTransitionComposites()` for recursive transition compilation
7. Integrated compilation into `buildDTCGFile()` pipeline

**Output Format Changes**:
```json
// BEFORE (string easing)
"easing": {
  "ease-out": { "$type": "string", "$value": "cubic-bezier(0, 0, 0.58, 1)" }
}

// AFTER (cubicBezier array)
"easing": {
  "ease-out": { "$type": "cubicBezier", "$value": [0, 0, 0.58, 1] }
}

// BEFORE (separate properties)
"transition": {
  "enter": {
    "duration": { "$type": "duration", "$value": {...} },
    "delay": { "$type": "number", "$value": {...} },
    "timingfunction": { "$type": "string", "$value": "{...}" }
  }
}

// AFTER (composite)
"transition": {
  "enter": {
    "$type": "transition",
    "$value": {
      "duration": {...},
      "delay": {...},
      "timingFunction": [0, 0, 0.58, 1]
    }
  }
}
```

**Critical Lesson Learned**:
- ⚠️ **INITIALLY EDITED WRONG FILES**: Changes were made to `src/working-code.js` instead of `src/plugin/exporter.ts`
- This highlighted the need for clearer documentation about TypeScript source vs legacy JS files
- Added prominent warning section at top of this document to prevent future mistakes

### Session: TextDecoration Implementation
**Goal**: Add textDecoration property to typography tokens
**Approach**: Read Figma textStyle.textDecoration, convert to DTCG format
**Result**: Successfully implemented, working in production

**Key Changes**:
1. Added `textDecoration` to DTCGTypography interface
2. Implemented `convertFigmaTextDecoration()` method
3. Updated typography export logic
4. Fixed ES2018 compatibility issues
5. Resolved UI loading problems
6. Removed temporary test/debug code

### Session Lessons Learned
- Always check ES2018 compatibility for all new syntax
- Debug logging helps identify root causes (variable binding vs code issues)
- Manifest.json configuration is critical for plugin execution
- Figma plugin environment has strict JavaScript limitations
- **⚠️ EDIT TYPESCRIPT FILES, NOT LEGACY .JS FILES**

## Development Workflow

### Making Changes
1. **Read current code** to understand existing patterns
2. **Check ES2018 compatibility** for any new syntax
3. **Test in Figma** after each significant change
4. **Verify output** in test-examples/tokens/ folder
5. **Clean up** debug logging before finalizing

### Adding New Features
1. **Update TypeScript interfaces** (types/dtcg.ts)
2. **Implement transformation logic** (plugin/exporter.ts)
3. **Add validation if needed** (plugin/validator.ts) 
4. **Test with real Figma data**
5. **Document decisions** (update this file)

### Debugging Issues
1. **Add console logging** at key points
2. **Check browser console** during plugin execution
3. **Verify file paths** in manifest.json
4. **Test with minimal cases** first
5. **Remove debug code** when complete

## Next Steps & Future Enhancements

### Potential Areas for Improvement
- Additional composite token types (border, transition, etc.)
- Enhanced variable alias resolution
- More sophisticated validation rules
- Performance optimizations for large token sets
- Extended Figma metadata preservation

### Important Notes for Future Agents
- **Always maintain ES2018 compatibility**
- **Test thoroughly in Figma environment**
- **Preserve existing functionality when adding features**
- **Document all significant decisions**
- **Keep debug logging temporary and clean up**

---

*This document should be updated whenever significant architectural decisions are made or new features are implemented.*