---
engine: minor
---
The conforming projection (`<brand>.base.tokens.json`) now writes each typeface primitive's `$value` as its full fallback stack in the DTCG array form, primary family first and ending in a CSS generic family. The canonical `<brand>.tokens.json` still holds one family, with the stack under `$extensions.prism3.fallbackStack`. Before this, the stack never reached a consumer, so the `@prism3/tokens` CSS read `--pds3-core-font-typeface-inter: Inter;` and a face that failed to load fell back to the browser default (#4155).
