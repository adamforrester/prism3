---
engine: minor
---
A Tailwind v4 theme projector (#2997, PR 3 of 4). `emit-tailwind.ts` writes `tailwind/<brand>.theme.css` from each brand's emitted handoff: the shadcn variables in `:root` and `.dark`, per-mode shadow variables named `--shadow-<rung>-value` (not the shipped token CSS's `--pds3-shadow-<rung>`, so a page loading both files keeps each file's value), and an `@theme inline` block for `--color-*` (shadcn's names), `--radius-sm` to `--radius-3xl`, `--spacing`, `--font-sans`, `--font-mono` and `--shadow-xs` to `--shadow-2xl`. `projections/tailwind.ts` maps the non-color rows at `TAILWIND_MAP_VERSION` 1.0.0. `emit-shadcn.ts` exports its dimension and font readers for it. Nothing is committed under `out/` yet: the delivery lands in its own PR.

`handoffBrands` in `emit-shadcn.ts` no longer lists a brand's web base (`<brand>.web.base.tokens.json`, #4155) as a brand of its own. Both files end in `.base.tokens.json`, so the shadcn and Tailwind projectors read `aurora.web` as a brand and threw for its missing dark overlay.
