## (2026-10-27) — Grid margin per brand: the reference brand's md margin is 44, linked to core/dimension/44 (#3052)

**What.** The owner's Q785 A replaces #3052's first answer (a raw 44 with no link). A per-brand grid margin or
gutter links to the first of: (1) a `space/*` step with that px, (2) the brand's `core/dimension/*` step, (3) a
plain px flagged off-scale. Never snapped. The reference brand sets `marginOverrides: { md: 44 }` in `nbThemeFrom`
and in `examples/nb-redesign.design.md`; `grid/margin` md now aliases `nbds/core/dimension/44` in the Figma `layout`
collection and the md grid style's offset is 44. sm stays 16 on `space/200`. Every other brand: no diff in `out/`.

**Diagnosis that kept it small.** The lever already existed (`layout.marginOverrides`, #1593), and `tree.ts`'s
`gridSpaceAlias` already fell back to a raw leaf; only `resolveGap`'s throw stood in the way. The rule lives in one
helper, `gridGapLink` (theme.ts), which both the token builder and the decisions note read. `emit-figma-dims` needed
no change: it copies whatever the DTCG alias is.

**Bind vs gate (technical call).** The grid style's offset is not bound to `grid/margin`. A grid style is a static
per-breakpoint copy; a variable bound inside it resolves in the frame's layout mode, so the `md` style would show
`sm`'s margin on an `sm` frame. The two emitters are gated to agree instead (test.ts 19g, G1).

**Gates (test.ts 19g).** G1 margin/gutter variable == grid style offset/gutterSize per brand × mode; G2 the reference
brand md == 44 → `core/dimension/44`, sm unchanged; G3 a link reaches `core/dimension/*` only when no `space/*`
step has the value (read from the emitted Figma `space` collection), and a plain value is flagged; G4 every other
brand's link table pinned as shipped. Mutations M1–M4 recorded in the block header.

**Trap for later.** The generalise arm (21)(d) compares unrooted names (`'grid/gutter'`) against rooted emitted
names, so it selects no rows and cannot fail. Filed as #3053 rather than fixed here.
