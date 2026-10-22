## (2026-10-16) — Container states are `[]`, and `codeOnly` admissions use one template (#2711)

**What.** From the component consistency audit (#2706). Two drifts, both settled one way and both gated.

1. **Containers with no state axis.** Checkbox group, Radio group, Tabs and Segmented control said `states: ['rest']`;
   twelve other components said `states: []`. `[]` wins: the schema's own instruction on `ComponentDef.states` and the
   validator's message both say `[]` for a component with no interaction of its own, it is the majority, and it does not
   claim a one-rung ladder the set never projects. `validateComponentDef` now refuses `['rest']` alone, and `test.ts`
   drives that on Checkbox group.
2. **The admission phrasing.** Every `codeOnly` entry that admits an unprojected axis or state now reads
   `<name> — not projected: <why Figma cannot carry it>. <what the code does>`. The `#2711 codeOnly admissions` block in
   `test.ts` holds it with three arms and a literal: an entry leading with a projected name is refused (the #867 trap),
   an admission off the template is refused, a template entry naming something the set projects or does not declare is
   refused, and the 27 admissions found must equal a hand-written list.

**Why the gate is in `test.ts` and not in `admits()`.** The plugin build cuts every `codeOnly` entry to its leading term
(`apps/plugin/strip-maintainer-prose.mjs`), and `figmaPropertyErrors` runs in the plugin on those cut entries. Tightening
`admits()` to demand `— not projected:` would have refused every admission in the bundle. So the template is checked on
the source defs, and `admits()` keeps reading the leading term only.

**A live #867 instance, found by arm 1.** Dialog's codeOnly entry `placement per breakpoint, no automatic switch — …` led
with `placement`, an axis Dialog projects, so `admits('placement')` returned true: dropping `placement` from
`variantAxes` would have passed the validator. It now leads with `per-breakpoint placement`.

**Out of scope, noted.** The control atoms' `read-only — deliberately not a state of this atom` (checkbox, radio, switch)
and switch-control's `pending —` lead with names the atom does not declare, so they admit nothing and the gate leaves them
alone; they say a different thing (absent, not unprojected). #2660 rewrites the four containers but not their `states`
line, so this change and it touch different lines.
