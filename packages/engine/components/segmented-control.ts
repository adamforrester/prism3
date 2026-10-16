/**
 * SegmentedControl and SegmentedControl.Segment (#2418).
 *
 * KB brief: `components/segmented-control.md`
 *
 * Owner decisions Q269 (2026-10-13), on the refreshed proposal:
 *   1 A  `behavior`: `view` by default (a group of buttons, the current one marked); `form` (a radio group) for a
 *        submitted value. A code prop only: one Figma component serves both.
 *   2 A  A value control, never contained tabs.
 *   3 A  Bold when selected with the width held (Tab's bold reserve, #2528), plus the tint and the 2px outline.
 *        The tint and the outline are superseded by Q336 A and Q342 A (below); the bold and the reserve stand.
 *   4 A  The hover is the neutral overlay wash (confirmed built, Q278.1 A).
 *   5 A  Track `radius.md`, indicator `radius.sm`, 4px inside. No style axis (confirmed built, Q278.2 A: the corners
 *        stay non-concentric, no derived radius token).
 *   6 A  `grow` on a nested instance, so the segments are equal width in Figma as in code.
 *   7 A  `SegmentedControl` / `SegmentedControl.Segment`, category `form`, toggles `Segment 3`–`Segment 5` (replaced by
 *        the `items` slot, #2649), its own page after Tabs.
 *   8 A  2–5 segments, 3 shown.
 *
 * Owner decisions Q278 (2026-10-13), on the built PR, all A: 1 the hover wash kept; 2 the shape kept as built;
 * 3 the default label "Option"; 4 the control built at 320 and a standalone option at 120; 5 no track padding or
 * gap, each option carrying its own 4px inset; 6 the page sorts alphabetically (Q260 A, between Radio and Select),
 * no exception.
 *
 * Owner decisions Q336 A and Q342 A (2026-10-15, #2724), on owner QA of the built control, with the wireframe
 * approved: the studio's own selected look. A neutral track with no outline, a flat surface pill with no border and
 * no shadow, the emphasis weight as the state cue, no brand color. They supersede Q269.3's tint and 2px outline and
 * the 1px track outline Q278.2 kept; the shape, the inset, the hover wash and the bold reserve stand.
 *
 * ── THE SEGMENT ────────────────────────────────────────────────────────────────────────────────────────
 * `selection` [unselected, selected] × `size` [small, medium, large] × five states = 30 members. The cell is the
 * hit target (Button's height rung); an INDICATOR inset 4px inside it carries the paint. The cell is BUILT at a
 * placement width (120, Q278.4 A) and fills: the indicator grows across it, so when the control grows a segment the
 * selected pill spans the whole share, not just the label.
 *
 * THE SELECTED LOOK (owner decisions Q336 A and Q342 A, 2026-10-15, #2724; they supersede Q269.3's tint and 2px
 * outline and the track outline Q278 kept): a flat PILL on a neutral track. The selected indicator fills with the
 * page surface, `color.background.primary`, with no border and no shadow; the track under it (the control's) fills
 * with `color.background.secondary`, the quiet surface step, with no outline. The label in the EMPHASIS weight is
 * the state cue, with a clipped bold reserve so the label box is as wide in both states; the pill against the track
 * has no contrast floor, because it is not the only cue. No brand color anywhere in the control. The label and
 * icon take the NEUTRAL ink in both selections, and the selected pill does not change at hover or press (selecting
 * the selected option does nothing). Those two roles were picked because they already exist and clear every floor
 * in every committed brand × mode cell: the label 4.5:1 and the icon 3:1 on the pill and on the track at every
 * wash, the focus ring 3:1 against the track and the page (`test.ts`, #2724).
 *
 * ── THE CONTROL ────────────────────────────────────────────────────────────────────────────────────────
 * `size` only = 3 members. An optional nested FieldLabel above a filled TRACK with no outline, holding a native `items`
 * slot (#2649, owner decision Q307 A) of nested segments following `size`: three by default, five at most, segment 1
 * selected. Until #2649 the track held five segments, `nest-exposed` (`selection`, `state`), 3 to 5 behind Figma-only
 * booleans (#2344); in the slot they are `nest-fixed`, and a designer sets each one's selection on the segment itself.
 * The slot GROWS along the track and each segment along the slot (Q269.6), and the track stretches across the
 * control, so the segments share its width equally.
 */
import { ComponentDef } from '../component-schema';

export const segmentedControlSegment: ComponentDef = {
  id: 'segmented-control-segment',
  name: 'SegmentedControl.Segment',
  aliases: ['segment', 'segmented-control-option'],
  category: 'form',
  status: 'draft',
  summary: 'One option of a segmented control. Selected, it shows a flat pill and a bold label.',
  description:
    'One option in a segmented control: a cell as tall as a button, holding the option label and an optional leading icon. A selected option shows a flat pill in the page surface color inside the cell, and its label is set in the emphasis weight. Every option keeps the width of its bold label, so selecting one never moves the others. At hover, an unselected option shows a light neutral wash on the track. SegmentedControl places the options and owns the selection.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The option name: a short noun or noun phrase, one line.' },
    { name: 'value', type: 'string', required: true, description: 'The value the control reports when this option is selected.' },
    { name: 'selected', type: 'boolean', default: false, required: false, description: 'Whether this option is the selected one. Set by the control from its value; do not set it on an option inside a control.' },
    { name: 'leadingIcon', type: 'slot', required: false, description: 'An icon before the label. Decorative when a label is shown.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Option height, padding and label type. Passed down by the control.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Dims this one option and takes it out of interaction, while the rest of the control stays usable.' },
  ],

  states: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'],
  variants: {
    selection: ['unselected', 'selected'],
    size: ['small', 'medium', 'large'],
  },
  axisKinds: { selection: 'runtime', size: 'authoring' },

  paintKeys: ['{selection}.{slot}.{state}', '{selection}.{slot}'],
  densitySpacing: ['size.{size}.padding-x', 'size.{size}.gap'],

  tokens: {
    // The indicator's inset inside the cell: the visible pill sits 4px inside the hit target at every size.
    'inset': 'space.050',
    'pad-y': 'space.0',
    'indicator-radius': 'radius.sm',
    // THE BOLD RESERVE (Q269.3, Tab's Q226 A construction): a zero-height, clipping frame holding the label in the
    // selected weight, so the label box is always as wide as the bold label.
    'reserve-height': 'space.0',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    // The leading icon sits ONE RUNG BELOW the control rung, as Button's does (#1350): small → icon.size.xs (16),
    // medium → sm (20), large → md (24). A label already carries the control, so the glyph beside it reads better
    // smaller (owner Q337 A, #2725). `lint-rung-names.ts` records it in `ICON_OFFSET_DEFS`.
    'size.small.height': 'size.sm.height',
    'size.small.padding-x': 'space.150',
    'size.small.gap': 'space.075',
    'size.small.icon': 'icon.size.xs',
    'size.small.type.selected': 'type.label.sm.emphasis',
    'size.small.type.unselected': 'type.label.sm.default',
    'size.medium.height': 'size.md.height',
    'size.medium.padding-x': 'space.200',
    'size.medium.gap': 'space.100',
    'size.medium.icon': 'icon.size.sm',
    'size.medium.type.selected': 'type.label.md.emphasis',
    'size.medium.type.unselected': 'type.label.md.default',
    'size.large.height': 'size.lg.height',
    'size.large.padding-x': 'space.250',
    'size.large.gap': 'space.100',
    'size.large.icon': 'icon.size.md',
    'size.large.type.selected': 'type.label.lg.emphasis',
    'size.large.type.unselected': 'type.label.lg.default',

    // UNSELECTED — no edge and no fill at rest; the neutral wash at hover and pressed (Q269.4 A, Q278.1 A).
    'unselected.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'unselected.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'unselected.label': 'color.interactive.neutral.text.rest',
    'unselected.label.hover': 'color.interactive.neutral.text.hover',
    'unselected.label.pressed': 'color.interactive.neutral.text.pressed',
    'unselected.icon': 'color.interactive.neutral.icon.rest',
    'unselected.icon.hover': 'color.interactive.neutral.icon.hover',
    'unselected.icon.pressed': 'color.interactive.neutral.icon.pressed',

    // SELECTED — the flat pill (Q336 A, Q342 A): the page surface, no border, no shadow, unchanged at hover and
    // pressed, so the state-qualified keys fall through to these. The ink is the neutral rest ink.
    'selected.fill': 'color.background.primary',
    'selected.label': 'color.interactive.neutral.text.rest',
    'selected.icon': 'color.interactive.neutral.icon.rest',

    // DISABLED — a disabled selected option keeps its pill, so a disabled control still shows its value; the
    // disabled branch applies `disabled.fill` only where the selection has a fill at rest, so an unselected option
    // stays clear. The ink is the disabled ink, whose own contract is set on the page surface the pill shares.
    'disabled.fill': 'color.background.primary',
    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        children: ['indicator'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fill', y: 'fixed' } },
        height: 'size.{size}.height',
        padding: { block: 'inset', inlineLabel: 'inset' },
        // BUILT AT A PLACEMENT WIDTH (#1757) so the indicator has a width to grow across; inside the control each
        // segment grows along the track and takes its equal share instead (Q278.4 A).
        placementWidth: 120,
        note: 'The option cell, as tall as a button and the whole of the pointer target. It paints nothing: the indicator inside it carries the selection. Inside a segmented control it takes an equal share of the track.',
      },
      indicator: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill', 'overlay'],
        children: ['content', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        grow: true,
        crossAxisFill: true,
        radius: 'indicator-radius',
        note: 'The indicator, inset 4px inside the cell and as wide as the cell allows. Selected, it is a flat pill in the page surface color, with no border or shadow, and it does not change at hover or press; unselected, it is clear at rest and takes a light neutral wash over the track at hover and press.',
      },
      content: {
        kind: 'box',
        role: 'presentation',
        children: ['leadingVisual', 'labelBox'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        padding: { block: 'pad-y', inlineLabel: 'size.{size}.padding-x' },
        gap: 'size.{size}.gap',
        note: 'The optional leading icon and the label, centered in the indicator.',
      },
      leadingVisual: {
        kind: 'slot',
        optional: true,
        size: 'size.{size}.icon',
        nesting: { kind: 'swap' },
        note: 'An optional icon before the label. Every option in one control shows an icon, or none does.',
      },
      labelBox: {
        kind: 'box',
        role: 'presentation',
        children: ['reserve', 'label'],
        layout: { direction: 'column', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        note: 'Holds the label at the width of its selected weight: as wide as the wider of the bold reserve and the label, with the label centered.',
      },
      reserve: {
        kind: 'box',
        role: 'presentation',
        children: ['labelReserve'],
        height: 'reserve-height',
        clipsContent: true,
        layout: { direction: 'column', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'fixed' } },
        note: 'A zero-height frame that clips the bold copy of the label: it takes the bold width and shows nothing.',
      },
      labelReserve: {
        kind: 'text',
        type: 'size.{size}.type.selected',
        note: 'The label again, in the selected weight, never seen: it holds every option at its bold width.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.type.{selection}',
        note: 'The option name, one line: regular when unselected, in the emphasis weight when selected.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the indicator while the option has keyboard focus.',
      },
    },
    codeOnly: [
      'code delivery pending: behavior layer (#2454), as for Tabs. The entries below are a framework-neutral behavior contract.',
      'The option in code — a <button> with aria-current in the view behavior, or a native <input type="radio"> with its <label> in the form behavior. The control decides which, never the option.',
      'The label weight in code — the selected option sets its label in the emphasis weight and the others in the default weight, and every option reserves its bold width so selecting never shifts the row: a hidden bold copy of the label (for example ::after { content: attr(data-label); font-weight: <emphasis>; height: 0; visibility: hidden; overflow: hidden }) in a column with the label.',
      'The indicator in code — it may be one sliding node shared by the options (aria-hidden) rather than a box per option; the 4px inset and the paint are the same either way.',
      'forced-colors — the pill fill drops out, so give the selected option a system-color border or outline (for example 1px solid Highlight) and keep the bold label; the selection still shows.',
      'The hit-target expansion — a small option is 36px tall on comfortable density; reaching 44px there is a code-side hit area larger than the visible box.',
      'RTL — logical properties mirror the row: the leading icon moves to the right of the label.',
      'text expansion — a label never wraps or truncates; the control renders a select instead when the longest translated label no longer fits.',
    ],
  },

  figmaProperties: {
    variantAxes: ['selection', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    // "Option" (Q278.3 A).
    texts: { label: { part: 'label', default: 'Option', also: ['labelReserve'] } },
    booleans: { leadingIcon: { part: 'leadingVisual', figmaName: 'leading icon', default: false } },
    swaps: { leadingIcon: { part: 'leadingVisual', figmaName: '↳ swap leading icon' } },
  },

  accessibility: {
    role: 'a <button> with aria-current in the view behavior, or a native radio with its label in the form behavior; the control sets which',
    wcag: [
      '1.4.1 Use of Color (the bold label marks the selected option, never the pill alone)',
      '1.4.3 Contrast (the label clears 4.5:1 on the pill and on the track at rest, hover and press)',
      '1.4.11 Non-text Contrast (the icon clears 3:1 on the pill and the track; the pill against the track has no floor, because it is not the only cue)',
      '2.4.13 Focus Appearance (the shared focus ring)',
      '2.5.8 Target Size (targets 44px at medium on comfortable and spacious density)',
    ],
    keyboard: 'Set by the control: in the view behavior each option is a Tab stop and Enter or Space selects it; in the form behavior arrow keys move between options and select.',
    focus: 'A focus ring around the indicator on :focus-visible. It can sit on a different option from the selected one.',
    aria: 'A leading icon is aria-hidden when a label is shown. An icon-only option needs an aria-label and a tooltip.',
  },

  content: {
    labelPattern: 'A short noun or noun phrase, one line, parallel with the other options ("List", "Grid"). Not a verb phrase.',
  },

  docs: {
    usage: 'Use inside SegmentedControl only. An option names one value; selecting it changes the current view or the form value in place.',
    do: ['Give every option in a control the same kind of content: all labels, or all labels with icons', 'Let the control set selected from its value'],
    dont: ['Place an option outside a segmented control', 'Set selected on an option inside a control by hand'],
    contentGuidelines: 'One or two words, a noun, sentence case.',
  },

  ai: {
    primaryPurpose: 'One option inside a segmented control.',
    whenToUse: 'Only as a child of SegmentedControl.',
    avoidWhen: 'Anywhere outside a segmented control: a single toggle is a switch or a select tag, and a lone action is a button.',
    commonPartners: ['segmented-control', 'icon'],
    triggerKeywords: ['segment', 'segmented option', 'segmented control option'],
    generationPriority: 9,
  },

  composition: {
    composesWith: ['focus-ring'],
    alternativeTo: [],
    replacesPatterns: ['a styled button with a hand-rolled active state'],
    supersededBy: [],
  },

  motion: {
    enter: 'None. On selection the pill moves to this option, or cross-fades, over a short duration.',
    exit: 'None.',
    reduceMotion: 'The indicator moves at once; only the color change remains.',
  },

  notes: {
    contested: [],
    unverified: [
      'In the high-contrast modes the surface steps are one color, so the track and the pill both read as the page and the bold label is the only selection cue there. Allowed by Q336 (the pill has no floor); not yet seen by the owner on a rendered high-contrast file.',
      'In the dark modes the page surface is darker than the track, so the pill reads as set into the track rather than raised from it. The same roles in every mode, by design; not yet seen by the owner on a rendered dark file.',
    ],
    evolution: [
      '2026-10-13 (#2418): owner decisions Q269 1–8 A: view behavior by default, a value control not contained tabs, bold when selected with the width held plus tint and 2px outline, the neutral hover wash (provisional), track radius.md and indicator radius.sm (provisional), grow on a nested instance for equal widths, the names and its own page after Tabs, 2–5 segments with 3 shown.',
      '2026-10-13 (#2418): owner decisions Q278 1–6 A, on the built option: the hover wash kept (Q269.4 no longer provisional); the shape kept as built, track radius.md and indicator radius.sm 4px inside, corners non-concentric with no derived radius token; the default label "Option"; a standalone option built at 120 so the indicator has a width to fill, while inside the control it takes its equal share.',
      '2026-10-15 (#2724): owner decisions Q336 A and Q342 A supersede Q269.3\'s tint and 2px outline: the selected option is a flat pill in color.background.primary with no border and no shadow, the emphasis-weight label is the state cue, and the pill holds at hover and press. The hover wash, the shape and the bold reserve are unchanged.',
    ],
  },
};

const segmentNest = (selection: 'selected' | 'unselected') => ({
  kind: 'nest' as const,
  nests: 'segmented-control-segment',
  // `nest-fixed` inside the `items` slot (#2649): a designer selects an option in the slot and sets its own `selection`
  // and `state` there, so the control exposes no nested properties of its own (Figma refuses a property reference on a
  // slot sublayer, measured for text in #2417).
  nesting: { kind: 'nest-fixed' as const, variant: { selection, size: 'medium', state: 'rest' }, follow: ['size'] },
  // Q269.6 A: every segment grows along the track, so the segments share its width equally.
  grow: true,
});

export const segmentedControl: ComponentDef = {
  id: 'segmented-control',
  name: 'SegmentedControl',
  aliases: ['segmented-button', 'segmented-buttons', 'toggle-button-group', 'content-switcher', 'connected-button-group'],
  category: 'form',
  status: 'draft',
  summary: 'A row of two to five options in one track, where exactly one is selected and all stay visible.',
  description:
    'A compact row of two to five short options in one neutral track, where exactly one is always selected and every option stays visible. Selecting an option changes a value in place: a parameter of the current view, such as list or grid, or a form value. The options share the track equally. A visible label, or an accessible name, says what is being chosen.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'What is being chosen, such as "View". Shown above the track, or given as an accessible name only when the page already shows it.' },
    { name: 'items', type: 'slot', anyOf: ['segmented-control-segment'], minItems: 1, maxItems: 5, required: true, description: 'The options, each a SegmentedControl.Segment, in order. Three by default with the first selected, five at most.' },
    { name: 'value', type: 'string', required: false, description: 'The selected option\'s value. Controlled; pair it with onChange.' },
    { name: 'defaultValue', type: 'string', required: false, description: 'The option selected first, when the control manages its own state. A segmented control always has one option selected.' },
    { name: 'onChange', type: 'function', required: false, description: 'Called with the new value when the selection changes. Never called with an empty value.' },
    { name: 'behavior', type: "enum: 'view' | 'form'", values: ['view', 'form'], default: 'view', required: false, description: 'view: a group of buttons that changes the current view at once, the selected one marked as current. form: a radio group whose value is submitted with a form. One look, two behaviors; never wire one as the other.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Passed to every option. Medium is a button\'s height, 44px on comfortable and spacious density.' },
    { name: 'width', type: "enum: 'auto' | 'full'", values: ['auto', 'full'], default: 'auto', required: false, description: 'auto: every option as wide as the widest. full: the control fills its column and the options share it equally.' },
    { name: 'name', type: 'string', required: false, description: 'The form field name, in the form behavior.' },
    { name: 'disabled', type: 'boolean', default: false, required: false, description: 'Disables every option and takes the control out of the Tab order.' },
  ],

  states: ['rest'],
  variants: { size: ['small', 'medium', 'large'] },
  axisKinds: { size: 'authoring' },

  paintKeys: ['{slot}'],

  tokens: {
    'gap': 'space.100',
    'track-pad': 'space.0',
    'track-gap': 'space.0',
    'radius': 'radius.md',
    // THE TRACK (Q336 A): the quiet surface step, with no outline. Every option's 4px inset is its padding.
    'fill': 'color.background.secondary',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        children: ['label', 'track'],
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'gap',
        // BUILT AT 320 (#1757, the fields' width) and fills its column; the track stretches across it, so the
        // growing segments have a bounded width to share (Q278.4 A).
        placementWidth: 320,
        note: 'The control: a label above the track. It fills its column.',
      },
      label: {
        kind: 'nest',
        nests: 'field-label',
        nesting: { kind: 'nest-fixed', variant: { size: 'medium', emphasis: 'secondary', weight: 'bold', state: 'rest' }, follow: ['size'] },
        crossAxisFill: true,
        optional: true,
        note: 'The visible label, naming what is being chosen. Shown by default.',
      },
      track: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['fill'],
        children: ['items'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        padding: { block: 'track-pad', inlineLabel: 'track-pad' },
        gap: 'track-gap',
        radius: 'radius',
        crossAxisFill: true,
        note: 'The track: a neutral fill behind every option, with no outline. Each option fills an equal share of it, and the selected one shows a pill on it.',
      },
      // THE ITEMS SLOT (#2649, owner decision Q307 A): a native Figma slot (#2417) inside the track, holding the
      // options, three by default with the first selected. It grows across the track, so the options inside it
      // still share the track's width equally (Q269.6). A designer adds, removes and reorders options in place.
      items: {
        kind: 'box',
        role: 'presentation',
        contentSlot: true,
        // Owner decision Q307 A: at least one item, at most 5, and only a segmented-control-segment (#2646's slot constraints).
        slotSettings: { minChildren: 1, maxChildren: 5, allowPreferredValuesOnly: true },
        preferred: ['segmented-control-segment'],
        children: ['segment1', 'segment2', 'segment3'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'track-gap',
        grow: true,
        note: 'The options: a native slot holding Segment instances, three by default, the first selected. Each option fills an equal share of the track.',
      },
      segment1: { ...segmentNest('selected'), note: 'The first option, selected.' },
      segment2: { ...segmentNest('unselected'), note: 'The second option.' },
      segment3: { ...segmentNest('unselected'), note: 'The third option.' },
    },
    codeOnly: [
      'code delivery pending: behavior layer (#2454), as for Tabs. The entries below are a framework-neutral behavior contract for whichever layer the project\'s developers choose.',
      'The view behavior (the default) — role="group" named by the label, holding <button> elements; the selected one carries aria-current="true". Each button is its own Tab stop and Enter or Space selects it, so arrowing never changes the view by accident.',
      'The form behavior — a <fieldset> with a <legend> (or role="radiogroup" with aria-labelledby) holding native <input type="radio"> elements that share one name. One Tab stop; arrow keys move and select, wrapping at the ends.',
      'Never empty — a click on the selected option does nothing, so onChange never reports an empty value. In the form behavior a radio cannot be cleared, so this holds by default.',
      'Equal widths — display: inline-grid with grid-auto-flow: column and grid-auto-columns: 1fr makes every option as wide as the widest (width auto); width full sets inline-size: 100%, capped by the parent with a max-width.',
      'The sliding indicator (optional) — one aria-hidden node behind the options, moved with transform from the selected option\'s measured box (a ResizeObserver, re-measured when fonts load or the direction changes), about 150–200ms. Under prefers-reduced-motion it moves without animation.',
      'Overflow — the control never wraps or scrolls; when the options do not fit, render a select instead.',
      'RTL — logical properties mirror the row, so the first option sits at the right edge; a sliding indicator measures from the inline start edge.',
      'text expansion — translations run 30 to 50 percent longer; measure the longest translated label and fall back to a select when the control would overflow its column.',
    ],
  },

  figmaProperties: {
    variantAxes: ['size'],
    // The options are the `items` slot (#2649); the label stays outside it, behind its own Figma-only toggle, on.
    booleans: {
      showLabel: { part: 'label', default: true, figmaName: 'Label', figmaOnly: true },
    },
  },

  accessibility: {
    role: 'view behavior: role="group" of buttons, the selected one with aria-current="true". form behavior: a radio group (a fieldset with a legend, or role="radiogroup"), native radios inside. Never role="tablist".',
    wcag: [
      '1.3.1 Info and Relationships (the group and its label are exposed together)',
      '4.1.2 Name, Role, Value',
      '1.4.1 Use of Color (the selected option has a bold label as well as a pill)',
      '1.4.3 Contrast (every label clears 4.5:1 on the pill and on the track at rest, hover and press)',
      '1.4.11 Non-text Contrast (icons clear 3:1 on the pill and the track, and the focus ring 3:1 against the track; the pill and the track against the page have no floor, because the labels identify the options)',
      '2.4.7 Focus Visible',
      '2.4.13 Focus Appearance (the shared focus ring, as intent)',
      '2.5.8 Target Size (every option is a full-height cell)',
      '2.5.5 Target Size (targets 44 by 44 at medium on comfortable and spacious density)',
    ],
    keyboard: 'view behavior: Tab moves to each option and Enter or Space selects it. form behavior: Tab enters at the selected option, arrow keys move to the next or previous option and select it, wrapping at the ends, and Tab leaves.',
    focus: 'A focus ring around the focused option\'s indicator on :focus-visible.',
    aria: 'The label names the group (aria-labelledby, or a legend in the form behavior); without it a screen reader announces options with no subject. Some screen readers do not announce aria-current on a button, so test the view behavior. Every name is translatable, and the row mirrors right to left.',
  },

  content: {
    labelPattern: 'Short nouns or noun phrases, one line each, in sentence case: "List", "Grid". The same kind of content in every option. The control label names what is being chosen ("View", "Time range").',
  },

  docs: {
    usage: 'Use a segmented control for a choice between two to five short options that changes a value in place: a parameter of the current view, such as list or grid, or a form value. Every option stays visible, and one is always selected. Don\'t use it to switch between panels of content (use tabs), for more than five options or long labels (use a select or a radio group), or for one setting that turns on and off (use a switch).',
    do: [
      'Name what is being chosen, with a visible label or an accessible name',
      'Use two to five options with short, one-line labels',
      'Select a sensible option from the start',
      'Use the form behavior when the value is submitted with a form',
    ],
    dont: [
      'Leave the control unnamed',
      'Use it for more than five options or long labels',
      'Let a click on the selected option clear the selection',
      'Use it to switch between panels of content; that is tabs',
    ],
    contentGuidelines: 'One or two words per option, nouns, sentence case: "List", not "Show list".',
  },

  ai: {
    primaryPurpose: 'Choose exactly one of two to five short, always-visible options that change a value in place.',
    whenToUse: 'A short single choice the user changes often or that changes the current view at once, such as list or grid, a time range or a delivery method.',
    avoidWhen: 'The options switch panels of content (use tabs), there are more than five or the labels are long (use a select or a radio group), options need descriptions (use a radio group), it is one on/off setting (use a switch), or selecting goes to another page (a navigation of links).',
    commonPartners: ['segmented-control-segment', 'field-label', 'icon'],
    triggerKeywords: ['segmented control', 'segmented button', 'view switcher', 'content switcher', 'toggle group', 'list grid toggle'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['field-label', 'segmented-control-segment'],
    alternativeTo: ['tabs', 'radio-group', 'select', 'switch-row'],
    replacesPatterns: ['a radio group restyled as a compact switcher for a view that changes at once', 'a row of buttons with a hand-rolled active state and no group semantics'],
    supersededBy: [],
  },

  motion: {
    enter: 'None. On selection the pill moves to the new option, about 150–200ms, or cross-fades.',
    exit: 'None.',
    reduceMotion: 'The indicator moves at once; only the color change remains.',
  },

  notes: {
    contested: [],
    unverified: [],
    evolution: [
      '2026-10-13 (#2418): owner decisions Q269 1–8 A. Two defs, Segment (30 members) nested in the control (3); view behavior by default; bold selected label with its width held; neutral hover wash and radius.md / radius.sm, both provisional; grow on a nested instance for equal widths; Segment 3 on, 4 and 5 off.',
      '2026-10-13 (#2418): owner decisions Q278 1–6 A, on the built control: hover and shape kept; built at 320, which fits three options at every size (with all five shown at large the options can run narrower than their labels until a designer widens the control); no track padding or gap, each option carrying its own 4px inset; the page sorts alphabetically, between Radio and Select.',
      '2026-10-15 (#2724): owner decisions Q336 A and Q342 A: the track is filled with color.background.secondary and loses its 1px outline; the selected option is a flat pill in color.background.primary. They supersede the outlined track Q278 kept and Q269.3\'s tint and outline.',
    ],
  },
};
