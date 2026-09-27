# Switch.Row

> Labeled switch for a setting that applies immediately. Label leads, switch trails.

A control for a binary on/off setting that takes effect IMMEDIATELY — no save, no submit; the flip is both the input and the execution command. The labeled ROW: it nests a Switch.Control (the track, thumb and state glyph) and carries the setting label, with the whole row as the hit target and the control at the trailing edge. Independent by definition: there is no Switch.Group, which closes the selection-control decomposition arc (checkbox has an optional group, radio a mandatory one, switch none). A settings list of switches is a list of rows, not a selection group. Not a staged binary submitted with a form (Checkbox.Row — if a submit button sits anywhere in the flow, it is a Checkbox.Row), not an action or view-mode toggle (a toggle button with aria-pressed, not built yet), not a one-of-two exclusive labeled choice (Radio.Group, or a segmented control, not built yet).

- **ID:** `switch-row`
- **Category:** form
- **Status:** draft
- **Also known as:** switch, toggle, toggle-switch, on-off, switch-group
- **Builds on:** `checkbox-row`

## Usage

Use for a binary on/off setting that applies IMMEDIATELY — notifications, dark mode, Wi-Fi, a feature flag in a settings panel. Compose into a list or settings row with the label leading and the switch at the trailing edge, which is the habitat this control comes from. There is no group: a panel of switches is a list of rows, and each switch owns its own independent boolean and fires its own mutation. Default to optimistic updates with revert-and-message on failure, and reach for `pending` only where an inconsistent intermediate would genuinely harm.

### Do

- Apply the change the instant it is toggled — the immediacy IS the contract
- Put the label first and the switch at the row's trailing edge; flip to control-leading only when a switch sits inline among other form controls
- Name the setting, not the state, and keep the label the same on and off
- Default to optimistic: flip immediately, then revert and say what failed if the effect did not take
- Guard the re-toggle race — lock input on the first interaction until the effect resolves
- Support read-only for settings a user may review but not change: focusable, in the tab order, at full contrast
- Let thumb POSITION carry the state, and add the thumb glyph (`showStateLabel`) where legibility demands a cue beyond color

### Don't

- Use a switch for a binary that is submitted with a form — if a Save button sits anywhere in the flow it is a Checkbox.Row (Apple's HIG reserves switches for immediate settings)
- Use a switch whose toggle reveals a sub-form that must be filled before the data is valid — that is progressive disclosure, not an immediate mutation, and it is the most common real misuse
- Put aria-pressed on a switch — it corrupts the announcement; aria-pressed is a toggle BUTTON
- Reach for a Switch.Group — there is none, deliberately: a settings list is a list of rows
- Hardcode "On"/"Off" text beside the label — use the thumb glyph affordance instead
- Add a third or indeterminate state — role="switch" coerces aria-checked="mixed" to false
- Put the focus ring on the thumb — it moves, so the indicator would travel with it

### Content guidelines

The label names the setting and never changes. The description says what turning it on will do. Async failures say what did not happen and that it reverted.

### Copy patterns

- **Labels:** Names the SETTING, not the state and not the action — "Airplane Mode", "Location Services"; not "Airplane Mode is On" and not "Turn on Airplane Mode". A stable noun or adjective phrase that does NOT change on toggle: a label flipping between Enable and Disable is disorienting and is a common bug. Positive framing is mandatory — the on state is the affirmative, so off never means a double negative. Sentence case, no terminal punctuation. Long labels wrap; the fixed-width track does not shrink. AND REJECT HARDCODED ADJACENT "On"/"Off" TEXT, which is the label rule this control has and its siblings do not: it competes with the track state, produces duplicative screen-reader output, and does not localize. The track plus the role="switch" announcement already carries it; where legibility genuinely demands more, use the thumb glyph affordance (`showStateLabel`) rather than words.
- **Errors:** An OUTCOME failure, not a validation failure: say what did not happen and that it reverted — "Couldn't turn on notifications. Try again." Near the control, as a status message rather than a field error. Never "Invalid input"; there was no input to invalidate.

## Choosing it

- **Purpose:** Set a binary on/off value that takes effect immediately, with no save step, via a labeled row that nests the track-and-thumb control.
- **Use when:** A single independent setting that applies the moment it is flipped — a notification preference, dark mode, a feature flag — usually in a settings row or list with the label leading.
- **Avoid when:** The change is staged and committed by a Save or Submit button (Checkbox.Row — the presence of that button anywhere in the flow is the tell), the toggle reveals a sub-form that must be completed for the data to be valid (Checkbox.Row again; the most common misuse), it is a single consent or agreement (Checkbox.Row), it performs an action or sets a view mode rather than holding a setting (a toggle button with aria-pressed, not built yet), it is a one-of-two exclusive labeled choice (Radio.Group, or a segmented control, not built yet), or a third indeterminate state is needed (Checkbox.Row). Also do not reach for this def expecting a group: there is no Switch.Group by decision.
- **Often used with:** `switch-control`, `field-label`, `field-message`, `focus-ring`
- **Keywords:** switch, toggle, toggle switch, on off, on/off, enable, setting, immediate, feature flag, dark mode
- **Generation priority:** 2

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `checked` | boolean | — | no | The binary, with `defaultChecked` for the uncontrolled form — native naming. `onChange` is expected to apply the effect IMMEDIATELY: that expectation is the component's contract, and a switch whose change is committed by a later Save button is a Checkbox.Row. For an async effect the controlled value is the SERVER-CONFIRMED source of truth with optimistic local state layered over it. |
| `label` | node | — | no | Rich content, and part of the hit target — the Checkbox.Row label model, inherited. Names the SETTING as a stable noun or adjective phrase ("Airplane Mode"), never the state ("Airplane Mode is On") and never an action ("Turn on Airplane Mode"). It does NOT change on toggle: a label that flips Enable/Disable is disorienting and is a common bug. |
| `description` | node | — | no | Helper beneath the label, describedby-wired. Where the consequence of the setting goes — what turning it on will actually do. |
| `labelPosition` | enum: 'leading' \| 'trailing' | `leading` | no | Where Switch.Row differs structurally from Checkbox.Row and Radio.Row, whose control always leads. Defaults to label-leading because a switch's habitat is the settings row, with the toggle at the row's trailing edge where the eye expects it; flip to control-leading when a switch sits inline among other form controls. A PROP and not a variants axis: it changes a row's direction and no ink at any coordinate, so it is an anatomy concern (see the header). |
| `isPending` | boolean | `false` | no | A first-class state here, because an immediate change can still wait on the network. Locks input, swaps the thumb for a spinner and announces `aria-busy`. The practice ships optimistic-by-default — flip instantly, revert and message on failure — with this as the alternative for high-latency or critical toggles where an inconsistent intermediate is genuinely harmful. |
| `readOnly` | boolean | `false` | no | Supported, which is not obvious for a toggle. Enterprise dashboards need users to review permission sets and system config they lack authority to change, and disabling those drops them from the tab order while swapping to static text hides the setting from screen readers. So: `aria-readonly="true"`, focusable and IN the tab order, at full WCAG contrast (unlike disabled), and visually distinct from disabled. |
| `showStateLabel` | boolean | `false` | no | The on/off affordance — a checkmark in the thumb when on, an X when off, off by default since thumb position plus track color carries the state. Add only where state legibility genuinely demands it. Exposed from the nested Switch.Control, which carries the glyph. This is NOT hardcoded "On"/"Off" text adjacent to the label, which is rejected outright: it competes with the track, duplicates the screen-reader output, and does not localize. |
| `size` | enum: 'small' \| 'medium' | `medium` | no | Two rungs, not three: switches rarely warrant a large. Scales the row: the label-to-control gap, the row's minimum height, the label's type, and — passed through to the nested control by `follow` — the track's height and length and the thumb's diameter. |

## States

`rest`, `hover`, `pressed`, `focus-visible`, `disabled`, `read-only`, `pending`, `error`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `small`, `medium` | once, when authored |

## Accessibility

- **Role:** switch (native \<input type="checkbox" role="switch">), with aria-checked true/false — announced "on"/"off", NOT "checked"
- **WCAG:**
  - 4.1.2 Name Role Value (the switch role and aria-checked doing the work)
  - 1.4.1 Use of Color (thumb POSITION distinguishes on from off, never track color alone; the thumb glyph is a legibility aid on top of that)
  - 1.4.11 Non-text Contrast (the off-state track must be distinguishable from the background) / 2.4.13 Focus Appearance
  - 2.5.8 Target Size (the whole row, as in Checkbox.Row)
  - 4.1.3 Status Messages (the async outcome or error of an immediate change)
- **Keyboard:** Each switch is its own tab stop — like Checkbox.Row, unlike Radio.Row, and there is no group to traverse. SPACE toggles, which is the canonical W3C activation; some systems also accept Enter. Nothing else: no arrow keys, because a switch is never one of a mutually-related set.
- **Focus:** :focus-visible ring on the TRACK, never the thumb — the thumb moves, and a ring that travels with it reads as two indicators. Offset, at least 3:1, keyboard traversal only. A read-only switch STAYS in the tab order and stays focusable; a disabled one is removed from it.
- **ARIA:** Three roles are easily confused: checkbox is role="checkbox" (announced "checked"), switch is role="switch" (announced "ON"/"OFF"), and a toggle button is role="button" + aria-pressed (announced "pressed"). Putting aria-pressed on a switch is a recurring and severe error that CORRUPTS the announcement. Prefer the styled native input — \<input type="checkbox" role="switch"> keeps focus, activation and the a11y tree for free. ANNOUNCE THE IMMEDIATE EFFECT: aria-checked flips on toggle; for an async effect set aria-busy during flight and announce the outcome politely (4.1.3). The thumb glyph is decorative (aria-hidden) — the role and state already carry on/off. TWO IMPLEMENTATION TRAPS: the IA2 quirk, where both aria-pressed buttons and role="switch" map internally to IA2_ROLE_TOGGLE_BUTTON — author to the ARIA spec regardless; and shadow-DOM label detachment, where wrapping a web-component switch in a native \<label> does NOT associate the name with the input inside the shadow root, so set aria-label or aria-labelledby explicitly.

## Composition

- **Composes with:** `switch-control`, `field-label`, `field-message`, `focus-ring`
- **Alternative to:** `checkbox-row`, `radio-row`
- **Planned:** `card`, `toggle-button`, `segmented-control`
- **Replaces:**
  - a checkbox misused for an immediate-effect setting
  - two radios standing in for an obvious binary on/off
  - an aria-pressed toggle button misused to hold a state setting

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- read-only — a `states` value the Figma set does not carry. Since #1354 the Row projects a SIZE-ONLY set (no stateAxis): the control's `state` is EXPOSED from the nested `switch-control` and the consumer drives it from the Row, so no state is enumerated into the Row's own matrix. read-only binds NOTHING even in code: the brief recommends a lock affordance over a styled locked control, and the one candidate token resolves to the same step as the rest border in all four brands.
- pending — first-class in `props` and carried by no Figma member. It is a THUMB SWAP (a spinner replaces the thumb) on the nested control plus an `aria-busy` lock, not a row skin; `button`'s `overlay` part (#848) is the mechanism, unauthored on the control here. The Row's own per-state LABEL treatment (`disabled.label` dimming the text) is the CODE projection's, not Figma's — `lint-paint` arm 2 reads `def.states` for reachability, so `disabled.label` stays reachable and keyed for code while the Figma SET collapses to size-only.
- states — the documented cost of collapsing 24 members to 2 (the #1354 decomposition). A disabled Row in Figma shows the disabled CONTROL (the exposed state) beside a full-ink label, because the Row no longer multiplies state.
- min-height — `size.*.min-height` is the row's FLOOR and Figma has no floor. `PartDef` carries `height`, which is fixed, so binding it on the row would clip a wrapping label at the one coordinate that matters most. The row hugs its children instead and the keys stay bound for the code projection.
- THE FULL-WIDTH SETTINGS ROW, this component's actual habitat and layout rather than anatomy. The row HUGS its children here, so `label` and the control sit adjacent with the gap between them; a settings panel stretches the row and pins the control to the trailing edge, and `justify` on a hugging row cannot express that. `labelPosition: trailing` — the control-leading order for a switch among other form controls — is the same kind of fact: a prop that reorders this row, and the reordered form is the code projection's.
- The `description` prop — helper text beneath the label, describedby-wired, where the CONSEQUENCE of the setting goes. A second text part under `label` rather than beside it, which would change the row's vertical shape for content that is optional at every member.
- RTL — the label-leading row mirrors AND the thumb travel flips (`on` sits at the inline-END). Logical properties make that automatic in CSS; a Figma projection would need it stated, and nothing does.

---

Generated from the `switch-row` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
