# Dialog

> A panel over the page for a short task or a decision. Centered, a bottom sheet, or full screen.

- **ID:** `dialog`
- **Category:** overlay
- **Status:** draft
- **Also known as:** modal, sheet, bottom-sheet, full-screen-dialog

## Overview

A modal panel over the page for a short task or a decision the user makes before going on: a confirmation, a short form, or a choice that needs the page behind it for context. The page behind is inert until the dialog closes. Centered by default, at a small, medium or large width; on a small screen a product can open it as a bottom sheet or full screen instead. A header names the task and holds the close button, the body holds the content, and the footer holds the actions. Not a toast or a banner (they do not interrupt), not a popover or a menu (they sit beside a control and do not trap focus), and not a page of its own for a long form.

- **Purpose:** Interrupt the page for a short task or a decision the user must make before going on.
- **Use when:** A confirmation, a short form or a choice that needs the page behind it for context, and that the user must finish or dismiss before going on.
- **Avoid when:** The message is passing and needs no answer (a toast or a banner), the content belongs beside a control (a popover or a menu), the task is long or has many steps (a page of its own), or the content can sit in the page (an accordion).

## Anatomy

Shown on the default member: placement `center`, size `medium`, footer `inline`.

1. **Panel** — The panel: the surface, its shadow and its corners. It pads the top and bottom; the header, body and footer pad their own sides, so a divider runs edge to edge.
2. **Header** — The header: the title and description, then the close button at the end edge.
3. **Title box** — The title and the description under it. It fills the header beside the close button.
4. **Title** — The title: the dialog's accessible name. It wraps onto more lines rather than truncating.
5. **Description** (optional) — The optional description under the title, in secondary text. Hidden by default.
6. **Close** (optional) — The close button: a FlushIconButton.Neutral, flush, medium, labeled "Close", always showing the close icon. Shown by default; an alertdialog hides it.
7. **Header divider** (optional) — The rule under the header, edge to edge. Off by default; in code it shows only while the body scrolls.
8. **Body** — The body: a slot that holds whatever the dialog needs, and the only part that scrolls. Its inline inset matches the header.
9. **Placeholder** — Placeholder content. Replace it with the text or components the dialog holds.
10. **Footer divider** (optional) — The rule above the footer, edge to edge. Off by default, and absent when there is no footer.
11. **Footer** — The footer: the actions, inset to match the header. Absent when there is no footer.
12. **Actions inline** — The inline footer: a Button group, inline, at the end edge: Cancel, then Save.
13. **Actions stacked** — The stacked footer: a Button group, stacked: Save on top, Cancel under it, both full width.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `placement` | `center`, `bottom`, `full` | once, when authored | Where the panel sits. center on every screen by default; bottom (a bottom sheet) and full (full screen) are for small screens. Set per breakpoint; nothing switches automatically. |
| `size` | `medium`, `small`, `large` | once, when authored | The width of a centered panel: 400, 560 or 720px. On a small screen a centered panel is as wide as the screen less its margins. Bottom and full panels are full width and ignore it. |
| `footer` | `inline`, `stacked`, `none` | once, when authored | How the actions are laid out. inline is a row at the end edge; stacked is full-width buttons, the main action on top; none is for a dialog whose body holds its own actions. |

## Usage guidelines

Use a Dialog when the user must make a decision or finish a short task before going on, and needs the page behind for context: a confirmation, a short form, a choice. Center it on every screen by default; on a small screen, open it as a bottom sheet for a short choice within thumb reach, or full screen for a form that needs the whole screen. Use role alertdialog for a confirmation that interrupts, such as deleting something.

### Do

- Name the task in the title, and the action in the main button
- Keep the close button on a standard dialog
- Put the main action last in an inline footer (Cancel, then Save), and on top when stacked
- Let only the body scroll, and keep the footer in view
- Return focus to the control that opened the dialog

### Don't

- Use a dialog for a passing message. Use a toast or a banner.
- Open a dialog from a dialog. Replace the content or close the first.
- Put a long, multi-step form in a dialog. Give it a page.
- Focus a destructive button when the dialog opens
- Build the backdrop into the panel. It is the page's scrim, behind the dialog.

## Accessibility

- **Role:** role="dialog" with aria-modal="true", or role="alertdialog" for a confirmation that needs an answer. A native \<dialog> opened with showModal() provides the dialog role, the modal state, the top layer and an inert page.
- **Keyboard:** Tab and Shift+Tab cycle through the controls inside the dialog. Escape closes it (an alertdialog as Cancel). Enter and Space act on the focused button.
- **Focus:** Moves into the dialog on open (the first control, the title for long content, or Cancel in an alertdialog), stays inside while it is open, and returns to the control that opened it.
- **ARIA:** aria-modal="true"; aria-labelledby pointing at the title; aria-describedby pointing at the description when there is one. The close button's accessible name is "Close". Hide the dividers from assistive technology.

### WCAG

- 1.3.1 Info and Relationships (the title is a heading and labels the dialog; the description describes it)
- 2.1.1 Keyboard (every action, the close button included, works from the keyboard)
- 2.1.2 No Keyboard Trap (focus is held inside on purpose, and Escape and the close button always let the user out)
- 2.4.3 Focus Order (focus moves in on open, cycles inside, and returns to the opener on close)
- 2.4.6 Headings and Labels (the title names the task)
- 2.4.7 Focus Visible (every control inside shows the shared focus ring)
- 2.4.11 Focus Not Obscured (only the body scrolls, so the footer never covers a focused field)
- 1.4.10 Reflow (a bottom sheet or full-screen dialog keeps a 320px screen usable)
- 2.5.8 Target Size (Minimum) (the close button is a medium flush icon button, a 20px glyph with a 44×44px hit area in code)
- 4.1.2 Name, Role, Value (role, aria-modal and the accessible name are set)

### Motion

- **Enter:** A centered panel fades in and scales up a little; a bottom sheet and a full-screen dialog slide up from the bottom edge (motion.duration.moderate, motion.easing-role.enter). The backdrop fades in.
- **Exit:** The reverse, on motion.easing-role.exit.
- **Reduced motion:** Under prefers-reduced-motion every placement fades only, at motion.duration-reduced.moderate, with no movement.

## Content guidelines

Titles are specific and in sentence case. Body text is short and states the consequence of an action, especially one that cannot be undone. Buttons are named by what they do.

- **Labels:** The title names the task or asks the question ("Delete this address?"), never "Warning" or "Are you sure?". The main action echoes the title's verb ("Delete address"), not "OK" or "Yes". Sentence case.

## Related components

- **Built from:** `flush-icon-button-neutral`, `divider`, `button-group`
- **Instead, consider:** `accordion`
- **Often used with:** `button`, `button-neutral`, `button-destructive`, `flush-icon-button-neutral`, `divider`, `text-field`, `select`, `checkbox-group`, `radio-group`
- **Replaces:**
  - a div overlay with a z-index and a hand-written focus trap
  - a backdrop built from a veil

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `open` | boolean | `false` | no | Whether the dialog is showing. Opening it moves focus into it and makes the page behind it inert. |
| `onOpenChange` | function | — | no | Called with false on every attempt to close: the close button, Escape, a backdrop click on a standard dialog, or an action that closes it. Keep `open` in step with it. |
| `title` | node | — | yes | The heading that names the task. It is the dialog's accessible name, so make it specific: "Delete this address?", not "Are you sure?". It wraps rather than truncating. |
| `description` | node | — | no | One or two sentences under the title that say what the dialog is for or what an action will do. Linked as the dialog's accessible description. |
| `children` | node | — | yes | The body content. The body is the only part that scrolls; the header and footer stay in place. |
| `actions` | slot of `button` or `button-destructive` or `button-neutral`, 1 to 3 | — | no | The footer buttons, one to three Button elements, laid out by a Button group. Inline, the main action last (Cancel, then Save); stacked, the main action first. Name each by what it does. |
| `role` | enum: 'dialog' \| 'alertdialog' | `dialog` | no | dialog for a task or form. alertdialog for a confirmation that interrupts and needs an answer: it hides the close button, a backdrop click does not close it, and focus starts on the least destructive action. |
| `placement` | enum: 'center' \| 'bottom' \| 'full' | `center` | no | Where the panel sits. center on every screen by default; bottom (a bottom sheet) and full (full screen) are for small screens. Set per breakpoint; nothing switches automatically. |
| `size` | enum: 'small' \| 'medium' \| 'large' | `medium` | no | The width of a centered panel: 400, 560 or 720px. On a small screen a centered panel is as wide as the screen less its margins. Bottom and full panels are full width and ignore it. |
| `footer` | enum: 'inline' \| 'stacked' \| 'none' | `inline` | no | How the actions are laid out. inline is a row at the end edge; stacked is full-width buttons, the main action on top; none is for a dialog whose body holds its own actions. |

---

Generated from the `dialog` component definition.
