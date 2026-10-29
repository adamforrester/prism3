## (2026-10-29) — Gate: the redesign seed's leading, label weights and viewports match the stored input (#3146)

**The gap.** #3080 synced the reference brand's redesign seed to its stored input (Q821 A): `lineHeights`,
`leadingShift`, label weights `[default, emphasis]` and `minViewport: 375`. Reverting the seed to the #3080 base still
passed `test.ts`, because the #3077 arm pinned only size and tracking.

**The fix.** The fix is test-only, so no engine bump is owed. The #3077 type table now carries each composite's
leading rung and value (`display.2xl → snug 1.2`, `body.md → relaxed 1.65`, `label.md → snug 1.2`, …), written as
literals. Arm (a) checks the seed against the table. Arm (b) checks the stored input, patched, against the same
literals, so the table is confirmed from the other side without either one being read into it. Arm (a) also gains
two assertions: the fluid clamp is 375–1440, and the label weight-role set is `default,emphasis`, both emitted and
declared.

**The trap in the label check.** The engine's default label weights are also `default, emphasis`. So a seed with its
`label` line dropped emits the same pair, and an emitted-set check alone passes. The assertion therefore also reads
the seed's parsed input for an explicit `label` entry. Without it, the seed silently follows the engine default
instead of the stored input.

**Mutations.** Each mutation fails its arm by name:
- The seed reverted to the #3080 base (`5837a115`) fails the type table (leading), the viewport arm and the label arm.
- `minViewport` alone set back to 402 fails only the viewport arm.
- The `label` weight line alone dropped fails only the label arm.
