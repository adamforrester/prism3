## (2026-11-19) — The token CSS ships the light defaults on [data-theme="light"] too, and its README names every promised brand (#4135, #4134)

Found in the 2026-11-19 token output and hygiene audits (#4104).

**#4135.** `packages/tokens/sd.ship.mjs` wrote the light defaults under `:root` only, and each other mode under
`[data-theme="<mode>"]`. Dark, hc-dark and hc-light worked on any subtree, but light didn't:
`<section data-theme="light">` inside `<html data-theme="dark">` matched no rule and kept the dark values. The
base run's stock `selector` option is now `:root, [data-theme="light"]`, one rule, so the no-custom-code rule holds
and no token name moves. A one-off browser check of the built CSS: a light section inside a dark page resolves
`--pds3-color-background-primary` to `#ffffff`, the dark page around it to `#0d0d0e`.

`check-package.mjs` now reads a selector list as each of its selectors and promises `[data-theme="light"]` by name,
held to the base values like `:root`. `[OWN FILE]` expects `base.css` to hold that one rule with both selectors, and
the joined file to hold 5 selectors in 4 rules. On main it fails on `[BLOCK] [data-theme="light"]`, the count arm and
`[OWN FILE] … base.css`. Mutation: the selector misspelled `[data-theme="lite"]` fails `[BLOCK]` and `[OWN FILE]`
by name.

**#4134.** The README's scope table named four brands and said "four known profiles", while `PROMISED` in
`check-consumability.mjs` holds five: the canonical default theme, `prism3`, was missing. The table gains the
`prism3` row, and the prose now says "every brand in `PROMISED`", so it has no count to drift. Two neighboring
claims were stale too and are fixed: "the only brand with gradients" (`prism3` has gradients) and "the rest at
`prism`" (each brand has its own root). A new `[SCOPE-DOC]` arm reads the README's scope table and asserts a row
for every promised brand and no row for any other. On main it fails on the `prism3` row. Mutations: dropping the
row fails `[SCOPE-DOC] … a row for \`prism3\``, and adding an unpromised row fails `[SCOPE-DOC] … names only
promised brands`.

No engine code moves, so no change note: the same as #3503, #3583 and #3950.
