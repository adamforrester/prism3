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
- **Keywords:** helper text, help text, error message, validation message, field error, caption, hint
- **Generation priority:** 3

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

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- aria-describedby wiring — the message's entire relationship to its field is a DOM one the HOST owns (§6): the field references this node's id in its describedby chain and sets aria-invalid on error. Figma has no accessibility tree and no node-to-node reference, so the projection is a glyph and a caption that sit below a field and are associated with it by proximity alone. This is the same ceiling `field-label`'s htmlFor hits, and it is the reason both defs are presentational in Figma and load-bearing in code.
- the live region — a message that appears or changes after render must be announced without stealing focus, which the host does by wrapping it in a polite live region. That is a runtime announcement behavior with no visual expression at all: the Figma member for `tone=error` looks identical whether the message was there on load or arrived on blur, and the difference is the whole of whether a screen-reader user learns about it.
- the icon SLOT in code, where Figma now has none — the one asymmetry #1010 introduced, recorded because it is a real difference and not an oversight. The three validation members each carry a FIXED glyph chosen by tone, so there is no INSTANCE_SWAP property on the Figma side at all: an error member cannot be made to show a check mark, which is the reachable-wrong-state the old entry here worried about. `props.icon` survives as a code-side override for a host with a domain-specific status glyph, and nothing in Figma corresponds to it. The previous entry claimed this def "cannot bind WHICH glyph each tone shows" because "`PartKind` has no vector kind" — true when written, falsified by #920 (39 glyphs) and #864 (`kind: 'vector'` + `glyph`), and it is retired rather than edited because its premise, not its wording, was the thing that expired.
- the default tone's OPTIONAL icon, which is now the only half of this that Figma cannot express. Since #1010 the two sides agree on the common case — no glyph on the default tone, three fixed glyphs on the validation tones — so what is left is narrower than the entry it replaces: in code a host MAY pass `props.icon` on the default tone and get a glyph painted `default.icon`, and there is no Figma member for that. A member either has the node or does not, so "optional in the same sense the prop is" has no projection, and adding a boolean property for it would offer a designer a toggle whose ON state has no glyph to show. **The reason the previous entry gave had expired and the entry had not**, which is why this one is worth reading carefully: it said the part is always-present because `present()` builds no optional part outside the two slot names it hardcodes — accurate for a `kind: 'slot'` part, and false the moment these became `presentWhen`-gated `vector` parts, since `presentWhen` IS a mechanism for variant-scoped absence (#910). The gating is what let the default tone lose its glyph at all.

---

Generated from the `field-message` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
