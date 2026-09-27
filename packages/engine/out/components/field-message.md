# FieldMessage

> Helper or validation caption below a field; status sets its icon and ink.

The small icon + caption below a form field. In its default status it is persistent helper guidance (the format shown BEFORE failure); its error / warning / success statuses carry a validation result. A shared field part — the same component under every field control, not re-authored per host. Icon + text together, never color alone.

- **ID:** `field-message`
- **Category:** form
- **Status:** draft
- **Also known as:** helper-text, help-text, field-error, validation-message, caption

## Usage

Place directly below a field to carry persistent helper guidance (default status) or a validation result (error / warning / success). Reuse the same component under every field control so the icon-plus-text, gated-contrast contract holds everywhere. The field wires it into aria-describedby.

### Do

- Show the format/constraint in the default status BEFORE the user can fail
- Pair the status with an icon so it is never color-only
- Let the host own aria-describedby + aria-invalid; keep this node presentational

### Don't

- Signal error with color alone (fails SC 1.4.1)
- Duplicate the error into a self-announcing live region here AND on the host — the host owns announcement
- Use warning as a hard blocker — it is a soft, non-blocking caution (many systems fold it into helper/error)

### Copy patterns

- **Labels:** Default status carries the format up front ("Use 8+ characters") so the guidance is seen before failure, not only in the error.
- **Errors:** Say what is wrong AND how to fix it (SC 3.3.3): "Enter a valid email address, e.g. name@example.com" — specific, human, not "Invalid input", not blaming the user.

## Choosing it

- **Purpose:** Carry helper guidance or a validation result below a form field, as icon + caption.
- **Use when:** Under any field control that needs persistent guidance or an error/warning/success message.
- **Avoid when:** As a standalone alert or toast (use an alert/banner) — this is field-scoped and associated to one control. Never as the sole color-coded error signal without text.
- **Often used with:** `text-field`, `select`, `checkbox-row`, `field-label`, `icon`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `status` | enum: 'default' \| 'error' \| 'warning' \| 'success' | `default` | no | default = helper guidance (neutral); error / warning / success = a validation result. The status re-points both the caption ink and the icon at the matching semantic role. |
| `message` | string \| node | — | yes | The message text. For error status, say what is wrong AND how to fix it (SC 3.3.3) — "Enter a valid email, e.g. name@example.com", not "Invalid input". |
| `icon` | slot | — | no | Overrides the leading status glyph, aria-hidden (the text carries the meaning). Rarely needed: each validation status already picks its own mark — an exclamation in a triangle for error, in a circle for warning, a circled check for success — so this is for a host with a domain-specific status mark, not for supplying the one the status implies. On the default status there is no glyph unless one is supplied here, which is what makes it the only status where this prop adds a node rather than replacing one. |
| `id` | string | — | no | Set by the host so it can reference this node from the field's aria-describedby chain. Auto-generated with useId when composed inside TextField. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `status` | `default`, `error`, `warning`, `success` | at runtime |

## Accessibility

- **Role:** none (rendered text; the host associates it via aria-describedby)
- **WCAG:**
  - 1.4.1 Use of Color (status is carried by icon + text, never color alone)
  - 3.3.1 Error Identification / 3.3.3 Error Suggestion (the error status names the problem and the fix — wired by the host)
  - 1.4.3 Contrast (caption ink clears 4.5:1; the engine gates text.\<role> per mode)
- **ARIA:** The status icon is aria-hidden — the caption text carries the meaning. The message does NOT self-announce; the host field references its id in aria-describedby (and sets aria-invalid on error). If the message appears/changes dynamically, the host wraps it in a polite live region so it is announced without stealing focus.

## Composition

- **Composes with:** `text-field`, `select`, `field-label`, `icon`
- **Planned:** `number-field`, `tooltip`, `inline-alert`

---

Generated from the `field-message` component definition.
