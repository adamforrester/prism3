# Divider

> A thin rule between groups of content. Horizontal or vertical, or broken by a short centered label.

- **ID:** `divider`
- **Category:** foundations
- **Status:** draft
- **Also known as:** separator, rule, hr

## Overview

A 1px rule that separates groups of content when spacing alone leaves the grouping unclear: sections of a page, rows of an accordion, or a cluster of controls in a toolbar. Horizontal by default, spanning the width of its container; vertical between items in a row, spanning its height. It can run edge to edge or sit inset from the start or from both ends. A labeled divider breaks the rule with one short centered word, such as Or between two ways to sign in: a line on each side, 24px clear of the label (12px when vertical), and the label in the secondary text color, which clears 4.5:1 against the page. It has no interaction states. Decorative by default, so assistive technology ignores it; set decorative to false when the rule marks a real break in the content, and it becomes a separator. A labeled divider is read as its label.

- **Purpose:** Separate groups of content with a thin horizontal or vertical rule that spans its container.
- **Use when:** Two groups of content sit next to each other and spacing alone does not separate them: page sections, accordion or list rows, or clusters of controls in a toolbar (vertical).
- **Avoid when:** Spacing already separates the groups, the edge is a container's own border (a card or field draws its own), or the break needs a title or more than one short word (use a heading). A labeled divider is for one word, such as Or, between two alternative groups of actions.

## Anatomy

Shown on the default member: orientation `horizontal`, inset `none`, labeled `false`.

1. **Container** — The divider's footprint: the thickness one way and the length the other, with the inset as its padding. A labeled divider is one label line tall. It paints nothing.
2. **Rule** — The rule itself: one box, one fill, no children. Its thickness is the hairline border width; its length fills the container it sits in, less the inset, so the standalone length is a placeholder a host stretches.
3. **Leading rule** — The line before the label, in the rule's color and thickness. It fills the space the label leaves on its side.
4. **Label** — The short word that breaks the rule, such as Or, in the secondary text color. It hugs its text and never wraps.
5. **Trailing rule** — The line after the label, the same as the line before it, so the label sits centered.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `orientation` | `horizontal`, `vertical` | once, when authored | Which way the rule runs. horizontal spans the width of its container and separates content stacked above and below it; vertical spans the height of its container and separates items side by side. A vertical rule sets aria-orientation="vertical"; horizontal is the default and needs no attribute. |
| `inset` | `none`, `inset`, `middle-inset` | once, when authored | How far the rule sits in from its container's edges. none runs edge to edge; inset starts the rule 16px in from the start edge, so it lines up with indented content such as list text after an avatar; middle-inset indents both ends. The start edge follows text direction. A vertical rule takes none or middle-inset only. |
| `labeled` | `false`, `true` | once, when authored | — |

## Usage guidelines

Use a divider to separate groups of related content when spacing alone does not make the groups clear: sections of a page, rows in an accordion or list, or a cluster of controls in a toolbar. Horizontal by default, spanning its container; vertical between items in a row. Inset it from the start to line up with indented content, or from both ends to separate within a section. It is decorative by default; set decorative to false when the rule marks a real break in the content. Give it a label, such as Or, when it sits between two alternative groups of actions, such as social sign-in above and email sign-in below. Vertical, it sits between two groups side by side on a wide layout.

### Do

- Let the divider span its container, so the break reads as a break between whole groups
- Try spacing first, and add a divider when the groups still run together
- Use a vertical divider between clusters of controls in a row, such as a toolbar
- Leave a divider decorative unless it marks a real break in the content, so a screen reader is not told about every visual line
- Use a labeled divider with Or between two alternative ways to do one thing, such as two ways to sign in
- Use a vertical labeled divider only where both groups are at least 56px tall; between two single buttons, stack them and use a horizontal one

### Don't

- Put a divider between every item in a list; increase the spacing instead
- Put a title, a sentence or controls inside a divider; title the group with a heading, and keep a label to one short word such as Or
- Use a divider as the only cue that two groups are separate when the rule is faint; add spacing too
- Stack a divider directly against a border, such as the edge of a card, so two lines sit side by side

## Accessibility

- **Focus:** None. A divider is not focusable and takes no place in the tab order.
- **Screen readers:** none with aria-hidden="true" by default, because a divider is decorative unless set otherwise; with decorative=false, separator (native \<hr> for a horizontal rule, role="separator" with aria-orientation="vertical" for a vertical one); a labeled divider takes no role, its two lines hidden and its label read as plain text

  By default the rule sets aria-hidden="true", so a screen reader does not announce a break that means nothing. With decorative=false, an \<hr> needs no attributes, and a vertical rule sets role="separator" and aria-orientation="vertical". A labeled divider sets no role: a separator hides its own text, so the label would not be read. Its two lines set aria-hidden="true", and the label is plain text in the reading order, read as Or between the two groups. Pass the translated word.

### WCAG

- 1.3.1 Info and Relationships — a rule that marks a real break in content is a separator, so assistive technology hears the break a sighted reader sees
- 1.4.11 Non-text Contrast — a decorative divider carries no information and needs no contrast minimum. A divider that marks a real boundary (decorative=false) uses border.tertiary, which reaches 3:1 on every background.
- 1.4.3 Contrast (Minimum) — a labeled divider's label is text.secondary, which clears 4.5:1 against the primary and secondary page backgrounds in every mode. Its two lines are decorative and need no minimum.

## Content guidelines

A plain divider holds no copy. A labeled divider holds one short word, such as Or, in sentence case, with no punctuation.

- **Labels:** A labeled divider names the choice between two groups of actions with one short word, such as Or, in sentence case. To title the group below, use a heading.

## Related components

- **Often used with:** `accordion`, `list`
- **Replaces:**
  - a hand-drawn line or a border-bottom on one item standing in for a separator

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `orientation` | enum: 'horizontal' \| 'vertical' | `horizontal` | no | Which way the rule runs. horizontal spans the width of its container and separates content stacked above and below it; vertical spans the height of its container and separates items side by side. A vertical rule sets aria-orientation="vertical"; horizontal is the default and needs no attribute. |
| `inset` | enum: 'none' \| 'inset' \| 'middle-inset' | `none` | no | How far the rule sits in from its container's edges. none runs edge to edge; inset starts the rule 16px in from the start edge, so it lines up with indented content such as list text after an avatar; middle-inset indents both ends. The start edge follows text direction. A vertical rule takes none or middle-inset only. |
| `decorative` | boolean | `true` | no | Whether the rule is only visual. true (the default) hides it from assistive technology with aria-hidden="true". Set false when the rule marks a real break in the content: it becomes a separator, an \<hr> for a horizontal rule, drawn in border.tertiary so it reaches 3:1 on every background. It has no effect on a labeled divider, where the label marks the break. |
| `label` | string | — | no | One short word that breaks the rule in the middle, such as Or. Setting it makes a labeled divider: a line on each side, centered on the label. No inset only. A vertical labeled divider keeps the label upright, with a line above and below it. Screen readers read the label as plain text and skip the two lines. Pass the translated word. |

## Specs

Generated from the plan that builds the design-file component: 7 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/rule` | frame | labeled=false |
| `container/leadingRule` | frame | labeled=true |
| `container/label` | text | labeled=true |
| `container/trailingRule` | frame | labeled=true |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `orientation`, `inset`, `labeled`.

**orientation=horizontal, inset=none, labeled=false**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.0` | `space.300` | `border-width.hairline` | `container.narrow` | — | — |

**orientation=horizontal, inset=none, labeled=true**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.0` | `space.300` | `type.label.md.line-box` | `container.narrow` | — | — |
| `container/leadingRule` | — | — | `border-width.hairline` | — | — | — |
| `container/trailingRule` | — | — | `border-width.hairline` | — | — | — |

**orientation=horizontal, inset=inset, labeled=false**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.0` / `space.0` / `space.0` / `space.200` | `space.300` | `border-width.hairline` | `container.narrow` | — | — |

**orientation=horizontal, inset=middle-inset, labeled=false**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.0` / `space.200` / `space.0` / `space.200` | `space.300` | `border-width.hairline` | `container.narrow` | — | — |

**orientation=vertical, inset=none, labeled=false**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.0` | `space.150` | `size.md.height` | `border-width.hairline` | — | — |

**orientation=vertical, inset=none, labeled=true**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.0` | `space.150` | `size.xl.height` | — | — | — |
| `container/leadingRule` | — | — | — | `border-width.hairline` | — | — |
| `container/trailingRule` | — | — | — | `border-width.hairline` | — | — |

**orientation=vertical, inset=middle-inset, labeled=false**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | `space.100` / `space.0` / `space.100` / `space.0` | `space.150` | `size.md.height` | `border-width.hairline` | — | — |

### Type

Keyed by nothing: one row covers every member.

| Members | Part | Text style |
| --- | --- | --- |
| every member | `container/label` | `type.label.md.default` |

### Color

Keyed by `orientation`, `inset`, `labeled`.

**orientation=horizontal, inset=none, labeled=false**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rule` | `color.border.secondary` | — | — | — |

**orientation=horizontal, inset=none, labeled=true**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/leadingRule` | `color.border.secondary` | — | — | — |
| `container/label` | — | — | `color.text.secondary` | — |
| `container/trailingRule` | `color.border.secondary` | — | — | — |

**orientation=horizontal, inset=inset, labeled=false**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rule` | `color.border.secondary` | — | — | — |

**orientation=horizontal, inset=middle-inset, labeled=false**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rule` | `color.border.secondary` | — | — | — |

**orientation=vertical, inset=none, labeled=false**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rule` | `color.border.secondary` | — | — | — |

**orientation=vertical, inset=none, labeled=true**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/leadingRule` | `color.border.secondary` | — | — | — |
| `container/label` | — | — | `color.text.secondary` | — |
| `container/trailingRule` | `color.border.secondary` | — | — | — |

**orientation=vertical, inset=middle-inset, labeled=false**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/rule` | `color.border.secondary` | — | — | — |

### Nesting and properties

| Property | Type | Default |
| --- | --- | --- |
| `label` | text | `Or` |

---

Generated from the `divider` component definition.
