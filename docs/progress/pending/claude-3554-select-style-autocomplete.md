## (2026-11-11) — Select: the style axis, and the defaultValue and autoComplete props (#3554 Q-CC3, Q-CC4)

**Status:** Select def, axis register, test arms. ENGINE minor (change note). CONTRACT unchanged: no token path moves.
No executor change, so `EXECUTOR_REVISION` stays.

### What changed

- **Owner decision Q-CC3 A (2026-11-11, on #3554):** Select declares `style: ['outline']` (authoring), as TextField,
  Textarea, PasswordField, SearchField and CardNumberField do, and the register's `style` row in `lint-axis-values.ts`
  lists it. The Field style setting already reached Select's control through `FIELD_FRAME_PARTS`; now its code surface
  says so. Select takes the codeOnly `style — not projected` line in TextField's words, which is the audit's mechanical
  item M-A.4 landing with the axis it admits.
- **Owner decision Q-CC4 A:** Select gains `defaultValue` (`string`) and `autoComplete` (`string (WHATWG token)`), in
  TextField's types. `accessibility.wcag` already cited SC 1.3.5 with no prop to set it.

### Diagnosis

`style` is a code axis only: `figmaProperties.variantAxes` stays `size, status`, so Select still projects 84 members.
The plan digest moves because every member's plan carries the def's codeOnly list; the paint census and the
component-axes baseline do not move.

### Verification

Two `test.ts` arms, literals typed from the decisions: `Q-CC3 select` (the axis, its kind, the unchanged Figma axes
and member count, the codeOnly line) and `Q-CC4 select` (the two props and their types, beside the 1.3.5 claim).
Dropping `style` from Select fails `Q-CC3 select` and `lint-axis-values` by name; dropping `autoComplete` fails
`Q-CC4 select` by name.
