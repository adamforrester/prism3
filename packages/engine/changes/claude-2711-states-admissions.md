---
engine: minor
---
Component states and `codeOnly` admissions read one way (#2711). Checkbox group, Radio group, Tabs and Segmented control
declared `states: ['rest']`; they now declare `states: []`, like every other component whose states live on its children,
and the validator refuses `['rest']` alone. `components.ai.json`, the four docs pages and `docs/public/reference/figma-conventions.json` no
longer list a `rest` state for them (the last as a code-only state). Every `codeOnly` entry that admits an axis or state Figma does not carry now reads
`<name> — not projected: <why>. <what the code does>`, and `test.ts` holds the phrasing, refuses an entry that leads with a
name the set does project, and pins the 27 admissions by name. Dialog's per-breakpoint placement entry no longer leads
with `placement`, an axis its set projects. No token moves, so CONTRACT is unchanged.
