# The arm input contract (#3408)

The KPI 2 and KPI 3 checks in this folder measure a Storybook. They don't need to know how an arm builds its
components. They need one JSON file that says where things are. Arm 1's is `arm-1.contract.json`. Another arm writes
its own, and `check-arm-contract.ts` tells it, by name, what's missing.

```sh
npx tsx apps/storybook/check-arm-contract.ts --contract <your-contract.json> --storybook <your storybook-static dir>
```

## What the file holds

```jsonc
{
  "format": "1.0",
  "arm": "a short name for the arm",
  "components": {
    "button": {
      "root": "[data-component=\"button\"]",       // the component's root, inside Storybook's #storybook-root
      "parts": {
        "container": "",                            // always '' (the root itself)
        "container/label": ":scope > .label",       // each anatomy part path: a selector relative to the root
        "container/spinner": { "unboxed": "why" }   // or a part with no box of its own in your markup, and why
      },
      "focusRing": { "drawn": "outline" }           // or { "drawn": "part", "selector": "..." } or { "drawn": "none", "why": "..." }
    },
    "text-field": { "...": "..." }
  },
  "forms": {
    "your-form-name": { "template": "components-{component}-{form}--{case}" },   // a story id pattern, or:
    "another-form":   { "cases": { "button": { "rest": "story-id", "hover": "story-id" } } }
  },
  "tokens": { "scheme": "stock" }                  // or { "scheme": "map", "map": { "--your-name": "pds3.color.text.primary" } }
}
```

- **Components.** `button` and `text-field` are required, because the brief names them for both arms.
  `password-field` is optional. Any other component id must be one the engine defines.
- **Part paths.** These come from the engine's anatomy for each component, which is `specs.json`'s `anatomy[].part` in
  the emitted component exports (`npx tsx packages/engine/emit-component-docs.ts --uncommitted --out <dir>`). Every part
  path must be mapped to a selector or declared `unboxed`. A part path the anatomy doesn't have fails. These are the
  same keys Figma's layers carry, so the geometry record can be set beside Figma's.
- **The focus ring** goes in `focusRing`, not `parts`. If the anatomy draws `container/focusRing`, `none` fails.
- **Forms.** Name as many delivery forms as the arm ships. Each form needs a story id for every KPI 2 state:
  - `rest`, `hover`, `focus-visible`, `disabled` and `pending` for every component;
  - `error` as well, for the fields.

  Each id must be in your built Storybook's `index.json`. Story ids that weren't checked don't count as a pass.
- **Tokens.** Use `stock` if your CSS custom properties are stock Style Dictionary's names: `--` and the full token
  path, each `.` a `-` (`--pds3-color-text-primary`). Otherwise, give a `map` from each property to its token path.
  Every path must be a token in `packages/engine/out/prism3.tokens.json`.

## What reads it

- `check-geometry.ts` takes its roots and part selectors from arm 1's contract.
- `compare-figma-geometry.ts` compares exactly the contract's boxed parts. A Figma layer for a part the contract maps
  fails when no code case drew it. It no longer drops out because the code never drew it. `--contract <file>` points it
  at another arm's contract.
