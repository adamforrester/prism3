---
engine: minor
---
`ai.generationPriority` follows a written scale (#2713). The build-component skill now defines it: 1 the default pick,
2 a top-level component, 3 a supporting top-level component or a sibling that loses its family's tiebreak, 4–5 a
specialization for a narrower place, 6 a part a host nests that can stand alone in a stated case, 9 a part never
generated alone. Nine defs move in `components.ai.json`: Focus ring 2 → 6; Checkbox, Radio and Switch controls, Field
label and Field message 3 → 6; Tab and List item 3 → 9; Segmented control 4 → 3. `test.ts` holds every def to a
hand-written tier list, refuses a number off the scale, and refuses a 6 or 9 that no registered host nests. The field is
agent-only, so no docs page changes. No token moves, so CONTRACT is unchanged.
