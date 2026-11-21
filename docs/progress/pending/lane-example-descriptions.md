## (2026-11-18) — A few words under each example brand (#3977)

**What ships.** Each example brand in the start window's "Explore an example" card and in the brand menu's Examples list
shows a short, muted line under its name, so a designer knows what it is before opening it (owner decision 2026-11-18,
Q-EB1 A). The three lines are the owner's approved copy, used verbatim: Prism3 "The default. Saturated blue,
balanced.", Aurora "Soft purple, rounder, quick.", Harbor "Muted teal, calm, square." The plugin's panel is the same
shell, so it shows them too. No other example is listed, so no DRAFT line was needed.

**Where the copy lives.** In a new pure engine module, `packages/engine/example-registry.ts`, one entry per example
holding its id and its line, so the line sits beside the example's source of truth and an example added without one is a
type error. `EXAMPLE_IDS` is now read from it; `emit-brandinput.ts` re-exports both, and `@prism3/engine` exports
`EXAMPLE_DESCRIPTIONS` for the hosts. Not the `design.md` frontmatter, which the issue also allowed: it compiles 1:1 to
`BrandInput`, and a description emits no token, so the schema would have carried a field only three files use.

**The shape.** In the start window each example is its chip with the line beneath it (`.p3-start-ex`), and the line
describes the chip (`aria-describedby`), so a screen reader hears it. In the brand menu the item holds the name over the
line (`.p3-menu-twoline`). Both lines are the chrome's secondary text ink, the `.p3-sub` ink, at 12px.

**Owner decision 2026-11-20 (as recommended).** Prism3's line reads "blue", not "violet" (its primary is #1E1EFF), and
the start window's examples sit 24px apart across a row (`--p3-space-300` column gap, row gap unchanged), because at
1280 the three lines, 8px apart, read as one sentence. At 480/400 the examples wrap two to a row with the same 24px
gap; at 320 they stack.

**Arms.** Chrome section `3977` (shard 2), both hosts and themes at 1280, both lists: exactly the three examples are
listed, each line reads the approved copy (typed in the suite, never read from the registry), sits under its name, and
is muted (the `.p3-sub` probe's ink, not the name's); the start window's chip is described by it; adjacent lines on one row of the start window are at least 20px apart
(8px before the 2026-11-20 change, so the check failed 4 times; it fails again by name with the gap reverted). Engine `test.ts`: every
key of the committed `schema/example-brands.json` has a non-empty line of at most 60 characters. Before: on `main`'s
shell the section stops at its first wait, 0/4. Mutation: aurora's line blanked in the registry fails
`#3977 … aurora has its line` 8 times (two hosts, two themes, two lists).

**Trap for a re-verifier.** `apps/plugin/test-build-verdict.mjs` read the example's name as the whole menu item's text;
the item now carries the line too, so it reads `.p3-menu-label`. And the guide citations into `start.ts` moved by the
seven lines the card gained.
