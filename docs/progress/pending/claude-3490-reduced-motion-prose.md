## (2026-11-18) — Accordion, tabs and banner fade under reduced motion, as the motion recipes say (#3490, #3543)

**What.** Owner decision A on #3490 (2026-11-18, also #3543): the `prism3-motion` skill's R7 and its recipes are the
decision. Four defs' `motion.reduceMotion` and two code-only motion notes now say what their recipe says:
- **Accordion:** the height changes at once, the panel's fade stays on `motion.duration-reduced.normal` both ways, and
  the indicator swaps without turning.
- **Tab and Tabs:** the underline snaps, and the incoming panel fades in on `motion.duration-reduced.fast`.
- **Banner:** it fades only, on `motion.duration-reduced.normal` both ways, and its height changes at once.

The dialog's #3538 wording was the model. The catalog, the accordion and banner plans (their code-only notes are in
the plan) and `component-surface.json` move; there is a `minor` change note.

**The gate.** `lint-motion-literals.ts` half 4 (DEF AGREEMENT). `RECIPE_DEFS`, authored in the gate, maps each recipe
to the defs it governs: 14 defs over 8 recipes, the selection controls themselves but not their rows and groups. For
each, `reduceMotion` names exactly the `motion.duration-reduced.*` roles the recipe's `**Reduced:**` form names, a
code-only note about reduced motion names no other role, and where the recipe keeps a fade, the prose keeps one and
says no "instantly" or "no transition". On main's prose it fails 12 times, naming `accordion`, `tab-item`, `tabs` and
`banner`; after the rewrite it is clean. Self-checks drive each failure kind through the live function. A first cut
matched only `fade`, so "fading" read as no fade and `segmented-control` failed: `FADES` now takes every form.

**Held for the owner: toast.** The decision's toast clause says "out on its own twin". The recipe it also names says
`motion.duration-reduced.normal` both ways, because R3 keeps a reduced exit from outlasting its entrance until #3493
orders the ramp. The exit's own twin, `duration-reduced.fast`, is longer than `normal` in all five emitted brands today. The
toast's prose already matches the recipe, so it is unchanged and passes half 4; writing the clause as given would fail
it, and the reduced-order half too. Raised on the PR.
