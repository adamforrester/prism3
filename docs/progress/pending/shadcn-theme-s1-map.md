## (2026-11-19) — The shadcn/ui role map, its pinned variable set, the projector, and gates 3 and 4 (#2997 PR 1)

**What.** The first of #2997's four PRs, built from the owner's decisions of 2026-11-19 (Q2997.1 B, everything else as
recommended). `packages/engine/projections/shadcn.ts` is the one authored part: shadcn's 32 theme variables, plus
`destructive-foreground` (Q2997.9 A), each pointed at a role path below the brand root, and the `cssVars.theme` rows
(every radius rung, Q2997.12 B; `font-sans` and `font-mono`, Q2997.16 A). It holds no values. `emit-shadcn.ts` reads the
emitted handoff (`<brand>.base.tokens.json` plus the dark overlay) and writes `shadcn/<brand>.css` and
`shadcn/<brand>.registry-item.json` for every brand, in `oklch()` (Q2997.14 A). The registry item carries the base-layer
rule that restores a full-strength ring (Q2997.17 B). It is not a regen step yet: delivery is PR 4.

**Two gates.** `shadcn-vars.ts --check` (gate 3) holds the map's keys to `schema/shadcn-vars.json` both ways, and the pin to
`SHADCN_MAP_VERSION`; only `--accept` writes the pin, and it refuses without a version raise. `lint-shadcn-contract.ts`
(gate 4) holds the anchored rows (primary, secondary, destructive and their foregrounds, input, ring) to the bindings in the
published contract export, which it renders itself because it is never committed. Every row is anchored or declared
unanchored, and every mapped role is in the guaranteed set. The anchors are typed in the gate, never read from the map.

**The trap for whoever re-verifies Q2997.18.** The decision was to pin shadcn as a devDependency and read its set offline,
if the package carries the set. It does not: shadcn 4.23.0 and `@shadcn/registry` 0.2.1 ship the CLI and the registry
schema, and the variable set lives only in the hosted registry. So no devDependency was added, the pin was read from
`r/styles/new-york-v4/theme-neutral.json`, and the upstream arm runs only with `--upstream <file>`. Without one, the gate
prints NOT CHECKED rather than a pass, and the arm proves itself every run against a planted stand-in. Flagged on #2997.

**Q2997.1 B, rechecked.** `card` is now `background.primary`, so its pairs are the page's: `card-foreground` on `card`
19.42 light and 18.13 dark on prism3, `muted-foreground` 5.51 and 5.03, `input` 3.85 and 3.52, `ring` 7.82 and 5.03. The
card no longer separates from the page by fill (1.00); its edge is `border`, 1.38 and 1.65. `muted` is no longer equal to
`card` (1.21 and 1.08 apart). `destructive` as text on `card` is now `destructive` on the page: 4.56 light passes, 4.25
dark is the known Q2997.8 failure. One finding for PR 2's contrast gate: on nb, light `muted-foreground` on `muted` measures
3.77, below 4.5. Q2997.4's premise holds on the four engine-native brands only.

**Checked.** Mutations, each failing by name: `primary` → `color.foreground.brand` fails `primary: color.foreground.brand ≠
Button filled.fill (color.interactive.primary.fill.rest)`; `accent` → `color.interactive.neutral.overlay.hover` fails
`NOT GUARANTEED`; dropping `sidebar-ring` fails `UNMAPPED sidebar-ring` (and gate 4's `STALE UNANCHORED`); an upstream item
with an added name fails `UPSTREAM ADDED sidebar-glow (light)`; a raised map version with no accept fails `MAP VERSION`.
Every emitted `oklch()` converts back to its emitted 8-bit color through `color.ts` (320 of 320); PR 2 proves it through
Chromium's parser, which shares no code with the projector.
