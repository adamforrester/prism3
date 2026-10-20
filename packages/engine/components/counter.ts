/**
 * Counter — a whole-number quantity between a minus and a plus button, for ecommerce (#2427).
 *
 * No KB brief: the catalogue has no stepper, quantity or spin-button brief. Its badge brief lists "Counter" as an
 * alias for a count badge (a number shown on another element), which is a different component; `test.ts` admits
 * that one collision by name. Category `form` — a value control beside SegmentedControl and Select, and the
 * proposal's placement (#2427, Oct 9 §1), not `data`: the user sets the number, it is not a readout.
 *
 * ── THE OWNER DECISIONS (all on #2427) ─────────────────────────────────────────────────────────────────────
 *
 *   Q283 (2026-10-14): 2 B nest a flush icon button (#2457); 3 A that button is its own small def; 4 A `appearance:
 *     outline | ghost`; 6 B sizes medium first, the field family's exception; 7 C "remove an item" out of scope, min
 *     and max settable with min defaulting to 0, and at a limit the designer sets that nested button's exposed
 *     state to disabled; 8 A the buttons are tabindex="-1" (APG); 9 B the label hidden by default in Figma; 10 A
 *     the control's focus offset on ghost; 11 A glyphs as drawn; 13 A glyphs 20/20/24, outline insets 12/12/16,
 *     the value 32 wide; 14 A its own page, alphabetical under Components.
 *   Q286 A (2026-10-14): two components, not variants of one. This is the Counter — buttons around a DISPLAYED value,
 *     no typed entry. The form field with typed entry is Number input (#2606), built from Text field, not here.
 *   The wireframe decisions (2026-10-14): the name Counter; appearances A (outlined) and B (ghost, round buttons)
 *     both, B the MVP; C (filled square buttons) not built now, but the axis must not rule it out.
 *
 * ── HOW B's ROUND BUTTONS MAP ONTO THE FLUSH ICON BUTTON (the open shape question) ─────────────────────────
 *
 * Settled on #2457 by Q287 A, after the wireframe comment asked it: the flush icon button has `shape: flush |
 * round`, and "the Counter's outlined appearance nests flush, its ghost appearance round". Round is the circle
 * with the decorative edge (`color.border.secondary`, Q305.1 A) and the neutral hover wash, its diameter the
 * Counter's height at each size (`size.sm/md/lg.height`, 36 / 44 / 56). So the mapping is one-to-one and needs no
 * new shape: `appearance=outline` → `shape=flush`, `appearance=ghost` → `shape=round`. The Counter nests the
 * NEUTRAL family (FlushIconButton.Neutral): the minus and plus carry no brand emphasis.
 *
 * The axes have different names and values, so `follow` (by name) cannot pass one into the other. `variantWhen`
 * (#2427, `component-schema.ts`) is the mapping: per host value, a partial child coordinate. The same field starts
 * both buttons at `state=disabled` on the Counter's disabled member, and the FieldLabel at its disabled state,
 * while each button's `state` stays exposed for the designer to set at a limit.
 *
 * C, if it comes, is a third `appearance` value mapping onto a third `shape` on the flush icon button (a filled
 * square): `appearance` is an open list, and nothing here is keyed so that a third value has nowhere to go.
 *
 * ── STRUCTURE ──────────────────────────────────────────────────────────────────────────────────────────────
 *
 *   container (column)  → label (nests FieldLabel, hidden by default) · control · message (nests FieldMessage, off)
 *   control (row, the Counter's height: size.sm/md/lg.height, 36 / 44 / 56)
 *     → decrement (nests FlushIconButton.Neutral) · entry (the value, at least 32 wide) · increment · focusRing
 *
 * Outline: the field's fill and edge (`color.field.fill`, `color.field.border.rest`, `radius.sm`), insets 12 / 12 /
 * 16, so a 20px glyph sits 12px in and its 44×44 code-side hit area reaches the edge exactly at medium (12 + 20 +
 * 12). Ghost: no box paint and no inset; the round buttons are the ends of the row. The disabled outline keeps an
 * edge in `color.disabled.border`: the cross-cutting disabled branch applies an edge only where the member has one
 * at rest, so a disabled ghost Counter draws none (the Oct 9 proposal's item 3c.3, answered by the paint grammar).
 *
 * `state`: rest, focus-visible, disabled. Hover and pressed belong to each button, which carries its own reactions
 * (#2574), so this set carries none. 2 appearances × 3 sizes × 3 states = 18 members.
 */
import { ComponentDef } from '../component-schema';

/** The two stepper buttons: one nest, two cells. Each nests FlushIconButton.Neutral with `state` exposed (Q283.7). */
const stepper = {
  kind: 'nest' as const,
  nests: 'flush-icon-button-neutral',
  nesting: {
    kind: 'nest-exposed' as const,
    variant: { shape: 'flush', size: 'medium', state: 'rest' },
    expose: ['state'],
    follow: ['size'],
    // Q287 A: outline nests flush, ghost nests round. A disabled Counter starts both buttons disabled.
    variantWhen: {
      appearance: { outline: { shape: 'flush' }, ghost: { shape: 'round' } },
      state: { disabled: { state: 'disabled' } },
    },
  },
};

export const counter: ComponentDef = {
  id: 'counter',
  name: 'Counter',
  aliases: ['quantity-stepper', 'quantity-selector', 'quantity-picker', 'qty-stepper'],
  category: 'form',
  status: 'draft',
  summary: 'A whole-number quantity between a minus and a plus button, such as an item count in a bag.',
  description:
    'A small whole-number quantity shown between a minus and a plus button, such as the item count on a product card or a bag line. The buttons change the value by one; the value itself is shown, not typed. Min and max are settable, with min 0 by default, and at a limit the matching button is unavailable. Outline draws the field\'s edge around the row, with the glyphs inside it. Ghost draws no box, and each button is a light circle. For typed numeric entry in a form, use a number input.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'What is counted, such as "Quantity". The accessible name of the value, always present in code; shown above the counter only with showLabel.' },
    { name: 'showLabel', type: 'boolean', default: false, required: false, description: 'Shows the label above the counter. Off by default: a counter on a product card or a bag line is usually explained by what sits around it, and the label stays its accessible name either way.' },
    { name: 'value', type: 'number', required: false, description: 'Controlled value; pair it with onChange.' },
    { name: 'defaultValue', type: 'number', required: false, description: 'The starting value when the counter manages its own state. Defaults to min.' },
    { name: 'onChange', type: 'function', required: false, description: 'Called with the new number after each step. Never called with a value outside min and max.' },
    { name: 'min', type: 'number', default: 0, required: false, description: 'The lowest value. At min, the minus button is unavailable.' },
    { name: 'max', type: 'number', required: false, description: 'The highest value, such as the stock or a per-order limit. At max, the plus button is unavailable. No max means no upper limit.' },
    { name: 'step', type: 'number', default: 1, required: false, description: 'How much one press or one arrow key changes the value.' },
    { name: 'appearance', type: "enum: 'outline' | 'ghost'", values: ['outline', 'ghost'], default: 'outline', required: false, description: 'outline draws the field edge around the row, with the minus and plus glyphs inside it. ghost draws no box, and the minus and plus are light circles at each end.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The row height (36, 44 or 56px), the value type (14, 16 or 18px) and the glyph (20, 20 or 24px). Each button keeps a hit area of at least 44×44px in code at every size.' },
    { name: 'message', type: 'string', required: false, description: 'Text below the counter, such as the reason for a limit ("Limit 5 per order"). Added to the value\'s description.' },
    { name: 'showMessage', type: 'boolean', default: false, required: false, description: 'Shows the message below the counter. Off by default.' },
    { name: 'decrementLabel', type: 'string', required: false, description: 'The minus button\'s accessible name. Defaults to "Decrease" followed by the label, such as "Decrease quantity". In a list of line items, include the item: "Decrease quantity, Trail runner".' },
    { name: 'incrementLabel', type: 'string', required: false, description: 'The plus button\'s accessible name. Defaults to "Increase" followed by the label. In a list of line items, include the item.' },
    { name: 'name', type: 'string', required: false, description: 'The form field name: a hidden input carries the value when the counter sits in a form.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Disables the whole counter: the value leaves the Tab order and both buttons are unavailable.' },
  ],

  states: ['rest', 'focus-visible', 'disabled'],
  // Q283.4 A, outline first as decided; Q283.6 B, medium first (the field family's exception, as text-field).
  variants: {
    appearance: ['outline', 'ghost'],
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { appearance: 'authoring', size: 'authoring' },

  // Appearance leads, so a ghost member resolves no box paint (every box key is `outline.*`). The value ink is
  // stated per appearance, identical. The `disabled.*` keys are the cross-cutting disabled branch.
  paintKeys: ['{appearance}.{slot}.{state}', '{appearance}.{slot}'],

  tokens: {
    // THE ROW: the Counter's height at each size, which is the round button's diameter (Q287 A: 36 / 44 / 56).
    'size.small.height': 'size.sm.height',
    'size.medium.height': 'size.md.height',
    'size.large.height': 'size.lg.height',
    // THE INSETS (Q283.13 A): outline 12 / 12 / 16, so the glyph's 44×44 code-side hit area meets the edge at
    // medium; ghost 0, the round buttons are the row's ends. Fixed, not density spacing: the inset is set by the
    // glyph and its hit area, not by the brand's density.
    'outline.size.small.pad-x': 'space.150',
    'outline.size.medium.pad-x': 'space.150',
    'outline.size.large.pad-x': 'space.200',
    'ghost.size.small.pad-x': 'space.0',
    'ghost.size.medium.pad-x': 'space.0',
    'ghost.size.large.pad-x': 'space.0',
    'pad-y': 'space.0',
    // THE VALUE: the field's body type, one per size, with a little room either side of the number.
    'size.small.type': 'type.body.sm.default',
    'size.medium.type': 'type.body.md.default',
    'size.large.type': 'type.body.lg.default',
    'size.small.value-pad': 'space.050',
    'size.medium.value-pad': 'space.050',
    'size.large.value-pad': 'space.100',
    // The stack spacing between label, row and message, the field family's.
    'root-gap': 'space.100',
    'radius': 'radius.sm',
    'border-width': 'border-width.hairline',
    // THE FOCUS RING (Q283.10 A): ghost takes the control offset, 2px, so the ring clears the round buttons;
    // outline takes the field offset, as Text field does, the edge already separating it.
    'ring-width': 'focus.ring.width',
    'outline.ring-offset': 'focus.ring.offset-field',
    'ghost.ring-offset': 'focus.ring.offset',

    // ── PAINT ──
    // Outline: Text field's fill and edge. The edge is the field's own 3:1 role.
    'outline.fill': 'color.field.fill',
    'outline.border': 'color.field.border.rest',
    // The value, full contrast on both appearances.
    'outline.label': 'color.text.primary',
    'ghost.label': 'color.text.primary',
    // Disabled: the dimmed value, and on outline only (the only appearance with an edge at rest) the disabled edge.
    'disabled.label': 'color.disabled.text',
    'disabled.border': 'color.disabled.border',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'root-gap',
        children: ['label', 'control', 'message'],
        note: 'The stack: an optional label above the row and an optional message below it. It hugs the row.',
      },
      label: {
        kind: 'nest',
        nests: 'field-label',
        // Nested as the fields nest it (owner decision Q399 A on #2693): `emphasis` and `weight` are EXPOSED and start
        // secondary and regular. Follows the size, and dims with a disabled Counter (`variantWhen` on the state).
        nesting: {
          kind: 'nest-exposed',
          variant: { size: 'medium', emphasis: 'secondary', weight: 'regular', state: 'rest' },
          expose: ['emphasis', 'weight'],
          follow: ['size'],
          variantWhen: { state: { disabled: { state: 'disabled' } } },
        },
        optional: true,
        note: 'What is counted, such as "Quantity". Its label text, required marker, emphasis and weight surface on the Counter. Hidden by default: the label is always the value\'s accessible name, and shown only where nothing around the counter says what it counts.',
      },
      control: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill', 'border'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        height: 'size.{size}.height',
        padding: { block: 'pad-y', inlineLabel: '{appearance}.size.{size}.pad-x' },
        radius: 'radius',
        strokeWidth: 'border-width',
        children: ['decrement', 'entry', 'increment', 'focusRing'],
        note: 'The row: the minus button, the value and the plus button. Outline draws the field\'s fill and edge with the glyphs 12px inside it (16px at large); ghost draws nothing, and the round buttons are its ends.',
      },
      decrement: {
        ...stepper,
        overrides: { swaps: { icon: 'minus' } },
        note: 'The minus button, at the leading edge. Flush glyph on outline, a light circle on ghost. Its state is the designer\'s to set: unavailable at the minimum.',
      },
      entry: {
        kind: 'box',
        role: 'presentation',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        // Q283.13 A: the value is at least 32 wide, room for two digits, so the row holds still from 9 to 10.
        minWidth: 32,
        padding: { block: 'pad-y', inlineLabel: 'size.{size}.value-pad' },
        children: ['value'],
        note: 'The value, centered between the buttons and at least 32px wide, so the buttons hold still as the count reaches two digits.',
      },
      value: {
        kind: 'text',
        type: 'size.{size}.type',
        paintSlot: 'label',
        note: 'The number, in the field\'s body type.',
      },
      increment: {
        ...stepper,
        overrides: { swaps: { icon: 'plus' } },
        note: 'The plus button, at the trailing edge. Flush glyph on outline, a light circle on ghost. Its state is the designer\'s to set: unavailable at the maximum.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: '{appearance}.ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the whole row while the value has keyboard focus: on the edge for outline, 2px outside the round buttons for ghost.',
      },
      message: {
        kind: 'nest',
        nests: 'field-message',
        nesting: { kind: 'nest-fixed', variant: { status: 'default' } },
        optional: true,
        note: 'An optional line below the row, such as the reason for a limit. Off by default.',
      },
    },
    codeOnly: [
      'the spinbutton — the value is one focusable element with role="spinbutton" and tabindex="0", not an <input>: a counter shows its value and is not typed into (typed entry is the number input). It carries aria-valuenow, aria-valuemin, aria-valuemax only when a max is set, aria-valuetext where the number alone is unclear ("3 items"), and the label as its name through aria-labelledby, which works with the label shown or hidden. The message, when shown, is added through aria-describedby.',
      'the keyboard model — Up Arrow and Down Arrow change the value by one step, Page Up and Page Down by ten steps, and Home and End go to min and to max when a max is set. The value never passes min or max. The counter is one Tab stop, at the value.',
      'the stepper buttons — each is a <button type="button" tabindex="-1"> (APG), out of the Tab order because the arrow keys do the same job, and still reached by pointer, touch and voice. They are not aria-hidden: the ARIA Authoring Practices spin button example keeps such buttons in the accessibility tree, so pointer and touch users of assistive technology can still find them by name. Each has aria-controls pointing at the value and an accessible name from decrementLabel and incrementLabel. A press does not move focus. At a limit the button takes aria-disabled="true", not native disabled, so it stays in the accessibility tree, and a press does nothing.',
      'the announcement — a button press writes the new value to the app\'s one shared polite live region, such as "Quantity 3", never a region of the counter\'s own. An arrow-key change is announced by the spinbutton itself and is not written there again.',
      'touch-target-expansion — each nested button extends its hit area in code to at least 44×44px at every size (the flush icon button\'s own rule). On outline the medium inset is 12px, so a 20px glyph\'s 44px area reaches the edge exactly; the value between the two buttons keeps their areas apart, at least 44px center to center.',
      'limits in Figma — min and max are code props. In Figma the designer shows a limit by setting that button\'s exposed state to disabled; in code the counter sets aria-disabled from min and max.',
      'no wheel — the value never changes on a mouse wheel or a scroll gesture.',
      'tabular figures — the value is set with font-variant-numeric: tabular-nums, so its width holds from one count to the next; the 32px minimum width holds two digits.',
      'the glyphs — the minus and plus are the nested buttons\' icon swap, set to the icon set\'s minus and plus as a per-instance override on each nested button (#2645).',
      'RTL — the row follows the reading direction, so the minus button sits at the right edge. The minus and plus glyphs are symmetric and are not mirrored.',
    ],
  },

  figmaProperties: {
    variantAxes: ['appearance', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    texts: { value: { part: 'value', default: '1' } },
    booleans: {
      // Q283.9 B: the label hidden by default in Figma, as in code.
      showLabel: { part: 'label', figmaName: 'label', default: false },
      showMessage: { part: 'message', figmaName: 'message', default: false },
    },
  },

  accessibility: {
    role: 'spinbutton (the value), with two buttons outside the Tab order',
    wcag: [
      '4.1.2 Name, Role, Value (the value is a spinbutton named by the label, with its current, minimum and maximum values)',
      '2.1.1 Keyboard (the arrow, Page Up, Page Down, Home and End keys change the value; the buttons are not needed)',
      '4.1.3 Status Messages (a button press announces the new value through the shared polite live region)',
      '1.4.11 Non-text Contrast (the outline edge is the field edge; the glyphs target 3:1 against the page)',
      '2.4.7 Focus Visible (the shared focus ring around the row)',
      '2.5.8 Target Size (Minimum) (24×24, as intent, through each button\'s code-side hit area)',
      '2.5.5 Target Size (Enhanced) (targets 44×44 for each button at every size, through its code-side hit area)',
    ],
    keyboard: 'The counter is one Tab stop: focus lands on the value. Up and Down Arrow change it by one step, Page Up and Page Down by ten steps, Home and End go to min and max. The minus and plus buttons are for pointer and touch and are outside the Tab order (tabindex="-1").',
    focus: 'One focus ring around the whole row while the value has keyboard focus, as built in Figma: on the edge for outline, 2px outside the buttons for ghost. The buttons never take focus from the keyboard, so they draw no ring of their own.',
    aria: 'The value has role="spinbutton", aria-valuenow, aria-valuemin, aria-valuemax when a max is set, aria-valuetext where the number is shown formatted ("3 items"), and the label as its name, shown or not. Each button has aria-controls pointing at the value and its own name, a verb with the object ("Increase quantity"); in a list of line items, the name includes the item. At a limit the button takes aria-disabled="true" and stays in the accessibility tree. The buttons are not aria-hidden: they keep their names for pointer and touch users of assistive technology, as the ARIA Authoring Practices spin button example does. Every name is translatable, and the row mirrors right to left.',
  },

  content: {
    labelPattern: 'The label is a noun ("Quantity"). The button names are a verb with the object ("Decrease quantity", "Increase quantity"). A limit message states the limit and its reason ("Limit 5 per order").',
  },

  docs: {
    usage: 'Use for a small whole-number quantity that usually changes by one, such as the item count on a product card or in a bag. Set min and max where they apply, and say why a limit applies in the message. Use ghost where the counter stands on its own beside product text; use outline where it should read as a field. For a number the user types, such as a price or a measurement, use a number input.',
    do: [
      'Set max when stock or a per-order limit exists, and state the limit in the message',
      'Name the buttons for the item in a list of line items ("Increase quantity, Trail runner")',
      'Show a button at its limit as unavailable rather than hiding it, so the row does not move',
      'Leave each button its 44×44px hit area in code, at least 44px apart center to center',
    ],
    dont: [
      'Use it for a large or precise number, such as a price or a measurement; use a number input',
      'Use it for a count shown on another element, such as unread messages; use a badge',
      'Put the minus and plus buttons in the Tab order; the arrow keys already step the value',
      'Hide the minus and plus buttons with aria-hidden; they stay in the accessibility tree for pointer and touch users of assistive technology',
      'Change the value on a mouse wheel or scroll',
    ],
    contentGuidelines: 'The label is a noun ("Quantity"). Button names are a verb with the object. A limit message states the limit and why ("Limit 5 per order").',
  },

  ai: {
    primaryPurpose: 'Set a small whole-number quantity with a minus and a plus button around the displayed value.',
    whenToUse: 'An item count on a product card or a bag line, a number of guests or tickets: a small count, usually changed by one, with a known minimum and often a maximum.',
    avoidWhen: 'The number is typed, large, precise or decimal, such as a price or a measurement (use a number input). The count is shown on another element rather than set by the user, such as unread messages (use Badge). The options are a short fixed list to compare (use Select or SegmentedControl).',
    commonPartners: ['flush-icon-button-neutral', 'field-label', 'field-message', 'button'],
    triggerKeywords: ['counter', 'quantity', 'quantity stepper', 'quantity selector', 'plus minus', 'item count', 'add to bag quantity'],
    generationPriority: 4,
  },

  composition: {
    composesWith: ['field-label', 'flush-icon-button-neutral', 'focus-ring', 'field-message'],
    alternativeTo: ['select', 'segmented-control', 'text-field'],
    planned: ['number-input'],
    replacesPatterns: ['an <input type="number"> for an item count', 'a select of 1 to 10 for a bag quantity', 'two IconButtons around a <span> with no spinbutton semantics'],
  },

  motion: {
    enter: 'none (present on mount)',
    exit: 'none',
    reduceMotion: 'The value changes in place with no animation, so nothing changes under prefers-reduced-motion.',
  },

  notes: {
    contested: [
      'Appearance order: `outline` first, as Q283.4 A spelled it, so the Figma default and the code default are outline, while the wireframe decision made ghost the MVP. If ghost should be what a designer inserts, the order flips (an owner call).',
      'The value in Figma defaults to "1", the Oct 9 draft, while the code default is min, which defaults to 0 (Q283.7). A product card usually starts at 1; the two defaults differ on purpose until the owner says otherwise.',
      'TWO NESTS EXPOSING `state` ON ONE HOST are built and exposed on the shim (`test-roundtrip.ts`), but untested on a real host, where Figma lists each exposed instance\'s properties under its layer name (decrement, increment).',
    ],
    unverified: [
      'iOS VoiceOver\'s adjust gesture on role="spinbutton" (APG warns of mobile support gaps); the two buttons are the fallback.',
      'The round button\'s edge is decorative (about 2:1, no floor, Q305.1 A); the glyph carries the 3:1, gated on the flush icon button, not here.',
      'The outline edge clears 3:1 through `color.field.border.rest`, gated for the field family, not re-measured here.',
    ],
    evolution: [
      '2026-10-09: proposal as QuantityStepper, owning its edges (shape A, 54 members).',
      '2026-10-12: refreshed proposal: shape B, nesting a flush icon button (18 members).',
      '2026-10-14 Q283: shape B; outline | ghost; medium first; remove-at-min out of scope, min defaulting to 0; buttons tabindex="-1"; label hidden by default in Figma; the control focus offset on ghost; glyphs 20/20/24, insets 12/12/16, value 32 wide; its own page.',
      '2026-10-14 Q286 A: Counter and Number input are two components; the Counter displays its value and is not typed into.',
      '2026-10-14 wireframes: the name Counter; appearances outline and ghost (round buttons), ghost the MVP; filled square buttons not built, the axis left open for them.',
      '2026-10-14 Q287 A (on #2457): the flush icon button carries `shape: flush | round`; outline nests flush and ghost nests round.',
    ],
  },
};
