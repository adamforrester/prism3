---
engine: patch
---
The last 96 errors in the engine tsconfig's import graph now typecheck under `noUncheckedIndexedAccess` (#1182), across 12 files: scale, theme-brand, theme-gradient, theme-shadow, theme-type, theme-layout, vocabulary, figma-description, and the sign-in-button, code-input, provider-logo and card-number-field defs. No behavior change. A mark vocabulary with no sign-in glyph at all now fails with a named error instead of a bare TypeError.
