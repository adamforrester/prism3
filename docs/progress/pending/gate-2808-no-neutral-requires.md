## (2026-10-16) — Gate: no component requires the Neutral button families (#2808, Q386)

Owner decision Q386: many teams will not build Button.Neutral or IconButton.Neutral, so no other component may
need them. A close or dismiss nests FlushIconButton.Neutral, which the plugin builds as a dependency, and a neutral
action uses Button.Neutral only as a fallback-only preference declared in its own field (Q363.8 on #2661).

A new block in `apps/plugin/test-write-components.ts` holds the rule per def, by name, on two readings that share
no derivation (`docs/34` shape 2):

- **Declared:** `anatomy.parts[*].nests`, read off the def.
- **Built:** `missingDependencies` over the projected plans in an empty file. This is the plugin's own transitive
  list of what it builds before the def. It reads `nestTarget`, `swapTarget` and swap overrides off the plan, so
  it also catches a requirement that arrives through a nested def.

A fallback-only reference is neither `nests` nor `nestTarget`, so neither reading counts it.

The floors:
- Both forbidden ids must be registered defs, so a rename cannot empty the gate (shape 9).
- The built reading must walk every projected def. The count is printed and held, 39 of 39 (shape 15).
- A fixture def nesting each forbidden id must fail both predicates.

The PR is stacked on #2806 and must merge after it. Dialog's close nests IconButton.Neutral until #2806 takes
Q385 (FlushIconButton.Neutral). On #2806's current head the gate fails by name:
`#2808 dialog declares no required nest …` and `#2808 building dialog into an empty file builds no Neutral button
family first …`.

Not covered: a native slot's `preferred` list. A preferred def the file lacks is a named miss when the slot is
written, but the slot is still written. No def uses `preferred` with a Neutral family today.
