/**
 * SegmentedControl — DRAFT FOR THE OWNER'S REVIEW (#2418). Not registered in `components/index.ts`, not in any
 * gate list, and not for merge: it exists so the proposal's plan renders come from a real projection rather than a
 * drawing. Every design call below is the proposal's RECOMMENDATION, held for the owner (the numbered owner calls
 * on #2418), never settled here.
 *
 * KB brief: `components/segmented-control.md`
 *
 * ── THE SHAPE (recommended, owner call 1) ──────────────────────────────────────────────────────────────
 *
 * Two defs in one file, Radio.Group's pattern one family over:
 *   · `segmented-control-segment` (SegmentedControl.Segment) — ONE segment: a 44px cell (Button's height rung,
 *     the hit target) holding an INDICATOR box inset 4px, which paints the selection. Axes: selection × size,
 *     and the five-value state axis. 2 × 3 × 5 = 30 members.
 *   · `segmented-control` (SegmentedControl) — the group: an optional nested FieldLabel above an outlined TRACK
 *     holding up to five nested segments. Segments 1 and 2 always show; 3, 4 and 5 sit behind Figma-only
 *     booleans (Radio.Group's #2344 mechanism), so the count never multiplies the set. Axis: size. 3 members.
 *   Which segment is selected is the designer's override on each nested instance (`selection` exposed), not a
 *   group axis: an "index" axis would multiply the set by up to five and would need a new axis name.
 *
 * ── THE SELECTED LOOK (the system selection pattern, owner decision 2026-09-28, recorded in the
 *    build-component skill §5 "Selection" with segmented control named as its next user) ─────────────────
 *
 *   A tint (`interactive.primary.subtle-fill.selected`) and a 2px `interactive.primary.border` outline drawn
 *   inside the indicator, the label at a constant weight and the unselected neutral ink. No check mark (owner
 *   call): the track-and-pill shape has none, and a check would widen one segment and break equal widths.
 *   Measured on the committed Figma exports, four corpus brands × light, dark, HC light, HC dark (16 cells):
 *     label on the page 18.11:1 min · label on the tint 10.80:1 min · selected outline vs the track ground
 *     4.56:1 min · track edge vs the page 18.11:1 min · the tint alone vs the page 1.34–1.89:1 (never the cue).
 *   The rejected iOS look, a page-colored pill on a `background.secondary` track, measures 1.00–1.22:1.
 */
import { ComponentDef } from '../component-schema';

export const segmentedControlSegment: ComponentDef = {
  id: 'segmented-control-segment',
  name: 'SegmentedControl.Segment',
  aliases: ['segment'],
  category: 'form',
  status: 'draft',
  inherits: 'segmented-control',
  summary: 'One option of a segmented control, nested by the control. Not placed on its own.',
  description:
    'One option in a segmented control: a cell as tall as a button, holding the option label and an optional leading icon. The selected option takes a tint and a 2px outline inside the cell; the label keeps its weight, so nothing moves when the selection changes. Nested by SegmentedControl, which owns the selection.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'The option name. A short noun or noun phrase, one line.' },
    { name: 'value', type: 'string', required: true, description: 'The value the control reports when this option is selected.' },
    { name: 'leadingIcon', type: 'slot', required: false, description: 'An icon before the label. Decorative when a label is shown.' },
    { name: 'disabled', type: 'boolean', default: 'false', required: false, description: 'Removes this one option from interaction and dims it, while the rest of the control stays usable.' },
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
    'inset': 'space.050',
    'indicator-radius': 'radius.sm',
    'pad-y': 'space.0',
    'unselected.border-width': 'border-width.none',
    'selected.border-width': 'border-width.thick',
    'focus-ring': 'color.border.focus',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',

    'size.small.height': 'size.sm.height',
    'size.small.padding-x': 'space.100',
    'size.small.gap': 'space.075',
    'size.small.icon': 'icon.size.sm',
    'size.small.type': 'type.label.sm.emphasis',
    'size.medium.height': 'size.md.height',
    'size.medium.padding-x': 'space.150',
    'size.medium.gap': 'space.100',
    'size.medium.icon': 'icon.size.md',
    'size.medium.type': 'type.label.md.emphasis',
    'size.large.height': 'size.lg.height',
    'size.large.padding-x': 'space.200',
    'size.large.gap': 'space.150',
    'size.large.icon': 'icon.size.lg',
    'size.large.type': 'type.label.lg.emphasis',

    // UNSELECTED — no edge of its own (the track carries the control's edge); the neutral wash on hover/pressed.
    'unselected.overlay.hover': 'color.interactive.neutral.overlay.hover',
    'unselected.overlay.pressed': 'color.interactive.neutral.overlay.pressed',
    'unselected.label': 'color.interactive.neutral.text.rest',
    'unselected.label.hover': 'color.interactive.neutral.text.hover',
    'unselected.label.pressed': 'color.interactive.neutral.text.pressed',
    'unselected.icon': 'color.interactive.neutral.icon.rest',
    'unselected.icon.hover': 'color.interactive.neutral.icon.hover',
    'unselected.icon.pressed': 'color.interactive.neutral.icon.pressed',

    // SELECTED — Tag's selection pattern: the tint holds, the 2px outline steps with the interaction.
    'selected.overlay': 'color.interactive.primary.subtle-fill.selected',
    'selected.border': 'color.interactive.primary.border.rest',
    'selected.border.hover': 'color.interactive.primary.border.hover',
    'selected.border.pressed': 'color.interactive.primary.border.pressed',
    'selected.label': 'color.interactive.neutral.text.rest',
    'selected.label.hover': 'color.interactive.neutral.text.hover',
    'selected.label.pressed': 'color.interactive.neutral.text.pressed',
    'selected.icon': 'color.interactive.neutral.icon.rest',
    'selected.icon.hover': 'color.interactive.neutral.icon.hover',
    'selected.icon.pressed': 'color.interactive.neutral.icon.pressed',

    'disabled.label': 'color.disabled.text',
    'disabled.icon': 'color.disabled.icon',
    'disabled.border': 'color.disabled.icon',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        children: ['indicator'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        height: 'size.{size}.height',
        padding: { block: 'inset', inlineLabel: 'inset' },
        note: 'The segment cell, as tall as a button and the whole of the option\'s pointer target. Unpainted: the indicator inside it carries the paint.',
      },
      indicator: {
        kind: 'box',
        role: 'presentation',
        paintSlots: ['overlay', 'border'],
        children: ['content', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        crossAxisFill: true,
        radius: 'indicator-radius',
        strokeWidth: '{selection}.border-width',
        note: 'The selected indicator, inset 4px inside the cell. Selected, it takes a tint and a 2px outline drawn inside it, so its box does not grow; unselected, it is clear until hover or press.',
      },
      content: {
        kind: 'box',
        role: 'presentation',
        children: ['leadingVisual', 'label'],
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
        note: 'An optional icon before the label. Every segment in one control shows an icon, or none does.',
      },
      label: {
        kind: 'text',
        type: 'size.{size}.type',
        note: 'The option name, at the same weight selected and unselected, so the label never moves.',
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
      'The segment in code — one <input type="radio"> with its <label> (the form behavior), or one <button> with aria-current (the view behavior); the control decides which, never the segment.',
      'The indicator in code — in the view behavior it may be one sliding node shared by the segments rather than a box per segment; the 4px inset and the paint are the same either way.',
    ],
  },

  figmaProperties: {
    variantAxes: ['selection', 'size'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'] },
    gridAxis: 'state',
    texts: { label: { part: 'label', default: 'Option' } },
    booleans: { leadingIcon: { part: 'leadingVisual', figmaName: 'leading icon', default: false } },
    swaps: { leadingIcon: { part: 'leadingVisual', figmaName: '↳ swap leading icon' } },
  },

  accessibility: {
    role: 'A radio input with its label in the form behavior, or a button with aria-current in the view behavior, set by the control.',
    wcag: ['1.4.1 Use of Color (a 2px outline marks the selected option, never the tint alone)', '1.4.11 Non-text Contrast (the selected outline clears 3:1 against the track)'],
    keyboard: 'Set by the control.',
    focus: 'A focus ring around the indicator on :focus-visible.',
    aria: 'A leading icon is aria-hidden when a label is shown. An icon-only segment takes an aria-label.',
  },

  docs: {
    usage: 'Placed by SegmentedControl, never on its own.',
    do: ['Give every segment in a control the same content: all labels, or all labels with icons'],
    dont: ['Place a segment outside a segmented control.'],
  },

  ai: {
    primaryPurpose: 'One option inside a segmented control.',
    whenToUse: 'Only as a child of SegmentedControl.',
    avoidWhen: 'Anywhere outside a segmented control (use a tag or a button).',
    commonPartners: ['icon'],
    triggerKeywords: ['segment', 'segmented option'],
    generationPriority: 9,
  },

  composition: { composesWith: ['focus-ring'] },
};

export const segmentedControl: ComponentDef = {
  id: 'segmented-control',
  name: 'SegmentedControl',
  aliases: ['segmented-button', 'segmented-buttons', 'toggle-button-group', 'content-switcher', 'button-toggle-group'],
  category: 'form',
  status: 'draft',
  summary: 'A row of two to five options where exactly one is selected. Every option stays visible.',
  description:
    'A compact row of two to five short options, joined in one outlined track, where exactly one is always selected. Every option stays visible and one press changes the choice. Use it for a choice the user makes often or that changes what follows right away, such as a delivery method or a list or grid view. It has a visible label or an accessible name that says what is being chosen.',

  props: [
    { name: 'label', type: 'string', required: true, description: 'What is being chosen, such as "Delivery". Shown above the track, or given as an accessible name only when the context already shows it.' },
    { name: 'value', type: 'string', required: false, description: 'The selected option\'s value (controlled).' },
    { name: 'defaultValue', type: 'string', required: true, description: 'The option selected at first. A segmented control always has one option selected.' },
    { name: 'onChange', type: 'function', required: false, description: 'Called with the new value when the selection changes.' },
    { name: 'behavior', type: "enum: 'form' | 'view'", values: ['form', 'view'], default: 'form', required: false, description: 'form = a radio group whose value is submitted with a form. view = buttons that change the current view at once, such as a list or grid view.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Height, padding and label size. Medium is a button\'s height: 44px on comfortable density.' },
    { name: 'width', type: "enum: 'auto' | 'full'", values: ['auto', 'full'], default: 'auto', required: false, description: 'auto = every segment as wide as the widest. full = the control fills its column, segments shared equally.' },
    { name: 'name', type: 'string', required: false, description: 'The form field name, in the form behavior.' },
    { name: 'disabled', type: 'boolean', default: 'false', required: false, description: 'Disables every option and removes the control from the tab order.' },
  ],

  states: ['rest'],
  variants: { size: ['small', 'medium', 'large'] },
  axisKinds: { size: 'authoring' },
  paintKeys: ['{slot}'],

  tokens: {
    'gap': 'space.100',
    'track-pad': 'space.0',
    'radius': 'radius.md',
    'border-width': 'border-width.hairline',
    'border': 'color.interactive.neutral.border.rest',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'fill', y: 'hug' } },
        gap: 'gap',
        placementWidth: 320,
        minWidth: 120,
        children: ['label', 'track'],
        note: 'The control: a label above the track. Built 320px wide, it fills its column.',
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
        paintSlots: ['border'],
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        padding: { block: 'track-pad', inlineLabel: 'track-pad' },
        radius: 'radius',
        strokeWidth: 'border-width',
        crossAxisFill: true,
        children: ['segment1', 'segment2', 'segment3', 'segment4', 'segment5'],
        note: 'The track: one 1px outline around every option, the control\'s visible edge. No fill.',
      },
      segment1: { kind: 'nest', nests: 'segmented-control-segment', nesting: { kind: 'nest-exposed', variant: { size: 'medium', selection: 'selected', state: 'rest' }, follow: ['size'], expose: ['selection', 'state'] }, note: 'The first option, selected by default.' },
      segment2: { kind: 'nest', nests: 'segmented-control-segment', nesting: { kind: 'nest-exposed', variant: { size: 'medium', selection: 'unselected', state: 'rest' }, follow: ['size'], expose: ['selection', 'state'] }, note: 'The second option. A control has at least two.' },
      segment3: { kind: 'nest', nests: 'segmented-control-segment', nesting: { kind: 'nest-exposed', variant: { size: 'medium', selection: 'unselected', state: 'rest' }, follow: ['size'], expose: ['selection', 'state'] }, optional: true, note: 'The third option, shown by default.' },
      segment4: { kind: 'nest', nests: 'segmented-control-segment', nesting: { kind: 'nest-exposed', variant: { size: 'medium', selection: 'unselected', state: 'rest' }, follow: ['size'], expose: ['selection', 'state'] }, optional: true, note: 'The fourth option, hidden by default.' },
      segment5: { kind: 'nest', nests: 'segmented-control-segment', nesting: { kind: 'nest-exposed', variant: { size: 'medium', selection: 'unselected', state: 'rest' }, follow: ['size'], expose: ['selection', 'state'] }, optional: true, note: 'The fifth option, hidden by default. Past five, use a select.' },
    },
    codeOnly: [
      'The form behavior — a <fieldset> (or role="radiogroup") named by the label, holding native <input type="radio"> elements that share one name. One tab stop; arrow keys move and select; the browser handles exclusivity and right-to-left arrows.',
      'The view behavior — role="group" named by the label, holding <button> elements; the selected one carries aria-current="true". Each button is its own tab stop and Enter or Space selects it, so arrowing never changes the view by accident.',
      'Equal widths — display: inline-grid with grid-auto-flow: column and grid-auto-columns: 1fr makes every segment as wide as the widest (width auto); width full sets inline-size: 100%. Labels never wrap or truncate: a label too long for its segment means the control is the wrong choice, and the page should use a select.',
      'Never empty — clicking the selected segment does nothing. In the form behavior a radio cannot be cleared, so this holds by default.',
      'The sliding indicator (optional) — one aria-hidden node behind the segments, moved with transform from the selected segment\'s measured box (a ResizeObserver, re-measured when fonts load or the direction changes). Under prefers-reduced-motion it moves without animation.',
      'RTL — logical properties mirror the row, so the first segment sits at the right edge; a sliding indicator measures from the inline start edge.',
      'forced-colors — the tint drops out; the 2px outline (as an outline or a transparent border) and the track edge survive in system colors. Test it.',
      'text expansion — translations run 30 to 50 percent longer. Measure the longest translated label; if the control would overflow its column, render a select instead.',
    ],
  },

  figmaProperties: {
    variantAxes: ['size'],
    booleans: {
      showLabel: { part: 'label', default: true, figmaName: 'Label', figmaOnly: true },
      option3: { part: 'segment3', default: true, figmaName: 'Option 3', figmaOnly: true },
      option4: { part: 'segment4', default: false, figmaName: 'Option 4', figmaOnly: true },
      option5: { part: 'segment5', default: false, figmaName: 'Option 5', figmaOnly: true },
    },
  },

  accessibility: {
    role: 'form behavior: a radio group (a fieldset with a legend, or role="radiogroup"), native radios inside. view behavior: role="group" of buttons, the selected one with aria-current="true".',
    wcag: [
      '1.3.1 Info and Relationships (the group and its label are exposed together)',
      '1.4.1 Use of Color (the selected option has a 2px outline as well as a tint)',
      '1.4.3 Contrast (labels clear 4.5:1 on the page and on the tint)',
      '1.4.11 Non-text Contrast (the selected outline and the track edge clear 3:1 against what is next to them)',
      '2.1.1 Keyboard',
      '2.4.7 Focus Visible',
      '2.5.8 Target Size (Minimum) (every segment is a full-height cell)',
      '2.5.5 Target Size (Enhanced) (44 by 44, as intent: a medium control on comfortable and spacious density)',
      '4.1.2 Name, Role, Value',
    ],
    keyboard: 'form behavior: Tab enters at the selected option; arrow keys move to the next or previous option and select it, wrapping at the ends; Tab leaves. view behavior: Tab moves to each option; Enter or Space selects it.',
    focus: 'A focus ring around the focused option\'s indicator on :focus-visible.',
    aria: 'The label names the group (a legend, or aria-labelledby). In the view behavior, a screen reader that ignores aria-current on a button is a known gap, so test it. Every name is translatable, and the row mirrors right to left.',
  },

  content: {
    labelPattern: 'Short nouns or noun phrases, one line each, in sentence case: "Delivery", "Store pickup". The same kind of content in every segment. The control label names what is being chosen.',
  },

  docs: {
    usage: 'Use a segmented control for a choice between two to five short options that the user makes often or that changes what follows right away. Every option stays visible, and one is always selected.',
    do: [
      'Name what is being chosen, with a visible label or an accessible name',
      'Use two to five options with short, one-line labels',
      'Select a sensible option from the start',
    ],
    dont: [
      'Use it to switch between whole sections of a page. That is tabs.',
      'Use it for more than five options or long labels. That is a select or a radio group.',
      'Use it for one setting that turns on and off. That is a switch.',
      'Mix icon-only and labeled segments in one control.',
    ],
    contentGuidelines: 'Keep each label to one or two words. Use nouns, not verbs: "List", not "Show list".',
  },

  ai: {
    primaryPurpose: 'Choose exactly one of two to five short, always-visible options.',
    whenToUse: 'A short single choice the user changes often or that changes what follows right away, such as a delivery method, a list or grid view, or a time range.',
    avoidWhen: 'The options switch whole content panels (use tabs), there are more than five or the labels are long (use a select or a radio group), options need descriptions (use a radio group), or it is one on/off setting (use a switch).',
    commonPartners: ['radio-group', 'select', 'switch-row', 'tag'],
    triggerKeywords: ['segmented control', 'segmented button', 'button group toggle', 'view switcher', 'content switcher', 'toggle group'],
    generationPriority: 4,
  },

  composition: {
    composesWith: ['field-label', 'segmented-control-segment'],
    alternativeTo: ['radio-group', 'select', 'switch-row'],
    planned: ['tabs', 'toggle-button'],
  },

  motion: {
    enter: 'On selection, the indicator moves to the new option over a short duration, or the tint and outline crossfade.',
    exit: 'None.',
    reduceMotion: 'Under prefers-reduced-motion the indicator moves at once; only the color change remains.',
  },
};
