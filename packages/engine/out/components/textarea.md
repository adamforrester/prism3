# Textarea

> Multi-line text field: label, input area, and helper or validation message.

A control for free-form text expected to wrap across multiple lines — comments, descriptions, messages, feedback. Shares the form-field substrate with TextField (label, helper/error, the aria-describedby wiring); differs in the sizing model, the prominence of the character counter, and who owns the Enter key. Not single-line (TextField), not formatted or structured (a rich-text editor), not code (a code editor), not a value from a known set (Select, or a combobox, not built yet).

- **ID:** `textarea`
- **Category:** form
- **Status:** draft
- **Also known as:** text-area, multiline-input, multiline-text-field, textbox, comment-box
- **Builds on:** `text-field`

## Usage

Use for free-form text expected to exceed one line — comments, descriptions, messages, feedback, multi-line addresses. Pick the sizing model by context: fixed-height-plus-scroll for a field inside a long form (so the form does not reflow as the user types), auto-grow for a composer (so the message box follows the message). Right-size the initial rows to the expected input. Compose FieldLabel above and FieldMessage below exactly as TextField does; the host wires the ids and the aria-describedby chain. Pick the size with the form: medium is the default, large for a roomy form, small for a dense one on fine pointers only — on a touch screen the small field renders at 16px, because a smaller field makes iOS zoom the page on focus.

### Do

- Set maxRows whenever auto-growing — uncapped growth pushes the submit affordance off-screen on a long paste
- Enforce a character limit softly (allow over, flag invalid, block submit) and count by grapheme, not by string length
- Announce the over-limit through the live region and aria-invalid — color alone is not a signal
- Normalize \r\n to \n on paste before counting or storing, and resize once per paste rather than once per inserted line
- Keep a read-only textarea scrollable and selectable, so the whole value stays reachable — far more text is hidden here than in a single-line field
- Reserve space in the footer for the validation message and the counter, so an over-limit error does not push the resize handle

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
- **Often used with:** `field-label`, `field-message`, `button`, `icon`, `spinner`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `value` | string | — | no | Controlled value; pair with onChange. The same prop as TextField's. |
| `placeholder` | string | — | no | An example only; vanishes on input; nothing load-bearing lives here. The same prop as TextField's. |
| `showMessage` | boolean | `true` | no | Whether the composed FieldMessage is shown. ON, the default, renders the helper or validation message below the field; turning it off hides the message entirely. The same prop as TextField's. Never hides a message the field needs. |
| `rows` | number | `3` | no | Initial and minimum height, in LINES not pixels — a line count recomputes against the current line-height when the user raises their font size, where a pixel floor does not. Also a content cue: two rows signals brevity, six signals "write more". `cols` is dead on the web; width comes from CSS. |
| `resize` | enum: 'none' \| 'vertical' \| 'auto' | `vertical` | no | The sizing model in ONE prop, so two props cannot contradict each other. `vertical` (the drag handle) for standalone form fields; `auto` (grow within minRows/maxRows) for composers; `none` where layout stability wins. NEVER horizontal or both — altering the inline dimension shatters grid and flex layouts for no user gain. |
| `minRows` | number | — | no | Auto-grow floor, in lines. Only meaningful with resize="auto". |
| `maxRows` | number | — | no | Auto-grow cap, in lines; beyond it the field scrolls. ALWAYS set this when auto-growing — an uncapped field pushes the submit button off-screen on a long paste, which is a shipped failure in the field, not a hypothetical. |
| `maxLength` | number | — | no | Character limit, counted by GRAPHEME (Intl.Segmenter) rather than UTF-16 code unit — a flag emoji costs 4 units and a ZWJ family up to 11, so a .length limit hits non-Latin and emoji users artificially early. Enforce SOFT: allow the overflow, set aria-invalid, show the counter in error, block submit. Never the native hard maxlength, which silently truncates pasted overflow with no signal to anyone, AT users included. |
| `showCount` | boolean | `false` | no | The character counter — first-class here, unlike on TextField. Only ever with a real limit: a counter on an unlimited field implies a cap that does not exist. |
| `spellCheck` | boolean | — | no | Native passthrough; worth surfacing because structured input often wants it off. |
| `submitOnEnter` | boolean | `false` | no | Composer opt-in: Enter submits, Shift+Enter inserts a newline. NOT the base default — Enter inserting a newline is the platform contract a multi-line field advertises via aria-multiline, and hijacking it silently can lose a screen-reader user a drafted message. Whenever true, pair it with a real visible submit button and a visible "Shift+Enter for a new line" hint (SC 3.3.2). A composer that submits on Enter by default is its own specialization, named MessageComposer or ChatInput (brief §3, §10), not this base field. |
| `validation` | enum: 'default' \| 'error' \| 'warning' \| 'success' | `default` | no | The validation state. Each non-default status swaps the field border to its own boundary (border-only — `error` → danger, `warning` → warning, `success` → success) and sets the composed message to the matching status; `default` is neutral. `error` also sets aria-invalid. The same prop, with the same values, as TextField and Select. |
| `validationMessage` | string \| node | — | no | The validation text shown at error / warning / success, added to aria-describedby. For error, say what is wrong AND how to fix it, with the number when it is a length limit (SC 3.3.3), never "Invalid". |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | Scales the value type with the field (small 14px, medium 16px, large 18px, `type.body.{sm,md,lg}`), the nested label one step below it (12 / 14 / 16), and the padding. NOT the height: that belongs to rows / auto-grow, so the reserved rows grow with the type's line height. `small` is for fine pointers only: on a coarse pointer (`@media (pointer: coarse)`) the code sets the small textarea to 16px, because iOS Safari zooms the page when it focuses a field under 16px. The same prop, with the same values, as TextField and Select. |

## States

`rest`, `hover`, `filled`, `focus-visible`, `disabled`, `read-only`, `pending`, `empty`

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `size` | `medium`, `small`, `large` | once, when authored |
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
  - 1.4.3 Contrast / 1.4.11 Non-text Contrast (field boundary ≥3:1 — the rest, hover and read-only borders are gated on `background.secondary`, the darkest permissible ground) / 2.4.13 Focus Appearance / 4.1.2 Name Role Value
  - 2.5.8 Target Size — intent: the resize handle is the browser's own control, sized by the browser, so this def does not set its target
- **Keyboard:** Native multi-line editing with undo/redo, spellcheck and IME. Enter inserts a newline — that is the contract aria-multiline advertises and the default. submitOnEnter inverts it for composers, and then Shift+Enter inserts the newline, a real submit button still exists, and the swap is stated visibly near the field.
- **Focus:** :focus-visible with the field ring (`focus.ring.offset-field`, 0 offset). An inset indicator for large surfaces is not built. forwardRef must reach the \<textarea> itself, not the wrapper. Auto-resize must not move the caret or scroll the viewport — the measurement is synchronous with input, and it must also run on PROGRAMMATIC value changes (a reset, or AI-inserted text), which is the common auto-grow bug.
- **ARIA:** The counter is the central problem and it is two nodes, not one: the visual counter is aria-hidden and updates instantly, while a separate visually-hidden node carries announcements. Two channels — the static limit folded into aria-describedby so tabbing in announces the ceiling, and a threshold-based polite live region that speaks only near the limit (per-keystroke counting makes the field unusable), escalating to assertive only on breach. Over-limit sets aria-invalid and is ANNOUNCED, never color-only. aria-busy while content streams. Preserve the native aria-multiline; do not reconstruct a textarea from contenteditable, which loses undo/redo, spellcheck, reliable IME and form submission. Set dir="auto" so content direction can differ from UI direction, and do not run counting or auto-grow measurement mid-IME-composition.

## Motion

- **Enter:** none (present on mount)
- **Exit:** none
- **Reduced motion:** State transitions follow text-field's ~100–150ms token-driven contract. AUTO-GROW HAS NO HEIGHT TRANSITION: the height changes instantly on each keystroke, because an eased height lags behind the typing and reflows the layout below on every frame; if a transition is used at all it stays at or under 100ms and drops under prefers-reduced-motion. While the user drags the resize handle, strip every transition off the node, or the edge lags behind the cursor.

## Composition

- **Composes with:** `field-label`, `field-message`, `focus-ring`
- **Alternative to:** `text-field`, `select`
- **Planned:** `form`, `rich-text-editor`, `combobox`, `code-editor`
- **Replaces:**
  - a one-row textarea used as a tall input
  - a contenteditable div used for plain multi-line text

---

Generated from the `textarea` component definition.
