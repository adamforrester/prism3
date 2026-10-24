/**
 * Slider and Slider.Thumb (#2669).
 *
 * KB brief: `components/slider.md`
 *
 * Owner decision (2026-10-16, on #2669): the proposal approved with every numbered call at its recommendation (A):
 *   1 A  One `Slider`; range comes from a two-value `value` (`[40, 120]`), the price-filter case. No RangeSlider.
 *   2 A  `type` [single, range] × five states. (Q550 e adds the size axis: 30 members.)
 *   3 A  One size. (Superseded by Q550 e.)
 *   4 A  The value readout is header text, always visible. No bubble (it would need a Tooltip).
 *   5 A  A 2px rail and a 4px primary fill. (Superseded by Q550 a.)
 *   6 A  A 24px filled disc with a 2px page-colored ring; 44×44 hit area in code. (Ring removed by Q550 b.)
 *   7 A  Paired inputs behind an `inputs` boolean, off by default, nesting TextField.
 *   8 A  Thumbs stop at each other, by pointer and keyboard.
 *   9 A  `Slider` / `slider`, category `form`, aliases `range-slider`, `range-input`, `range`; its own page.
 *  10 A  The wording as listed ("Label", "Minimum", "Maximum", "Minimum {label}", "Maximum {label}", the summary).
 *
 * Owner decision Q550 (2026-10-22, A on Q536 a–f, on the Q536 wireframe):
 *   a  One track thickness, in `color.field.border.rest`; the selected part and the thumb in neutral ink
 *      (`color.interactive.neutral.border.*`). With one thickness, color alone tells the selected part apart, and
 *      ink clears 3:1 against the track where the primary fill does not.
 *   b  No gap: the thumb sits on the track, with no page-colored ring.
 *   c  A 0px gap under the header; the 44px control row stays.
 *   d  Milestones off by default; one opt-in, labeled milestones, which replace the end labels. No tick marks.
 *   e  A `size` axis, small / medium / large: thumb 18 / 24 / 30px (`control.size.{sm,md,lg}.thumb`), track 2 / 4 /
 *      6px (`border-width.thick`, `heavy`, `x-heavy`, the last new for this). Medium first.
 *   f  A halo around the thumb in `color.border.primary`, 4px at hover and 8px pressed; focus-visible is the shared
 *      2px ring at a 2px offset; disabled dims the thumb and the selected part together.
 *
 * Owner rules this build follows (#2706, 2026-10-15/16): Rest carries While hovering and While pressing, Hover
 * carries While pressing (Q344, the plugin's reaction map, nothing to author here); a border never binds an icon or
 * text role, and a disabled border binds `color.disabled.border` (Q346); the Figma first member is the code default
 * (Q347: `type=single, size=medium, state=rest`); property names are lowercase (Q345); a part used only inside its
 * parent takes the `_` prefix (Q349), which is why the thumb is `_slider-thumb`.
 *
 * ── WHY THE THUMB IS ITS OWN COMPONENT ───────────────────────────────────────────────────────────────────
 * A range member shows its state on the maximum thumb while the minimum thumb stays at rest (call 2). `paintOf` is
 * part-blind, so two boxes in one def that take the same slot paint the same variable at a coordinate: the two thumbs
 * could not differ. Nesting one Thumb component twice, each `nest-fixed` at rest and moved by `variantWhen`, lets the
 * maximum thumb follow every host state and the minimum one follow only `disabled`. The focus ring and the halo sit
 * inside the Thumb, so they land on the thumb and never on the track. Both thumbs follow the Slider's size.
 *
 * ── THE TRACK IS FLOW, NOT OFFSETS ───────────────────────────────────────────────────────────────────────
 * Figma auto layout has no per-child main-axis offset, and `positionWhen` is three positions only. So the track is
 * a flow of growing segments around fixed thumbs: single is [bar, thumb, spaceEnd], range is [spaceStart, thumbMin,
 * bar, thumb, spaceEnd]. The growing segments share the track equally, so a single thumb sits at the middle and the
 * two range thumbs near a third and two thirds. The bar is square-ended, so it meets the ink disc with no visible
 * gap. Code draws one rail and positions the fill and thumbs by value; see `codeOnly`.
 *
 * ── THE HALO STAYS OUT OF THE FLOW ───────────────────────────────────────────────────────────────────────
 * The thumb's frame is exactly the disc's size, so the track segments never move with state. The halo boxes around
 * the disc are larger than the frame and overflow it on every side (centered, unclipped), as a box-shadow does.
 *
 * ── PAINT ────────────────────────────────────────────────────────────────────────────────────────────────
 * Slider: the track takes `fill` (`color.field.border.rest`), the selected bar takes `indicator`
 * (`color.interactive.neutral.border.rest`), the value readout takes `label` (`color.text.primary`) and the
 * milestones take `body` (`color.text.secondary`). None moves with hover or press: the state is on the thumb.
 * Thumb: the disc's `indicator` steps rest / hover / pressed on the same ink; the inner halo is a 4px `border`
 * stroke at hover and pressed, and the outer halo a `fill` at pressed only, both `color.border.primary`.
 * Disabled: the track `color.disabled.fill`; the bar and the disc together `color.disabled.icon`; text
 * `color.disabled.text`; no halo.
 */
import { ComponentDef } from '../component-schema';

export const sliderThumb: ComponentDef = {
  id: '_slider-thumb',
  name: 'Slider.Thumb',
  aliases: ['slider-handle', 'slider-knob'],
  category: 'form',
  status: 'draft',
  summary: 'The thumb a Slider moves: an ink disc that sits on the track. Used only inside a Slider.',
  description:
    'The handle a Slider moves along its track: a disc in neutral ink that sits on the track with no gap. A light halo grows around it at hover and wider while pressed, and it shows the focus ring while it has keyboard focus. It comes in the Slider\'s three sizes. It lives inside a Slider, which places one thumb for a single value and two for a range, and is never placed on its own.',

  props: [
    { name: 'aria-label', type: 'string', required: false, description: 'The thumb\'s accessible name. Set by the Slider: the label for a single value, "Minimum {label}" and "Maximum {label}" for a range.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The disc\'s diameter: 18, 24 or 30px at the default density, from control.size.*.thumb. Set by the Slider.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'The disabled look. Set by the Slider when the whole control is disabled.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  // Medium first (Q347): the code default is the first member.
  variants: { size: ['medium', 'small', 'large'] },
  axisKinds: { size: 'authoring' },

  paintKeys: ['{slot}.{state}', '{slot}'],

  tokens: {
    // The disc: `control.size.{sm,md,lg}.thumb` (18 / 24 / 30px at the default density), round.
    'size.small.thumb': 'control.size.sm.thumb',
    'size.medium.thumb': 'control.size.md.thumb',
    'size.large.thumb': 'control.size.lg.thumb',
    'radius': 'radius.round',
    // THE HALO (Q550 f): two 4px bands around the disc. The inner band is a 4px stroke, drawn at hover and pressed;
    // the outer band is a fill padded 4px around it, drawn only pressed, so the halo is 4px at hover and 8px pressed.
    'halo-step': 'space.050',
    'halo-width': 'border-width.heavy',
    'border.hover': 'color.border.primary',
    'border.pressed': 'color.border.primary',
    'fill.pressed': 'color.border.primary',
    // THE DISC (Q550 a): neutral ink, stepping at hover and press.
    'indicator': 'color.interactive.neutral.border.rest',
    'indicator.hover': 'color.interactive.neutral.border.hover',
    'indicator.pressed': 'color.interactive.neutral.border.pressed',
    // Disabled (contrast-exempt): the disc dims with the Slider's selected bar; no halo.
    'disabled.indicator': 'color.disabled.icon',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',
  },

  anatomy: {
    root: 'frame',
    parts: {
      frame: {
        kind: 'box',
        role: 'target',
        size: 'size.{size}.thumb',
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['pressHalo', 'focusRing'],
        note: 'The thumb, exactly the disc\'s size, so the track never moves with state. The halo overflows it.',
      },
      pressHalo: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill'],
        radius: 'radius',
        padding: { block: 'halo-step', inlineLabel: 'halo-step' },
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        children: ['hoverHalo'],
        note: 'The outer 4px of the halo, painted only while pressed. Centered on the frame and larger than it, so it overflows on every side.',
      },
      hoverHalo: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['border'],
        strokeWidth: 'halo-width',
        radius: 'radius',
        padding: { block: 'halo-step', inlineLabel: 'halo-step' },
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        children: ['disc'],
        note: 'The inner 4px of the halo: a stroke inside its own edge, at hover and pressed.',
      },
      disc: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['indicator'],
        size: 'size.{size}.thumb',
        radius: 'radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        note: 'The disc in neutral ink. It steps darker or lighter at hover and press.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, 2px at a 2px offset around the disc while it has keyboard focus. On the thumb, never the track.',
      },
    },
    codeOnly: [
      'The thumb in code — a visually hidden native <input type="range"> under the drawn disc supplies focus, the keyboard, form submission and role="slider". The disc is aria-hidden drawing.',
      'touch-target-expansion — the visible disc is 18, 24 or 30px; its hit area is at least 44×44px at every size and density in code, never under 24×24px: a transparent ::before inset outward and centered on the thumb. The small 18px disc relies on it most.',
      'The halo — a box-shadow on the disc, 0 0 0 4px at hover and 0 0 0 8px while pressed, in color.border.primary. It does not move the thumb or change its hit area. Under forced-colors the halo is dropped.',
      'Pointer capture — on pointerdown call setPointerCapture(pointerId) on the thumb so a drag survives the pointer leaving the track; release on pointerup and pointercancel.',
      'Motion — while dragging, the thumb follows the pointer 1:1 with transition: none (a data-dragging attribute), so it never lags the cursor. The halo grows on motion.duration.fast; under reduced motion it changes at once.',
      'forced-colors — the disc keeps a system-color fill or border, so the thumb still shows; the focus ring is an outline.',
    ],
  },

  figmaProperties: {
    variantAxes: ['size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    booleans: {},
  },

  accessibility: {
    role: 'slider, from a visually hidden native <input type="range">; the Slider wires its name, value and range',
    wcag: [
      '1.4.11 Non-text Contrast (the disc targets 3:1 against the page and against the track at rest, hover and press)',
      '2.4.7 Focus Visible / 2.4.13 Focus Appearance (the shared focus ring, as intent)',
      '2.5.8 Target Size (targets a 44×44px hit area in code at every size, beyond the visible disc)',
    ],
    keyboard: 'Set by the Slider: arrow keys move one step, Page Up and Page Down one large step, Home and End to the ends of the thumb\'s range.',
    focus: 'A focus ring around the thumb on :focus-visible, never around the track.',
    aria: 'aria-valuenow, aria-valuemin and aria-valuemax from the native input; aria-valuetext whenever the value is not a bare number. Set by the Slider.',
  },

  content: {
    labelPattern: 'None of its own. The Slider names each thumb: its label for a single value, "Minimum {label}" and "Maximum {label}" for a range.',
  },

  docs: {
    usage: 'Part of a Slider. The Slider places one thumb for a single value and two for a range, and sets each thumb\'s name, value, size and state.',
    do: [
      'Extend its hit area in code to at least 44×44px at every size, with a transparent ::before inset outward',
      'Let the Slider name each thumb, so a range announces "Minimum" and "Maximum", not "slider, slider"',
    ],
    dont: ['Place a thumb outside a Slider', 'Put the focus ring on the track instead of the thumb'],
    contentGuidelines: 'No copy of its own.',
  },

  ai: {
    primaryPurpose: 'The handle a Slider moves, inside a Slider only.',
    whenToUse: 'Only as a child of a Slider. Generate a Slider, which places one thumb for a single value and two for a range, and sets their size and state.',
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
    reduceMotion: 'While dragging the thumb follows the pointer with no transition. After a track click or a key step it slides on the fast duration, and the halo grows on the same duration; under reduced motion both change at once.',
  },

  notes: {
    contested: [],
    unverified: [
      'The halo overflows the thumb\'s frame in Figma: two boxes larger than the frame, centered on it and unclipped, so the track segments do not move with state. Code draws it as a box-shadow. The halo is pointer feedback and carries no contrast floor (1.4.11 asks it of the disc, not the halo).',
    ],
    evolution: [
      '2026-10-16 (#2669): built with the Slider to the approved proposal (all calls A). A nested component, not a part of the Slider, so the minimum thumb of a range can stay at rest while the maximum thumb shows the state (Q349 `_` prefix).',
      '2026-10-22 (#2669, owner Q550): an ink disc on the track with no ring, a size axis (18 / 24 / 30px), and a halo in color.border.primary, 4px at hover and 8px pressed. 15 members.',
    ],
  },
};

// Each thumb nests the Thumb at rest and follows the Slider's size; `variantWhen` moves it with the host. The maximum
// thumb follows every state; the minimum thumb of a range follows only `disabled`, so the state shows on one thumb
// (call 2 A).
const thumbNest = (states: readonly string[]) => ({
  kind: 'nest' as const,
  nests: '_slider-thumb',
  nesting: {
    kind: 'nest-fixed' as const,
    variant: { size: 'medium', state: 'rest' },
    follow: ['size'],
    variantWhen: { state: Object.fromEntries(states.map((s) => [s, { state: s }])) },
  },
});

// A segment of the track: it grows along the rail, so the segments share it equally. One thickness (Q550 a): every
// segment is the track's own height. Structure only, unless a part gives it a paint slot (the selected bar).
const segment = () => ({
  kind: 'box' as const,
  role: 'presentation' as const,
  height: 'size.{size}.thickness',
  layout: { direction: 'row' as const, align: 'center' as const, justify: 'start' as const, sizing: { x: 'hug' as const, y: 'fixed' as const } },
  grow: true,
});

// A nested TextField in the inputs row, filled with a value (call 7 A). It grows, so two share the row equally.
const inputNest = (value: string) => ({
  kind: 'nest' as const,
  nests: 'text-field',
  nesting: { kind: 'nest-fixed' as const, variant: { size: 'medium', status: 'default', state: 'filled' }, variantWhen: { state: { disabled: { state: 'disabled' } } } },
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
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The thumb and the track: an 18px thumb on a 2px track, 24 on 4, or 30 on 6. The label, the value text and the 44px hit area stay the same at every size.' },
    { name: 'showValue', type: 'boolean', default: true, required: false, description: 'Shows the value text above the track. Turn it off only when the paired inputs show the value instead.' },
    { name: 'showMilestones', type: 'boolean', default: false, required: false, description: 'Shows labeled milestones under the track: the minimum and the maximum at its ends, and any values in milestones between them, each under its own position.' },
    { name: 'milestones', type: 'Array<number | { value: number; label: string }>', required: false, description: 'The values labeled under the track when showMilestones is on, such as [500, 1000]. A plain number is formatted like the value text; an object gives its own label. The minimum and the maximum are always labeled.' },
    { name: 'showInputs', type: 'boolean', default: false, required: false, description: 'Shows paired number inputs under the track: one for a single value, "Minimum" and "Maximum" for a range. Typing moves the thumb; dragging updates the input. With inputs on, turn the value text off.' },
    { name: 'helpText', type: 'string', required: false, description: 'Guidance under the slider, in a field message.' },
    { name: 'validation', type: "enum: 'default' | 'error'", values: ['default', 'error'], default: 'default', required: false, description: 'error marks the slider invalid: the field message shows the error status and each thumb carries aria-invalid. A slider\'s own value is always in range, so an error comes from a paired input or from validation elsewhere in the form.' },
    { name: 'validationMessage', type: 'string', required: false, description: 'The error text, shown in the field message and added to aria-describedby. Say what is wrong and how to fix it.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Takes the slider out of interaction and out of the form payload, and dims it.' },
    { name: 'readOnly', type: 'boolean', default: false, required: false, description: 'The thumbs stay focusable and the value is still submitted, but it cannot change. Looks like rest.' },
    { name: 'name', type: 'string', required: false, description: 'The form field name. A range submits two values.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  // Medium first (Q347, Q550 e): the code default is the first member.
  variants: { size: ['medium', 'small', 'large'], type: ['single', 'range'] },
  axisKinds: { size: 'authoring', type: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    'gap': 'space.100',
    // Q550 c: no gap under the header. The 44px control row already sets the label 10px above a medium thumb.
    'header-gap': 'space.0',
    'inputs-gap': 'space.150',
    // The control row: the target height, `size.md.min-height` (44px at comfortable and spacious density), at every
    // size, so the hit area never shrinks with the thumb.
    'control-height': 'size.md.min-height',
    // Q550 a / e: one track thickness per size, round-ended.
    'size.small.thickness': 'border-width.thick',
    'size.medium.thickness': 'border-width.heavy',
    'size.large.thickness': 'border-width.x-heavy',
    'radius': 'radius.round',
    'value-type': 'type.body.sm.default',
    'milestone-type': 'type.body.xs.default',

    // The track (3:1 against the page) and the selected bar, in ink (3:1 against the page and against the track).
    // Neither moves with state: the state is on the thumb.
    'fill': 'color.field.border.rest',
    'indicator': 'color.interactive.neutral.border.rest',
    // The value readout and the milestones (4.5:1 against the page).
    'label': 'color.text.primary',
    'body': 'color.text.secondary',

    // Q550 f: disabled dims the selected bar with the thumb (`color.disabled.icon`, the disc's own disabled ink).
    'disabled.fill': 'color.disabled.fill',
    'disabled.indicator': 'color.disabled.icon',
    'disabled.label': 'color.disabled.text',
    'disabled.body': 'color.disabled.text',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'presentation',
        children: ['field', 'inputs', 'message'],
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'gap',
        // BUILT AT 320 (the fields' width) and fills its column; the control row stretches across it, so the growing
        // track segments have a bounded width to share.
        placementWidth: 320,
        note: 'The slider: the field (label, value, track and milestones), then the optional inputs and message. It fills its column.',
      },
      field: {
        kind: 'box',
        role: 'presentation',
        children: ['header', 'control', 'milestones'],
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'header-gap',
        crossAxisFill: true,
        note: 'The header, the track and the milestones, with no gap between them (Q550 c).',
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
        nesting: { kind: 'nest-fixed', variant: { size: 'medium', emphasis: 'secondary', weight: 'bold', state: 'rest' }, variantWhen: { state: { disabled: { state: 'disabled' } } } },
        optional: true,
        // The nested FieldLabel is built at its own 320, so left to hug it fills the header and pushes the value out of the
        // component to the right. It grows into what the value leaves instead, so the value sits at the header's end.
        grow: true,
        note: 'The visible label, naming the dimension being set; it fills the room the value leaves.',
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
        height: 'size.{size}.thickness',
        radius: 'radius',
        grow: true,
        note: 'The track: one thickness (2, 4 or 6px by size), the full range, across the control. The selected bar runs along it and the thumbs sit on it.',
      },
      spaceStart: {
        ...segment(),
        presentWhen: { type: ['range'] },
        note: 'The track before the minimum thumb of a range, outside the selected range. Paints nothing: the track shows through.',
      },
      thumbMin: {
        ...thumbNest(['disabled']),
        presentWhen: { type: ['range'] },
        note: 'The minimum thumb of a range. It stays at rest while the maximum thumb shows the state.',
      },
      bar: {
        ...segment(),
        paintSlots: ['indicator'],
        note: 'The selected part of the track, in ink at the track\'s own thickness: from the start to the thumb, or between the two thumbs of a range. Square-ended, so it meets the disc with no gap.',
      },
      thumb: {
        ...thumbNest(['hover', 'pressed', 'focus-visible', 'disabled']),
        note: 'The thumb of a single value, or the maximum thumb of a range. It shows the state.',
      },
      spaceEnd: {
        ...segment(),
        note: 'The track after the thumb, outside the selected value or range. Paints nothing: the track shows through.',
      },
      milestones: {
        kind: 'box',
        role: 'presentation',
        children: ['minLabel', 'milestone', 'maxLabel'],
        layout: { direction: 'row', align: 'center', justify: 'space-between', sizing: { x: 'hug', y: 'hug' } },
        crossAxisFill: true,
        optional: true,
        note: 'Labeled milestones under the track (Q550 d): the minimum, a value between, and the maximum, spaced evenly. Off by default. No tick marks.',
      },
      minLabel: { kind: 'text', type: 'milestone-type', paintSlot: 'body', note: 'The minimum value, under the start of the track.' },
      milestone: { kind: 'text', type: 'milestone-type', paintSlot: 'body', note: 'A milestone between the ends, halfway along in Figma.' },
      maxLabel: { kind: 'text', type: 'milestone-type', paintSlot: 'body', note: 'The maximum value, under the end of the track.' },
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
      'The track in code — one rail across the control, with the fill and the thumbs positioned by value over it; the fill runs under the thumb to its center, so the two meet with no gap. Figma draws the same picture as growing segments around the thumbs, because auto layout has no per-child offset.',
      'Size — small, medium and large set the thumb (control.size.sm/md/lg.thumb: 18, 24, 30px) and the track (border-width.thick, heavy, x-heavy: 2, 4, 6px). The control row stays size.md.min-height and each thumb\'s hit area stays at least 44×44px at every size, so the small 18px thumb keeps a target well over 24×24px.',
      'Milestones — with showMilestones on, the minimum and the maximum are labeled under the ends of the track and each value in milestones under its own position (left: the value\'s fraction of the range, centered on it; the end labels align to the track\'s edges). Figma draws three labels, the ends and one between, spaced evenly; code draws one label per value in milestones. The labels are text, not ticks, and are aria-hidden: each thumb\'s aria-valuetext already carries the value.',
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
      'readOnly and disabled — readOnly keeps the hidden inputs focusable and submitted, with the value unchangeable; disabled drops them from the form payload.',
      'The Figma value text, inputs and milestones are placeholders: "50" for a single value, "30 – 70" and 30 and 70 for a range, near where the growing segments put the thumbs, and 0, 50 and 100 under the track.',
      'RTL — the minimum sits at the right and the fill grows leftward; Right Arrow lowers and Left Arrow raises, while Up and Down do not change. Logical properties and the measured dir handle it.',
      'text expansion — the label and the value text share the header row; a long translated label wraps above the value rather than truncating it.',
    ],
  },

  figmaProperties: {
    variantAxes: ['size', 'type'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    texts: {
      // Keyed by the code prop each text reads from (a texts key must be a declared prop): the readout of a single
      // value and of a range are two properties, because a set carries ONE default per text property and the two
      // members need different placeholders ("50", "30 – 70"). The first and last milestones read `min` and `max`.
      value: { part: 'valueSingle', default: '50', figmaName: 'value text' },
      defaultValue: { part: 'valueRange', default: '30 – 70', figmaName: 'range text' },
      min: { part: 'minLabel', default: '0', figmaName: 'min label' },
      // The milestone between the ends: one Figma placeholder for the `milestones` list, which code draws one label
      // per value.
      milestones: { part: 'milestone', default: '50', figmaName: 'milestone' },
      max: { part: 'maxLabel', default: '100', figmaName: 'max label' },
    },
    booleans: {
      showLabel: { part: 'label', default: true, figmaName: 'label', figmaOnly: true },
      showValue: { part: ['valueSingle', 'valueRange'], default: true, figmaName: 'value' },
      showMilestones: { part: 'milestones', default: false, figmaName: 'milestones' },
      showInputs: { part: 'inputs', default: false, figmaName: 'inputs' },
      showHelper: { part: 'message', default: false, figmaName: 'helper', figmaOnly: true },
    },
  },

  accessibility: {
    role: 'slider, once per thumb, from a visually hidden native <input type="range">; a range is two sliders in a group named by the label',
    wcag: [
      '4.1.2 Name, Role, Value (each thumb named, with aria-valuetext for a formatted value)',
      '2.1.1 Keyboard (arrow, Page and Home and End keys on every thumb)',
      '1.4.11 Non-text Contrast (the track, the selected part and the thumb target 3:1 against the page, and the selected part 3:1 against the track)',
      '1.4.1 Use of Color (the selected part is bounded by the thumbs, and the value text states it, so it is not told apart by color alone)',
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
    generationPriority: 2,
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
      'Figma draws three milestone labels (the ends and one between) spaced evenly, so a middle value sits exactly only at the halfway point; code places one label under each value in milestones (Q550 d). A file that needs more labels between the ends has none to turn on.',
      'The nested inputs in Figma show TextField\'s own label ("Label") and its message: a host can set a nested instance\'s text and swap properties, not a boolean or a property two levels down (#2781); in code the inputs are labeled "Minimum" and "Maximum" and carry no message.',
    ],
    evolution: [
      '2026-10-16 (#2669): owner decision, every call A on the proposal and wireframe. One Slider with a type axis (single, range) × five states = 10 members, one size, header value text, a 2px rail and 4px fill, a 24px ringed thumb nested as Slider.Thumb, optional end labels, inputs and message.',
      '2026-10-22 (#2669): owner decision Q550, A on Q536 a–f. One track thickness in field.border.rest with the selected part and the thumb in neutral ink; the thumb on the track with no ring; a 0px header gap; labeled milestones in place of the end labels, off by default; a size axis (small, medium, large) for 30 members; a halo at hover and press.',
    ],
  },
};
