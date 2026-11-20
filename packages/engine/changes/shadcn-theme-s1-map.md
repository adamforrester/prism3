---
engine: minor
---
A shadcn/ui theme projector (#2997, PR 1 of 4). `projections/shadcn.ts` maps shadcn's theme variables onto Prism3 roles and holds no values; `emit-shadcn.ts` reads each brand's emitted handoff and writes the theme as plain CSS (`:root` and `.dark`) and as a `registry:theme` item, in `oklch()`. `schema/shadcn-vars.json` pins shadcn's variable set at `SHADCN_MAP_VERSION` 1.0.0. Two new gates: `shadcn-vars.ts --check` (the map covers the pinned set) and `lint-shadcn-contract.ts` (the map follows the component contract). Nothing is committed under `out/` yet: the delivery lands in its own PR.
