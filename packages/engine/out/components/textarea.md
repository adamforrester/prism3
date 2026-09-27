# Textarea

> Multi-line text field: label, input area, and helper or validation message.

A control for free-form text expected to wrap across multiple lines — comments, descriptions, messages, feedback. Shares the form-field substrate with TextField (label, helper/error, the aria-describedby wiring); differs in the sizing model, the prominence of the character counter, and who owns the Enter key. Not single-line (TextField), not formatted or structured (a rich-text editor), not code (a code editor), not a value from a known set (Select, or a combobox, not built yet).

- **ID:** `textarea`
- **Category:** form
- **Status:** draft
- **Also known as:** text-area, multiline-input, multiline-text-field, textbox, comment-box
- **Builds on:** `text-field`

## Usage

Use for free-form text expected to exceed one line — comments, descriptions, messages, feedback, multi-line addresses. Pick the sizing model by context: fixed-height-plus-scroll for a field inside a long form (so the form does not reflow as the user types), auto-grow for a composer (so the message box follows the message). Right-size the initial rows to the expected input. Compose FieldLabel above and FieldMessage below exactly as TextField does; the host wires the ids and the aria-describedby chain.

### Do

- Set maxRows whenever auto-growing — uncapped growth pushes the submit affordance off-screen on a long paste
- Enforce a character limit softly (allow over, flag invalid, block submit) and count by grapheme, not by string length
- Announce the over-limit through the live region and aria-invalid — color alone is not a signal
- Normalize \r\n to \n on paste before counting or storing, and resize once per paste rather than once per inserted line

### Don't

- Offer horizontal or both resize — it shatters grid and flex layouts and breaks responsive viewports
- Use the native maxlength attribute for substantial text — it silently swallows pasted overflow with no feedback
- Bake submit-on-Enter into the base component — it is a composer opt-in that always keeps a real submit button and a visible hint
- Reach for contenteditable to add formatting — cross the boundary to a real rich-text editor instead
- Drop in a one-row Textarea as a "bigger input" — the semantics and the Enter behavior differ from TextField

### Content guidelines

Counter reads "240 / 280" or "40 characters remaining"; over-limit reads "12 characters over the limit" — constructive and numeric, never "Too long." If Enter submits, say so near the field.

### Copy patterns

- **Labels:** Noun phrase, sentence case, no trailing colon — the substrate discipline (see field-label).
- **Errors:** What is wrong AND how to fix it, with the number: "Description must be under 500 characters. Remove 24 to continue." (SC 3.3.3). May replace the helper text to conserve vertical space, provided it still carries the original constraint.
- **Empty states:** Label plus an optional placeholder. The placeholder may model the expected SHAPE ("Describe the issue, including steps to reproduce") but still vanishes on the first keystroke — and the recall cost is higher here than on a single-line field, because a user may write several paragraphs, tab away, and come back to a prompt that is long gone. Nothing load-bearing lives in it.

## Choosing it

- **Purpose:** Capture multi-line free-form text with an associated label, an optional soft character limit, and a stated sizing model.
- **Use when:** Comments, descriptions, messages, feedback, notes, commit-message bodies, a multi-line address — any input that predictably runs past the ~40–60 characters a single-line field shows comfortably, or that legitimately needs user-authored line breaks.
- **Avoid when:** The value is a single line (TextField — and do not substitute a one-row Textarea, the Enter semantics differ), needs formatting or structure such as bold, links, @-mentions or embedded media (a rich-text editor — a \<textarea> holds a plain string and nothing else), is source code (a real code editor, for syntax highlighting and bracket matching), or comes from a known set (Select, or a combobox, not built yet). Also avoid reaching for it as a general "big box of text" when the content is genuinely structured — that is the rich-text signal.
- **Often used with:** `field-label`, `field-message`, `button`, `icon`
- **Keywords:** textarea, text area, multiline, multi-line input, comment box, message box, description field, composer
- **Generation priority:** 2

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `value` | string | — | no | Controlled value; pair with onChange. The same prop as TextField's, restated here because the Figma text property is keyed by it. |
| `placeholder` | string | — | no | An example only; vanishes on input; nothing load-bearing lives here. The same prop as TextField's, restated here because the Figma text property is keyed by it. |
| `showMessage` | boolean | `true` | no | Whether the composed FieldMessage is shown. ON, the default, renders the helper or validation message below the field; turning it off hides the message entirely. The same prop as TextField's. Never hides a message the field needs. |
| `rows` | number | `3` | no | Initial and minimum height, in LINES not pixels — a line count recomputes against the current line-height when the user raises their font size, where a pixel floor does not. Also a content cue: two rows signals brevity, six signals "write more". `cols` is dead on the web; width comes from CSS. |
| `resize` | enum: 'none' \| 'vertical' \| 'auto' | `vertical` | no | The sizing model in ONE prop, so two props cannot contradict each other. `vertical` (the drag handle) for standalone form fields; `auto` (grow within minRows/maxRows) for composers; `none` where layout stability wins. NEVER horizontal or both — altering the inline dimension shatters grid and flex layouts for no user gain. |
| `minRows` | number | — | no | Auto-grow floor, in lines. Only meaningful with resize="auto". |
| `maxRows` | number | — | no | Auto-grow cap, in lines; beyond it the field scrolls. ALWAYS set this when auto-growing — an uncapped field pushes the submit button off-screen on a long paste, which is a shipped failure in the field, not a hypothetical. |
| `maxLength` | number | — | no | Character limit, counted by GRAPHEME (Intl.Segmenter) rather than UTF-16 code unit — a flag emoji costs 4 units and a ZWJ family up to 11, so a .length limit hits non-Latin and emoji users artificially early. Enforce SOFT: allow the overflow, set aria-invalid, show the counter in error, block submit. Never the native hard maxlength, which silently truncates pasted overflow with no signal to anyone, AT users included. |
| `showCount` | boolean | `false` | no | The character counter — first-class here, unlike on TextField. Only ever with a real limit: a counter on an unlimited field implies a cap that does not exist. |
| `spellCheck` | boolean | — | no | Native passthrough; worth surfacing because structured input often wants it off. |
| `submitOnEnter` | boolean | `false` | no | Composer opt-in: Enter submits, Shift+Enter inserts a newline. NOT the base default — Enter inserting a newline is the platform contract a multi-line field advertises via aria-multiline, and hijacking it silently can lose a screen-reader user a drafted message. Whenever true, pair it with a real visible submit button and a visible "Shift+Enter for a new line" hint (SC 3.3.2). |
| `validation` | enum: 'default' \| 'error' \| 'warning' \| 'success' | `default` | no | The validation state. Each non-default status swaps the field border to its own boundary (border-only — `error` → danger, `warning` → warning, `success` → success) and sets the composed message to the matching status; `default` is neutral. `error` also sets aria-invalid. The same prop, with the same values, as TextField and Select. |
| `validationMessage` | string \| node | — | no | The validation text shown at error / warning / success, added to aria-describedby. For error, say what is wrong AND how to fix it, with the number when it is a length limit (SC 3.3.3), never "Invalid". |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales type and padding ONLY — height belongs to rows / auto-grow, so the substrate's height tiers do not transfer. |

## States

`rest`, `hover`, `filled`, `focus-visible`, `disabled`, `read-only`, `pending`, `empty`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `style` | `outline` | once, when authored |
| `status` | `default`, `error`, `warning`, `success` | at runtime |

## Accessibility

- **Role:** textbox (native \<textarea>), with the implicit aria-multiline="true"
- **WCAG:**
  - 4.1.3 Status Messages (the counter and over-limit live region — the most Textarea-specific SC)
  - 1.4.4 Resize Text / 1.4.10 Reflow (the field, counter and resize handle must survive 200% zoom and 320px without colliding or clipping)
  - 3.3.2 Labels or Instructions (the "Shift+Enter for a new line" hint whenever Enter submits)
  - 1.3.5 Identify Input Purpose / 1.3.1 Info and Relationships (inherited substrate wiring)
  - 3.3.1 Error Identification / 3.3.3 Error Suggestion (over-limit states the overage and how to fix it)
  - 1.4.3 Contrast / 1.4.11 Non-text Contrast / 2.4.13 Focus Appearance / 4.1.2 Name Role Value
  - 2.5.8 Target Size (the resize handle is a target)
- **Keyboard:** Native multi-line editing with undo/redo, spellcheck and IME. Enter inserts a newline — that is the contract aria-multiline advertises and the default. submitOnEnter inverts it for composers, and then Shift+Enter inserts the newline, a real submit button still exists, and the swap is stated visibly near the field.
- **Focus:** :focus-visible with the field ring (`focus.ring.offset-field`, 0 offset). An inset indicator for large surfaces is not built. forwardRef must reach the \<textarea> itself, not the wrapper. Auto-resize must not move the caret or scroll the viewport — the measurement is synchronous with input, and it must also run on PROGRAMMATIC value changes (a reset, or AI-inserted text), which is the common auto-grow bug.
- **ARIA:** The counter is the central problem and it is two nodes, not one: the visual counter is aria-hidden and updates instantly, while a separate visually-hidden node carries announcements. Two channels — the static limit folded into aria-describedby so tabbing in announces the ceiling, and a threshold-based polite live region that speaks only near the limit (per-keystroke counting makes the field unusable), escalating to assertive only on breach. Over-limit sets aria-invalid and is ANNOUNCED, never color-only. aria-busy while content streams. Preserve the native aria-multiline; do not reconstruct a textarea from contenteditable, which loses undo/redo, spellcheck, reliable IME and form submission. Set dir="auto" so content direction can differ from UI direction, and do not run counting or auto-grow measurement mid-IME-composition.

## Composition

- **Composes with:** `field-label`, `field-message`, `focus-ring`, `button`, `icon`, `spinner`
- **Alternative to:** `text-field`, `select`
- **Planned:** `form`, `rich-text-editor`, `combobox`, `code-editor`
- **Replaces:**
  - a one-row textarea used as a tall input
  - a contenteditable div used for plain multi-line text

## In code, not in Figma

Structure and behavior the Figma component cannot carry. Code implements each one.

- size — the small / medium / large ladder is a code-API PROP + padding tokens (`size.{small,medium,large}.pad-*`), NOT a variants axis and NOT a projected Figma variant. Figma renders the single `md` rung (the bare `pad-x` / `pad-y` keys), text-field's shape: a declared size axis must project a rung (#795), so the single-projected-size field is expressed by the prop and tokens.
- style — the outline / filled / underline treatment is theming, not an API axis: `style` carries the single value `outline`, so there is nothing for a Figma variant to enumerate.
- pending — a real STATE (content streaming into the field, with aria-busy), deliberately NOT a Figma variant: its delta is runtime behavior with no distinct static skin, so it stays in `states` and is admitted out of the projected `stateAxis`.
- empty — a real STATE in code (the field holds no value, so it shows the placeholder), NOT a Figma variant, text-field's posture: in Figma the empty field IS the rest, hover and focus-visible members, showing the `placeholder` layer in `text.secondary`, and `filled` is the member showing the `value` layer in `text.primary`. It and `pending` are the two states held back, leaving the projected set at status(4) × state(6) = 24 members. In code the placeholder and the value are one \<textarea>: its `placeholder` attribute and its value, never two elements.
- the FOCUS CARET — Figma draws a static bar before the placeholder on the focus-visible member. Code draws the browser's native caret, blinking, at the insertion point, with `caret-color` set from `color.text.primary` (the `caret` binding), so it keeps the value ink over the placeholder's muted one.
- rows / minRows / maxRows and auto-grow — Figma has no numeric component property, so `rows` is not a Figma property: the value text reserves the `rows` prop's DEFAULT line count (3) of its own line height, frozen at paste. A designer wanting more rows types more lines (the box grows) or resizes the instance; `minRows` / `maxRows` and the auto-grow measurement are runtime behavior.
- the RESIZE HANDLE's behavior (`resize`) — Figma draws a decorative grip behind the `resize handle` boolean, on by default because `resize` defaults to `vertical`. In code the handle is the browser's own, drawn at the inline-end corner (bottom-left in a right-to-left layout); Figma members are drawn left to right, so the grip sits bottom-right. `auto` and `none` draw no handle in code; in Figma, switch the boolean off.
- the CHARACTER COUNTER's live value (`maxLength` / `showCount`) — Figma draws a static "0 / 200" caption trailing the message, behind the `character count` boolean, off by default like `showCount`. Code counts graphemes, sets tabular numerals (`font-variant-numeric: tabular-nums`, which the type tokens do not carry, so Figma uses the caption style as it is) and paints the counter in the error role past the limit. In Figma, as in code, the counter and the message switch independently.
- the label / describedby WIRING and the counter's two-node live region — the host generates ids, ties the FieldLabel to the textarea, stitches the FieldMessage and the counter into aria-describedby, and sets aria-invalid. Figma has no accessibility tree, so the nested parts are associated by proximity alone.
- the nested LABEL's disabled dimming — the field fixes the FieldLabel to `state=rest` (its state vocabulary is not the field's), so in Figma the nested label reads at rest regardless. A projection limit, not a design choice.
- the KEYBOARD MODEL — native multi-line editing, the Enter key (a newline unless submitOnEnter), IME composition guards and the resize drag. All of it is runtime interaction the closed static member cannot carry.

---

Generated from the `textarea` definition by Prism3 0.176.0. Maintainer notes are in `components.ai.json`.
