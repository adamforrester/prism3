# Token Press - Plugin Description

**For Figma Plugin Listing**

---

## Current Description (Updated for v1.6)

Transform your Figma design system into production-ready design tokens with Token Press. This plugin exports Variables, Text Styles, and Effect Styles in W3C DTCG-compliant JSON format, packaged and ready for Style Dictionary consumption.

**🎯 What Makes Token Press Different:**

Unlike basic export plugins, Token Press intelligently compiles Figma styles into **DTCG composite tokens** - a powerful feature that transforms scattered properties into cohesive, spec-compliant token structures:

- **Typography Composites** - Automatically combines fontFamily, fontSize, fontWeight, letterSpacing, lineHeight, and textDecoration from Text Styles into single DTCG typography tokens
- **Shadow Composites** - Merges multi-layer drop shadows and inner shadows into proper DTCG shadow tokens with complete property sets
- **Transition Composites** - NEW! Compiles duration, delay, and timingFunction properties into DTCG transition tokens, making motion systems production-ready

**Key Features:**

- **W3C DTCG standard compliance** for maximum compatibility
  - Motion easing as `cubicBezier` arrays (e.g., `[0, 0, 0.58, 1]`)
  - Duration tokens with proper DTCG duration format
  - Transition composites with duration, delay, and timingFunction
  - Color tokens use rgb/rgba string format for optimal Style Dictionary compatibility
  - Grid columns as unitless numbers, dimensions with appropriate units

- **Multi-mode support** for light/dark themes and brand variants

- **Intelligent composite token generation** across all complex token types
  - Typography: fontFamily, fontSize, fontWeight, letterSpacing, lineHeight, textDecoration
  - Shadows: Multi-layer support with color, offsetX, offsetY, blur, spread, inset
  - Transitions: duration, delay, timingFunction (cubic bezier arrays)
  - Smart variable binding and alias preservation

- **Intelligent alias resolution** that preserves variable references
  - Maintains token relationships across primitive → semantic → component hierarchy
  - Smart variable matching for font weights, line heights, and easing curves

- **Built-in validation** to catch broken aliases and type mismatches

- **100% client-side processing** with no network calls

- **Flexible export options** for units, namespacing, and metadata

Perfect for design system teams looking to automate the handoff between Figma and code. Get production-ready tokens with proper composite structures, not just raw variable exports.

This has been tested across several different design systems and token taxonomies, but if something isn't exporting as expected let us know.

---

## Recent Updates

### v1.6 (October 2025) - Transition Composites & Cubic Bezier

**Major New Features:**
- **Transition Composite Tokens** - Automatically compiles duration, delay, and timingFunction properties into DTCG-compliant transition composites
- **CubicBezier Arrays** - Easing tokens now export as proper DTCG `cubicBezier` type with array values (e.g., `[0, 0, 0.58, 1]`) instead of strings
- **Smart Easing Resolution** - Converts CSS easing names (linear, ease-out, etc.) and cubic-bezier() functions to spec-compliant arrays
- **Automatic Property Compilation** - Individual transition properties are intelligently merged into composite tokens and removed after compilation

**Why This Matters:**
- Motion systems are now fully DTCG-compliant and production-ready
- Transition tokens can be consumed directly by Style Dictionary with minimal transforms
- Easing values are type-safe arrays instead of strings requiring parsing
- Reduces token count by compiling related properties into cohesive composites

### v1.5 (September 2025) - Motion Token Improvements

**Motion Token Improvements:**
- Motion duration tokens now export with correct DTCG-compliant format (`duration` type with proper value/unit structure)
- Ensures proper Style Dictionary transformation with "ms" suffix for CSS output
- All motion references (instant, fast, normal, slow, etc.) continue to work seamlessly

**Enhanced DTCG Compliance:**
- 100% compliance across all token types (color, dimension, number, string, typography, shadow, duration)
- Optimized for Style Dictionary with minimal transformation requirements
- Comprehensive documentation of format preferences and implementation decisions

---

## Alternative Shorter Version

Transform your Figma design system into production-ready design tokens. Token Press intelligently compiles Text Styles, Effect Styles, and Variables into **DTCG composite tokens** - not just raw exports, but proper spec-compliant token structures.

**What Sets It Apart:**
- **Automatic Composites**: Typography, shadows, and transitions compiled from Figma properties
- **Motion-Ready**: CubicBezier arrays and transition composites for production animation systems
- **Full DTCG Compliance**: All token types properly formatted for Style Dictionary
- **Smart Aliases**: Preserves variable references across primitive → semantic → component hierarchy
- **Multi-Mode Support**: Light/dark themes and brand variants
- **Built-In Validation**: Catches broken aliases and type mismatches
- **100% Client-Side**: No network calls, all processing local

Perfect for design system teams who need production-ready tokens, not just variable dumps. Tested across multiple design systems and token taxonomies.

---

## Version Badge Text

**Current Version:** v1.6.0
**Status:** Stable
**Last Updated:** October 2025

---

## Notes for Plugin Listing Update

When updating the Figma plugin page:
1. Use either the full description or the shorter version above
2. **Emphasize the composite token compilation** as a key differentiator from basic export plugins
3. Highlight the new v1.6 transition composite features in the changelog
4. Lead with DTCG compliance and the intelligent compilation of typography, shadows, and transitions
5. Keep the "tested across different design systems" note to set expectations
6. Consider using the "What Makes Token Press Different" section prominently to highlight the value proposition

---

## Composite Token Compilation Examples

**What does "intelligent composite token compilation" mean?**

Token Press doesn't just export raw variables - it analyzes your Figma styles and intelligently compiles related properties into proper DTCG composite tokens.

### Typography Composites

**Figma Input:**
- Text Style: "Heading/Display/5XL/Bold"
- Properties: Font Family, Size, Weight, Letter Spacing, Line Height, Text Decoration

**Token Press Output:**
```json
{
  "$type": "typography",
  "$value": {
    "fontFamily": "{pds.font.family.display}",
    "fontSize": "{pds.font.size.display.desktop.5xl}",
    "fontWeight": "{pds.font.weight.bold}",
    "letterSpacing": "{pds.font.letterspacing.display.tight}",
    "lineHeight": "{pds.font.lineheight.105}",
    "textDecoration": "none"
  }
}
```

**Without Token Press:** You'd need to manually extract and combine these 6+ properties from the Text Style.

### Shadow Composites

**Figma Input:**
- Effect Style: "Elevation/MD"
- Multi-layer shadow with 2 drop shadows

**Token Press Output:**
```json
{
  "$type": "shadow",
  "$value": [
    {
      "color": "rgba(0, 0, 0, 0.1)",
      "offsetX": { "value": 0, "unit": "px" },
      "offsetY": { "value": 2, "unit": "px" },
      "blur": { "value": 4, "unit": "px" },
      "spread": { "value": 0, "unit": "px" }
    },
    {
      "color": "rgba(0, 0, 0, 0.2)",
      "offsetX": { "value": 0, "unit": "px" },
      "offsetY": { "value": 1, "unit": "px" },
      "blur": { "value": 2, "unit": "px" },
      "spread": { "value": 1, "unit": "px" }
    }
  ]
}
```

**Without Token Press:** Multi-layer shadows would need complex manual extraction and formatting.

### Transition Composites (NEW in v1.6)

**Figma Input:**
- Variables: `pds/motion/transition/enter/duration`, `/delay`, `/timingfunction`
- Separate tokens for each property

**Token Press Output:**
```json
{
  "$type": "transition",
  "$value": {
    "duration": "{pds.motion.duration.normal}",
    "delay": "{pds.motion.duration.000}",
    "timingFunction": [0, 0, 0.58, 1]
  }
}
```

**Without Token Press:** You'd have 3 separate tokens instead of one cohesive transition composite, and easing values would be strings instead of DTCG-compliant cubic bezier arrays.

---

### The Bottom Line

Token Press transforms:
- **6 text style properties** → 1 typography composite
- **Multiple shadow layers** → 1 multi-value shadow composite
- **3 motion properties** → 1 transition composite with cubic bezier arrays

This means cleaner token structures, better DTCG compliance, and tokens that are ready for immediate use in Style Dictionary without complex transformations.
