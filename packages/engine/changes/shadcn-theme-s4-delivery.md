---
engine: minor
---
The shadcn/ui and Tailwind v4 themes are committed regen artifacts (#2997 PR 4, Q2997.5 B). `regen.ts` runs `emit-shadcn.ts` and `emit-tailwind.ts` after the handoff is written, so every brand now ships `out/shadcn/<brand>.css`, `out/shadcn/<brand>.registry-item.json` and `out/tailwind/<brand>.theme.css`, each drift-checked and classified as payload. A studio Export option and an MCP `include` come later.
