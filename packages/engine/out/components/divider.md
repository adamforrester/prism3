# Divider

> A thin rule between groups of content. Horizontal or vertical, and it fills its container.

A 1px rule that separates groups of content: sections of a page, items in a list, rows of an accordion, or a cluster of controls in a toolbar. Horizontal by default, spanning the width of its container; vertical between items in a row, spanning its height. It carries no content and has no interaction states. Where the break is meaningful, it is a separator to assistive technology; where it is only visual, hide it.

- **ID:** `divider`
- **Category:** layout
- **Status:** draft
- **Also known as:** separator, rule, horizontal-rule

## Usage

Use a divider to separate groups of related content when spacing alone does not make the groups clear: sections of a page, rows in an accordion or list, or a cluster of controls in a toolbar. Horizontal by default, spanning its container; vertical between items in a row. Mark it aria-hidden when the break is only visual.

### Do

- Let the divider span its container, so the break reads as a break between whole groups
- Try spacing first, and add a divider when the groups still run together
- Use a vertical divider between clusters of controls in a row, such as a toolbar
- Set aria-hidden="true" on a divider that only decorates

### Don't

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
- **Often used with:** `button`, `icon-button`

## Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `orientation` | enum: 'horizontal' \| 'vertical' | `horizontal` | no | Which way the rule runs. horizontal spans the width of its container and separates content stacked above and below it; vertical spans the height of its container and separates items side by side. A vertical rule sets aria-orientation="vertical"; horizontal is the default and needs no attribute. |

## States

None — not interactive.

## Variants

| Axis | Values | Changes |
| --- | --- | --- |
| `orientation` | `horizontal`, `vertical` | once, when authored |

## Accessibility

- **Role:** separator (native \<hr> for a horizontal rule, role="separator" with aria-orientation="vertical" for a vertical one), or none with aria-hidden="true" when the rule is decorative
- **WCAG:**
  - 1.3.1 Info and Relationships — a rule that marks a real break in content is a separator, so assistive technology hears the break a sighted reader sees
  - 1.4.11 Non-text Contrast — a divider is not a UI control boundary, so it does not need 3:1; where a layout relies on the rule alone to show that two groups are separate, aim for the same 3:1 and add spacing as a second cue
- **Focus:** None. A divider is not focusable and takes no place in the tab order.
- **ARIA:** An \<hr> needs no attributes. A vertical rule sets role="separator" and aria-orientation="vertical". A decorative rule sets aria-hidden="true", so a screen reader does not announce a break that means nothing.

## Composition

- **Planned:** `accordion`
- **Replaces:**
  - a hand-drawn line or a border-bottom on one item standing in for a separator

---

Generated from the `divider` component definition.
