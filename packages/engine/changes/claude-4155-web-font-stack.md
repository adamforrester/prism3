---
engine: minor
---
The engine emits a new per-brand artifact, `<brand>.web.base.tokens.json`: the conforming base with each typeface primitive's `$value` written as its full fallback stack, in the DTCG array form, primary family first and ending in a CSS generic family. `@prism3/tokens` builds its CSS from it, so `--pds3-core-font-typeface-inter` reads `Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` instead of `Inter`, and a face that fails to load falls back to its kind instead of the browser default. The platform-neutral `<brand>.base.tokens.json` and the overlays don't change: each typeface stays one family there, so Android and the other platforms read what they read before (#4155).
