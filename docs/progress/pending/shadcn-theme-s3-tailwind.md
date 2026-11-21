## (2026-11-19) — The Tailwind v4 `@theme` output and the stock-Tailwind gate (#2997 PR 3)

**What.** PR 3 of #2997. `packages/engine/emit-tailwind.ts` writes one self-contained `tailwind/<brand>.theme.css` per
brand from the emitted handoff:
- the shadcn variables in `:root` and `.dark`;
- `--shadow-<rung>-value` per mode;
- an `@theme inline` block. Colors use shadcn's names only (Q2997.15 A). Every radius rung comes from our scale
  (Q2997.12 B). `--spacing` is 4px, from `space.050`. Fonts are sans and mono only (Q2997.16 A). Shadows run from `xs`
  to `2xl`.

The map for the non-color rows is `projections/tailwind.ts` (`TAILWIND_MAP_VERSION` 1.0.0, versioned by #2997 §9's rule).
Gate 5 is `npm run -w @prism3/tokens check:shadcn`. It compiles a typed fixture against each brand's file with the
stock Tailwind CLI, pinned exact at 4.3.3 in `packages/tokens`. The engine stays dependency-free.

**Why `inline`, and why per-mode shadow variables.** With `@theme inline`, Tailwind writes the variable into the
utility: `bg-primary` becomes `var(--primary)`, so `.dark` flips it, as shadcn's own scaffold does. Shadows differ per
mode, and Tailwind copies a shadow's theme value into `--tw-shadow`. A `.dark` override of `--shadow-md` would therefore
never reach the utility. The theme points `--shadow-md` at `var(--shadow-md-value)`, and that variable is set in both
blocks. Checked in the compiled output: `.shadow-md { --tw-shadow: var(--shadow-md-value) }`.

**The shadow variable name (owner decision on #4309, B).** The per-mode variables are `--shadow-<rung>-value`, not
`@prism3/tokens`' own `--pds3-shadow-<rung>`. A page that loads both the shipped token CSS and this theme would
otherwise have the shipped `[data-theme="dark"]` rule override the theme's value for the same name. Gate 5's new
`[COLLIDE]` check builds the shipped CSS with its own stock `sd.ship.mjs` and fails if any variable the theme sets in
`:root` or `.dark` is a name the shipped CSS writes.

**Values are gate 2's.** Gate 5 checks that a color or shadow utility reads a variable set in both modes, not what the
variable holds. Gate 2 (`lint-shadcn-roundtrip.ts`) reads the Tailwind theme's `:root` and `.dark` as well as the shadcn
file, through Chromium, against each role's per-mode value, so a theme with light and dark swapped fails
`<brand> tailwind light background: …`. No gate compares a shadow variable's value yet.

**Trap.** The Tailwind CLI resolves `@import "tailwindcss"` from the input file's own directory, so an input in a temp
dir fails with "Can't resolve 'tailwindcss'". The gate imports the resolved `tailwindcss/index.css` path with
`source(none)` and names its classes with `@source inline(...)`. Without `source(none)`, Tailwind also scans the working
directory and compiles any class-like word it finds there.

**Version pin.** Tailwind 4.3.3 (2026-07-16). 4.3.4 and 4.3.5 were under two weeks old when this was built.

**Checked.** Mutations, each failing by name:
- dropping `--color-ring` from `@theme` fails `outline-ring utility unresolved`, on all five brands;
- mapping `spacing` to `space.100` fails `p-2 computes calc(8px * 2), not space.100 (8px)`;
- leaving the shadow variables out of `.dark` fails `--shadow-md-value is not set in .dark`;
- naming the shadow variables `--pds3-shadow-<rung>` again fails `[COLLIDE] <brand>: the theme sets --pds3-shadow-md in
  .dark, and --pds3-shadow-md is also written by the shipped token CSS`.

**Fix after merging main.** #4155 added `<brand>.web.base.tokens.json` beside each base. `handoffBrands` matched on the
`.base.tokens.json` suffix, so it read `aurora.web` as a brand, and `check:shadcn` and `lint-shadcn-contrast.ts` threw
`aurora.web: no aurora.web.dark.overlay.tokens.json in the handoff`. It now skips the web base. A `test.ts` arm holds
the brand list to the committed handoff's own canonical files. Putting `handoffBrands`' old suffix rule back fails
`#2997: handoffBrands lists each brand once, no web base among them`. The projectors still read the single-family base,
not the web base's fallback stacks. Whether `--font-sans` should carry the stack is an open question, not part of this fix.
