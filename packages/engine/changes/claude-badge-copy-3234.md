---
engine: minor
---
Badge copy that the inline style made stale (#3234, owner Q3234.1 A, Q3234.2 A, Q3234.3 A). The `size` prop names both
styles in its existing order (contained 12px / about 30px and 11px / about 19px; inline 16px on a 24px line and 14px on a
21px line). The usage sentence and `ai.whenToUse` say "next to what it describes" instead of a second sense of "inline".
The do reads "Keep a contained label to one or two words, and use the same casing everywhere", and the `label` prop and
`accessibility.labelPattern` say the same. `components.ai.json` and the Badge docs page move; no token moves, so CONTRACT
is unchanged.
