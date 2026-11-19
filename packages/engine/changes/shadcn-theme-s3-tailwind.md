---
engine: minor
---
A Tailwind v4 theme projector (#2997, PR 3 of 4). `emit-tailwind.ts` writes `tailwind/<brand>.theme.css` from each brand's emitted handoff: the shadcn variables in `:root` and `.dark`, per-mode shadow variables, and an `@theme inline` block for `--color-*` (shadcn's names), `--radius-sm` to `--radius-3xl`, `--spacing`, `--font-sans`, `--font-mono` and `--shadow-xs` to `--shadow-2xl`. `projections/tailwind.ts` maps the non-color rows at `TAILWIND_MAP_VERSION` 1.0.0. `emit-shadcn.ts` exports its dimension and font readers for it. Nothing is committed under `out/` yet: the delivery lands in its own PR.
