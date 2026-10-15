---
engine: minor
---
Password field (#2317, owner decisions Q301, 2026-10-14). TextField's def is now built by a shared field factory,
`makeTextField` in `components/text-field.ts` (Q301.8 A, the `makeButton` pattern), and TextField's output is
byte-identical: no TextField artifact or projected surface moves. `password-field` (PasswordField) is the factory's
second output: TextField's anatomy and token block with no trailing slot, the label in a row with a nested Button at
its end (Q301.2 B), text appearance, flush, primary intent and emphasis weight (Q301.3 B), its size following the
field's. size x status x state = 84 members, no visibility axis (Q301.6 A); the default member shows a masked value
and "Show". Its own page under Components (Q301.9 B). Engine: `NestingRelation.atState` maps a host state to nested
axis values (the toggle nests Button's disabled member at the field's disabled member and rest everywhere else), and
`PartDef.nestTexts` sets a nested instance's own TEXT property; both executors write it with `setProperties`
(EXECUTOR_REVISION 24), and the round-trip reads it back. No token is added or renamed, so CONTRACT is unchanged.
