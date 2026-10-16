/**
 * Slider and Slider.Thumb (#2669).
 *
 * KB brief: `components/slider.md`
 *
 * Owner decision (2026-10-16, on #2669): the proposal approved with every numbered call at its recommendation (A):
 *   1 A  One `Slider`; range comes from a two-value `value` (`[40, 120]`), the price-filter case. No RangeSlider.
 *   2 A  `type` [single, range] × five states = 10 members.
 *   3 A  One size. Density moves `control.size.md.thumb` and `size.md.min-height`; no size axis.
 *   4 A  The value readout is header text, always visible. No bubble (it would need a Tooltip).
 *   5 A  A 2px rail in `color.field.border.rest` and a 4px fill in `color.interactive.primary.fill.rest`, every part
 *        at 3:1 or more against the page; the fill is told from the rail by thickness and by the thumbs, not color.
 *   6 A  A 24px filled disc in the primary fill with a 2px page-colored ring; 44×44 hit area in code.
 *   7 A  Paired inputs behind an `inputs` boolean, off by default, nesting TextField.
 *   8 A  Thumbs stop at each other, by pointer and keyboard.
 *   9 A  `Slider` / `slider`, category `form`, aliases `range-slider`, `range-input`, `range`; its own page.
 *  10 A  The wording as listed ("Label", "Minimum", "Maximum", "Minimum {label}", "Maximum {label}", the summary).
 *
 * Owner rules this build follows (#2706, 2026-10-15/16): Rest carries While hovering and While pressing, Hover
 * carries While pressing (Q344, the plugin's reaction map, nothing to author here); a border never binds an icon or
 * text role, and a disabled border binds `color.disabled.border` (Q346); the Figma first member is the code default
 * (Q347: `type=single, state=rest`); property names are lowercase (Q345); a part used only inside its parent takes
 * the `_` prefix (Q349), which is why the thumb is `_slider-thumb`.
 *
 * ── WHY THE THUMB IS ITS OWN COMPONENT ───────────────────────────────────────────────────────────────────
 * A range member shows its state on the maximum thumb while the minimum thumb stays at rest (call 2). `paintOf` is
 * part-blind, so two boxes in one def that take the same slot paint the same variable at a coordinate: the two thumbs
 * could not differ. Nesting one Thumb component twice, each `nest-fixed` at rest and moved by `atState`, lets the
 * maximum thumb follow every host state and the minimum one follow only `disabled`. The focus ring sits inside the
 * Thumb, so it lands on the thumb and never on the track.
 *
 * ── THE TRACK IS FLOW, NOT OFFSETS ───────────────────────────────────────────────────────────────────────
 * Figma auto layout has no per-child main-axis offset, and `positionWhen` is three positions only. So the control row
 * is a flow of growing segments around fixed thumbs: single is [fill, thumb, rail], range is [rail, thumb, fill,
 * thumb, rail]. The growing segments share the row equally, so a single thumb sits at the middle and the two range
 * thumbs near a third and two thirds. The thumb's own page-colored ring covers each joint. Code draws one rail and
 * positions the fill and thumbs by value; see `codeOnly`.
 *
 * ── PAINT ────────────────────────────────────────────────────────────────────────────────────────────────
 * Slider: the rails take `fill` (`color.field.border.rest`), the selected bar takes `indicator`
 * (`color.interactive.primary.fill.rest`), the value readout takes `label` (`color.text.primary`) and the end labels
 * take `body` (`color.text.secondary`). None moves with hover or press: the state is on the thumb. Thumb: the inner
 * disc's `indicator` steps rest / hover / pressed on the primary fill; the outer disc's `fill` is the 2px page-colored
 * ring (`color.background.primary`), padded 2px around the inner one, not a stroke (Q346: a stroke binds a border role).
 * Disabled: rails, bar and inner disc `color.disabled.fill`, text `color.disabled.text`; the ring keeps the page color.
 */
import { ComponentDef } from '../component-schema';

export const sliderThumb: ComponentDef = {
  id: '_slider-thumb',
  name: 'Slider.Thumb',
  aliases: ['slider-handle', 'slider-knob'],
  category: 'form',
  status: 'draft',
  summary: 'The thumb a Slider moves: a filled disc with a page-colored ring. Used only inside a Slider.',
  description:
    'The handle a Slider moves along its track: a filled disc in the primary fill with a 2px ring in the page color, which keeps it apart from the fill beside it. It darkens at hover and press, and shows the focus ring while it has keyboard focus. It lives inside a Slider, which places one thumb for a single value and two for a range, and is never placed on its own.',

  props: [
    { name: 'aria-label', type: 'string', required: false, description: 'The thumb\'s accessible name. Set by the Slider: the label for a single value, "Minimum {label}" and "Maximum {label}" for a range.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'The disabled look. Set by the Slider when the whole control is disabled.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  variants: {},

  paintKeys: ['{slot}.{state}', '{slot}'],

  tokens: {
    // The disc: `control.size.md.thumb` (24px at the default density), round.
    'size': 'control.size.md.thumb',
    'radius': 'radius.round',
    // THE RING (call 6 A): the outer disc in the page color, padded 2px around the inner disc. Structure, not a stroke:
    // a stroke binds a border role (Q346), and no border role is the page color.
    'ring-inset': 'space.025',
    'fill': 'color.background.primary',
    'indicator': 'color.interactive.primary.fill.rest',
    'indicator.hover': 'color.interactive.primary.fill.hover',
    'indicator.pressed': 'color.interactive.primary.fill.pressed',
    // Disabled (contrast-exempt): the ring keeps the page color, the disc dims.
    'disabled.fill': 'color.background.primary',
    'disabled.indicator': 'color.disabled.fill',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',
  },

  anatomy: {
    root: 'thumb',
    parts: {
      thumb: {
        kind: 'box',
        role: 'target',
        paintSlots: ['fill'],
        size: 'size',
        radius: 'radius',
        padding: { block: 'ring-inset', inlineLabel: 'ring-inset' },
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['disc', 'focusRing'],
        note: 'The thumb: a disc in the page color, the 2px ring that keeps the thumb apart from the fill bar beside it, around the inner disc.',
      },
      disc: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['indicator'],
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        grow: true,
        crossAxisFill: true,
        note: 'The inner disc in the primary fill. It darkens at hover and press.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the thumb while it has keyboard focus. On the thumb, never the track.',
      },
    },
    codeOnly: [
      'The thumb in code — a visually hidden native <input type="range"> under the drawn disc supplies focus, the keyboard, form submission and role="slider". The disc is aria-hidden drawing.',
      'touch-target-expansion — the visible disc is 24px at the default density and smaller at compact; its hit area is at least 44×44px at every size and density in code: a transparent ::before inset outward and centered on the thumb.',
      'Pointer capture — on pointerdown call setPointerCapture(pointerId) on the thumb so a drag survives the pointer leaving the track; release on pointerup and pointercancel.',
      'Motion — while dragging, the thumb follows the pointer 1:1 with transition: none (a data-dragging attribute), so it never lags the cursor.',
      'forced-colors — the disc keeps a system-color fill or border, so the thumb still shows; the focus ring is an outline.',
    ],
  },

  figmaProperties: {
    variantAxes: [],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    booleans: {},
  },

  accessibility: {
    role: 'slider, from a visually hidden native <input type="range">; the Slider wires its name, value and range',
    wcag: [
      '1.4.11 Non-text Contrast (the disc targets 3:1 against the page at rest, hover and press)',
      '2.4.7 Focus Visible / 2.4.13 Focus Appearance (the shared focus ring, as intent)',
      '2.5.8 Target Size (targets a 44×44px hit area in code, beyond the visible disc)',
    ],
    keyboard: 'Set by the Slider: arrow keys move one step, Page Up and Page Down one large step, Home and End to the ends of the thumb\'s range.',
    focus: 'A focus ring around the thumb on :focus-visible, never around the track.',
    aria: 'aria-valuenow, aria-valuemin and aria-valuemax from the native input; aria-valuetext whenever the value is not a bare number. Set by the Slider.',
  },

  content: {
    labelPattern: 'None of its own. The Slider names each thumb: its label for a single value, "Minimum {label}" and "Maximum {label}" for a range.',
  },

  docs: {
    usage: 'Part of a Slider. The Slider places one thumb for a single value and two for a range, and sets each thumb\'s name, value and state.',
    do: [
      'Extend its hit area in code to at least 44×44px at every size, with a transparent `::before` inset outward',
      'Let the Slider name each thumb, so a range announces "Minimum" and "Maximum", not "slider, slider"',
    ],
    dont: ['Place a thumb outside a Slider', 'Put the focus ring on the track instead of the thumb'],
    contentGuidelines: 'No copy of its own.',
  },

  ai: {
    primaryPurpose: 'The handle a Slider moves, inside a Slider only.',
    whenToUse: 'Only as part of a Slider.',
    avoidWhen: 'Anywhere outside a Slider. A switch handle is Switch.Control; a value chosen by dragging is a Slider.',
    commonPartners: ['slider', 'focus-ring'],
    triggerKeywords: ['slider thumb', 'slider handle', 'slider knob'],
    generationPriority: 9,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: [],
    replacesPatterns: ['the browser\'s own range thumb, restyled per engine'],
    supersededBy: [],
  },

  motion: {
    enter: 'None.',
    exit: 'None.',
    reduceMotion: 'While dragging the thumb follows the pointer with no transition. After a track click or a key step it slides on the fast duration; under reduced motion it moves at once.',
  },

  notes: {
    contested: [],
    unverified: [
      'The 2px page-colored ring sits inside the 24px thumb in Figma (a page-colored disc padded 2px around the primary disc), so the visible disc is 20px; the wireframe drew it outside (a box-shadow). Code may draw either; the 3:1 against the page is the disc\'s fill, measured the same either way. A stroke cannot carry it: a stroke binds a border role (Q346), and no border role is the page color.',
    ],
    evolution: [
      '2026-10-16 (#2669): built with the Slider to the approved proposal (all calls A). A nested component, not a part of the Slider, so the minimum thumb of a range can stay at rest while the maximum thumb shows the state (Q349 `_` prefix).',
    ],
  },
};

// Each thumb nests the Thumb at rest; `atState` moves it with the host. The maximum thumb follows every state; the
// minimum thumb of a range follows only `disabled`, so the state shows on one thumb (call 2 A).
const thumbNest = (states: readonly string[]) => ({
  kind: 'nest' as const,
  nests: '_slider-thumb',
  nesting: {
    kind: 'nest-fixed' as const,
    variant: { state: 'rest' },
    atState: Object.fromEntries(states.map((s) => [s, { state: s }])),
  },
});

// A segment of the track: it grows along the rail, so the segments share it equally. Structure only, unless a part
// gives it a paint slot (the selected bar).
const segment = (height: string) => ({
  kind: 'box' as const,
  role: 'presentation' as const,
  height,
  layout: { direction: 'row' as const, align: 'center' as const, justify: 'start' as const, sizing: { x: 'hug' as const, y: 'fixed' as const } },
  grow: true,
});

// A nested TextField in the inputs row, filled with a value (call 7 A). It grows, so two share the row equally.
const inputNest = (value: string) => ({
  kind: 'nest' as const,
  nests: 'text-field',
  nesting: { kind: 'nest-fixed' as const, variant: { size: 'medium', status: 'default', state: 'filled' }, atState: { disabled: { state: 'disabled' } } },
  overrides: { texts: { value } },
  grow: true,
});

export const slider: ComponentDef = {
  id: 'slider',
  name: 'Slider',
  aliases: ['range-slider', 'range-input', 'range'],
  category: 'form',
  status: 'draft',
  summary: 'Choose a value, or a range, by moving a thumb along a track. Works with arrow keys too.',
  description:
    'A slider picks an approximate value, or a range between two values, by moving a thumb along a track: a price filter, a text size, a volume. It suits a value where the position within the range matters more than the exact number. One thumb sets a single value; two thumbs set a minimum and a maximum. The current value shows as text above the track. For an exact number, turn on the paired inputs, or use a text field.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'Names the dimension being set, such as "Price" or "Volume". Shown above the track, and the accessible name of a single thumb.' },
    { name: 'value', type: 'number | [number, number]', required: false, description: 'The value. A number sets one thumb; a pair of numbers, such as [40, 120], sets a range with two thumbs. Controlled; pair it with onChange.' },
    { name: 'defaultValue', type: 'number | [number, number]', required: false, description: 'The starting value when the slider manages its own state. A pair starts a range.' },
    { name: 'onChange', type: 'function', required: false, description: 'Called on every change while dragging or stepping, for a live preview.' },
    { name: 'onChangeEnd', type: 'function', required: false, description: 'Called once when the pointer is released or a key step ends. Bind costly work here, such as a network filter, so a drag does not call it for every pixel.' },
    { name: 'min', type: 'number', default: 0, required: false, description: 'The lowest value.' },
    { name: 'max', type: 'number', default: 100, required: false, description: 'The highest value.' },
    { name: 'step', type: 'number', default: 1, required: false, description: 'The amount one arrow key or one snap moves. Every value is rounded to the nearest exact multiple of the step before onChange.' },
    { name: 'largeStep', type: 'number', required: false, description: 'The amount Page Up and Page Down move. Ten steps when not set.' },
    { name: 'minStepsBetweenThumbs', type: 'number', default: 0, required: false, description: 'For a range, how many steps the two thumbs must stay apart. A thumb stops there and never crosses the other.' },
    { name: 'formatOptions', type: 'Intl.NumberFormatOptions', required: false, description: 'How the value reads: a currency, a percent, a unit. Drives the visible value text and each thumb\'s aria-valuetext from one formatter, so what is seen and what is heard match.' },
    { name: 'thumbLabels', type: '[string, string]', required: false, description: 'For a range, the two thumb names. "Minimum {label}" and "Maximum {label}" when not set.' },
    { name: 'type', type: "enum: 'single' | 'range'", values: ['single', 'range'], default: 'single', required: false, description: 'Read from value: a number is single, a pair is range. Not set on its own; listed so the two looks have a name.' },
    { name: 'showValue', type: 'boolean', default: true, required: false, description: 'Shows the value text above the track. Turn it off only when the paired inputs show the value instead.' },
    { name: 'showEndLabels', type: 'boolean', default: false, required: false, description: 'Shows the minimum and maximum under the ends of the track.' },
    { name: 'showInputs', type: 'boolean', default: false, required: false, description: 'Shows paired number inputs under the track: one for a single value, "Minimum" and "Maximum" for a range. Typing moves the thumb; dragging updates the input. With inputs on, turn the value text off.' },
    { name: 'helpText', type: 'string', required: false, description: 'Guidance under the slider, in a field message.' },
    { name: 'validation', type: "enum: 'default' | 'error'", values: ['default', 'error'], default: 'default', required: false, description: 'error marks the slider invalid: the field message shows the error status and each thumb carries aria-invalid. A slider\'s own value is always in range, so an error comes from a paired input or from validation elsewhere in the form.' },
    { name: 'validationMessage', type: 'string', required: false, description: 'The error text, shown in the field message and added to aria-describedby. Say what is wrong and how to fix it.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Takes the slider out of interaction and out of the form payload, and dims it.' },
    { name: 'readOnly', type: 'boolean', default: false, required: false, description: 'The thumbs stay focusable and the value is still submitted, but it cannot change. Looks like rest.' },
    { name: 'name', type: 'string', required: false, description: 'The form field name. A range submits two values.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  variants: { type: ['single', 'range'] },
  axisKinds: { type: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    'gap': 'space.100',
    'inputs-gap': 'space.150',
    // The control row: the target height, `size.md.min-height` (44px at comfortable and spacious density).
    'control-height': 'size.md.min-height',
    // Call 5 A: a 2px rail and a 4px fill, both round-ended.
    'rail-height': 'border-width.thick',
    'bar-height': 'border-width.heavy',
    'radius': 'radius.round',
    'value-type': 'type.body.sm.default',
    'end-type': 'type.body.xs.default',

    // The rails (3:1 against the page) and the selected bar (3:1 against the page). Neither moves with state.
    'fill': 'color.field.border.rest',
    'indicator': 'color.interactive.primary.fill.rest',
    // The value readout and the end labels (4.5:1 against the page).
    'label': 'color.text.primary',
    'body': 'color.text.secondary',

    'disabled.fill': 'color.disabled.fill',
    'disabled.indicator': 'color.disabled.fill',
    'disabled.label': 'color.disabled.text',
    'disabled.body': 'color.disabled.text',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'presentation',
        children: ['header', 'control', 'ends', 'inputs', 'message'],
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'gap',
        // BUILT AT 320 (the fields' width) and fills its column; the control row stretches across it, so the growing
        // track segments have a bounded width to share.
        placementWidth: 320,
        note: 'The slider: a header with the label and the value, the track, and the optional end labels, inputs and message. It fills its column.',
      },
      header: {
        kind: 'box',
        role: 'presentation',
        children: ['label', 'valueSingle', 'valueRange'],
        layout: { direction: 'row', align: 'center', justify: 'space-between', sizing: { x: 'hug', y: 'hug' } },
        crossAxisFill: true,
        note: 'The label at the start and the value text at the end.',
      },
      label: {
        kind: 'nest',
        nests: 'field-label',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium', emphasis: 'secondary', weight: 'bold', state: 'rest' }, atState: { disabled: { state: 'disabled' } } },
        optional: true,
        note: 'The visible label, naming the dimension being set.',
      },
      valueSingle: {
        kind: 'text',
        type: 'value-type',
        optional: true,
        presentWhen: { type: ['single'] },
        note: 'The current value, formatted as the thumb announces it.',
      },
      valueRange: {
        kind: 'text',
        type: 'value-type',
        optional: true,
        presentWhen: { type: ['range'] },
        note: 'The current range, the minimum and the maximum, formatted as the thumbs announce them.',
      },
      control: {
        kind: 'box',
        role: 'target',
        children: ['track'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },
        height: 'control-height',
        crossAxisFill: true,
        note: 'The hit area around the track, as tall as the hit target. A click anywhere on it moves the nearer thumb there.',
      },
      track: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill'],
        children: ['spaceStart', 'thumbMin', 'bar', 'thumb', 'spaceEnd'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },
        height: 'rail-height',
        radius: 'radius',
        grow: true,
        note: 'The rail: 2px, the full range, across the control. The selected bar and the thumbs sit on it and stand out above and below it.',
      },
      spaceStart: {
        ...segment('rail-height'),
        presentWhen: { type: ['range'] },
        note: 'The rail before the minimum thumb of a range, outside the selected range. Paints nothing: the rail shows through.',
      },
      thumbMin: {
        ...thumbNest(['disabled']),
        presentWhen: { type: ['range'] },
        note: 'The minimum thumb of a range. It stays at rest while the maximum thumb shows the state.',
      },
      bar: {
        ...segment('bar-height'),
        paintSlots: ['indicator'],
        radius: 'radius',
        note: 'The selected part of the track: 4px, from the start to the thumb, or between the two thumbs of a range.',
      },
      thumb: {
        ...thumbNest(['hover', 'pressed', 'focus-visible', 'disabled']),
        note: 'The thumb of a single value, or the maximum thumb of a range. It shows the state.',
      },
      spaceEnd: {
        ...segment('rail-height'),
        note: 'The rail after the thumb, outside the selected value or range. Paints nothing: the rail shows through.',
      },
      ends: {
        kind: 'box',
        role: 'presentation',
        children: ['minLabel', 'maxLabel'],
        layout: { direction: 'row', align: 'center', justify: 'space-between', sizing: { x: 'hug', y: 'hug' } },
        crossAxisFill: true,
        optional: true,
        note: 'The minimum and maximum under the ends of the track. Off by default.',
      },
      minLabel: { kind: 'text', type: 'end-type', paintSlot: 'body', note: 'The minimum value.' },
      maxLabel: { kind: 'text', type: 'end-type', paintSlot: 'body', note: 'The maximum value.' },
      inputs: {
        kind: 'box',
        role: 'presentation',
        children: ['inputSingle', 'inputMin', 'inputMax'],
        layout: { direction: 'row', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'inputs-gap',
        crossAxisFill: true,
        optional: true,
        note: 'Paired number inputs for exact entry: one for a single value, two for a range. Off by default.',
      },
      inputSingle: { ...inputNest('50'), presentWhen: { type: ['single'] }, note: 'The number input of a single value.' },
      inputMin: { ...inputNest('30'), presentWhen: { type: ['range'] }, note: 'The minimum input of a range.' },
      inputMax: { ...inputNest('70'), presentWhen: { type: ['range'] }, note: 'The maximum input of a range.' },
      message: {
        kind: 'nest',
        nests: 'field-message',
        nesting: { kind: 'nest-fixed', variant: { status: 'default' } },
        crossAxisFill: true,
        optional: true,
        note: 'Help or error text under the slider. Off by default.',
      },
    },
    codeOnly: [
      'code delivery pending: behavior layer (#2454), as for Tabs. The entries below are a framework-neutral behavior contract.',
      'The track in code — one rail across the control, with the fill and the thumbs positioned by value over it. Figma draws the same picture as growing segments around the thumbs, because auto layout has no per-child offset.',
      'Each thumb is a visually hidden native <input type="range"> under the drawn disc: focus, the keyboard, form submission and role="slider" come from it. A range has two, each with its own name ("Minimum {label}", "Maximum {label}") and its own aria-valuemin and aria-valuemax: the other thumb\'s value, less minStepsBetweenThumbs.',
      'aria-valuetext — set whenever the value is not a bare number ("$40", "120%"), from the same Intl.NumberFormat formatter as the visible value text.',
      'Keyboard — Right and Up raise one step; Left and Down lower one step; Page Up and Page Down move one largeStep (ten steps by default); Home and End go to the ends of the thumb\'s own range; Tab moves from the minimum thumb to the maximum thumb.',
      'Thumb collision — a thumb stops at the other thumb (less minStepsBetweenThumbs), by pointer and by keyboard; it never pushes or crosses it.',
      'Click to jump — a pointerdown on the rail moves the nearer thumb there and starts a drag, so a user does not have to grab the thumb.',
      'Rounding — each value snaps to the nearest exact multiple of step before onChange (0.1 + 0.2 is not 0.3 in floating point).',
      'Edge alignment — at the minimum and maximum the thumb\'s outer edge stays inside the control: its translate runs from 0% to -100% of its own width across the range, so it never causes a horizontal scroll.',
      'Geometry — value to pixel from the control\'s measured getBoundingClientRect, recomputed on resize (ResizeObserver) and when the direction changes.',
      'Motion — while dragging, the thumb and the fill follow the pointer 1:1 with no transition. A rail click or a key step slides the thumb on motion.duration.fast with motion.easing-role.default. Under prefers-reduced-motion the slide is 0ms; motion.duration-reduced.fast keeps 100ms, so the slider sets 0 itself.',
      'Paired inputs — one shared value; typing in an input moves its thumb and dragging updates the input. An incoming value is applied only if it differs, which stops an update loop. With inputs on, the value text is off.',
      'disabled and readOnly — disabled drops the hidden inputs from the form payload; readOnly keeps them focusable and submitted, with the value unchangeable.',
      'The Figma value text and inputs are placeholders: "50" for a single value, "30 – 70" and 30 and 70 for a range, near where the growing segments put the thumbs.',
      'RTL — the minimum sits at the right and the fill grows leftward; Right Arrow lowers and Left Arrow raises, while Up and Down do not change. Logical properties and the measured dir handle it.',
      'text expansion — the label and the value text share the header row; a long translated label wraps above the value rather than truncating it.',
    ],
  },

  figmaProperties: {
    variantAxes: ['type'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    texts: {
      // Keyed by the code prop each text reads from (a texts key must be a declared prop): the readout of a single
      // value and of a range are two properties, because a set carries ONE default per text property and the two
      // members need different placeholders ("50", "30 – 70"). The end labels read `min` and `max`.
      value: { part: 'valueSingle', default: '50', figmaName: 'value text' },
      defaultValue: { part: 'valueRange', default: '30 – 70', figmaName: 'range text' },
      min: { part: 'minLabel', default: '0', figmaName: 'min label' },
      max: { part: 'maxLabel', default: '100', figmaName: 'max label' },
    },
    booleans: {
      showLabel: { part: 'label', default: true, figmaName: 'label', figmaOnly: true },
      showValue: { part: ['valueSingle', 'valueRange'], default: true, figmaName: 'value' },
      showEndLabels: { part: 'ends', default: false, figmaName: 'end labels' },
      showInputs: { part: 'inputs', default: false, figmaName: 'inputs' },
      showHelper: { part: 'message', default: false, figmaName: 'helper', figmaOnly: true },
    },
  },

  accessibility: {
    role: 'slider, once per thumb, from a visually hidden native <input type="range">; a range is two sliders in a group named by the label',
    wcag: [
      '4.1.2 Name, Role, Value (each thumb named, with aria-valuetext for a formatted value)',
      '2.1.1 Keyboard (arrow, Page and Home and End keys on every thumb)',
      '1.4.11 Non-text Contrast (the rail, the fill and the thumb target 3:1 against the page)',
      '1.4.1 Use of Color (the fill is thicker than the rail and bounded by the thumbs, not told apart by color alone)',
      '2.4.7 Focus Visible / 2.4.13 Focus Appearance (the focus ring on the thumb, as intent)',
      '2.5.7 Dragging Movements (a click on the rail, the keys or the paired inputs move a thumb without dragging)',
      '2.5.8 Target Size (targets a 44×44px hit area on each thumb in code)',
      '3.3.2 Labels or Instructions (a visible label names the dimension)',
    ],
    keyboard: 'Right and Up raise one step; Left and Down lower one step; Page Up and Page Down move ten steps; Home and End go to the minimum and maximum, or for a range thumb to the other thumb. Tab moves from the minimum thumb to the maximum thumb. In right-to-left text, Right lowers and Left raises.',
    focus: 'A focus ring around the focused thumb on :focus-visible, never around the track.',
    aria: 'Each thumb carries aria-valuenow, aria-valuemin, aria-valuemax and, for a formatted value, aria-valuetext from the same formatter as the visible text. A range names its thumbs "Minimum {label}" and "Maximum {label}", which are translatable. Help and error text join aria-describedby; an error sets aria-invalid on each thumb. The layout mirrors right to left.',
  },

  content: {
    labelPattern: 'Name the dimension, in sentence case: "Price", "Volume", "Text size". The value text carries the unit, currency or percent, formatted for the locale ("$40 – $120", "120%").',
    errorPattern: 'Say what is wrong and how to fix it, in the field message: "Enter a maximum of 200 or less."',
  },

  docs: {
    usage: 'Use a slider for an approximate value, or a range, where seeing the position within the bounds helps more than the exact number: a price filter, a text size, a volume. Use two thumbs for a minimum and a maximum. For an exact number the user already knows, use a text field, or turn on the paired inputs. Don\'t use a slider for a few named options (use a segmented control or a radio group) or for on and off (use a switch).',
    do: [
      'Name the dimension with a visible label',
      'Format the value with its unit or currency, and use the same text for aria-valuetext',
      'Turn on the paired inputs when an exact value matters',
      'Bind costly work, such as a network filter, to onChangeEnd',
    ],
    dont: [
      'Use a slider for a precise value over a wide range; a 300px track cannot reach every value',
      'Leave the thumbs of a range unnamed',
      'Show the value only in a bubble during a drag; it is gone when the drag ends',
      'Animate the thumb while it is dragged',
    ],
    contentGuidelines: 'The label names the dimension. The value text shows the value with its unit; a range shows both ends, "$40 – $120".',
  },

  ai: {
    primaryPurpose: 'Choose an approximate value, or a minimum and maximum, by moving a thumb along a track.',
    whenToUse: 'An approximate value where the position within the range matters more than the exact number, such as a volume, a text size or a price filter window.',
    avoidWhen: 'The user knows the exact number (use a text field, or turn on the paired inputs), there are a few named options (use a segmented control or a radio group), it is on or off (use a switch), or the range is too wide for the track to reach each value.',
    commonPartners: ['_slider-thumb', 'field-label', 'field-message', 'text-field'],
    triggerKeywords: ['slider', 'range slider', 'price filter', 'volume control', 'range input', 'min max slider'],
    generationPriority: 4,
  },

  composition: {
    composesWith: ['field-label', '_slider-thumb', 'text-field', 'field-message'],
    alternativeTo: ['text-field', 'segmented-control', 'radio-group', 'switch-row'],
    replacesPatterns: ['a native <input type="range"> styled per browser engine', 'a drag-only custom slider with no keyboard support', 'two separate sliders for a minimum and a maximum'],
    supersededBy: [],
  },

  motion: {
    enter: 'None.',
    exit: 'None.',
    reduceMotion: 'While dragging, the thumb and the fill follow the pointer with no transition. After a click on the rail or a key step the thumb slides on the fast duration with the default easing; under reduced motion it moves at once.',
  },

  notes: {
    contested: [
      'NO ERROR MEMBERS IN FIGMA. Q354 puts every control that can be invalid on the fields\' `status` axis. The approved proposal (call 2 A, 10 members) holds that a slider\'s own value is always in range, so an error comes from a paired input or outside validation, and the field message carries it; there is no error skin on the track. So the set has no `status` axis, and code carries `validation` (default, error) onto the nested message. Held for the owner: a `status` axis would make 20 members.',
    ],
    unverified: [
      'The fill against the rail measures under 3:1 in every committed brand and mode (call 5 A). The fill is told from the rail by its thickness (4px against 2px) and by the thumbs that bound it; the parts SC 1.4.11 needs (the thumb, which carries the value, and the rail, which carries the range) clear 3:1 against the page, held as literals in test.ts.',
      'The nested inputs in Figma show TextField\'s own label ("Label") and its message: a host can set a nested instance\'s text and swap properties, not a boolean or a property two levels down (#2781); in code the inputs are labeled "Minimum" and "Maximum" and carry no message.',
    ],
    evolution: [
      '2026-10-16 (#2669): owner decision, every call A on the proposal and wireframe. One Slider with a type axis (single, range) × five states = 10 members, one size, header value text, a 2px rail and 4px fill, a 24px ringed thumb nested as Slider.Thumb, optional end labels, inputs and message.',
    ],
  },
};
