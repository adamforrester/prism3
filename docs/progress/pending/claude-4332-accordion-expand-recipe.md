## (2026-11-20) — The prism3-motion Accordion recipe plays the panel on the `expand` preset (#4332 follow-up)

**What.** The owner's 2026-11-20 decision on #4332 (Accordion recipe → A): the skill's Accordion recipe uses the
`expand` motion preset. The instruction named the theme skill, but the recipe lives only in `prism3-motion`
(`skills/prism3-theme/` has no Accordion recipe), so that is the file that changed. The panel's height and opacity
track now names "the `expand` preset" both ways, in place of `motion.transition.enter` / `.exit`. A short paragraph
says a preset isn't a token: find `expand` in the brand's `.ai.json` `motion_presets` block and bind the `duration`,
`easing` and `reduced_duration` it names, because a brand can move its step. It also says what Prism3's default
resolves to (`motion.duration.normal`, `motion.easing-role.default`). The reduced form is unchanged in substance:
`motion.duration-reduced.normal` both ways, now named as `expand`'s reduced duration. R5's sentence that said every
layout change runs on the enter and exit transitions now sends the accordion panel to its recipe.

**Gates.** A `test.ts` arm reads the hand-written recipe against the emitted prism3 sidecar: the panel row names
`expand` in both cells, every "`<name>` preset" the skill cites is an emitted preset, and the recipe cites each name
`expand` resolves to. `lint-skills.ts` learned the fields of a `motion_presets` entry as `.ai.json` vocabulary. Before,
it refused `reduced_duration` as an unknown identifier, since #4332 added the block after the gate's field list was
written.

**Not changed.** The `accordion` def's `motion.enter` / `motion.exit` and its code-only height note still name the
enter and exit transitions. `lint-motion-literals.ts` half 4 checks only the reduced roles, which still agree. Filed
as #4395 rather than fixed here.

**Trap.** This branch carries #4332's head through a normal merge and lands after it. Once #4332 squash-merges,
refresh by merging `origin/main`. Don't rebase.
