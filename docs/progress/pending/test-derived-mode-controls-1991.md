## (2026-10-02) — the derived-mode read-only checks count every control, not just native ones (#1991)

**Status:** test-only (`apps/studio/test-chrome.mjs`). No studio source change, no freeze exception, no
engine change.

### What changed

The derived-mode checks ("in HC light, HC dark and wireframe, every control on the page is disabled", Q59)
collected controls with `button, select, input`. A non-native control (a `[role=switch]`, a
`[contenteditable]`, any `[tabindex]` element with a click handler) could stay live in a derived mode and the
check would pass. None exists today, so the hole was latent.

One shared definition, `DERIVED_CONTROL_QUERY`, now says what a control is: every native control, every ARIA
widget role (`switch`, `checkbox`, `radio`, `slider`, `spinbutton`, `tab`, the `menuitem`s, `option`,
`combobox`, `textbox`, `button`), every editable region, and every element in the tab order. Off means
`:disabled` (which also covers a control in a disabled fieldset) or `aria-disabled="true"`. It is passed
into the page as data, so the checks that use it cannot drift apart.

### Where it applies

- **Surfaces & fills** (S4d, Q56/Q59) and **Interactive** (S5, Q59): the two derived-mode checks with the
  issue's shape.
- **The read-only scrim and focus rows** (S4c, S4d): they assert a row has *no* control, with the same
  native-only query, so a switch there passed too. Not a derived-mode check, but the same hole.
- **S2 Palettes and S3 Brand › Modes**, which the issue asked about, have no derived-mode read-only check,
  so there was nothing to widen. The smoke suite's derived-mode check on the surface controls (S4c) names
  its four controls one by one, which a wider query would not change.

### Mutations

A `<div role="switch" tabindex="0">`, injected into the source and restored each time:

| Injected into | Fails |
|---|---|
| every Surfaces & fills row | 6: `… every control on Surfaces & fills is disabled (Q59) — 257 controls …, 112 enabled: div[role=switch], …`, each derived mode on both hosts |
| every Interactive lever section | 3: `Q59: previewing HC dark, every control on Interactive is disabled (85/89, …) — enabled div[role=switch]`, each derived mode |
| the scrim row | 8: the six above, plus `… Background fills shows the scrim once, read-only … 1 control(s) …` on both hosts |

**The control that proves the widening is what bites:** the first mutation run against `main`'s unwidened
check passes 12,031/12,031, with 112 live switches on the page in every derived mode.

The count of controls on Surfaces & fills is unchanged at 145 per derived mode: nothing non-native exists.
