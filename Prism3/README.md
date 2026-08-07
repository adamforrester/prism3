# Prism3

The next iteration of the Prism white-label design system, delivered as a **brand-generation engine**: a brand is a small validated input set that the engine expands into a complete token tree, AI metadata, and platform outputs.

This directory holds the **architecture spec + Theme Schema contract** and a
**working engine prototype** that generates and validates the color axis against
a real brand (New Balance).

```
Prism3/
├── docs/
│   ├── 00-progress.md             ← status, decisions log, next steps (read for handoff)
│   ├── 01-token-architecture.md   ← the architecture spec (start here for the design)
│   └── 02-nb-regression-pass.md   ← the NB regression: method + measured results
├── schema/
│   ├── theme-schema.json          ← the white-label BrandInput contract (JSON Schema; validated on every emit)
│   ├── theme-schema.example.json  ← a worked BrandInput (aurora) that conforms to the contract
│   ├── nb-measured.json           ← NB regression measurement fixture (a different shape; consumed only by nbTheme)
│   ├── token-contract.json        ← the guaranteed token-NAME surface (committed baseline; docs/30)
│   ├── lever-manifest.json        ← the BrandInput lever presentation contract (emitted by emit-levers.ts)
│   └── example-brands.json        ← compiled BrandInput fixtures (emitted by emit-brandinput.ts)
└── engine/                        ← dependency-free TypeScript prototype (see engine/README.md)
    ├── color.ts ramp.ts theme.ts modes.ts
    ├── nb-regression.ts  emit-dtcg.ts
    └── out/{nb,aurora,harbor,wendys}.tokens.json  ← generated DTCG token trees (4 modes each) + out/figma/**
```

**Status:** architecture spec at v0.1; engine prototype generates the full
token layer — color, dimension, typography, motion, shadow, layout — end-to-end
from the schema across the corpus brands (`nb`, `aurora`, `harbor`, plus `wendys`
via the CLI). NB regression aggregate ΔE00 **1.95**, **11/11** band contrast
contracts and **488/488** mode contracts pass per brand, **936/936** (nb)
semantic aliases resolve. See `docs/00-progress.md` for the full state, the
decisions log, and what's next.

Run:

```bash
npx tsx Prism3/engine/nb-regression.ts   # regression vs real NB
npx tsx Prism3/engine/emit-dtcg.ts       # emit DTCG + modes, validate
```

The prior iterations (`../reference/Prism2`, `../reference/New Balance`) are retained as reference inputs — Prism3 is clean-sheet and cherry-picks the best mechanics from both.
