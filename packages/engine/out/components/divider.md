# Divider

> A thin rule between groups of content. Horizontal or vertical, and it fills its container.

A 1px rule that separates groups of content when spacing alone leaves the grouping unclear: sections of a page, rows of an accordion, or a cluster of controls in a toolbar. Horizontal by default, spanning the width of its container; vertical between items in a row, spanning its height. It can run edge to edge or sit inset from the start or from both ends. It carries no content and has no interaction states. Decorative by default, so assistive technology ignores it; set decorative to false when the rule marks a real break in the content, and it becomes a separator.

- **ID:** `divider`
- **Category:** foundations
- **Status:** draft
- **Also known as:** separator, rule, hr

## Usage

Use a divider to separate groups of related content when spacing alone does not make the groups clear: sections of a page, rows in an accordion or list, or a cluster of controls in a toolbar. Horizontal by default, spanning its container; vertical between items in a row. Inset it from the start to line up with indented content, or from both ends to separate within a section. It is decorative by default; set decorative to false when the rule marks a real break in the content.

### Do

- Let the divider span its container, so the break reads as a break between whole groups
- Try spacing first, and add a divider when the groups still run together
- Use a vertical divider between clusters of controls in a row, such as a toolbar
- Leave a divider decorative unless it marks a real break in the content, so a screen reader is not told about every visual line

### Don't

- Put a divider between every item in a list; increase the spacing instead
- Put text or controls inside a divider; title the group with a heading instead
- Use a divider as the only cue that two groups are separate when the rule is faint; add spacing too
- Stack a divider directly against a border, such as the edge of a card, so two lines sit side by side

### Content guidelines

A divider holds no copy.

### Copy patterns

- **Labels:** A divider carries no text. To title the group below it, use a heading, not a label on the rule.

## Choosing it

- **Purpose:** Separate groups of content with a thin horizontal or vertical rule that spans its container.
- **Use when:** Two groups of content sit next to each other and spacing alone does not separate them: page sections, accordion or list rows, or clusters of controls in a toolbar (vertical).
- **Avoid when:** Spacing already separates the groups, the edge is a container's own border (a card or field draws its own), or the break needs a title (use a heading).

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `orientation` | enum: 'horizontal' \| 'vertical' | `horizontal` | no | Which way the rule runs. horizontal spans the width of its container and separates content stacked above and below it; vertical spans the height of its container and separates items side by side. A vertical rule sets aria-orientation="vertical"; horizontal is the default and needs no attribute. |
| `inset` | enum: 'none' \| 'inset' \| 'middle-inset' | `none` | no | How far the rule sits in from its container's edges. none runs edge to edge; inset starts the rule 16px in from the start edge, so it lines up with indented content such as list text after an avatar; middle-inset indents both ends. The start edge follows text direction. A vertical rule takes none or middle-inset only. |
| `decorative` | boolean | `true` | no | Whether the rule is only visual. true (the default) hides it from assistive technology with aria-hidden="true". Set false when the rule marks a real break in the content: it becomes a separator, an \<hr> for a horizontal rule. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `orientation` | `horizontal`, `vertical` | once, when authored |
| `inset` | `none`, `inset`, `middle-inset` | once, when authored |

## Accessibility

- **Role:** none with aria-hidden="true" by default, because a divider is decorative unless set otherwise; with decorative=false, separator (native \<hr> for a horizontal rule, role="separator" with aria-orientation="vertical" for a vertical one)
- **WCAG:**
  - 1.3.1 Info and Relationships — a rule that marks a real break in content is a separator, so assistive technology hears the break a sighted reader sees
  - 1.4.11 Non-text Contrast — a decorative divider carries no information and needs no contrast minimum; a divider that genuinely communicates a boundary should clear 3:1. On a tinted surface, such as background.secondary or background.tertiary in light mode, the default rule does not reach 3:1, so a divider that marks a real boundary (decorative=false) needs more than the default rule there.
- **Focus:** None. A divider is not focusable and takes no place in the tab order.
- **ARIA:** By default the rule sets aria-hidden="true", so a screen reader does not announce a break that means nothing. With decorative=false, an \<hr> needs no attributes, and a vertical rule sets role="separator" and aria-orientation="vertical".

## Composition

- **Planned:** `accordion`, `list`, `menu`, `card`, `stack`, `toolbar`
- **Replaces:**
  - a hand-drawn line or a border-bottom on one item standing in for a separator

---

Generated from the `divider` component definition.
