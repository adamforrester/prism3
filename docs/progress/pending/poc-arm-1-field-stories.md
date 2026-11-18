## (2026-11-18) — The arm 1 Storybook adds the text field and password field in both delivery forms (#3408 S5)

**What changed.** On the code POC's integration branch `poc/arm-1`, `apps/storybook` gains the two fields as
`<p3-text-field>` / `<p3-password-field>` and as `@prism3/css` markup. Engine output doesn't move, so there is no
change note.

- **64 new stories:** 15 cases per field per form, plus `Shown` and `ShownError` on the password field, which press
  Show. Cases cover rest, filled, hover, focus-visible, error, warning, success, disabled, read-only, pending,
  required, each size and the visual slots.
- **`check:build` covers them** (868 checks over 100 stories). It holds each state, Show/Hide in both forms, both forms'
  computed styles, and owner decision #1712 A's error wiring: `aria-invalid` at error only, `aria-describedby` naming
  the message, and no field-level live region. Four mutations fail by name.
- **The #1712 A audit:** both field forms already conform. Two gaps are flagged for the owner, not changed.
