---
engine: minor
---
The layout grid styles drop their `Grid /` group and are named by the bare breakpoint: `sm`, `md`, `lg`, `xl`,
`2xl`, plus `xs` where a brand has it (#2467, owner decision Q185 A). Figma's styles panel no longer shows them
inside a "Grid" group. Only `out/figma/<brand>/grid-styles.json` moves; the DTCG trees and the `layout.grid`
variables are unchanged. The plugin renames an old `Grid / <bp>` it owns to `<bp>` in place, keeping its id so
every layer using it stays linked, and never creates `<bp>` beside it. Ownership is the #1884 mark, else the
engine's grid-description signature, never the name: a client's own `sm` is not adopted, and the pre-flight
refuses the apply rather than write over it. The opt-in prune spares an old `Grid / <bp>` whose size the plan
still emits, and no longer reads a bare size as a style group. CONTRACT is unchanged: style names are not in
the token contract.
