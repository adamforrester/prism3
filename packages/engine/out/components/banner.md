# Banner

> A persistent message in the page flow about an important state, with an optional action.

- **ID:** `banner`
- **Category:** feedback
- **Status:** draft
- **Also known as:** alert, callout, inline-alert

## Overview

A message that sits in the page flow and stays until the user dismisses it or the condition clears: a page-level error, a service notice, or the result of a process that has to stay visible. Because it is part of the page and the tab order, it can carry an action. Four tones, each with its own glyph shape, so the tone is never carried by color alone. Contained inside a section, or full width at the top of a page. Not a toast (it does not go away by itself), not a field message (that belongs to one field), and not a dialog (it does not block the page).

- **Purpose:** Show a persistent, in-flow message about an important state, with an optional action to resolve it.
- **Use when:** A page or section error, a service or maintenance notice, or a result that has to stay visible until the user acts on it or dismisses it.
- **Avoid when:** The message is a brief confirmation that can go away by itself (a toast), it is about one field (a field message), the user must decide before going on (a dialog), or it is a short status label beside content (a badge).

## Anatomy

Shown on the default member: tone `info`, width `contained`.

1. **Container** — The banner: the tone's tinted surface with a 1px edge in the tone's border color, drawn inside so it adds no size. Contained: rounded, edged all round. Full width: a square bar, edged top and bottom only.
2. **Info glyph** (optional) — The info glyph, an i in a circle, hidden from assistive technology: the text carries the meaning, and the shape tells the tones apart without color.
3. **Success glyph** (optional) — The success glyph, a check in a circle, hidden from assistive technology: the text carries the meaning, and the shape tells the tones apart without color.
4. **Warning glyph** (optional) — The warning glyph, an exclamation in a circle, hidden from assistive technology: the text carries the meaning, and the shape tells the tones apart without color.
5. **Danger glyph** (optional) — The danger glyph, an exclamation in a triangle, hidden from assistive technology: the text carries the meaning, and the shape tells the tones apart without color.
6. **Content** — The title, the body and the action, stacked. It fills the row between the glyph and the dismiss button.
7. **Title box** (optional) — The title's row, padded down so its first line centers on the glyph.
8. **Title** — The title: a short heading that names the issue. It wraps rather than truncating.
9. **Body** — The body: a slot that holds the message, and can take a link or a short list in place of the sentence.
10. **Placeholder** — Placeholder text. Replace it with the message, or with a link or a list.
11. **Actions** (optional) — The action's row under the body, so the space above it hides with it. Off by default.
12. **Action** — The one action: a Button, text, small; Button.Neutral when the file has it (Q386). Q533.1: one text action, never two.
13. **Dismiss** (optional) — The dismiss button: a FlushIconButton.Neutral, flush, small (the bare glyph, no edge or fill, as Dialog's close; owner QA 2026-10-19), always the close glyph, with no swap (Q386). Off by default.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `tone` | `info`, `success`, `warning`, `danger` | at runtime | How serious the message is. Sets the fill, the edge and the glyph. Match it to the message: danger for an error that blocks the user, warning for a risk, success for a finished process, info for everything else. |
| `width` | `contained`, `full` | once, when authored | contained is a rounded box with an edge on all four sides, inside a section or card. full is a bar across the top of the page, for a message about the whole app: square corners, and an edge on the top and bottom only, so it runs edge to edge. |

## Usage guidelines

Use a Banner for an important message the user should see and may need to act on, and that has to stay until it is resolved: a page-level error, a service notice, or the result of a process. Contain it inside the section it is about, or run it full width at the top of the page for a message about the whole app. Show one banner at a time in a region, the most serious one.

### Do

- Match the tone to how serious the message is
- Name the issue in the title, and say what to do next in the body
- Give the action a verb that says what it does
- Move focus to a sensible place after a dismiss

### Don't

- Use a banner for a short confirmation like "Saved". Use a toast.
- Use a banner for one field's validation. Use the field's message.
- Stack banners. Show the most serious one.
- Give a banner a second action. Link to the details in the body instead.
- Mark a banner present at page load as role="alert"
- Let a dismissed banner come back on reload

## Accessibility

- **Keyboard:** The action and the dismiss button are ordinary Tab stops in reading order. The banner itself takes no focus.
- **Focus:** No focus of its own. After a dismiss, focus moves to the control that caused the banner or to the page heading, never to the page body.
- **Screen readers:** A banner present when the page loads is a region (\<section aria-labelledby> pointing at the title) and has no live role. A banner inserted after an action is announced through the page's live region: role="alert" for danger, role="status" for the other tones.

  The glyph is aria-hidden. A banner present at load: a section with aria-labelledby pointing at the title, and no role="alert". An inserted banner: announced through a live region that already exists, role="alert" for danger and role="status" otherwise. The dismiss button's accessible name names what it dismisses ("Dismiss error message"), and is translated.

### WCAG

- 4.1.3 Status Messages (a banner inserted after an action is announced without moving focus)
- 1.3.1 Info and Relationships (the title is a heading at the level the page outline needs, and it labels the region)
- 1.4.1 Use of Color (each tone has its own glyph shape, and the text says what happened)
- 1.4.3 Contrast (the title and body clear 4.5:1 on every tone's fill, measured in every mode of the example brands)
- 1.4.11 Non-text Contrast (the edge clears 3:1 against the page and the glyph 3:1 against the fill, measured in every mode of the example brands)
- 2.4.3 Focus Order (the action is in the tab order, and a dismiss moves focus to a surviving element)
- 2.5.8 Target Size (Minimum) (the dismiss button is a 20px glyph; it passes by spacing, its 24px circle clear of every other target, and targets 44×44px through a code-side hit area)
- 2.2.1 Timing Adjustable (the reason errors go in a banner, which stays, rather than a toast, which goes away)

### Motion

- **Enter:** Fades in. A banner inserted at the top of a page reserves its space, so the content below does not jump.
- **Exit:** Collapses its height and fades (about 150 to 200ms, motion.transition.exit), so the content below moves up smoothly.
- **Reduced motion:** Under prefers-reduced-motion it appears and goes instantly.

## Content guidelines

Titles are short, specific and in sentence case, with no period. The body states the consequence and the fix in one or two sentences; for more, link to the details. Action labels are verbs.

- **Labels:** Title: names the issue up front, in sentence case and with no period ("Payment failed", not "Error"). Body: what happened and what to do next, in one or two sentences, never repeating the title. Action: a verb of one or two words ("Retry", "Update billing").
- **Errors:** Say what went wrong, whether anything was lost, and how to fix it. Use danger only for an error that blocks the user.

## Related components

- **Built from:** `button`, `flush-icon-button-neutral`
- **Instead, consider:** `dialog`, `field-message`, `badge`, `toast`
- **Often used with:** `link`, `list`, `button-neutral`
- **Replaces:**
  - a colored div with an icon and role="alert" on a message present at load
  - an error shown as a toast that disappears

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `tone` | enum: 'info' \| 'success' \| 'warning' \| 'danger' | `info` | no | How serious the message is. Sets the fill, the edge and the glyph. Match it to the message: danger for an error that blocks the user, warning for a risk, success for a finished process, info for everything else. |
| `width` | enum: 'contained' \| 'full' | `contained` | no | contained is a rounded box with an edge on all four sides, inside a section or card. full is a bar across the top of the page, for a message about the whole app: square corners, and an edge on the top and bottom only, so it runs edge to edge. |
| `title` | node | — | no | A short heading that names the issue ("Payment failed"), with no period at the end. When present, it labels the banner's region. |
| `children` | node | — | yes | The body: what happened and what to do next, in one or two sentences. It can hold a link or a short list. Never repeat the title. |
| `headingLevel` | enum: 2 \| 3 \| 4 \| 5 \| 6 | `2` | no | The heading level of the title, matched to where the banner sits in the page outline, so the outline stays in order. |
| `icon` | node \| false | — | no | Replaces the tone glyph, or false to hide it in a dense layout. The glyph is hidden from assistive technology either way. |
| `actions` | node | — | no | One text Button that resolves the message (Button.Neutral when the file has it). Name it by what it does ("Retry", "Update billing"). A banner carries one action at most. |
| `dismissible` | boolean | `false` | no | Whether the banner shows a dismiss button. Set it together with onDismiss. Leave a banner about a condition that still blocks the user not dismissible. |
| `onDismiss` | function | — | no | Called when the dismiss button is pressed. Remove the banner, store the dismissal so it does not return on reload, and move focus to a sensible place. |
| `announce` | enum: 'auto' \| 'none' | `auto` | no | Whether a banner inserted after the page loads is announced: auto announces it through the page's live region, assertively for danger and politely otherwise. A banner present when the page loads is never announced; it is read in order. |

## Specs

Generated from the plan that builds the design-file component: 8 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/infoGlyph` | instance | tone=info |
| `container/content` | frame | every member |
| `container/content/titleBox` | frame | every member |
| `container/content/titleBox/title` | text | every member |
| `container/content/body` | slot | every member |
| `container/content/body/placeholder` | text | every member |
| `container/content/actions` | frame | every member |
| `container/content/actions/action` | instance | every member |
| `container/dismiss` | instance | every member |
| `container/successGlyph` | instance | tone=success |
| `container/warningGlyph` | instance | tone=warning |
| `container/dangerGlyph` | instance | tone=danger |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `width`.

**width=contained**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.200` | `space.150` | — | — | — | build width 480px (literal) |
| `container/infoGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/content` | — | `space.050` | — | — | — | — |
| `container/content/titleBox` | `space.050` / — / — / — | — | — | — | — | — |
| `container/content/actions` | `space.150` / — / — / — | — | — | — | — | — |
| `container/successGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/warningGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/dangerGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**width=full**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.200` | `space.150` | — | — | — | build width 960px (literal) |
| `container/infoGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/content` | — | `space.050` | — | — | — | — |
| `container/content/titleBox` | `space.050` / — / — / — | — | — | — | — | — |
| `container/content/actions` | `space.150` / — / — / — | — | — | — | — | — |
| `container/successGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/warningGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/dangerGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |

### Type

Keyed by nothing: one row covers every member.

| Members | Part | Text style |
| --- | --- | --- |
| every member | `container/content/titleBox/title` | `type.label.md.emphasis` |
| every member | `container/content/body/placeholder` | `type.body.md.default` |

### Color

Keyed by `tone`, `width`.

**tone=info, width=contained**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.foreground.info-subtle` | `color.border.info` | — | — |
| `container/infoGlyph` | — | — | — | `color.icon.info` |
| `container/content/titleBox/title` | — | — | `color.text.primary` | — |
| `container/content/body/placeholder` | — | — | `color.text.primary` | — |

**tone=info, width=full**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.foreground.info-subtle` | `color.border.info` | — | — |
| `container/infoGlyph` | — | — | — | `color.icon.info` |
| `container/content/titleBox/title` | — | — | `color.text.primary` | — |
| `container/content/body/placeholder` | — | — | `color.text.primary` | — |

**tone=success, width=contained**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.foreground.success-subtle` | `color.border.success` | — | — |
| `container/successGlyph` | — | — | — | `color.icon.success` |
| `container/content/titleBox/title` | — | — | `color.text.primary` | — |
| `container/content/body/placeholder` | — | — | `color.text.primary` | — |

**tone=success, width=full**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.foreground.success-subtle` | `color.border.success` | — | — |
| `container/successGlyph` | — | — | — | `color.icon.success` |
| `container/content/titleBox/title` | — | — | `color.text.primary` | — |
| `container/content/body/placeholder` | — | — | `color.text.primary` | — |

**tone=warning, width=contained**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.foreground.warning-subtle` | `color.border.warning` | — | — |
| `container/warningGlyph` | — | — | — | `color.icon.warning` |
| `container/content/titleBox/title` | — | — | `color.text.primary` | — |
| `container/content/body/placeholder` | — | — | `color.text.primary` | — |

**tone=warning, width=full**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.foreground.warning-subtle` | `color.border.warning` | — | — |
| `container/warningGlyph` | — | — | — | `color.icon.warning` |
| `container/content/titleBox/title` | — | — | `color.text.primary` | — |
| `container/content/body/placeholder` | — | — | `color.text.primary` | — |

**tone=danger, width=contained**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.foreground.danger-subtle` | `color.border.danger` | — | — |
| `container/dangerGlyph` | — | — | — | `color.icon.danger` |
| `container/content/titleBox/title` | — | — | `color.text.primary` | — |
| `container/content/body/placeholder` | — | — | `color.text.primary` | — |

**tone=danger, width=full**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container` | `color.foreground.danger-subtle` | `color.border.danger` | — | — |
| `container/dangerGlyph` | — | — | — | `color.icon.danger` |
| `container/content/titleBox/title` | — | — | `color.text.primary` | — |
| `container/content/body/placeholder` | — | — | `color.text.primary` | — |

### Nesting and properties

- `container/infoGlyph` nests `icon/info-circle`
- `container/content/body` is a slot
- `container/content/actions/action` nests `button` at `appearance=text, size=small, surface=default, inset=default, state=rest, leading icon=false, trailing icon=false`
- `container/dismiss` nests `flush-icon-button-neutral` at `shape=flush, size=small, surface=default, state=rest`
- `container/successGlyph` nests `icon/check-circle`
- `container/warningGlyph` nests `icon/error-circle`
- `container/dangerGlyph` nests `icon/warning-triangle`

| Property | Type | Default |
| --- | --- | --- |
| `title text` | text | `Title` |
| `icon` | boolean | `true` |
| `title` | boolean | `true` |
| `actions` | boolean | `false` |
| `dismiss` | boolean | `false` |
| `body` | slot | — |

---

Generated from the `banner` component definition.
