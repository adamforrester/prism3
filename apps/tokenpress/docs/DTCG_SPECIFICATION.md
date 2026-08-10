# DTCG (Design Tokens Community Group) Specification Reference

**⚠️ IMPORTANT NOTICE ⚠️**
The DTCG specification is currently in draft status. This document focuses only on widely-adopted, stable features to ensure compatibility and avoid implementing experimental features that may change.

This document serves as a conservative reference for DTCG compliance, focusing on core features with broad tool support.

## File Format Requirements

### Media Type
- **Official Media Type**: `application/design-tokens+json`
- **File Extensions**: `.tokens`, `.tokens.json`
- **Character Encoding**: UTF-8

### JSON Structure
- Must be valid JSON
- Root object contains tokens and/or groups
- Reserved properties start with `$`

## Token Properties

### Required Properties
- **`$value`**: The actual token value (required for all tokens)

### Optional Properties
- **`$type`**: Defines the token type (optional but recommended)
- **`$description`**: Human-readable description (string)
- **`$extensions`**: Vendor-specific metadata (object)
- **`$deprecated`**: Marks token as deprecated (boolean or string)

### Example Token Structure
```json
{
  "color-primary": {
    "$type": "color",
    "$value": {
      "colorSpace": "srgb", 
      "components": [0, 1, 0.4]
    },
    "$description": "Primary brand color",
    "$extensions": {
      "figma": {
        "styleId": "abc123"
      }
    }
  }
}
```

## Token Types

**Note**: Only including core token types with wide industry adoption. Experimental types are noted but not recommended for production use.

### Core Primitive Types (Stable & Widely Supported)

#### Color (`color`)
```json
{
  "$type": "color",
  "$value": {
    "colorSpace": "srgb",
    "components": [1, 0.5, 0],
    "alpha": 0.8
  }
}
```
- **colorSpace**: `"srgb"`, `"p3"`, `"rec2020"`, etc.
- **components**: Array of 3 numbers (0-1) for RGB values
- **alpha**: Optional alpha channel (0-1)

**🔧 Token Press Implementation Preference:**

While the DTCG specification supports the color object format shown above, Token Press uses **rgb/rgba string format** for better Style Dictionary compatibility:

```json
{
  "$type": "color",
  "$value": "rgb(255, 128, 0)"
}

// With transparency
{
  "$type": "color",
  "$value": "rgba(0, 0, 0, 0.2)"
}
```

**Rationale:**
- ✅ DTCG-compliant
- ✅ Requires minimal Style Dictionary transforms
- ✅ Direct conversion to CSS output
- ✅ Reduces transformation complexity
- ✅ Tested and proven approach

**When to use:**
- All color tokens including base colors
- Transparency/opacity colors
- Shadow colors (can reference transparency tokens)

**Format rules:**
- RGB: `"rgb(r, g, b)"` where r, g, b are 0-255
- RGBA: `"rgba(r, g, b, a)"` where r, g, b are 0-255, a is 0-1
- Hex format is also acceptable: `"#rrggbb"` or `"#rrggbbaa"`

#### Dimension (`dimension`)
```json
{
  "$type": "dimension", 
  "$value": {
    "value": 16,
    "unit": "px"
  }
}
```
- **value**: Numeric value
- **unit**: Units like `"px"`, `"rem"`, `"em"`, `"%"`, etc.

#### Font Family (`fontFamily`)
```json
{
  "$type": "fontFamily",
  "$value": ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"]
}
```
- Array of font family names in fallback order

#### Font Weight (`fontWeight`)
```json
{
  "$type": "fontWeight",
  "$value": 400
}
```
- Numeric value (100-900) or string ("normal", "bold")

#### Number (`number`)
```json
{
  "$type": "number",
  "$value": 1.5
}
```
- Simple numeric value

#### Duration (`duration`)
```json
{
  "$type": "duration",
  "$value": {
    "value": 200,
    "unit": "ms"
  }
}
```
- **value**: Numeric value
- **unit**: Time unit - `"ms"` (milliseconds) or `"s"` (seconds)

**🔧 Token Press Implementation Note - Motion Duration Tokens:**

Motion duration tokens use the DTCG `duration` type with object format:

```json
{
  "$type": "duration",
  "$value": {
    "value": 200,
    "unit": "ms"
  },
  "$description": "Normal duration; standard animations (200ms)"
}
```

**Important:**
- ❌ **Do NOT use** `$type: "dimension"` with "px" units for time durations
- ❌ Wrong: `"$value": "200px"` - pixels are spatial, not temporal
- ❌ Wrong: `"$value": 200` - missing unit specification
- ✅ Correct: `"$value": { "value": 200, "unit": "ms" }`

**Rationale:**
The DTCG specification includes a `duration` type specifically for time values. This provides clear semantic meaning and allows tools like Style Dictionary to properly transform durations for different output formats (CSS, iOS, Android, etc.).

### Core Composite Types (Stable & Widely Supported)

#### Typography (`typography`)
```json
{
  "$type": "typography",
  "$value": {
    "fontFamily": ["Inter", "sans-serif"],
    "fontSize": {
      "value": 16,
      "unit": "px"
    },
    "fontWeight": 400,
    "lineHeight": 1.5,
    "letterSpacing": {
      "value": 0,
      "unit": "px"
    },
    "textDecoration": "none",
    "textCase": "none"
  }
}
```

##### Token Press extension: `fontStyle`

Token Press emits `fontStyle: "italic" | "oblique"` as a sibling on the
typography `$value` for italic/oblique source styles. This key is **not** part
of the DTCG typography composite spec — italic/oblique handling is currently
unspecified in DTCG. We emit it because Figma source styles distinguish
italic from upright variants and downstream tools (CSS, SD v4 with custom
transforms) can use it directly.

- The key is omitted entirely for normal (upright) styles — no `fontStyle: "normal"` noise.
- Tools that don't recognize the key should pass it through unchanged or
  ignore it (DTCG requires unknown keys to be preserved).
- If you want spec-strict typography composites, post-process to strip
  `fontStyle` from each `$value` before consuming.

This matches the spec's stated extension model — DTCG explicitly invites
tools to add vendor-specific data, but typically via `$extensions`. We chose
sibling-on-`$value` because the DTCG typography composite is meant to be
self-contained and consumers expect type information at one level.

#### Shadow (`shadow`)
```json
{
  "$type": "shadow",
  "$value": [
    {
      "color": {
        "colorSpace": "srgb",
        "components": [0, 0, 0],
        "alpha": 0.25
      },
      "offsetX": { "value": 0, "unit": "px" },
      "offsetY": { "value": 4, "unit": "px" },
      "blur": { "value": 8, "unit": "px" },
      "spread": { "value": 0, "unit": "px" },
      "inset": false
    }
  ]
}
```

### Draft-Status Token Types (DTCG Spec)

The DTCG spec marks the following types as draft. Token Press support varies — see the implementation table below.

- **`duration`** - Time duration tokens
- **`cubicBezier`** - Animation timing functions
- **`transition`** - Transition composite tokens
- **`border`** - Border composite tokens
- **`strokeStyle`** - Stroke styling tokens
- **`gradient`** - Gradient tokens

Because these types are still evolving, downstream tools may need updates if the spec changes their value shape.

## Token References

### Reference Syntax
- References use curly braces: `"{path.to.token}"`
- Path uses dot notation for nested groups
- References resolve to the `$value` of the target token

### Examples
```json
{
  "color": {
    "primary": {
      "$type": "color",
      "$value": {
        "colorSpace": "srgb",
        "components": [0, 0.5, 1]
      }
    },
    "secondary": {
      "$type": "color", 
      "$value": "{color.primary}"
    }
  }
}
```

### Reference Rules
- Cannot be circular
- Must reference valid token path
- Resolved value must match expected type

## Naming Conventions

### Valid Token Names
- Cannot start with `$`
- Cannot contain: `{`, `}`, `.`
- Can contain: letters, numbers, hyphens, underscores
- Case sensitive

### Group Structure
```json
{
  "semantic": {
    "color": {
      "text": {
        "primary": {
          "$type": "color",
          "$value": "{foundation.color.gray.900}"
        }
      }
    }
  },
  "foundation": {
    "color": {
      "gray": {
        "900": {
          "$type": "color",
          "$value": {
            "colorSpace": "srgb",
            "components": [0.1, 0.1, 0.1]
          }
        }
      }
    }
  }
}
```

## Validation Rules

### Type Validation
- Each token type has specific value structure requirements
- Tools should validate `$value` against `$type` specification
- Unknown types should be preserved but may not be validated

### Reference Validation
- All references must resolve to valid tokens
- Circular references are invalid
- Type compatibility should be checked

### File Validation
- Must be valid JSON
- Must follow DTCG structure requirements
- Reserved properties must be used correctly

## Tool Implementation Requirements

### Must Support
- Parsing valid DTCG files
- Preserving unknown properties in `$extensions`
- Reference resolution
- Basic type validation

### Should Support
- All standard token types
- Validation error reporting
- Pretty-printing output
- Schema validation

### Extensions
- Tools can add vendor-specific data in `$extensions`
- Must not conflict with standard properties
- Should be namespaced by vendor

## Common Patterns

### Aliasing Pattern
```json
{
  "alias": {
    "color": {
      "primary": {
        "$type": "color",
        "$value": "{foundation.color.blue.500}"
      }
    }
  }
}
```

### Multi-Theme Pattern
```json
{
  "theme": {
    "light": {
      "background": {
        "$type": "color",
        "$value": {
          "colorSpace": "srgb",
          "components": [1, 1, 1]
        }
      }
    },
    "dark": {
      "background": {
        "$type": "color", 
        "$value": {
          "colorSpace": "srgb",
          "components": [0, 0, 0]
        }
      }
    }
  }
}
```

## Token Press Implementation Notes

### Stable Features Implemented (v1.5)

#### Color Tokens
- ✅ **Format:** rgb/rgba string format (preferred)
- ✅ Example: `"rgb(255, 128, 0)"` or `"rgba(0, 0, 0, 0.2)"`
- ✅ Rationale: DTCG-compliant with minimal Style Dictionary transforms
- ✅ Transparency tokens use rgba for alpha channel support

#### Motion Duration Tokens
- ✅ **Type:** `$type: "duration"` with object value `{ value, unit: "ms" }`
- ✅ Example: `"$value": { "value": 200, "unit": "ms" }`
- ✅ Style Dictionary v4 with `usesDtcg: true` consumes the object directly
- ⚠️ Do NOT use `$type: "dimension"` with "px" for time durations

#### Motion Easing Tokens
- ✅ **Type:** `$type: "string"` with cubic-bezier values
- ✅ Example: `"cubic-bezier(0.42, 0, 1, 1)"`
- ✅ Works directly with CSS output

#### Other Token Types
- ✅ Dimension tokens with standard units (px, rem, em, %)
- ✅ Font family tokens (arrays supported)
- ✅ Font weight tokens (numeric and keywords)
- ✅ Number tokens (line-height, opacity, etc.)
- ✅ Typography composite tokens
- ✅ Shadow tokens (single and multiple layers)
- ✅ Token references with validation
- ✅ Extensions metadata (Figma-specific)

#### Shadow Token Strategy
- ✅ Shadow colors should reference transparency primitive tokens
- ✅ Example: `"color": "{pds.transparency.dark-20}"`
- ✅ Benefits: Better theming, single source of truth
- ✅ Follows pattern used in brand-theme files

### Draft-Type Support Status

Token Press emits some draft DTCG types where Figma variables map cleanly:

- ✅ **`duration`** — emitted as `{ value, unit: "ms" }` for motion/duration variables
- ✅ **`cubicBezier`** — emitted for easing/curve variables as a 4-element array
- ✅ **`transition`** — emitted as a composite when transition primitives (duration + easing) are detected together

Not implemented (no clean Figma variable mapping):

- ⚠️ **`border`** — composite (color + width + style); no native Figma variable equivalent
- ⚠️ **`gradient`** — Figma stores gradients on paints, not variables
- ⚠️ **`strokeStyle`** — extended/composite form

**Rationale**: Draft types may have breaking spec changes. The three that Token Press emits are widely adopted in motion design pipelines and consumable by Style Dictionary v4 with `usesDtcg: true`. The remaining draft types lack a meaningful Figma variable source.

### Validation Enhancements Needed
- Type-specific value validation
- Reference cycle detection
- Cross-type reference validation
- Schema-based validation

This specification should be referenced when implementing new features or making changes to ensure DTCG compliance.