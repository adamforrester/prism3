/**
 * QuantityStepper — DRAFT FOR THE OWNER'S REVIEW (#2427). Not registered in `components/index.ts`, not gated,
 * and not for merge: it exists so the proposal on #2427 can show plan renders of the recommended shape. Every
 * name, value, default and string here is DRAFT until the owner approves the proposal.
 *
 * No KB brief. Category `form`: a numeric entry control that sits in a form or a line item, beside the field
 * family it borrows its sizing from. The closest briefs are `components/text-field.md` §3 (a number field is a
 * separate component with a spinbutton keyboard model) and `components/slider.md` (a stepper for very small
 * ranges); there is no stepper brief yet.
 *
 * THE STRUCTURAL CLAIM (#2350 part 2): the stepper OWNS ITS EDGES. The − and + are not nested IconButtons:
 * an IconButton is a square with its glyph centered, so a row of them cannot sit flush with the content above
 * and below, and the owner decided icon buttons get no flush option (#2350, correction to Q143). Each button
 * here is its own 44px square target whose glyph is pinned to the stepper's OUTER edge, with the slack toward
 * the value. On the `ghost` appearance the edge inset is 0, so the glyphs line up with the content edge.
 *
 * TWO DRAFT ENGINE TOUCHES this def needs, both flagged on #2427 rather than decided here:
 *   1. `value` is reused as the axis NAME for in-range / at-min / at-max (no closed axis name fits better;
 *      the alternative is adding `limit` to `VARIANT_AXES`, a schema change).
 *   2. The two glyphs need DIFFERENT inks in one member (at-min dims the − only). The paint grammar is
 *      part-blind and the vector branch always asks for `icon`, so on this branch the vector honors
 *      `paintSlot` (as the text branch has since #796) and the + borrows `indicator`. The proper fix is a
 *      technical call for the build PR.
 */
import { ComponentDef } from '../component-schema';

export const quantityStepper: ComponentDef = {
  id: 'quantity-stepper',
  name: 'QuantityStepper',
  aliases: ['stepper', 'quantity-selector', 'counter', 'spinbutton', 'number-stepper'],
  category: 'form',
  status: 'draft',
  summary: 'Whole-number quantity control: a value between a decrease and an increase button.',
  description:
    'A control for a small whole-number quantity, such as an item count in a bag or a number of guests. The value sits between a decrease (−) and an increase (+) button, each a 44px target; the value is also typed directly. At the minimum the decrease button is unavailable, and at the maximum the increase button is. Not for a large or precise range (a number field), a value from a short fixed list (Select or SegmentedControl), or an approximate value (Slider).',

  props: [
    { name: 'label', type: 'string | node', required: true, description: 'The accessible name, rendered as FieldLabel. Required even when hidden: a stepper in a line item names its product ("Quantity, Trail runner").' },
    { name: 'labelHidden', type: 'boolean', default: false, required: false, description: 'Keeps the label for assistive technology and hides it visually, for a line item where the product row already shows what the quantity is for.' },
    { name: 'value', type: 'number', required: false, description: 'Controlled value; pair with onChange.' },
    { name: 'defaultValue', type: 'number', default: 1, required: false, description: 'Uncontrolled starting value.' },
    { name: 'onChange', type: 'function', required: false, description: 'Called with the new whole number after a button press, an arrow key, or a committed typed value.' },
    { name: 'min', type: 'number', default: 1, required: false, description: 'The lowest value. At the minimum the decrease button is unavailable (aria-disabled), unless removeAtMin is set.' },
    { name: 'max', type: 'number', required: false, description: 'The highest value, such as the stock or a per-order limit. At the maximum the increase button is unavailable. Say why in the message ("Limit 5 per order").' },
    { name: 'step', type: 'number', default: 1, required: false, description: 'How much one press changes the value.' },
    { name: 'removeAtMin', type: 'boolean', default: false, required: false, description: 'At the minimum, the decrease button becomes a remove action named "Remove" and the product, and calls onRemove. For a bag line item.' },
    { name: 'onRemove', type: 'function', required: false, description: 'Called when the remove action is pressed at the minimum.' },
    { name: 'appearance', type: "enum: 'outline' | 'ghost'", values: ['outline', 'ghost'], default: 'outline', required: false, description: 'outline draws the field border around the control, for a form or a product page. ghost draws no border and puts the − and + glyphs on the control\'s outer edges, so it lines up with the content above and below, for a bag line item.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The field sizes. small and medium are 44px tall, small with 14px type and medium with 16px; large is 56px with 18px type. Every size keeps the 44px target on both buttons.' },
    { name: 'validationMessage', type: 'string | node', required: false, description: 'Text below the control, such as a limit or an out-of-range value, added to aria-describedby.' },
    { name: 'showMessage', type: 'boolean', default: false, required: false, description: 'Whether the composed FieldMessage is shown.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Native disabled on the input and both buttons. Removed from the tab order.' },
    { name: 'readOnly', type: 'boolean', default: false, required: false, description: 'Shows the value with no buttons\' actions; still focusable and submitted.' },
    { name: 'name', type: 'string', required: false, description: 'A real <input name>, so the value submits with a native form.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled', 'read-only'],
  variants: {
    appearance: ['outline', 'ghost'],
    size: ['medium', 'small', 'large'],
    value: ['in-range', 'at-min', 'at-max'],
  },
  axisKinds: { appearance: 'authoring', size: 'authoring', value: 'runtime' },

  // Three lengths, so no two templates of one length lead with different axes (`paintKeyErrors`).
  paintKeys: ['{appearance}.{slot}.{state}', '{value}.{slot}', '{slot}'],

  tokens: {
    // ── GEOMETRY
    'radius': 'radius.sm',
    'border-width': 'border-width.hairline',
    'root-gap': 'space.100',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset-field',
    'zero': 'space.0',
    // Each button is a square the control's height: 44 at small and medium, 56 at large.
    'size.small.height': 'size.md.min-height',
    'size.medium.height': 'size.md.min-height',
    'size.large.height': 'size.lg.height',
    'size.small.type': 'type.body.sm.default',
    'size.medium.type': 'type.body.md.default',
    'size.large.type': 'type.body.lg.default',
    'size.small.glyph': 'icon.size.sm',
    'size.medium.glyph': 'icon.size.sm',
    'size.large.glyph': 'icon.size.md',
    'size.small.value-pad': 'space.050',
    'size.medium.value-pad': 'space.050',
    'size.large.value-pad': 'space.100',
    // The glyph's inset from the control's outer edge: inside the border on outline, 0 on ghost (the flush edge).
    'size.small.outline.edge': 'space.150',
    'size.medium.outline.edge': 'space.150',
    'size.large.outline.edge': 'space.200',
    'size.small.ghost.edge': 'space.0',
    'size.medium.ghost.edge': 'space.0',
    'size.large.ghost.edge': 'space.0',

    // ── PAINT. outline: the field chrome (transparent field fill, field border, focus border). ghost: nothing.
    'outline.fill.rest': 'color.field.fill',
    'outline.fill.focus-visible': 'color.field.fill',
    'outline.border.rest': 'color.field.border.rest',
    'outline.border.focus-visible': 'color.border.focus',
    'outline.border.disabled': 'color.disabled.border',
    // The value, full-contrast.
    'label': 'color.text.primary',
    // The − glyph (`icon`) and the + glyph (`indicator`, the draft workaround in the header), each dimmed at
    // its own limit. The neutral interactive icon ink, as IconButton.Neutral's ghost glyph.
    'icon': 'color.interactive.neutral.icon.rest',
    'indicator': 'color.interactive.neutral.icon.rest',
    'at-min.icon': 'color.disabled.icon',
    'at-max.indicator': 'color.disabled.icon',
    // Cross-cutting disabled.
    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
    'disabled.indicator': 'color.disabled.icon',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'root-gap',
        children: ['label', 'control', 'message'],
      },
      label: {
        kind: 'nest',
        nests: 'field-label',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium', emphasis: 'secondary', weight: 'regular', state: 'rest' }, follow: ['size'] },
        optional: true,
        note: 'The accessible name, as FieldLabel. Shown by default; hidden visually in a line item, where code keeps it for assistive technology.',
      },
      control: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill', 'border'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },
        height: 'size.{size}.height',
        radius: 'radius',
        strokeWidth: 'border-width',
        children: ['decrement', 'entry', 'increment', 'focusRing'],
        note: 'The row: the decrease button, the value, the increase button. The input inside is the one focus stop; the ring goes around the whole row.',
      },
      decrement: {
        kind: 'box',
        role: 'presentation',
        innerTarget: true,
        size: 'size.{size}.height',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
        padding: { block: 'zero', inlineLabel: 'size.{size}.{appearance}.edge', inlineEnd: 'zero' },
        children: ['minus'],
        note: 'The decrease button: a square as tall as the control, with the − on the outer edge and the slack toward the value.',
      },
      minus: {
        kind: 'vector',
        glyph: 'minus',
        size: 'size.{size}.glyph',
        note: 'The − glyph, aria-hidden; the button is named "Decrease quantity".',
      },
      entry: {
        kind: 'box',
        role: 'presentation',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        minWidth: 32,
        padding: { block: 'zero', inlineLabel: 'size.{size}.value-pad' },
        children: ['value'],
        note: 'The value cell, never narrower than two digits, so the buttons do not move between 9 and 10.',
      },
      value: {
        kind: 'text',
        type: 'size.{size}.type',
        note: 'The value, centered, in the value ink.',
      },
      increment: {
        kind: 'box',
        role: 'presentation',
        innerTarget: true,
        size: 'size.{size}.height',
        layout: { direction: 'row', align: 'center', justify: 'end', sizing: { x: 'fixed', y: 'fixed' } },
        padding: { block: 'zero', inlineLabel: 'zero', inlineEnd: 'size.{size}.{appearance}.edge' },
        children: ['plus'],
        note: 'The increase button, mirroring the decrease button: the + on the outer edge.',
      },
      plus: {
        kind: 'vector',
        glyph: 'plus',
        size: 'size.{size}.glyph',
        paintSlot: 'indicator',
        note: 'The + glyph, aria-hidden; the button is named "Increase quantity".',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the whole row while the input has keyboard focus.',
      },
      message: {
        kind: 'nest',
        nests: 'field-message',
        nesting: { kind: 'nest-fixed', variant: { status: 'default' } },
        optional: true,
        note: 'An optional limit or validation message below the control.',
      },
    },
    codeOnly: [
      'hover — a per-button state in code (an overlay wash on the hovered button\'s square). One member cannot show one button hovered and the other at rest, so Figma projects rest, focus-visible and disabled.',
      'pressed — a per-button state in code, for the same reason as hover.',
      'read-only — a real state in code, not a Figma variant: the value shows at full contrast and the buttons take no action.',
      'The input model — an <input type="text" inputmode="numeric"> with role="spinbutton", aria-valuenow, aria-valuemin and aria-valuemax; never type="number".',
      'The two buttons — <button type="button" tabindex="-1"> named "Decrease quantity" and "Increase quantity" (or the product), aria-controls pointing at the input, aria-disabled at their limit. Out of the tab order because the arrow keys already step the value; still reachable by touch and voice.',
      'Remove at the minimum — with removeAtMin the decrease button stays enabled at the minimum, shows a remove glyph, and is named "Remove" and the product. There is no remove glyph in the icon set yet.',
      'RTL — the row follows the reading direction: in a right-to-left layout the decrease button sits on the right. The − and + glyphs are not mirrored.',
      'Typed entry — select the value on focus so typing replaces it; commit after a short pause (about 300ms) and on Enter or blur; clamp to min and max and snap to the step on commit.',
    ],
  },

  figmaProperties: {
    variantAxes: ['appearance', 'size', 'value'],
    stateAxis: { name: 'state', values: ['rest', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    texts: { value: { part: 'value', default: '1', figmaName: 'quantity' } },
    booleans: {
      showLabel: { part: 'label', figmaName: 'label', default: true, figmaOnly: true },
      showMessage: { part: 'message', figmaName: 'message', default: false },
    },
  },

  accessibility: {
    role: 'spinbutton (an <input> with role="spinbutton") with two <button> elements',
    wcag: [
      '4.1.2 Name, Role, Value (the spinbutton carries aria-valuenow, aria-valuemin and aria-valuemax)',
      '2.1.1 Keyboard (Up and Down step the value, Home and End jump to the limits)',
      '4.1.3 Status Messages (a button press announces the new value politely)',
      '1.4.11 Non-text Contrast (the − and + glyphs and the outline border at 3:1)',
      '2.5.8 Target Size (Minimum), and 2.5.5 Target Size (Enhanced) as intent: each button is a 44px square at comfortable density',
    ],
    keyboard: 'Tab reaches the input once. Up and Down Arrow change the value by one step; Page Up and Page Down by ten steps; Home and End go to the minimum and the maximum. Typing replaces the selected value.',
    focus: 'One focus stop, the input; the focus ring goes around the whole control.',
    aria: 'The input is role="spinbutton" with aria-valuenow, aria-valuemin, aria-valuemax and the label as its name. Each button has its own name and aria-controls, and aria-disabled="true" at its limit (kept in the accessibility tree, not removed). A button press writes the new value to a polite live region ("Quantity 3"). Under RTL the decrease button sits on the right; the glyphs are not mirrored.',
  },

  docs: {
    usage: 'DRAFT. Use for a small whole-number quantity that usually changes by one, such as an item count in a bag. Set min and max, and say why a limit applies in the message. Use ghost in a bag line item so the control lines up with the product text; use outline in a form or on a product page.',
    do: [
      'DRAFT. Set a max when stock or a per-order limit exists, and say the limit in the message',
      'DRAFT. Name the buttons for the item in a list of line items ("Increase quantity, Trail runner")',
      'DRAFT. Let typing replace the value, and commit it without a separate Update button',
    ],
    dont: [
      'DRAFT. Use it for a large or precise number, such as a price or a measurement (use a text field with inputmode="numeric")',
      'DRAFT. Remove the decrease button at the minimum; show it unavailable so the layout does not move',
      'DRAFT. Use <input type="number">',
    ],
    contentGuidelines: 'DRAFT. The label is a noun ("Quantity"). Button names are verbs with the object ("Increase quantity"). A limit message states the limit and its reason ("Limit 5 per order").',
  },

  ai: {
    primaryPurpose: 'Change a small whole-number quantity one step at a time, with typed entry as a shortcut.',
    whenToUse: 'An item count in a bag or cart, a number of guests or tickets, any small count that usually changes by one.',
    avoidWhen: 'The number is large, precise or decimal (a text field with inputmode="numeric"), the choices are a short fixed list (Select), or the value is approximate (a slider).',
    commonPartners: ['field-label', 'field-message', 'button'],
    triggerKeywords: ['quantity stepper', 'quantity selector', 'stepper', 'counter', 'plus minus', 'item count'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['field-label', 'field-message', 'focus-ring'],
    alternativeTo: ['select', 'text-field'],
    planned: ['number-field', 'slider', 'segmented-control'],
    replacesPatterns: ['an <input type="number"> with the browser spinner', 'two icon buttons and a bare number with no spinbutton semantics'],
  },

  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    reduceMotion: 'The value changes in place with no animation.',
  },

  notes: {
    contested: [
      'DRAFT for the owner on #2427: the axis name for the limit (`value` reused, or a new `limit`), the appearance names, remove-at-minimum, and the label default.',
    ],
    unverified: [
      'iOS VoiceOver support for role="spinbutton" adjust gestures has not been checked; the two buttons are the fallback.',
    ],
    evolution: [],
  },
};
