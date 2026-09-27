# FieldMessage

> Helper or validation caption below a field; status sets its icon and ink.

The small icon + caption below a form field. In its default status it is persistent helper guidance (the format shown BEFORE failure); its error / warning / success statuses carry a validation result. A shared field part — the same component under every field control, not re-authored per host. Icon + text together, never color alone.

- **ID:** `field-message`
- **Category:** feedback
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

### Content guidelines

Say what is wrong and how to fix it, with the constraint stated: "Enter a valid email address, like name@example.com", "First name must be 35 characters or less" — never "Invalid" or an error code. Use plain language with no blame ("Enter your first name", not "You forgot to enter your name") and no humor. Reuse the field label's own words, and keep the message identical to its line in any error summary. Use a success status sparingly, for an asynchronous confirmation such as "Username available". In the default status, state the requirement up front so the error never has to.

### Copy patterns

- **Labels:** Default status carries the format up front ("Use 8+ characters") so the guidance is seen before failure, not only in the error.
- **Errors:** Say what is wrong AND how to fix it (SC 3.3.3): "Enter a valid email address, e.g. name@example.com" — specific, human, not "Invalid input", not blaming the user.

## Choosing it

- **Purpose:** Carry helper guidance or a validation result below a form field, as icon + caption.
- **Use when:** Under any field control that needs persistent guidance or an error/warning/success message.
- **Avoid when:** As a standalone alert or toast (use an alert/banner) — this is field-scoped and associated to one control. Never as the sole color-coded error signal without text.
- **Often used with:** `text-field`, `textarea`, `select`, `checkbox-row`, `field-label`, `icon`

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
  - 3.3.2 Labels or Instructions (the default status states the format or constraint before the user can fail)
  - 1.4.3 Contrast (caption ink clears 4.5:1; the engine gates text.\<role> per mode)
  - 1.4.11 Non-text Contrast (the status glyph's ink, icon.\<role>, is gated at 3:1 per mode)
  - 1.3.1 Info and Relationships / 4.1.2 Name, Role, Value (the host associates the message through aria-describedby and sets aria-invalid on error)
  - 4.1.3 Status Messages (a message that arrives without focus moving to its field must still reach assistive tech — the host decides how)
- **ARIA:** The status icon is aria-hidden — the caption text carries the meaning, so a non-default status starts with a visually hidden prefix that names it ("Error:"), announced even where the glyph is not. The prefix is translatable, like the message after it — a hard-coded English prefix before a localized message is a broken reading. The message does NOT self-announce; the host field references its id in aria-describedby (and sets aria-invalid on error). If the message appears/changes dynamically, the host wraps it in a polite live region so it is announced without stealing focus.

## Motion

- **Enter:** A short fade as the message is inserted. The field grows to hold it and pushes the content below down (dynamic expansion). Never positioned absolutely to avoid that shift — it would overlap the next field's label.
- **Exit:** none
- **Reduced motion:** Under prefers-reduced-motion the message snaps in with no fade. The row reserves the glyph's height in every status, so a status change moves nothing; inserting or removing the message still shifts the layout below it.

## Composition

- **Planned:** `number-field`, `tooltip`, `inline-message`

---

Generated from the `field-message` component definition.
