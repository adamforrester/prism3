# Banner

> A persistent message in the page flow about an important state, with optional actions.

A message that sits in the page flow and stays until the user dismisses it or the condition clears: a page-level error, a service notice, or the result of a process that has to stay visible. Because it is part of the page and the tab order, it can carry actions. Four tones, each with its own glyph shape, so the tone is never carried by color alone. Contained inside a section, or full width at the top of a page. Not a toast (it does not go away by itself), not a field message (that belongs to one field), and not a dialog (it does not block the page).

- **ID:** `banner`
- **Category:** feedback
- **Status:** draft
- **Also known as:** alert, callout, inline-alert

## Usage

Use a Banner for an important message the user should see and may need to act on, and that has to stay until it is resolved: a page-level error, a service notice, or the result of a process. Contain it inside the section it is about, or run it full width at the top of the page for a message about the whole app. Show one banner at a time in a region, the most serious one.

### Do

- Match the tone to how serious the message is
- Name the issue in the title, and say what to do next in the body
- Give each action a verb that says what it does
- Move focus to a sensible place after a dismiss

### Don't

- Use a banner for a short confirmation like "Saved". Use a toast.
- Use a banner for one field's validation. Use the field's message.
- Stack banners. Show the most serious one.
- Mark a banner present at page load as role="alert"
- Let a dismissed banner come back on reload

### Content guidelines

Titles are short, specific and in sentence case, with no period. The body states the consequence and the fix in one or two sentences; for more, link to the details. Action labels are verbs.

### Copy patterns

- **Labels:** Title: names the issue up front, in sentence case and with no period ("Payment failed", not "Error"). Body: what happened and what to do next, in one or two sentences, never repeating the title. Actions: a verb of one or two words ("Retry", "Update billing").
- **Errors:** Say what went wrong, whether anything was lost, and how to fix it. Use danger only for an error that blocks the user.

## Choosing it

- **Purpose:** Show a persistent, in-flow message about an important state, with optional actions to resolve it.
- **Use when:** A page or section error, a service or maintenance notice, or a result that has to stay visible until the user acts on it or dismisses it.
- **Avoid when:** The message is a brief confirmation that can go away by itself (a toast), it is about one field (a field message), the user must decide before going on (a dialog), or it is a short status label beside content (a badge).
- **Often used with:** `link`, `list`, `button`, `button-neutral`, `button-group`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `tone` | enum: 'info' \| 'success' \| 'warning' \| 'danger' | `info` | no | How serious the message is. Sets the fill, the edge and the glyph. Match it to the message: danger for an error that blocks the user, warning for a risk, success for a finished process, info for everything else. |
| `width` | enum: 'contained' \| 'full' | `contained` | no | contained is a rounded box inside a section or card. full has square corners and spans the page, for a message about the whole app at the top of the page. |
| `title` | node | — | no | A short heading that names the issue ("Payment failed"), with no period at the end. When present, it labels the banner's region. |
| `children` | node | — | yes | The body: what happened and what to do next, in one or two sentences. It can hold a link or a short list. Never repeat the title. |
| `headingLevel` | enum: 2 \| 3 \| 4 \| 5 \| 6 | `2` | no | The heading level of the title, matched to where the banner sits in the page outline, so the outline stays in order. |
| `icon` | node \| false | — | no | Replaces the tone glyph, or false to hide it in a dense layout. The glyph is hidden from assistive technology either way. |
| `actions` | node | — | no | Up to two buttons that resolve the message, the main one first: an outline Button.Neutral, then a text Button.Neutral. Name each by what it does ("Retry", "Update billing"). |
| `dismissible` | boolean | `false` | no | Whether the banner shows a dismiss button. Set it together with onDismiss. Leave a banner about a condition that still blocks the user not dismissible. |
| `onDismiss` | function | — | no | Called when the dismiss button is pressed. Remove the banner, store the dismissal so it does not return on reload, and move focus to a sensible place. |
| `announce` | enum: 'auto' \| 'none' | `auto` | no | Whether a banner inserted after the page loads is announced: auto announces it through the page's live region, assertively for danger and politely otherwise. A banner present when the page loads is never announced; it is read in order. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `tone` | `info`, `success`, `warning`, `danger` | at runtime |
| `width` | `contained`, `full` | once, when authored |

## Accessibility

- **Role:** A banner present when the page loads is a region (\<section aria-labelledby> pointing at the title) and has no live role. A banner inserted after an action is announced through the page's live region: role="alert" for danger, role="status" for the other tones.
- **WCAG:**
  - 4.1.3 Status Messages (a banner inserted after an action is announced without moving focus)
  - 1.3.1 Info and Relationships (the title is a heading at the level the page outline needs, and it labels the region)
  - 1.4.1 Use of Color (each tone has its own glyph shape, and the text says what happened)
  - 1.4.3 Contrast (the title and body clear 4.5:1 on every tone's fill, measured in every mode of the example brands)
  - 1.4.11 Non-text Contrast (the edge clears 3:1 against the page and the glyph 3:1 against the fill, measured in every mode of the example brands)
  - 2.4.3 Focus Order (the actions are in the tab order, and a dismiss moves focus to a surviving element)
  - 2.5.8 Target Size (Minimum) (the dismiss button is a 20px glyph; targets 44×44px through a code-side hit area)
  - 2.2.1 Timing Adjustable (the reason errors go in a banner, which stays, rather than a toast, which goes away)
- **Keyboard:** The actions and the dismiss button are ordinary Tab stops in reading order. The banner itself takes no focus.
- **Focus:** No focus of its own. After a dismiss, focus moves to the control that caused the banner or to the page heading, never to the page body.
- **ARIA:** The glyph is aria-hidden. A banner present at load: a section with aria-labelledby pointing at the title, and no role="alert". An inserted banner: announced through a live region that already exists, role="alert" for danger and role="status" otherwise. The dismiss button's accessible name names what it dismisses ("Dismiss error message"), and is translated.

## Motion

- **Enter:** Fades in. A banner inserted at the top of a page reserves its space, so the content below does not jump.
- **Exit:** Collapses its height and fades (about 150 to 200ms, motion.transition.exit), so the content below moves up smoothly.
- **Reduced motion:** Under prefers-reduced-motion it appears and goes instantly.

## Composition

- **Composes with:** `button-neutral`, `flush-icon-button-neutral`
- **Alternative to:** `dialog`, `field-message`, `badge`
- **Planned:** `toast`
- **Replaces:**
  - a colored div with an icon and role="alert" on a message present at load
  - an error shown as a toast that disappears

---

Generated from the `banner` component definition.
