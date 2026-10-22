## (2026-10-22) — Field messages off by default (#2926 item 1)

The owner decided on #2926 that a field's status/helper message starts hidden. TextField, PasswordField (through
`makeTextField`), Select and Textarea flip `figmaProperties.booleans.showMessage.default` and the `showMessage` prop's
default from true to false; Counter was already false, so all five fields now agree. The `message` Figma property, the
part names and the member counts do not move, so the component-renames ledger and the token contract are untouched; the
four sets' plan digests move and are re-accepted through `lint-component-surface.ts --accept`.

### The gate

`test.ts` now carries a `#2926` family assertion that writes the five-field list out by hand and checks the registry
against it both ways, so a def that gains a `showMessage` boolean must join the list and take the default. That is
aimed at Code input (#2789) and Search (#2912), both open: each must land with the message off. For every family member
the boolean default, the prop default and the built node (`visible: false` at every member) must agree, and no prop
description or part note may still say the message is shown by default. The older `#1426` select assertions now pin
the hidden default, with the tracking mutation flipped to show the built visibility follows the boolean.

### Existing files

A boolean property's default is a set-level value. `test-update-apply.ts` builds each of the four sets as a pre-#2926
file (message on, the `true` typed as the old file's value), places three instances (untouched, turned off, turned on)
and runs Update: the dry run lists one edit, `message` true → false, and nothing else; the property keeps its id; every
member's message node is hidden; the untouched instance follows the new default while both explicit values are kept; and
a second dry run is settled. The trap: the shim records an explicit value even when it equals the old default, and
whether Figma does the same for a designer who turned the message "on" while it was already on is not measured here.
