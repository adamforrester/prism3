---
engine: patch
---
The shadcn/ui theme projector (`emit-shadcn.ts`) takes a brand only when its full tree `<brand>.tokens.json` sits beside its `<brand>.base.tokens.json`. Since #4282 the handoff also carries a web-only `<brand>.web.base.tokens.json`, which has no overlays; the projector read it as a brand and threw (#4428). No committed artifact changes.
